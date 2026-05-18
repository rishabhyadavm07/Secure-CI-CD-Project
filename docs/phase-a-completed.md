# Phase A — Completed

**Completed on:** 2026-05-18
**Goal:** Build a fully working end-to-end CI/CD pipeline. No security hardening yet — this is the intentionally insecure baseline that Phase B will harden layer by layer.

---

## What Was Built

A `git push` to `main` now:
1. Triggers GitHub Actions automatically
2. Builds a Docker image of the quiz-site app
3. Pushes the image to GHCR (GitHub Container Registry)
4. The image runs in a local Kubernetes cluster
5. The app is accessible in the browser at `http://localhost:30080`

---

## Steps Completed

### A1 — Environment Setup
- Kali Linux running on WSL2 (chosen over Ubuntu for security tooling ecosystem)
- Docker Desktop installed with WSL2 backend enabled
- Kubernetes enabled inside Docker Desktop
- VS Code with Remote-WSL extension
- Git configured inside WSL2 with SSH authentication to GitHub
- Project files stored inside the Linux filesystem for performance

### A2 — Application Containerised
- quiz-site (AZ-500 practice quiz — static HTML/JS) selected as the app
- Basic Dockerfile created at `docker/Dockerfile`
- Image builds and runs locally
- App confirmed working in browser at `http://localhost:80`

**Current Dockerfile (intentionally basic — hardened in Phase B):**
```dockerfile
FROM nginx:alpine
COPY quiz-site /usr/share/nginx/html
EXPOSE 80
```

Known issues left intentionally for Phase B:
- Runs as root
- Base image version unpinned
- No HEALTHCHECK
- OS packages unpatched
- No nginx security headers

### A3 — GitHub Actions: Security Scanning Workflows
Three workflows set up before the build pipeline:

| File | Purpose | Status |
|---|---|---|
| `.github/workflows/security.yml` | Basic smoke test — confirms pipeline triggers | Working |
| `.github/workflows/trufflehog.yml` | Secret scanning — scans full git history for leaked credentials | Working |
| `.github/workflows/semgrep.yml` | SAST — scans source code for vulnerabilities, uploads SARIF to GitHub Security tab | Working |

Pre-commit hook also installed locally:
- Gitleaks runs on every `git commit` and blocks commits containing secrets

### A4 — Docker Build and Push to GHCR
Created `.github/workflows/pipeline.yml`:
- Triggers on every push to `main`
- Logs in to GHCR using `GITHUB_TOKEN` (no stored credentials needed)
- Builds the Docker image
- Pushes two tags to GHCR:
  - `:latest` — for convenience
  - `:<git-sha>` — for exact traceability (which code produced which image)

**Image location:**
```
ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site:latest
```

Package visibility set to **public** so the local Kubernetes cluster can pull it without credentials. Phase B will cover private registries with `imagePullSecret`.

### A5 — Kubernetes Manifests Created
Three files created in `k8s/base/`:

**`namespace.yaml`** — Creates an isolated environment called `quiz-app` for the app to run in. Security policies in Phase B will be applied at this namespace level.

**`deployment.yaml`** — Tells Kubernetes to run one replica of the quiz-site container using the GHCR image. Intentionally has no security context, no resource limits, no probes — all added in Phase B.

**`service.yaml`** — Exposes the app on port `30080` of the local machine using `NodePort`. This is what makes `http://localhost:30080` work in the browser.

### A6 — App Deployed and Verified
Manifests applied manually from WSL2 terminal:
```bash
kubectl apply -f k8s/base/
```

**Live Kubernetes state at Phase A completion:**
```
NAME                             READY   STATUS    RESTARTS
pod/quiz-site-7c749998c7-4dsxc   1/1     Running   0

NAME                TYPE       CLUSTER-IP      PORT(S)
service/quiz-site   NodePort   10.110.77.38    80:30080/TCP

NAME                        READY   UP-TO-DATE   AVAILABLE
deployment.apps/quiz-site   1/1     1            1
```

App confirmed accessible at `http://localhost:30080`.

---

## Architecture at Phase A Completion

```
git push to main
        ↓
GitHub Actions triggered
        ↓
TruffleHog secret scan
Semgrep SAST scan
        ↓
Docker image built from docker/Dockerfile
        ↓
Image pushed to GHCR
ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site:latest
        ↓
(Manual) kubectl apply -f k8s/base/
        ↓
Kubernetes pulls image from GHCR
        ↓
Pod running in quiz-app namespace
        ↓
Accessible at http://localhost:30080
```

---

## What Is Intentionally Insecure (Phase B fixes these)

| Area | Current State | Risk |
|---|---|---|
| Dockerfile | Runs as root, unpinned base, no patching | Container escape = root access |
| GHCR image | No CVE scanning before push | Vulnerable packages ship to production |
| GHCR image | No signature | Anyone with write access can push a backdoored image |
| K8s deployment | No security context | Pod runs as root with full Linux capabilities |
| K8s deployment | No resource limits | One pod can starve the entire cluster |
| K8s deployment | No liveness/readiness probes | Kubernetes cannot detect or recover from app failures |
| Cluster networking | Default allow-all | A compromised pod can reach everything in the cluster |
| Pipeline | No policy enforcement | Developers can skip security controls manually |
| GitHub Actions | Permissions not fully locked down | Overly broad token access |

---

## Key Learnings from Phase A

**GHCR role:** The registry is the handoff point between build and deploy. Every environment (staging, production) pulls the same image from GHCR — guaranteeing what was tested is exactly what runs. It is also the highest-value attack target in the pipeline because whoever controls it controls what runs in production.

**Kubernetes core concepts:**
- **Namespace** — isolated environment, security policies scoped here
- **Deployment** — describes what to run and how many replicas
- **ReplicaSet** — created automatically by the Deployment, maintains the desired replica count
- **Pod** — the actual running container instance
- **Service (NodePort)** — routes external traffic to the pod

**Race condition encountered:** `kubectl apply -f k8s/base/` failed the first time because the Deployment was processed before the Namespace was fully registered. Second run succeeded. Real-world fix: apply `namespace.yaml` first, then the rest. Or use `kubectl wait` between steps.

---

## Files Created in Phase A

| File | Purpose |
|---|---|
| `docker/Dockerfile` | Container definition for quiz-site |
| `.github/workflows/security.yml` | Pipeline smoke test |
| `.github/workflows/trufflehog.yml` | CI secret scanning |
| `.github/workflows/semgrep.yml` | CI SAST scanning |
| `.github/workflows/pipeline.yml` | Docker build and push to GHCR |
| `k8s/base/namespace.yaml` | Kubernetes namespace |
| `k8s/base/deployment.yaml` | Kubernetes deployment |
| `k8s/base/service.yaml` | Kubernetes NodePort service |

---

## Next: Phase B

Phase B hardens everything built in Phase A, in this order:

1. **B1** — Lock GitHub Actions permissions + OIDC (no stored credentials)
2. **B2** — Custom Semgrep rules + branch protection
3. **B3** — Checkov IaC scanning (see every violation in the current Dockerfile and K8s YAML)
4. **B4** — Harden the Dockerfile (non-root, patched, pinned, health check)
5. **B5** — Trivy container scanning (gate on CRITICAL/HIGH CVEs)
6. **B6** — Cosign image signing (fix the GHCR attack scenario)
7. **B7** — Dependabot + SBOM
8. **B8** — Kubernetes security contexts
9. **B9** — Network policies
10. **B10** — OPA Gatekeeper policy enforcement
11. **B11** — Falco runtime security + Prometheus/Grafana
