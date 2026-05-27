# Secure CI/CD Pipeline — Progress Tracker

_Last updated: 2026-05-27_

---

## Project Goal

Build a production-grade, fully documented DevSecOps pipeline demonstrating:
- Shift-left security (catch issues at commit time)
- Automated security scanning at every layer
- Supply chain integrity (signed, attested, provenance-tracked artefacts)
- Kubernetes hardening from pod to namespace to cluster
- Runtime threat detection and observability
- Secrets management with a dedicated vault
- Compliance against CIS, NSA/CISA, and OWASP standards

---

## Overall Status

| Phase | Theme | Status |
|-------|-------|--------|
| A | Build the pipeline | ✅ Complete |
| B | Secure the pipeline + Kubernetes | ✅ Complete |
| C | Detection, enforcement, GitOps | ⏳ Not started |
| D | Secrets management | ⏳ Not started |
| E | Advanced supply chain security | ⏳ Not started |
| F | Compliance + final hardening | ⏳ Not started |
| G | Jenkins CI/CD (enterprise alternative pipeline) | ⏳ Not started |

---

## Phase A — Complete

Built the foundation: working CI/CD pipeline, containerised application, Kubernetes deployment.

| Task | Description | Status |
|------|-------------|--------|
| A1 | Environment setup (WSL2 Kali, Docker Desktop, VS Code) | ✅ |
| A2 | quiz-site application containerised with nginx | ✅ |
| A3 | GitHub repository + SSH authentication | ✅ |
| A4 | GitHub Actions pipeline — build and push to GHCR | ✅ |
| A5 | Kubernetes deployment on Docker Desktop | ✅ |

---

## Phase B — Complete

Secured the pipeline and hardened the Kubernetes cluster.

### Part 1 — Pipeline Security

| Task | Description | Status |
|------|-------------|--------|
| B1 | Gitleaks pre-commit hook (local secret detection) | ✅ |
| B2 | TruffleHog CI secret scanning | ✅ |
| B3 | Semgrep SAST with custom rules | ✅ |
| B4 | Checkov IaC scanning (Dockerfile + k8s) | ✅ |
| B4b | Hardened Dockerfile (non-root, nginx:1.31-alpine, port 8080) | ✅ |
| B5 | Trivy container CVE scanning (blocks on CRITICAL/HIGH) | ✅ |
| B6 | Cosign image signing (key-based) | ✅ |
| B7 | Dependabot (Docker + GitHub Actions, weekly) | ✅ |

### Part 2 — Kubernetes Hardening

| Task | Description | Status |
|------|-------------|--------|
| B8 | Security contexts (non-root, read-only FS, drop ALL caps, seccomp) | ✅ |
| B9 | Network policies (default deny-all, allow port 8080) | ✅ |
| B10 | RBAC (dedicated ServiceAccount, no token mount) | ✅ |
| B11 | Checkov k8s SARIF upload to GitHub Security tab | ✅ |
| B12 | Pod Security Admission (enforce: restricted) | ✅ |
| B13 | ResourceQuota + LimitRange | ✅ |

---

## Phase C — Detection, Enforcement, GitOps

**Theme:** Know when something goes wrong. Prevent policy drift.
**Detail:** See `docs/phase-c-plan.md`

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| C1 | SBOM generation (Syft/anchore-action) | Low | ⏳ |
| C2 | Falco runtime threat detection | Medium | ⏳ |
| C3 | Kyverno policy enforcement (trusted registry, signed images, no latest) | Medium | ⏳ |
| C4 | ArgoCD GitOps (auto-sync cluster to git, drift detection) | Medium | ⏳ |
| C5 | Prometheus + Grafana observability | High | ⏳ |
| C6 | GPG signed commits + branch protection enforcement | Low | ⏳ |
| C7 | Incident response runbook | Low | ⏳ |
| C8 | Monthly security checklist | Low | ⏳ |

---

## Phase D — Secrets Management

**Theme:** Secrets never live in git, plain env vars, or unencrypted cluster storage.
**Detail:** See `docs/phase-d-plan.md`

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| D1 | GitHub push protection (block secrets before they land in git) | Low | ⏳ |
| D2 | Kubernetes Secrets encryption at rest (etcd) | Low | ⏳ |
| D3 | External Secrets Operator (pull secrets from vault into cluster) | Medium | ⏳ |
| D4 | HashiCorp Vault (dedicated secrets engine, dynamic secrets, audit log) | High | ⏳ |
| D5 | Secret rotation (all existing secrets rotated, procedure documented) | Medium | ⏳ |

---

## Phase E — Advanced Supply Chain Security

**Theme:** Every artefact has a verifiable, tamper-proof chain of custody.
**Detail:** See `docs/phase-e-plan.md`

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| E1 | Digest pinning (Dockerfile, k8s deployment, GitHub Actions) | Low | ⏳ |
| E2 | SLSA Level 1 provenance attestation | Medium | ⏳ |
| E3 | Cosign keyless signing (OIDC, replace key-based) | Medium | ⏳ |
| E4 | SBOM attestation (attach SBOM to image in GHCR) | Low | ⏳ |

