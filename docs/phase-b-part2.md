# Phase B — Part 2: Kubernetes and Runtime Security

**Focus:** Secure everything from the moment the verified image is deployed into Kubernetes to what happens while it runs.
**Covers:** B8 → B9 → B10 → B11 → B12 → B13

---

## The Big Picture of Part 2

At the end of Part 1 you have a clean, signed image sitting in GHCR. Part 2 is about what happens next — deploying it into Kubernetes and making sure it cannot be exploited, cannot spread if it is compromised, and cannot act without being detected.

```
Signed image in GHCR
    ↓ [B8] Security contexts — pod runs with minimum privilege
    ↓ [B9] Network policies — pod cannot talk to anything it should not
    ↓ [B10] OPA Gatekeeper — insecure deployments are rejected at the cluster level
    ↓ [B11] Falco — suspicious behaviour inside running containers triggers alerts
    ↓ [B11] Prometheus + Grafana — security posture is visible on a dashboard
    ↓ [B12] Full pipeline gates — all controls enforced end-to-end
    ↓ [B13] Signed commits + GitHub security settings — the final layer
    ↓
fully secured, observable, policy-enforced application running in Kubernetes
```

The theme of Part 2 is: **assume something will go wrong, and make sure the damage is contained and visible.**

Part 1 prevents bad things from reaching production. Part 2 limits what a bad thing can do once it is there, and ensures you know about it immediately.

---

## B8 — Kubernetes Security Contexts

### The vulnerability in your current deployment

Your Phase A `deployment.yaml` has no security context at all. This means:

- The container runs as **root (UID 0)**. If nginx has a vulnerability that allows code execution, the attacker operates as root inside the container.
- The filesystem is **writable**. An attacker can place malware, modify your application files, or write scripts that persist across restarts.
- The container has **all 30+ Linux capabilities** — `NET_ADMIN` (intercept network traffic), `SYS_ADMIN` (mount filesystems, change kernel parameters), `CAP_SETUID` (become any user), and many others it does not need.
- There are **no resource limits**. Your single pod can consume all CPU and memory on the node, starving every other workload on the cluster. This is a denial-of-service vulnerability from within.
- There are **no liveness or readiness probes**. Kubernetes cannot tell if your app is actually serving requests or is frozen. A crashed app stays in the rotation and users get errors.

### What security contexts are

A security context is a set of settings applied to a pod or container that control what it is allowed to do at the Linux kernel level. These are not application-level settings — they are enforced by the kernel itself. Even if an attacker compromises your app and gains code execution, the kernel will refuse requests that violate the security context.

### Each control explained

**`runAsNonRoot: true`**
Kubernetes checks before starting the pod — if the image's default user is root, the pod is rejected before it even starts. This is the safety net that catches Dockerfiles that forgot to add `USER nginx`.

**`runAsUser: 101` and `runAsGroup: 101`**
Forces the container to run as UID 101 (the nginx user you created in the hardened Dockerfile). Even if the image could run as root, this overrides it.

**`readOnlyRootFilesystem: true`**
The container's filesystem is mounted as read-only. Any attempt to write a file — malware, a webshell, a modified config — fails at the kernel level. Legitimate writable paths (nginx cache, pid file) are provided as temporary `emptyDir` volumes.

**`allowPrivilegeEscalation: false`**
Blocks the `setuid` and `setgid` bits. A setuid binary is one that runs as its owner's user instead of the calling user — a common privilege escalation technique. With this set to false, even if an attacker finds a setuid binary inside the container, it cannot be used to escalate privileges.

**`capabilities: drop: [ALL]`**
Drops every single Linux capability the container has. Containers inherit a default set of capabilities that they almost never need — `NET_BIND_SERVICE`, `CHOWN`, `DAC_OVERRIDE`, and others. Dropping all of them removes an entire category of attack surface. If a specific capability is needed (rare), it can be added back explicitly with `add: [CAPABILITY_NAME]`.

