# Phase C — Advanced Security Plan

> Builds on Phase B. All Phase B hardening must be complete before starting Phase C.
> Phase B completed: 2026-05-27.

---

## Overview

Phase C moves from **hardening** (making the system secure) to **observing and enforcing** (knowing when something goes wrong and preventing policy drift).

Phase B secured the pipeline and the cluster configuration.
Phase C secures **runtime behaviour**, **supply chain provenance**, and **operational visibility**.

---

## Tasks

---

### C1 — SBOM Generation (Software Bill of Materials)

**What:** Automatically generate a list of every package, library, and dependency inside the Docker image on every build.

**Why:** You cannot secure what you cannot see. An SBOM is the ingredient list for your container image. When a new CVE is published (e.g. a critical OpenSSL vulnerability), you can immediately check whether your image is affected without rebuilding or scanning — just query the SBOM.

**How:**
- Add `anchore/sbom-action` to `pipeline.yml` after the build step
- Output in SPDX or CycloneDX format (both industry standards)
- Attach SBOM as a build artifact to the GitHub Actions run
- Optionally: attach SBOM to the container image in GHCR alongside the Cosign signature

**Tools:** Syft (by Anchore), `anchore/sbom-action`

**Compliance relevance:** SBOM generation is required by US Executive Order 14028 (2021) for software sold to the US government. It is becoming standard in enterprise procurement requirements.

---

### C2 — Falco Runtime Security

**What:** Deploy Falco as a DaemonSet on the cluster. Falco watches every system call made by every container in real time and alerts when behaviour matches known attack patterns.

**Why:** All Phase B controls are preventive — they reduce the attack surface. But if an attacker finds a zero-day or misconfiguration we missed, we need to know within seconds, not hours. Falco is the detection layer.

**What Falco detects (examples):**
- Shell spawned inside a container (`/bin/sh`, `/bin/bash` executed)
- File written to a path that should be read-only
- Outbound network connection to an unexpected IP
- Privilege escalation attempt
- Sensitive file read (`/etc/passwd`, `/etc/shadow`)
- Crypto mining (connection to known mining pools)

**How:**
- Deploy Falco via Helm to a `falco` namespace (privileged — needs kernel access)
- Configure custom rules for quiz-site behaviour (nginx should never spawn a shell)
- Route alerts to stdout (visible in `kubectl logs`) and optionally to Slack/webhook

**Tools:** Falco, Helm, `falcosecurity/falco` Helm chart

---

### C3 — OPA / Kyverno Policy Enforcement

**What:** Deploy a policy engine that enforces custom rules across all Kubernetes resources at admission time — beyond what PSA covers.

**Why:** PSA enforces pod security. But it cannot enforce business rules like:
- "All images must come from `ghcr.io/rishabhyadavm07/` only (no pulling from Docker Hub)"
- "All deployments must have a `team` label"
- "Images must have a Cosign signature before they can be deployed"
- "No latest tag — all image references must use a digest or explicit version"

**Kyverno vs OPA/Gatekeeper:**
- **Kyverno** — Kubernetes-native, policies written in YAML, easier to start with
- **OPA Gatekeeper** — more powerful, policies written in Rego (a custom language), used in large enterprises

Recommendation: start with **Kyverno**.

**Policies to implement:**
1. Require images from trusted registry only (`ghcr.io/rishabhyadavm07/*`)
2. Require Cosign signature on all images
3. Require `team` and `app` labels on all deployments
4. Block `latest` tag on all images

**Tools:** Kyverno, Helm

---

### C4 — GitOps with ArgoCD

**What:** Replace `kubectl apply` with ArgoCD — a GitOps controller that continuously syncs the cluster state to what is defined in the Git repository.

**Why:** Currently you apply changes manually with `kubectl apply`. This means:
- There is no record of who applied what and when (outside of git commits)
- Cluster state can drift from the repo (someone runs `kubectl edit` directly)
- Rollbacks require manual intervention

With ArgoCD:
- The cluster automatically syncs to the git repo every few minutes
- Any manual change to the cluster is detected as "out of sync" and reverted
- Deployments are git commits — full audit trail, instant rollback via `git revert`
- You get a UI showing the health of every resource

**How:**
- Install ArgoCD via Helm to an `argocd` namespace
- Create an `Application` resource pointing to `k8s/base/` in your repo
- ArgoCD watches the repo and applies changes automatically on push

**Tools:** ArgoCD, Helm

---

### C5 — Prometheus + Grafana Observability

**What:** Deploy Prometheus (metrics collection) and Grafana (dashboards) to monitor the cluster and the quiz-site application.

