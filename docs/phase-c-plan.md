# Phase C — Advanced Security

**Theme:** Detection, enforcement, and GitOps. Phase B hardened the system. Phase C makes sure you know when something goes wrong and prevents policy drift.

**Prerequisites:** Phase B fully complete.
**Status:** Not started.

---

## Task List

| ID | Task | Effort | Status |
|----|------|--------|--------|
| C1 | SBOM Generation | Low | ⏳ Not started |
| C2 | Falco Runtime Security | Medium | ⏳ Not started |
| C3 | Kyverno Policy Enforcement | Medium | ⏳ Not started |
| C4 | ArgoCD GitOps | Medium | ⏳ Not started |
| C5 | Prometheus + Grafana | High | ⏳ Not started |
| C6 | GPG Signed Commits | Low | ⏳ Not started |
| C7 | Incident Response Runbook | Low | ⏳ Not started |
| C8 | Monthly Security Checklist | Low | ⏳ Not started |

---

## C1 — SBOM Generation (Software Bill of Materials)

**What it is:**
An SBOM is the complete ingredient list of your container image — every OS package, library, and dependency with its name, version, and licence. Generated automatically on every build and stored as a build artefact.

**Why it matters:**
When a critical CVE is published (e.g. a zero-day in OpenSSL), you can immediately query your SBOM to know if your image is affected — without rebuilding or scanning from scratch. This is how enterprise security teams achieve sub-hour response times on new CVEs.

**Compliance relevance:**
US Executive Order 14028 (2021) mandates SBOMs for all software sold to the US government. Enterprise procurement teams increasingly require SBOMs from vendors. Becoming standard practice.

**Implementation:**
- Add `anchore/sbom-action` step to `pipeline.yml` after the Docker build step
- Output format: SPDX (industry standard, supported by GitHub)
- Attach SBOM as a GitHub Actions artefact (downloadable from the Actions run)
- Optionally: attach SBOM to the image in GHCR as a Cosign attestation (done in Phase E)

**Tools:** Syft (by Anchore), `anchore/sbom-action`

**Pipeline position:**
```
Docker build → SBOM generation → Trivy scan → Push to GHCR
```

**Files to create/modify:**
- `.github/workflows/pipeline.yml` — add SBOM step

**Definition of done:**
- [ ] SBOM generated on every push to main
- [ ] SBOM downloadable as GitHub Actions artefact
- [ ] SBOM contains all OS packages and libraries in the image

---

## C2 — Falco Runtime Security

**What it is:**
Falco is a runtime threat detection engine that watches every system call made by every container in real time. When behaviour matches a known attack pattern, it fires an alert in milliseconds.

**Why it matters:**
All Phase B controls are preventive. Falco is the detection layer — the alarm system. If an attacker finds a zero-day, or if a misconfiguration is missed, Falco catches the behaviour while it is happening.

**What it detects (examples):**