**`seccompProfile: RuntimeDefault`**
Linux has over 300 system calls. Your nginx container needs about 50 of them. The `RuntimeDefault` seccomp profile blocks the rest. If an attacker gains code execution and tries to call an unusual syscall (common in exploit code), it is blocked at the kernel level before it can do anything.

**Resource limits:**
```yaml
resources:
  requests:
    memory: "32Mi"
    cpu: "25m"
  limits:
    memory: "64Mi"
    cpu: "100m"
```
`requests` is what Kubernetes uses to schedule the pod — it will not place the pod on a node that cannot provide this. `limits` is the hard ceiling — the pod is killed if it exceeds memory limits, and throttled if it exceeds CPU limits. This prevents any pod from becoming a denial-of-service threat to the rest of the cluster.

**Liveness and readiness probes:**
- Liveness probe: Kubernetes restarts the pod if this fails. Catches frozen or deadlocked applications.
- Readiness probe: Kubernetes removes the pod from the load balancer rotation if this fails. Catches apps that are running but not ready to serve traffic (e.g., still starting up).

### Enterprise context

Pod Security Standards (PSA) is a built-in Kubernetes feature since version 1.25. It enforces one of three profiles across entire namespaces:
- `privileged` — no restrictions (for system components)
- `baseline` — prevents the most dangerous settings
- `restricted` — enforces all of the controls above

Large organisations enforce the `restricted` profile on all application namespaces at cluster creation time. Any deployment that violates it is rejected automatically — developers never see insecure pods running in production. Custom seccomp profiles tailored to specific applications are used for high-security workloads.

---

## B9 — Network Policies

### The vulnerability in your current cluster

By default in Kubernetes, every pod can communicate with every other pod in the cluster on any port, with no authentication. This is called "flat networking."

Imagine you have: your quiz-site pod, a database pod, an internal API pod, and a monitoring pod — all in the same cluster. If an attacker compromises your quiz-site through a vulnerability, they immediately have network access to the database, the internal API, and every other service. They do not need to escape the container — they just make HTTP or TCP connections to other services from inside the compromised pod.

This is called lateral movement. It is how most Kubernetes security incidents escalate from a single compromised pod to full cluster access or data exfiltration.

### What network policies are

Network policies are Kubernetes resources that act like a firewall inside the cluster. They define exactly which pods can send traffic to which other pods, and on which ports. All other traffic is dropped.

The approach is **default deny, explicit allow**:
1. First, block all traffic in and out of every pod in the namespace
2. Then, add specific rules allowing only the traffic that is actually needed

This means a compromised quiz-site pod cannot reach the database even if the attacker knows its IP address — the network policy blocks it at the cluster network level.

### The three policies you need

**Policy 1 — Default deny everything:**
```yaml
kind: NetworkPolicy
spec:
  podSelector: {}    # Applies to ALL pods in the namespace
  policyTypes:
    - Ingress
    - Egress
```
An empty `podSelector` means "match all pods." This single rule blocks all incoming and outgoing traffic for every pod in the `quiz-app` namespace.

**Policy 2 — Allow incoming traffic to quiz-site on port 8080:**
```yaml
kind: NetworkPolicy
spec:
  podSelector:
    matchLabels:
      app: quiz-site
  policyTypes:
    - Ingress
  ingress:
    - ports:
        - port: 8080
```
Only allows traffic coming *in* to pods labelled `app: quiz-site` on port 8080. Nothing else can receive incoming connections in this namespace.

**Policy 3 — Allow DNS resolution:**
```yaml
kind: NetworkPolicy
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```
Pods need DNS to resolve hostnames. Without this, even legitimate outbound connections would fail because the pod could not look up IP addresses. This allows DNS traffic out of every pod in the namespace.

### Why this order matters

If you apply the default-deny policy alone, your pods immediately lose all connectivity — including DNS. They would not be able to resolve anything. You must apply all three policies together so the necessary exceptions are in place.

### Enterprise context

Network policies are baseline security in any production Kubernetes environment. Enterprise-grade additions:

**Calico or Cilium as the CNI (Container Network Interface):** The default Kubernetes networking does not support all NetworkPolicy features on all platforms. Calico and Cilium are dedicated network plugins that provide full policy support, better performance, and additional features like:
- Layer 7 (HTTP-level) policies: allow only GET requests to `/api/public`, deny everything else
- DNS-based policies: allow traffic to `api.github.com` but not to arbitrary IPs
- Encryption of all pod-to-pod traffic using WireGuard

**Service mesh (Istio, Linkerd):** A service mesh sits alongside every pod and handles all network traffic. It provides:
- Mutual TLS (mTLS) — every pod-to-pod connection is mutually authenticated and encrypted, even inside the cluster
- Detailed traffic metrics — requests per second, error rates, latency between every pair of services
- Circuit breaking — automatically stop sending traffic to a failing service

Cilium with eBPF is the current state-of-the-art. eBPF runs programs inside the Linux kernel with near-zero performance overhead, enabling network policies that would have required hardware firewalls previously.

---

## B10 — Policy as Code: OPA Gatekeeper

### The vulnerability without it

You have now written security contexts into your deployment YAML and network policies into your cluster. But these only protect the quiz-site deployment — because you wrote them manually. A developer working on a different service in the same cluster might deploy without a security context, without resource limits, running as root, with no network policy. There is nothing stopping them.

More importantly, even for your own deployments — under deadline pressure, after an incident, during an emergency — someone might apply a deployment without the security context and not notice. The cluster accepts it happily.

Policy enforcement at the cluster level means the cluster itself rejects insecure configurations, regardless of who submits them and when.

### What OPA Gatekeeper is

OPA (Open Policy Agent) is a general-purpose policy engine. Gatekeeper is its Kubernetes integration. It installs as an admission controller — a piece of software that intercepts every request to create or modify a Kubernetes resource before it is accepted.

When you run `kubectl apply` or GitHub Actions deploys to the cluster, the request goes through Gatekeeper first. Gatekeeper evaluates the resource against your policies. If it violates a policy, the request is rejected with a clear error message. The resource is never created.

```
kubectl apply -f deployment.yaml
        ↓
Kubernetes API server
        ↓
OPA Gatekeeper (admission controller)
        ↓ evaluates against policies
    Pass: resource created
    Fail: rejected with error "Container must not run as root"
```

### Policies are written in Rego

Rego is a purpose-built policy language. It looks unusual at first but it has one job — express rules about data structures. A Kubernetes deployment is a data structure (a YAML/JSON document). Rego rules say "if this document has this shape, it is allowed; otherwise, reject it."

**Why Rego instead of YAML policies:**
Rego can express complex logic that YAML cannot. For example: "reject the deployment if any container has a memory limit above 4GB AND the namespace is not in the approved high-memory list." That kind of conditional logic is not possible in simple YAML key-value policies.

### The three policies to implement

**Policy 1 — No root containers:**
Any deployment where `runAsNonRoot` is not `true` is rejected.

**Policy 2 — Required resource limits:**
Any deployment where CPU and memory limits are not set is rejected.

**Policy 3 — No privilege escalation:**
Any deployment where `allowPrivilegeEscalation` is not `false` is rejected.

### Enterprise context

OPA is used far beyond Kubernetes. The same engine and the same Rego language are used for:

- **API authorisation:** "Can this user call this API endpoint?" — evaluated by OPA at the gateway
- **Cloud configuration:** "Does this Terraform plan comply with our cloud security policy?" — evaluated by OPA in CI
- **Data access:** "Can this service query this database table?" — evaluated by OPA in the data layer

At companies like Netflix, LinkedIn, and Intuit, OPA is the central policy engine across the entire platform. Policies are stored in a Git repository, reviewed as code, and deployed to OPA the same way application code is deployed.

**Styra DAS** is the commercial OPA management platform — it provides a UI for writing and testing policies, a policy library for common requirements, and a dashboard showing policy violations across clusters. Many enterprises use it to manage OPA at scale.