**Why:** You cannot respond to incidents if you cannot see what is happening. Observability is also a security concern — unusual traffic spikes, error rate increases, and resource exhaustion are often the first signs of an attack.

**What to monitor:**
- Pod CPU and memory usage (against ResourceQuota limits from B13)
- HTTP request rate and error rate (via nginx metrics)
- Pod restart count (frequent restarts = crash loop or attack)
- Network traffic volume (spike could indicate data exfiltration)
- Kubernetes API server audit events

**How:**
- Deploy `kube-prometheus-stack` via Helm (includes Prometheus + Grafana + AlertManager + pre-built dashboards)
- Add nginx metrics exporter (`nginx-prometheus-exporter`) as a sidecar
- Configure AlertManager to send alerts on:
  - Pod crash loop
  - CPU/memory near quota limits
  - HTTP 5xx error rate above threshold

**Tools:** Prometheus, Grafana, AlertManager, `kube-prometheus-stack` Helm chart

---

### C6 — Signed Commits (Commit Signing)

**What:** Require all commits to `main` to be GPG-signed. GitHub shows a "Verified" badge on signed commits.

**Why:** Git does not verify identity. Anyone with write access (or who steals a token) can commit as any name and email. GPG signing cryptographically proves a commit came from a specific key, not just a specific username.

**How:**
- Generate a GPG key locally
- Add public key to GitHub account
- Configure `git config commit.gpgsign true` locally
- Enable "Require signed commits" in branch protection rules on `main`

**Tools:** GPG, GitHub branch protection

---

### C7 — Incident Response Runbook

**What:** Write a documented runbook covering what to do when specific security events occur.

**Why:** When an incident happens, you do not want to figure out the response in real time. A runbook is a pre-written checklist — follow the steps, contain the incident, recover, document.

**Scenarios to cover:**

| Trigger | Response steps |
|---------|---------------|
| Falco alerts: shell spawned in container | Cordon node, capture forensics, kill pod, rotate secrets |
| Trivy finds new CRITICAL CVE | Rebuild image, re-scan, re-deploy, update SBOM |
| TruffleHog finds leaked secret in commit | Revoke secret immediately, rotate, force-push or revert commit |
| Cosign verification fails in pipeline | Block deployment, investigate image provenance, audit GHCR access |
| Pod exceeds ResourceQuota | Investigate cause, check for crypto mining, scale if legitimate |
| ArgoCD shows cluster drift | Identify who changed what, revert to git state, investigate |

**Output:** `docs/incident-response-runbook.md`

---

### C8 — Monthly Security Review Checklist

**What:** A documented checklist to run every month to catch security drift.

**Items:**
- Review all Dependabot PRs — merge or dismiss with reason
- Check GitHub Security tab for new Checkov and Trivy findings
- Review Falco alert history for unusual patterns
- Check ResourceQuota usage — are we approaching limits?
- Rotate Cosign private key (annually)
- Review RBAC — any new ServiceAccounts created?
- Review branch protection rules — still enforced?
- Check for unused secrets in GitHub Secrets
- Review ArgoCD sync history — any unexplained drifts?

**Output:** `docs/monthly-security-checklist.md`

---

## Recommended Order

| Order | Task | Effort | Value |
|-------|------|--------|-------|
| 1 | C1 — SBOM Generation | Low | High — supply chain visibility |
| 2 | C6 — Signed Commits | Low | Medium — identity assurance |
| 3 | C3 — Kyverno Policies | Medium | High — enforces image trust |
| 4 | C2 — Falco | Medium | High — runtime detection |
| 5 | C4 — ArgoCD | Medium | High — GitOps + drift prevention |
| 6 | C5 — Prometheus + Grafana | High | High — observability |
| 7 | C7 — Incident Response Runbook | Low | High — operational readiness |
| 8 | C8 — Monthly Checklist | Low | Medium — ongoing hygiene |

**Start with C1** — it's a single GitHub Actions step, takes 30 minutes, and immediately gives you supply chain visibility.

---

## What Phase C Completes

At the end of Phase C, the project will demonstrate:

- **Prevent** — hardened images, network policies, PSA, RBAC, resource limits, policy enforcement
- **Detect** — Falco runtime alerts, Prometheus anomaly monitoring, audit logs
- **Respond** — documented runbooks, ArgoCD rollback, incident checklists
- **Prove** — SBOMs, Cosign signatures, signed commits, SARIF findings in Security tab

This covers the full DevSecOps lifecycle and maps directly to the CI/CD Security guide shared at the start of Phase C.