---

## Phase F — Compliance & Final Hardening

**Theme:** Verify against industry benchmarks. Document everything.
**Detail:** See `docs/phase-f-plan.md`

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| F1 | kube-bench CIS Kubernetes Benchmark | Medium | ⏳ |
| F2 | Trivy compliance scanning (NSA/CISA, CIS Docker) | Low | ⏳ |
| F3 | Remove Checkov soft_fail (hard gate on IaC violations) | Low | ⏳ |
| F4 | Final security posture report (all controls, framework mappings) | Medium | ⏳ |

---

## Security Controls Summary (Phase A + B complete)

```
Developer workstation
  ├── Gitleaks pre-commit hook
  └── GPG commit signing (Phase C)

GitHub push → main (branch protected, PRs required)
  ├── TruffleHog — secret scanning
  ├── Semgrep — SAST with custom rules
  └── Checkov — IaC scanning (Dockerfile + k8s manifests)
        ↓ all pass
  Docker build (hardened nginx:1.31-alpine, non-root, port 8080)
        ↓
  Trivy — CVE scan (blocks CRITICAL/HIGH)
        ↓ passes
  Push to GHCR
  Cosign sign + verify
  Dependabot watching for updates weekly

Kubernetes cluster (Docker Desktop)
  Namespace: quiz-app
    ├── Pod Security Admission: restricted enforced
    ├── ResourceQuota: 5 pods, 500m CPU, 640Mi memory
    ├── LimitRange: default and max per-container limits
    ├── NetworkPolicy: default deny-all, allow port 8080 inbound only
    ├── RBAC: dedicated ServiceAccount, no API permissions, no token
    └── Deployment:
          ├── runAsNonRoot: true (UID 101)
          ├── readOnlyRootFilesystem: true
          ├── capabilities: drop ALL
          ├── allowPrivilegeEscalation: false
          └── seccompProfile: RuntimeDefault
```

---

## Planned Full Architecture (Phase F complete)

```
Developer workstation
  ├── Gitleaks pre-commit
  ├── GPG signed commits
  └── Local Semgrep

Source control (GitHub)
  ├── Branch protection + required reviews
  ├── Secret scanning + push protection
  └── Dependabot

CI/CD Pipeline (GitHub Actions)
  ├── TruffleHog secret scan
  ├── Semgrep SAST
  ├── Checkov IaC scan (hard gate)
  ├── Trivy CVE scan (hard gate)
  ├── Trivy compliance scan
  ├── SBOM generation
  └── Cosign keyless signing + SLSA provenance

Container Registry (GHCR)
  └── Image with: signature, SBOM attestation, provenance attestation

Secrets (HashiCorp Vault)
  └── External Secrets Operator syncs to cluster

Kubernetes cluster
  ├── Kyverno: policy enforcement (trusted registry, signed images)
  ├── ArgoCD: GitOps sync (drift detection + auto-remediation)
  ├── Falco: runtime threat detection
  ├── Prometheus + Grafana: observability + alerting
  └── quiz-app namespace (all Phase B hardening)

Compliance
  ├── CIS Kubernetes Benchmark (kube-bench)
  ├── NSA/CISA K8s Hardening Guide (Trivy compliance)
  └── Security posture report (OWASP, CIS, NIST mapped)
```

---

## Phase G — Jenkins CI/CD (Enterprise Alternative Pipeline)

**Theme:** Same DevSecOps pipeline in Jenkins — platform-agnostic security skills.
**Detail:** See `docs/phase-g-plan.md`

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| G1 | Deploy Jenkins in Kubernetes (Helm, persistent volume) | Medium | ⏳ |
| G2 | Jenkinsfile — TruffleHog, Semgrep, Checkov, Trivy, Cosign | Medium | ⏳ |
| G3 | Kubernetes plugin — ephemeral pod agents with Kaniko | Medium | ⏳ |
| G4 | Vault plugin — all secrets pulled from HashiCorp Vault | Medium | ⏳ |
| G5 | Shared Library — reusable security scan steps across repos | High | ⏳ |

---

## Key Learnings Log

| Phase | Learning |
|-------|---------|
| B5 | SARIF upload blocked on PRs — use `github.event_name == 'push'` |
| B6 | Cosign key-based: always `--tlog-upload=false --insecure-ignore-tlog` |
| B6 | Use `git pull --rebase`, never "Update branch" button on GitHub |
| B8 | nginx user UID/GID is 101; container port is 8080 not 80 |
| B8 | `readOnlyRootFilesystem: true` needs emptyDir for `/var/cache/nginx`, `/var/run`, `/tmp` |
| B8 | Do NOT put `user nginx;` in nginx.conf |
| B12 | `restricted` PSA requires `seccompProfile: RuntimeDefault` — not just security contexts |