**Kyverno** is an alternative that uses YAML instead of Rego. Easier to start with, less powerful for complex logic. Teams that are Kubernetes-native often prefer Kyverno. Teams with cross-platform policy needs (K8s + APIs + cloud) prefer OPA.

---

## B11 — Runtime Security: Falco

### The vulnerability without it

Every control in Phase B so far is preventive — it stops known threats from deploying. But no set of preventive controls is complete. Attackers find novel techniques. Zero-day vulnerabilities exist. Insider threats act after deployment. Supply chain compromises happen through vectors no one anticipated.

The question is not just "can we stop every attack?" — it is also "when something does happen, how quickly do we know, and what do we know about what it did?"

Without runtime security, a compromised container can run for days or weeks without detection. By the time logs are reviewed, the attacker has exfiltrated data, established persistence, and covered their tracks.

### What Falco is

Falco is a runtime threat detection engine built by Sysdig and donated to the CNCF (Cloud Native Computing Foundation). It uses eBPF (extended Berkeley Packet Filter) — a technology that runs programs safely inside the Linux kernel — to observe every system call made by every process in every container on every node in the cluster.

A system call is the lowest-level action a process can take — reading a file, making a network connection, spawning a new process, opening a socket. Falco watches them all and compares them against a library of rules. When behaviour matches a known attack pattern, Falco fires an alert in milliseconds.

### Why syscall monitoring catches what network and file monitoring miss

Container firewalls and network policies operate at the network level — they see connections, not what is happening inside processes. File integrity monitoring sees file changes, not what changed them or why. Syscall monitoring sees every action at its most fundamental level — before it reaches the network, before it writes to disk. This is the only level at which you can reliably distinguish legitimate behaviour from malicious behaviour.

### The attacks Falco detects out of the box

| Rule | What it watches | Attack it catches |
|---|---|---|
| Terminal shell in container | `execve` syscall for bash/sh/zsh | Attacker drops to an interactive shell for manual exploration |
| Write below binary dirs | Write syscall to `/bin`, `/usr/bin`, `/sbin` | Attacker installs malware or replaces system binaries |
| Read sensitive file | Read of `/etc/shadow`, `/proc/*/environ` | Attacker harvests credentials from the container |
| Unexpected outbound connection | New connection from a container that has no prior egress pattern | C2 (command and control) — attacker's malware calling home |
| Container run as root | Process UID check on start | Misconfigured container slipped through policy |
| Execution from /tmp | `execve` from `/tmp` directory | Malware staging — attackers commonly write and execute from /tmp |
| kubectl exec into pod | `kubectl exec` against a running production pod | Insider threat or post-compromise investigation |
| Crypto mining detected | High CPU + specific network patterns to known mining pools | Cryptojacking — attacker using your compute for mining |

### How to install Falco

Using Helm in WSL2:
```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set falco.grpc.enabled=true \
  --set falcosidekick.enabled=true
```

Falco runs as a DaemonSet — one instance on every node in the cluster. It starts monitoring immediately using the default rule set which covers the most common attack patterns.

### Falcosidekick — routing alerts

Falcosidekick is a companion tool that takes Falco alerts and forwards them to wherever you need them:
- Slack — immediate notification to a security channel
- PagerDuty — wake someone up for CRITICAL findings
- AWS Security Hub — centralise findings in your cloud security dashboard
- Elasticsearch — store and search alert history
- Grafana — visualise alert trends over time

**Enterprise context:** Falco is the open source engine that commercial tools Sysdig Secure and Aqua Runtime Security are built on. The enterprise versions add: managed rule updates (new rules as new attacks emerge), a UI for investigating incidents, automated response (kill the pod, quarantine the namespace), and compliance reporting. The underlying detection technology is identical.

At mature organisations, Falco alerts integrate with the SIEM (Security Information and Event Management) platform — Splunk, Elastic, or Microsoft Sentinel. Every alert is correlated with other signals (network logs, access logs, vulnerability findings) to produce a full picture of an incident automatically.

---

## B12 — Prometheus and Grafana: Security Observability

