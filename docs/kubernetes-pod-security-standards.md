# Kubernetes Pod Security Standards — In-Depth Guide

> Written as part of the Secure CI/CD Project — Phase B learning series.

---

## Table of Contents

1. [What Are Pod Security Standards?](#1-what-are-pod-security-standards)
2. [How PSA Works](#2-how-psa-works)
3. [The Three Modes](#3-the-three-modes)
4. [Level 1 — Privileged](#4-level-1--privileged)
5. [Level 2 — Baseline](#5-level-2--baseline)
6. [Level 3 — Restricted](#6-level-3--restricted)
7. [Full Comparison Table](#7-full-comparison-table)
8. [Real Enterprise Examples](#8-real-enterprise-examples)
9. [Safe Rollout Strategy](#9-safe-rollout-strategy)
10. [How This Project Uses PSA](#10-how-this-project-uses-psa)

---

## 1. What Are Pod Security Standards?

By default, Kubernetes trusts whatever is in your deployment YAML. If a developer accidentally writes a deployment that runs as root, mounts the host filesystem, or disables all security controls — Kubernetes will run it without question.

**Pod Security Standards (PSS)** are Kubernetes's built-in rulebook that defines three security levels for pods. **Pod Security Admission (PSA)** is the enforcement engine — it checks every pod against the rules for its namespace before allowing it to run.

Think of it like building codes:

| Analogy | Kubernetes Level |
|---------|-----------------|
| Construction site — workers need full access to everything | `privileged` |
| Regular apartment — basic fire safety and structural rules | `baseline` |
| Hospital room — strict hygiene, access control, no exceptions | `restricted` |

PSA is built into Kubernetes since v1.25 — no plugins or extra tools needed.

---

## 2. How PSA Works

PSA is applied by **labelling a namespace**. Kubernetes reads the label and enforces the chosen level against every pod that tries to run in that namespace.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

The label format is:

```
pod-security.kubernetes.io/<MODE>: <LEVEL>
```

Where:
- `MODE` is one of: `enforce`, `audit`, `warn`
- `LEVEL` is one of: `privileged`, `baseline`, `restricted`

You can also pin a specific version of the standard:

```yaml
pod-security.kubernetes.io/enforce-version: v1.31
```

This prevents your policy from silently changing when you upgrade Kubernetes.

---

## 3. The Three Modes

Each level can be applied in three different modes. You can mix modes — for example enforce baseline but audit restricted at the same time.

### enforce
The pod is **rejected**. It will not run. The user gets an error message.

```
Error from server (Forbidden): pods "my-app" is forbidden:
violates PodSecurity "restricted:latest":
allowPrivilegeEscalation != false
```

Use this in production once you know your workloads are compliant.

### audit
The pod **runs**, but the violation is recorded in the Kubernetes audit log. Silent to the developer.

Use this during a rollout to discover violations without breaking anything.

### warn
The pod **runs**, but the developer sees a warning in their terminal when they `kubectl apply`.

```
Warning: would violate PodSecurity "restricted:latest":
runAsNonRoot != true
```

Use this early in a rollout so developers know to fix their manifests.

### Combining modes — recommended rollout pattern

```yaml
labels:
  pod-security.kubernetes.io/enforce: baseline      # hard block obvious dangers now
  pod-security.kubernetes.io/audit: restricted       # silently log restricted violations
  pod-security.kubernetes.io/warn: restricted        # warn developers about restricted violations
```

This lets you enforce a safe minimum immediately while giving teams time to reach the stricter level.

---

## 4. Level 1 — Privileged

### Definition

No restrictions. Every setting is allowed. This is the default for all namespaces unless you label them otherwise.

### What it allows

| Setting | Allowed |
|---------|---------|
| `privileged: true` | ✅ |
| `hostNetwork: true` | ✅ |
| `hostPID: true` | ✅ |
| `hostIPC: true` | ✅ |
| `hostPath` volume mounts | ✅ |
| Run as root (UID 0) | ✅ |
| All Linux capabilities | ✅ |
| Any seccomp profile (or none) | ✅ |
| Any sysctl | ✅ |

### When to use it

Only for **infrastructure-level** workloads that genuinely need deep OS access. These are typically managed by your platform/SRE team, not application developers.

| Workload | Why it needs privileged |
|----------|------------------------|
| CNI plugins (Calico, Cilium, Flannel) | Must modify host network interfaces and load kernel modules |
| CSI storage drivers | Must access block devices and mount volumes at the host level |
| Node monitoring agents (Datadog, Dynatrace) | Must read host-level metrics across all processes via `/proc` |
| Runtime security tools (Falco, Sysdig) | Must attach to the kernel via eBPF or kernel modules to watch syscalls |
| GPU device plugins | Must access `/dev/nvidia*` and host driver files |

### Real enterprise example

**Datadog Agent on a production EKS cluster**

A financial services company uses Datadog for observability. The Datadog node agent runs as a DaemonSet (one pod per node) in the `monitoring` namespace. It needs:
- `hostPID: true` — to see all processes on the node for APM tracing
- `hostNetwork: true` — to collect network metrics
- `hostPath` mounts to `/proc`, `/sys`, `/var/run/docker.sock`
- Privileged mode to access hardware performance counters

The `monitoring` namespace is labelled `privileged` and access is restricted to the platform team. Application teams cannot deploy to this namespace.

### Rule

> Only apply `privileged` to **infrastructure namespaces** managed by your platform team. Never to application namespaces.

---

## 5. Level 2 — Baseline

### Definition

Blocks the most dangerous escalation paths while remaining compatible with most applications that have not been explicitly hardened. Most containerised applications that run correctly will pass baseline without any changes.

### What it blocks

**Check 1: No privileged containers**

```yaml
# BLOCKED by baseline
securityContext:
  privileged: true
```

A privileged container has root-equivalent access to the host node. If an attacker gets remote code execution inside it, they own the node. There is almost no legitimate application reason to run privileged.

---

**Check 2: No host namespace sharing**

```yaml
# BLOCKED by baseline
spec:
  hostNetwork: true   # pod uses host's network stack directly
  hostPID: true       # pod can see all processes on the node
  hostIPC: true       # pod can use shared memory with the host
```

`hostNetwork: true` is particularly dangerous — it bypasses all Kubernetes Network Policies entirely. A pod with `hostNetwork` can reach any port on the node and communicate on the host's physical network.

---

**Check 3: No hostPath volumes (or only explicitly safe paths)**

```yaml
# BLOCKED by baseline
volumes:
  - name: dangerous
    hostPath:
      path: /etc        # exposes host config files
  - name: also-dangerous
    hostPath:
      path: /           # exposes entire host filesystem
```

Mounting host paths gives the container read/write access to the node's filesystem. An attacker could read SSH keys from `/root/.ssh`, modify `/etc/passwd`, or write a crontab to `/etc/cron.d`.

---

**Check 4: No dangerous Linux capabilities**

```yaml
# BLOCKED by baseline — these capabilities cannot be added
capabilities:
  add:
    - SYS_ADMIN      # nearly equivalent to root — can mount filesystems, modify kernel parameters
    - NET_RAW         # can craft raw network packets — enables ARP spoofing and network attacks
    - SYS_PTRACE      # can attach to any process and read its memory — credential theft
    - SYS_MODULE      # can load kernel modules
    - SYS_BOOT        # can reboot the system
    - MAC_ADMIN       # can change MAC address policies
```

Adding `SYS_ADMIN` to a container is functionally equivalent to giving it root on the node. It is the capability most commonly exploited in container escape attacks.

---

**Check 5: No privileged sysctls**

```yaml
# BLOCKED by baseline
securityContext:
  sysctls:
    - name: net.ipv4.ip_unprivileged_port_start
      value: "0"
    - name: kernel.unprivileged_userns_clone
      value: "1"
```

Dangerous kernel parameter changes that affect the entire node, not just the container.

---

**Check 6: Restricted AppArmor profiles**

If an AppArmor annotation is present, it must be either `runtime/default` or `localhost/*`. Custom unconfined profiles are blocked.

---

### What baseline does NOT enforce

- Does not require `runAsNonRoot` — container can still run as root
- Does not require `readOnlyRootFilesystem` — container can still write to its filesystem
- Does not require dropping capabilities — as long as you don't add dangerous ones, existing defaults are fine
- Does not require a seccomp profile

### When to use it

| Workload | Why baseline fits |
|----------|------------------|
| Legacy enterprise apps lifted from VMs | May run as root, may write to filesystem, but don't need host access |
| CI/CD build agents (Jenkins, GitLab Runner) | Need to run arbitrary build steps and write artifacts |
| Internal admin tooling and dashboards | Not fully hardened but don't need dangerous host access |
| Third-party software without security hardening | Vendor images that haven't been updated for security contexts |

### Real enterprise example

**Jenkins build agents on a shared Kubernetes cluster**

A large e-commerce company runs Jenkins pipelines on Kubernetes. Their Jenkins agents run Maven/Gradle builds, run unit tests, build Docker images (using kaniko, not Docker-in-Docker), and push artifacts to Nexus.

These agents need to:
- Write build output to the filesystem
- Run as the `jenkins` user (UID 1000) but sometimes as root for package installation steps
- Access the Docker socket (though they are migrating away from this)

They cannot use `restricted` because some legacy pipeline steps run as root. They use `baseline` which blocks the truly dangerous settings (privileged mode, hostPath, hostNetwork) while allowing the flexibility legacy pipelines need. The migration to `restricted` is a 6-month project running in parallel.

### Rule

> Use `baseline` as the **minimum floor** for all production application namespaces. It is the "do no obvious harm" standard. Any namespace that doesn't have a label is effectively `privileged` — which is dangerous.

---

## 6. Level 3 — Restricted

### Definition

The strictest standard. Enforces current best practices for pod security hardening. Every check in baseline is included, plus additional requirements that close the remaining escalation paths.

### What it enforces (in addition to baseline)

**Check 1: Must run as non-root**

```yaml
# REQUIRED
spec:
  securityContext:
    runAsNonRoot: true
```

Kubernetes verifies at admission time that the container's effective UID is not 0. If the image's default user is root and `runAsNonRoot` is not set, the pod is rejected.

This prevents the most common container escape: a process running as root inside the container exploiting a kernel vulnerability to become root on the host.

---

**Check 2: Must set allowPrivilegeEscalation: false**

```yaml
# REQUIRED
containers:
  - securityContext:
      allowPrivilegeEscalation: false
```

This sets the `no_new_privs` flag on the process. It prevents the process from gaining more privileges than it started with — specifically, it disables the `setuid` bit on executables. Without this, a non-root process could run a setuid binary and escalate to root.

Example of what this blocks: a container running as UID 1000 that contains `/usr/bin/sudo` with the setuid bit. Without `allowPrivilegeEscalation: false`, running `sudo` could succeed. With it, `sudo` is neutered.

---

**Check 3: Must drop ALL capabilities, only NET_BIND_SERVICE may be added**

```yaml
# REQUIRED
containers:
  - securityContext:
      capabilities:
        drop:
          - ALL
        add:           # optional — only this one is allowed
          - NET_BIND_SERVICE
```

Linux capabilities are fine-grained root permissions. By dropping ALL, you remove:

| Capability | What it controls |
|------------|-----------------|
| `CHOWN` | Change file ownership |
| `DAC_OVERRIDE` | Bypass file permission checks |
| `FOWNER` | Bypass permission checks for file operations |
| `KILL` | Send signals to any process |
| `NET_BIND_SERVICE` | Bind to ports below 1024 |
| `SETUID` / `SETGID` | Change process user/group ID |
| `SYS_CHROOT` | Use chroot |
| + 25 more | Various kernel interfaces |

Most applications need none of these. Dropping ALL and adding back only what is needed is the true least-privilege approach.

`NET_BIND_SERVICE` may be added back only if the application genuinely needs to bind to a port below 1024 (like port 443 for HTTPS directly). Applications should prefer running on ports above 1024 to avoid needing this capability at all.

---

**Check 4: Must set a seccomp profile**

```yaml
# REQUIRED — one of these two options
securityContext:
  seccompProfile:
    type: RuntimeDefault    # uses containerd/docker's built-in filter
# OR
  seccompProfile:
    type: Localhost          # custom profile on the node
    localhostProfile: profiles/my-app.json
```

Seccomp (Secure Computing Mode) is a Linux kernel feature that filters which system calls a process is allowed to make. The Linux kernel has ~400 system calls. Most applications use fewer than 50.

`RuntimeDefault` applies the container runtime's default filter (containerd's default blocks ~200 dangerous syscalls including `ptrace`, `mount`, `kexec_load`, `create_module`, `perf_event_open`, and others used in kernel exploits).

Without a seccomp profile, a compromised container can make any syscall the kernel supports — including those used in container escape exploits.

---

**Check 5: Volume types are restricted**

Only these volume types are allowed:

| Volume Type | Purpose |
|-------------|---------|
| `configMap` | Mount configuration from ConfigMaps |
| `secret` | Mount Kubernetes Secrets |
| `emptyDir` | Temporary in-memory or disk storage (scoped to pod lifetime) |
| `projected` | Combine multiple volume sources |
| `persistentVolumeClaim` | Mount persistent storage |
| `ephemeral` | Inline ephemeral volumes |
| `csi` | Container Storage Interface volumes |
| `downwardAPI` | Expose pod metadata to the container |

`hostPath` is completely blocked. No exceptions. This closes the direct host filesystem access path regardless of any other settings.

---

**Check 6: runAsUser must not be 0 (if set)**

```yaml
# BLOCKED
securityContext:
  runAsUser: 0    # explicitly setting root
```

Combined with `runAsNonRoot: true`, this ensures the container cannot run as root through any path — not by image default, not by explicit setting.

---

### When to use it

| Workload | Why restricted fits |
|----------|-------------------|
| Customer-facing APIs | Minimise blast radius if compromised — attacker stays trapped in container |
| Services handling PII, payments, or health data | Compliance requirements (PCI-DSS, HIPAA, SOC2) mandate least-privilege |
| Auth and identity services | Highest-value target — must be hardest to exploit |
| Multi-tenant SaaS workloads | Prevent one tenant's compromised pod from attacking another |
| Any newly written microservice | No reason not to — build it right from the start |

### Real enterprise example

**Stripe-style payment processing service**

A fintech company processes card payments on Kubernetes. Their `payments` namespace handles PAN (Primary Account Numbers) and is in scope for PCI-DSS compliance.

Their PSA label:
```yaml
pod-security.kubernetes.io/enforce: restricted
pod-security.kubernetes.io/enforce-version: v1.31
```

Every service in this namespace must:
- Run as a named non-root user (e.g. UID 10001)
- Have `readOnlyRootFilesystem: true`
- Drop ALL capabilities
- Use `RuntimeDefault` seccomp profile
- Mount secrets via projected volumes only

During their PCI-DSS audit, they show the namespace label as evidence of pod-level security controls. The auditor can verify enforcement without reading every deployment YAML individually.

If a developer accidentally deploys an image that runs as root, Kubernetes rejects it immediately with an error — it never runs in production.

### Rule

> Use `restricted` for all **application workloads** whenever possible. If you build new services, start with restricted. The extra configuration (non-root user, drop capabilities, seccomp) should be your default, not an afterthought.

---

## 7. Full Comparison Table

| Security Check | Privileged | Baseline | Restricted |
|---------------|-----------|----------|------------|
| Privileged containers (`privileged: true`) | ✅ Allowed | ❌ Blocked | ❌ Blocked |
| `hostNetwork` / `hostPID` / `hostIPC` | ✅ Allowed | ❌ Blocked | ❌ Blocked |
| `hostPath` volumes | ✅ Allowed | ❌ Blocked | ❌ Blocked |
| Dangerous capabilities (`SYS_ADMIN`, `NET_RAW`, `SYS_PTRACE`) | ✅ Allowed | ❌ Blocked | ❌ Blocked |
| Unsafe sysctls | ✅ Allowed | ❌ Blocked | ❌ Blocked |
| Run as root (UID 0) | ✅ Allowed | ✅ Allowed | ❌ Blocked |
| `allowPrivilegeEscalation` not set to false | ✅ Allowed | ✅ Allowed | ❌ Blocked |
| Capabilities not dropped | ✅ Allowed | ✅ Allowed | ❌ Blocked |
| No seccomp profile | ✅ Allowed | ✅ Allowed | ❌ Blocked |
| Non-allowed volume types | ✅ Allowed | ✅ Allowed | ❌ Blocked |

---

## 8. Real Enterprise Examples

### Example 1: Large bank — multi-tier namespace strategy

A tier-1 bank running 500+ microservices on Kubernetes uses three namespace tiers:

| Namespace type | PSA level | Examples |
|---------------|-----------|---------|
| `platform-*` | `privileged` | Calico CNI, Datadog agent, Vault agent injector |
| `shared-*` | `baseline` | Jenkins build agents, legacy middleware, vendor software |
| `app-*` | `restricted` | All customer-facing APIs, internal microservices |

Application teams are only permitted to deploy to `app-*` namespaces. The restricted level is enforced by policy. New projects must pass a security review showing compliance with restricted before getting a namespace.

---

### Example 2: SaaS company — gradual rollout

A SaaS company decides to move all namespaces from unlabelled (effectively privileged) to restricted. They cannot flip the switch overnight — some applications will break.

**Month 1:** Add `warn: restricted` to all namespaces. Developers see warnings in their terminals. No breakage.

**Month 2:** Engineering teams fix their manifests. Security team tracks compliance via audit logs.

**Month 3:** Switch to `enforce: baseline` (safe, no apps use dangerous settings). Add `audit: restricted` and `warn: restricted` for the next level.

**Month 4:** Teams that are compliant get `enforce: restricted`. Others stay at baseline with a deadline.

**Month 6:** All namespaces enforcing restricted. Legacy exceptions require security team approval.

---

### Example 3: Healthcare startup — restricted from day one

A digital health startup building a patient records API starts the project with `restricted` enforced on all namespaces. Every engineer knows from day one:

- Docker images must have a non-root USER instruction
- All deployments must have security contexts with `runAsNonRoot: true`, `drop: ALL`, `allowPrivilegeEscalation: false`, and `seccompProfile: RuntimeDefault`
- CI pipeline (Checkov) catches violations before they reach the cluster

The startup passes their HIPAA security assessment with minimal remediation because pod security was built in from the start, not retrofitted.

---

## 9. Safe Rollout Strategy

Never enable `enforce: restricted` on a production namespace without first running through these steps.

### Step 1: Audit (1-2 weeks)
Add audit only. No disruption. Watch the logs.

```yaml
labels:
  pod-security.kubernetes.io/audit: restricted
```

Check violations:
```bash
kubectl get events -n your-namespace --field-selector reason=FailedCreate
```

### Step 2: Warn (1 week)
Add warn alongside audit. Developers see warnings when they apply manifests.

```yaml
labels:
  pod-security.kubernetes.io/audit: restricted
  pod-security.kubernetes.io/warn: restricted
```

### Step 3: Fix violations
Work through all warnings and audit log entries. Common fixes:

| Violation | Fix |
|-----------|-----|
| Running as root | Add `USER 1000` to Dockerfile, set `runAsNonRoot: true` |
| Missing seccomp | Add `seccompProfile: RuntimeDefault` |
| Capabilities not dropped | Add `capabilities: drop: [ALL]` |
| Writable root filesystem | Add `readOnlyRootFilesystem: true` + emptyDir mounts |

### Step 4: Enforce baseline first
```yaml
labels:
  pod-security.kubernetes.io/enforce: baseline
  pod-security.kubernetes.io/warn: restricted
```

### Step 5: Enforce restricted
```yaml
labels:
  pod-security.kubernetes.io/enforce: restricted
  pod-security.kubernetes.io/enforce-version: v1.31
```

---

## 10. How This Project Uses PSA

The `quiz-app` namespace runs a static HTML/JS quiz site served by nginx. It was hardened in Phase B:

- Runs as nginx user (UID 101) — satisfies `runAsNonRoot`
- `allowPrivilegeEscalation: false` — set in deployment
- `capabilities.drop: [ALL]` — set in deployment
- `readOnlyRootFilesystem: true` — set in deployment with emptyDir mounts
- `seccompProfile: RuntimeDefault` — to be confirmed

This workload fully satisfies the `restricted` standard. The namespace is labelled to enforce it — meaning Kubernetes will reject any future pod that does not meet this bar, regardless of what is in the YAML.

```yaml
# k8s/base/namespace.yaml
labels:
  pod-security.kubernetes.io/enforce: restricted
  pod-security.kubernetes.io/enforce-version: v1.31
```

---

*Part of the Secure CI/CD Project learning series — Phase B, task B12.*