| Rule | Attack it catches |
|------|-----------------|
| Shell spawned in container | Attacker drops to interactive shell |
| Write to read-only path | Malware installation attempt |
| Sensitive file read (`/etc/shadow`) | Credential harvesting |
| Unexpected outbound connection | C2 (attacker's malware calling home) |
| Execution from `/tmp` | Malware staging |
| `kubectl exec` into production pod | Insider threat or post-compromise |
| Crypto mining network patterns | Cryptojacking |

**Implementation:**
- Deploy Falco via Helm to `falco` namespace
- Falco runs as DaemonSet — one instance per node
- Add custom rule: quiz-site nginx should never spawn a shell
- Route alerts to stdout (visible via `kubectl logs`)

**Tools:** Falco, Helm, `falcosecurity/falco` Helm chart

**Install commands:**
```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set driver.kind=ebpf
```

**Files to create:**
- `k8s/falco/custom-rules.yaml` — quiz-site specific rules

**Definition of done:**
- [ ] Falco running as DaemonSet in `falco` namespace
- [ ] Default ruleset active
- [ ] Custom rule: alert if shell spawned in quiz-site container
- [ ] Verified: test alert fires when `kubectl exec` into quiz-site pod

---

## C3 — Kyverno Policy Enforcement

**What it is:**
Kyverno is a Kubernetes-native policy engine. It intercepts every resource creation/update request before it is accepted by the cluster and enforces custom rules that go beyond what PSA covers.

**Why it matters:**
PSA enforces pod security. Kyverno enforces business rules:
- Only images from your trusted registry allowed
- All images must have a Cosign signature
- No `latest` tag — must use explicit version
- All deployments must have required labels

This means Kubernetes itself rejects policy violations — not just your pipeline.

**Policies to implement:**

**Policy 1 — Trusted registry only**
Block any image not from `ghcr.io/rishabhyadavm07/`. Prevents accidental pulls from Docker Hub or untrusted sources.

**Policy 2 — Require Cosign signature**
Every image must have a valid Cosign signature before it can be deployed. Even if someone pushes a rogue image to GHCR manually, it cannot be deployed without the signature.

**Policy 3 — Block latest tag**
Reject any deployment using `:latest`. Forces explicit version or digest — ensures deployments are deterministic and auditable.

**Policy 4 — Require labels**
Every deployment must have `app` and `team` labels. Enables tracking, cost attribution, and incident response.

**Tools:** Kyverno, Helm

**Install commands:**
```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --create-namespace
```

**Files to create:**
- `k8s/kyverno/trusted-registry.yaml`
- `k8s/kyverno/require-cosign.yaml`
- `k8s/kyverno/block-latest-tag.yaml`
- `k8s/kyverno/require-labels.yaml`

**Definition of done:**
- [ ] Kyverno running in `kyverno` namespace
- [ ] All 4 policies active
- [ ] Verified: deployment from Docker Hub is rejected
- [ ] Verified: unsigned image is rejected
- [ ] Verified: `:latest` tag is rejected

---

## C4 — ArgoCD GitOps

**What it is:**
ArgoCD is a GitOps controller. It continuously watches your Git repository and syncs the cluster state to match exactly what is in `k8s/base/`. Any manual change to the cluster is detected as drift and can be auto-reverted.

**Why it matters:**
Currently you deploy with `kubectl apply` manually. Problems with this:
- No audit trail of who deployed what and when
- Cluster state can drift from the repo (someone runs `kubectl edit` directly)
- Rollback requires manual intervention

With ArgoCD:
- Every deployment is a git commit — full audit trail
- Manual cluster changes are flagged as "OutOfSync"
- Rollback = `git revert` + ArgoCD auto-applies

**Implementation:**
- Install ArgoCD via Helm to `argocd` namespace
- Create an `Application` resource pointing at `k8s/base/` in your GitHub repo
- ArgoCD watches the repo and applies on every change automatically
- Access the ArgoCD UI at `localhost:8080` via port-forward

**Install commands:**
```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace
```

**Files to create:**
- `k8s/argocd/application.yaml` — ArgoCD Application resource

**Definition of done:**
- [ ] ArgoCD running in `argocd` namespace
- [ ] ArgoCD Application synced to `k8s/base/`
- [ ] Status shows `Synced` and `Healthy`
- [ ] Verified: manual `kubectl edit` on deployment is detected as drift
- [ ] Verified: git commit to `k8s/base/` triggers automatic sync

---

## C5 — Prometheus + Grafana Observability

**What it is:**
Prometheus collects metrics from the cluster and pipeline. Grafana displays them as dashboards and fires alerts when thresholds are crossed.

**Why it matters:**
Security is not a one-time state — it is continuous. Without metrics you find out something is wrong when an incident happens, not before. Observability lets you see anomalies before they become incidents.

**What to monitor:**

| Metric | Why |
|--------|-----|
| Pod CPU/memory vs ResourceQuota | Spike = possible cryptomining or attack |
| Pod restart count | Crash loop = instability or attack |
| HTTP 5xx rate | Spike = app under attack or broken |
| Falco alert rate by severity | Spike = active attack or misconfiguration |
| ArgoCD sync status | OutOfSync = drift from expected state |
| Pipeline success/failure rate | Drop = broken security gate |

**Install commands:**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

**Files to create:**
- `k8s/monitoring/grafana-dashboard-security.json` — custom security dashboard

**Definition of done:**
- [ ] Prometheus running in `monitoring` namespace
- [ ] Grafana accessible at `localhost:3000` via port-forward
- [ ] Pre-built Kubernetes dashboards loading
- [ ] Custom security dashboard showing pod restarts, CPU/memory, Falco alert rate
- [ ] AlertManager configured: alert on pod crash loop

---

## C6 — GPG Signed Commits

**What it is:**
Every commit to `main` is cryptographically signed with your GPG private key. GitHub shows a "Verified" badge. Branch protection enforces that unsigned commits cannot be merged.

**Why it matters:**
Git does not verify identity. Anyone with your laptop or a stolen token can make commits that appear to be from you. GPG signing proves a commit came from your specific private key — not just your username.

**Enterprise context:**
At high-security organisations, the GPG private key lives on a hardware security key (YubiKey). Even if the machine is compromised, the attacker cannot sign commits without physical possession of the YubiKey.

**Implementation:**
```bash
gpg --full-generate-key
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
gpg --armor --export YOUR_KEY_ID
# Add public key to GitHub → Settings → SSH and GPG keys
```

Enable in GitHub branch protection: **Require signed commits** on `main`.

**Definition of done:**
- [ ] GPG key generated and added to GitHub
- [ ] `git config commit.gpgsign true` set globally
- [ ] All commits show "Verified" badge on GitHub
- [ ] Branch protection rule: require signed commits on `main`

---

## C7 — Incident Response Runbook

**What it is:**
A pre-written, step-by-step document covering exactly what to do when specific security events occur. Followed during an incident — no decisions needed under pressure.

**Scenarios to cover:**

| Trigger | First response |
|---------|---------------|
| TruffleHog/Gitleaks detects leaked secret | Revoke immediately, rotate, assess exposure |
| Trivy finds new CRITICAL CVE | Rebuild image, re-scan, re-deploy same day |
| Falco: shell spawned in container | Cordon node, capture forensics, kill pod |
| Cosign verification fails | Block deployment, audit GHCR access logs |
| ArgoCD shows cluster drift | Identify what changed, who changed it, revert |
| Pod crashes repeatedly | Check logs, check resource limits, check Falco |
| ResourceQuota near limit | Investigate cause — legitimate load or attack? |

**Files to create:**
- `docs/incident-response-runbook.md`

**Definition of done:**
- [ ] Runbook covers all 7 scenarios
- [ ] Each scenario has: trigger, immediate action, investigation steps, recovery steps, post-incident actions

---

## C8 — Monthly Security Checklist

**What it is:**
A recurring checklist of hygiene tasks to run every month to catch security drift before it becomes a problem.

**Checklist items:**
- [ ] Review all open Dependabot PRs — merge or dismiss with written reason
- [ ] Check GitHub Security tab — new Checkov/Trivy/Semgrep findings?
- [ ] Review Falco alert history — any patterns worth investigating?
- [ ] Check ResourceQuota usage — approaching limits?
- [ ] Review ArgoCD sync history — any unexplained drifts?
- [ ] Check Grafana dashboards — any anomalies in past 30 days?
- [ ] Review RBAC — any new ServiceAccounts created?
- [ ] Review GitHub Actions workflow permissions — any unnecessary `write` permissions?
- [ ] Rotate Cosign private key (every 12 months)
- [ ] Check branch protection rules — still enforced on main?
- [ ] Check GitHub Secret Scanning alerts — any new findings?
- [ ] Verify Falco is still running: `kubectl get pods -n falco`
- [ ] Verify ArgoCD is synced: check UI or `argocd app list`

**Files to create:**
- `docs/monthly-security-checklist.md`

**Definition of done:**
- [ ] Checklist document written
- [ ] First monthly review completed and documented

---

## Phase C — Completion Checklist

- [ ] C1: SBOM generated on every pipeline run
- [ ] C2: Falco running, custom rules active, test alert verified
- [ ] C3: Kyverno running, all 4 policies enforced and tested
- [ ] C4: ArgoCD synced to repo, drift detection verified
- [ ] C5: Prometheus + Grafana running, security dashboard active
- [ ] C6: GPG signing on all commits, branch protection enforced
- [ ] C7: Incident response runbook written and reviewed
- [ ] C8: Monthly checklist written, first run completed