### Why observability is a security control

Security is not a state — it is a process. You do not secure a system once and walk away. You need continuous visibility into:
- Is the pipeline actually enforcing the security gates? (Are there failed scans being ignored?)
- Are CVE counts going up or down over time?
- How quickly are we patching after a new CVE is published?
- Are there Falco alerts that indicate a pattern of probing or attack?
- Is the deployment frequency changing? (A sudden drop might mean engineers are bypassing the pipeline)

Without metrics and dashboards, security is invisible. You find out something is wrong when an incident happens, not before.

### What Prometheus and Grafana are

**Prometheus** is a time-series database that scrapes metrics from your systems on a schedule. It stores them and allows querying with PromQL (Prometheus Query Language). Think of it as the data collection layer.

**Grafana** is a visualisation tool that queries Prometheus (and other data sources) and displays metrics as dashboards — charts, graphs, counters, status panels. Think of it as the display layer.

Together: Prometheus collects numbers, Grafana shows them.

### Security metrics to track

**Pipeline metrics:**
- Build success rate — a drop indicates broken security gates or failing scans
- Time from commit to deployment — a spike indicates a bottleneck or a stuck security check
- Scan failure rate per tool — which tool is blocking most often, and is it signal or noise?

**Vulnerability metrics:**
- Trivy CVE count per image over time — should trend downward as you patch
- Time from CVE published to image updated — your patch SLA in practice
- Number of open Semgrep findings in the GitHub Security tab

**Runtime metrics (from Falco):**
- Falco alert rate by severity — a spike in CRITICAL alerts means active attack or misconfiguration
- Falco alert rate by rule — which attack patterns are being triggered
- New rules firing for the first time — novel behaviour worth investigating

**Cluster metrics:**
- Pod restart count — frequent restarts indicate instability or a crashing app
- OPA Gatekeeper policy violations — how many rejected deployments per day
- Resource usage vs limits — pods approaching limits may indicate an attack or a problem

### How to install

Using Helm in WSL2:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

The `kube-prometheus-stack` chart installs Prometheus, Grafana, Alertmanager, and a full set of pre-built Kubernetes dashboards in one command.

**Access Grafana:**
```bash
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
```
Open `http://localhost:3000`. Default credentials: `admin` / `prom-operator`.

### Enterprise context

Datadog, New Relic, and Dynatrace are the commercial equivalents — fully managed, no self-hosting, with built-in integrations for hundreds of technologies. They cost money but eliminate the operational overhead of running Prometheus and Grafana yourself.

Grafana Cloud is a managed Grafana/Prometheus offering with a generous free tier.

At mature organisations, security dashboards are reviewed in weekly or monthly security reviews. They feed into board-level reporting — "our mean time to patch critical CVEs is 18 hours" is a metric a CISO presents to the board. The data comes from exactly this kind of pipeline.

---

## B13 — Full Pipeline Gates and Final Configuration

### What full pipeline gates means

Individual gates (Trivy blocks on CVEs, Checkov blocks on IaC violations) are already in place after Part 1. Full pipeline gates means making the complete pipeline a single enforced sequence where every gate must pass before the next step runs.

```
TruffleHog pass
    AND
Semgrep pass
    AND
Checkov pass (no soft_fail)
        ↓ only then
    Docker build
        ↓
    Trivy pass
        ↓ only then
    Push to GHCR
        ↓
    Cosign sign + verify
        ↓ only then
    OPA Gatekeeper pass at cluster admission
        ↓
    Deployment running
```

The key change from Part 1's Checkov configuration: remove `soft_fail: true` and set `exit-code: 1`. Now Checkov violations block the pipeline the same way Trivy CVEs do. Nothing ships with a known IaC misconfiguration.

### GitHub Security Settings

Enable everything in your repository's security settings:

**Settings → Security → Code security and analysis:**
- Dependency graph — tracks what your repo depends on
- Dependabot alerts — notifies you of CVEs in your dependencies
- Dependabot security updates — auto-opens PRs with fixes
- Secret scanning — GitHub's own scanner for known token patterns (AWS keys, GitHub PATs, Stripe keys, etc.)
- Push protection — blocks pushes that contain secrets before they land in git history

**Why push protection matters separately from TruffleHog:** TruffleHog runs after the code is already pushed. Push protection runs at the git protocol level — the push is rejected before the commit is stored. The secret never enters git history at all.

### GPG Signed Commits

Signed commits add a cryptographic proof to every commit that it was made by a specific person (you) using your private key. GitHub shows a "Verified" badge. Branch protection can require all commits to be signed.

**Why this matters in enterprise:** In a large company, anyone with access to a developer's machine — or anyone who compromises it — can make commits that appear to be from that developer. Signed commits make impersonation impossible without also stealing the developer's GPG private key (which should be on a hardware security key like a YubiKey at high-security organisations).

Setup:
```bash
# In WSL2
gpg --full-generate-key
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
gpg --armor --export YOUR_KEY_ID
# Paste the output into GitHub → Settings → SSH and GPG keys
```

---

## Part 2 — Completion Checklist

You are done with Part 2 when all of these are true:

- [ ] `deployment.yaml` has full security context (non-root, read-only filesystem, capabilities dropped, resource limits, probes)
- [ ] `networkpolicy.yaml` deployed — default deny-all with explicit allows for port 8080 and DNS
- [ ] OPA Gatekeeper installed in the cluster
- [ ] Gatekeeper policies enforcing non-root, resource limits, no privilege escalation
- [ ] Falco installed via Helm in the `falco` namespace
- [ ] Falco alerts routing to a notification channel (Slack or similar)
- [ ] Prometheus and Grafana installed via Helm in the `monitoring` namespace
- [ ] Security dashboard created in Grafana tracking CVE counts, Falco alerts, pipeline metrics
- [ ] Checkov `soft_fail: true` removed — IaC violations now block the pipeline
- [ ] GitHub Security settings fully enabled including push protection
- [ ] GPG commit signing configured

---

## The Complete Secured Architecture

At the end of Part 2, this is what your system looks like:

```
Developer workstation
  Gitleaks pre-commit hook (blocks secrets before commit)
  GPG signed commits (cryptographic proof of authorship)
        ↓ git push to feature branch → PR → code review
        ↓ merge to main

GitHub Actions pipeline
  TruffleHog     — verified secret scan (full history)
  Semgrep        — SAST with custom rules, blocks on ERROR
  Checkov        — IaC scan, blocks on violations
        ↓ all pass
  Docker build   — hardened Dockerfile (non-root, patched, pinned)
  Trivy scan     — blocks on CRITICAL/HIGH CVEs
        ↓ passes
  Push to GHCR   — clean, verified image
  Cosign sign    — cryptographic signature attached
  SBOM generate  — full ingredient list stored as artifact
  Dependabot     — opens PRs for dependency updates automatically
        ↓

Kubernetes cluster (Docker Desktop)
  OPA Gatekeeper — rejects root pods, missing limits, privilege escalation
  Deployment     — security context enforced (non-root, read-only FS, caps dropped)
  NetworkPolicy  — deny-all default, explicit allows only
  Falco          — watches every syscall, alerts on attack patterns
  Prometheus     — collects metrics from pipeline and cluster
  Grafana        — security dashboard showing posture over time
        ↓

Your app running at http://localhost:30080
  Secured at every layer from commit to runtime
```

---

## Key Skills Demonstrated by Completing This Project

When you have finished both parts of Phase B, you can demonstrate:

**Shift-left security** — catching vulnerabilities at commit time, not production
**Supply chain security** — signed images, SBOM generation, verified deployments
**Defence in depth** — six independent layers that an attacker must defeat separately
**Policy as code** — security rules that enforce themselves, no human bypass possible
**Runtime threat detection** — knowing when something is wrong while it is happening
**Security observability** — measuring and trending security posture over time

These are the exact skills listed in DevSecOps, Platform Security, and Security Engineering job descriptions.
