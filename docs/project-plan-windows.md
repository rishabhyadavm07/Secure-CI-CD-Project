# Secure CI/CD Pipeline — Windows 11 Project Plan

**Platform:** Windows 11 + WSL2 (Kali Linux) + Docker Desktop
**Duration:** 6–8 weeks
**Strategy:** Build a working pipeline first. Then secure it, layer by layer.

---

## How to Read This Plan

Every major step in the Securing phase (Phase B) answers four questions:

1. **What is the vulnerability?** — What can go wrong without this control?
2. **Why this specific tool?** — What makes it the right choice here, and what are the trade-offs?
3. **What do real enterprises use?** — What you would find at AWS, Google, banks, or large SaaS companies.
4. **What can be improved?** — The enterprise upgrade path beyond what we are building here.

This structure teaches you to think like a security engineer, not just a tool operator.

---

## Project Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Windows 11 Development Machine                │
│                                                            │
│  VS Code (Remote WSL)  ←→  Kali Linux WSL2                │
│                                  ↓                         │
│                         Docker Desktop                     │
│                         (Build + K8s)                      │
└────────────────────────────────────────────────────────────┘
                              ↓ git push
┌────────────────────────────────────────────────────────────┐
│                        GitHub                              │
│                                                            │
│  Repository → GitHub Actions → GHCR (image registry)      │
│  Security Tab ← SARIF uploads from all scan tools         │
└────────────────────────────────────────────────────────────┘
                              ↓ kubectl apply
┌────────────────────────────────────────────────────────────┐
│           Kubernetes (Docker Desktop local)                │
│                                                            │
│  Namespace → Deployment → Service → NetworkPolicy         │
│  OPA Gatekeeper (admission) + Falco (runtime)             │
│  Prometheus + Grafana (observability)                      │
└────────────────────────────────────────────────────────────┘
```

---

## Progress Tracker

| Phase | Step | Status |
|---|---|---|
| **Phase A** | A1: Environment setup | Done |
| **Phase A** | A2: Containerise application | Done (basic Dockerfile) |
| **Phase A** | A3: GitHub Actions basic pipeline | Partial — no build/push yet |
| **Phase A** | A4: Docker build + push to GHCR | Not started |
| **Phase A** | A5: Kubernetes manifests (basic, insecure) | Not started |
| **Phase A** | A6: Deploy to K8s in pipeline | Not started |
| **Phase B** | B1a: Gitleaks pre-commit hook | Done |
| **Phase B** | B1b: TruffleHog CI workflow | Done |
| **Phase B** | B1c: Minimum GitHub Actions permissions | Not started |
| **Phase B** | B1d: OIDC (no long-lived credentials) | Not started |
| **Phase B** | B2: Semgrep SAST + custom rules + SARIF | Done |
| **Phase B** | B2: Branch protection rules | Not started |
| **Phase B** | B3: Checkov IaC scanning | Not started |
| **Phase B** | B4: Harden Dockerfile | Not started |
| **Phase B** | B5: Trivy container scanning | Not started |
| **Phase B** | B6: Cosign image signing | Not started |
| **Phase B** | B7: Dependabot + SBOM | Not started |
| **Phase B** | B8: K8s security contexts | Not started |
| **Phase B** | B9: Network policies | Not started |
| **Phase B** | B10: OPA Gatekeeper | Not started |
| **Phase B** | B11: Falco runtime security | Not started |
| **Phase B** | B11: Prometheus + Grafana | Not started |
| **Phase B** | B12: Full pipeline gates enforced | Not started |
| **Phase B** | B13: GitHub security settings + signed commits | Not started |

---

---

## Phase A — Build the Working Pipeline

> Goal: A `git push` triggers GitHub Actions, builds a Docker image, pushes it to a registry, and deploys it to Kubernetes. The app runs and is accessible in the browser. Nothing is hardened yet — that is intentional.

---

### A1 — Environment Setup

**What and why:** WSL2 gives you a real Linux kernel on Windows. Kali Linux is chosen over Ubuntu because it ships with security tooling pre-installed and aligns with offensive and defensive security workflows. Docker Desktop uses the WSL2 backend — builds inside WSL2 are 10x faster than building on the Windows filesystem (`/mnt/c/`).

**Tasks:**
- WSL2 installed, Kali Linux distro configured
- Create `C:\Users\YOUR_NAME\.wslconfig`:
  ```ini
  [wsl2]
  memory=8GB
  processors=4
  swap=4GB
  localhostForwarding=true
  ```
- Docker Desktop: WSL2 backend enabled, Kubernetes enabled
- VS Code with Remote-WSL extension installed
- Git configured in WSL2, SSH auth to GitHub configured

**Verify:**
```bash
docker run hello-world
kubectl cluster-info
git --version
```

---

### A2 — Containerise the Application

**What and why:** The quiz-site is a static HTML/JS app. We containerise it so it runs identically everywhere — local machine, CI pipeline, Kubernetes. The Dockerfile at this stage is deliberately simple and insecure. This is your "before" state — when Trivy scans it in Phase B you will see every CVE and misconfiguration listed out.

**`docker/Dockerfile` (Phase A — intentionally basic):**
```dockerfile
FROM nginx:alpine
COPY quiz-site /usr/share/nginx/html
EXPOSE 80
```

What is wrong with this (every item gets fixed in Phase B):
- `nginx:alpine` is unpinned — a different image may be pulled next week
- Runs as root — any container escape gives attacker root access to the host
- Port 80 requires root to bind
- No HEALTHCHECK — Kubernetes cannot tell if the app is working
- No package updates — vulnerable OS packages baked in
- No security headers in nginx config

**Verify:**
```bash
docker build -t quiz-site:local -f docker/Dockerfile .
docker run -d -p 80:80 quiz-site:local
# Open http://localhost in browser — confirm quiz loads
docker stop $(docker ps -q)
```

---

### A3 — GitHub Actions: Build and Push to GHCR

**What and why:** Manual deployments are error-prone, slow, and unauditable. GitHub Actions automates the build and deploy cycle with a full audit log of every run. At this stage the pipeline builds the image and pushes it — no security gates yet.

**Why GHCR (GitHub Container Registry)?**
- Free for public repos
- No extra account or secrets needed — `GITHUB_TOKEN` is sufficient
- Image permissions automatically tied to the repository's access controls
- Alternatives: Docker Hub (requires account + secret), AWS ECR (requires AWS account)

**`.github/workflows/pipeline.yml`:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build Docker image
        run: docker build -t quiz-site:${{ github.sha }} -f docker/Dockerfile .

      - name: Push to GHCR
        run: |
          docker tag quiz-site:${{ github.sha }} ghcr.io/${{ github.repository }}/quiz-site:${{ github.sha }}
          docker tag quiz-site:${{ github.sha }} ghcr.io/${{ github.repository }}/quiz-site:latest
          docker push ghcr.io/${{ github.repository }}/quiz-site:${{ github.sha }}
          docker push ghcr.io/${{ github.repository }}/quiz-site:latest
```

---

### A4 — Kubernetes Manifests (Basic, Intentionally Insecure)

**What and why:** These manifests get the app running in Kubernetes. They are intentionally missing security controls — no security context, no resource limits, no network policies. This is your "before" state. When Checkov scans these in Phase B, it will list every CIS benchmark violation. You will fix them one by one and understand why each fix matters.

**`k8s/base/namespace.yaml`:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: quiz-app
```

**`k8s/base/deployment.yaml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quiz-site
  namespace: quiz-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: quiz-site
  template:
    metadata:
      labels:
        app: quiz-site
    spec:
      containers:
        - name: quiz-site
          image: ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO/quiz-site:latest
          ports:
            - containerPort: 80
```

**`k8s/base/service.yaml`:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: quiz-site
  namespace: quiz-app
spec:
  selector:
    app: quiz-site
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
  type: NodePort
```

---

### A5 — Add Deploy Step to GitHub Actions

Add a `deploy` job to `pipeline.yml` after the `build` job:

```yaml
  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Apply Kubernetes manifests
        run: kubectl apply -f k8s/base/

      - name: Update deployment image
        run: |
          kubectl set image deployment/quiz-site \
            quiz-site=ghcr.io/${{ github.repository }}/quiz-site:${{ github.sha }} \
            -n quiz-app

      - name: Wait for rollout
        run: kubectl rollout status deployment/quiz-site -n quiz-app --timeout=120s
```

---

### A6 — Phase A Complete: Verify End-to-End

Phase A is done when all of the following are true:

- [ ] `git push` to main triggers the GitHub Actions pipeline automatically
- [ ] GitHub Actions builds the Docker image
- [ ] Image is pushed to GHCR (visible at `github.com/YOUR_USERNAME/REPO/pkgs/container/quiz-site`)
- [ ] App is deployed to Kubernetes
- [ ] App is accessible at `http://localhost:30080`
- [ ] `kubectl get pods -n quiz-app` shows the pod Running

**At this point you have a working, fully automated pipeline. It is also completely insecure. Phase B fixes that, one layer at a time.**

---

---

## Phase B — Secure the Pipeline

> For every section: understand the vulnerability first. Then implement the fix. The before/after difference is the learning.

---

### B1 — Secrets and Authentication

#### The Vulnerability

Secrets (API keys, passwords, tokens) committed to Git are permanent. Even if you delete the file, the secret exists in git history forever and can be recovered with `git log`. In 2022, Toyota accidentally pushed an AWS access key to a public GitHub repo — 300,000 customer records were exposed for nearly five years before discovery.

The second problem: GitHub Actions workflows often have overly broad token permissions. A compromised workflow step or malicious dependency can use `GITHUB_TOKEN` with write access to push code, create releases, or tamper with the repository.

---

#### B1a — Local Secret Detection: Gitleaks Pre-commit Hook

**Why Gitleaks for local, not TruffleHog?**

| | Gitleaks | TruffleHog |
|---|---|---|
| Speed | Near-instant | 3–10 seconds per run |
| Detection method | Pattern matching on staged files | Calls real APIs to verify the secret is live |
| False positive rate | Higher | Much lower in verified-only mode |
| Best for | Pre-commit hook (speed matters for developer experience) | CI/CD deep scan (speed less critical) |

A pre-commit hook that takes 10 seconds per commit gets disabled. Gitleaks is fast enough to be invisible to the developer.

**`.git/hooks/pre-commit`:**
```bash
#!/bin/bash
echo "Scanning for secrets..."
gitleaks protect --staged --no-banner -v
if [ $? -ne 0 ]; then
  echo "SECRET DETECTED — commit blocked. Remove the secret and try again."
  exit 1
fi
exit 0
```

```bash
chmod +x .git/hooks/pre-commit
```

**Test it:**
```bash
echo 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' > test.txt
git add test.txt
git commit -m "test"
# Should be blocked with "SECRET DETECTED"
git reset HEAD test.txt && rm test.txt
```

---

#### B1b — CI Secret Detection: TruffleHog

**Why TruffleHog for CI?**

TruffleHog in `--only-verified` mode calls the real APIs (GitHub, AWS, Stripe, etc.) to confirm a detected credential is active. This eliminates false positives — you only get an alert when the secret is real and working. It also scans the full git history, not just the latest commit. A key committed six months ago and then deleted in a later commit is still there in history — TruffleHog finds it.

**`.github/workflows/trufflehog.yml`:**
```yaml
name: Secret Scanning

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for comprehensive scan

      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

---

#### B1c — Minimum GitHub Actions Permissions

By default, GitHub Actions gives every workflow write access to the repository. Lock every workflow to the minimum it needs.

Add to the top-level of every workflow file:
```yaml
permissions:
  contents: read
```

Then add back only what the specific job needs:
- Workflows that upload SARIF: `security-events: write`
- Workflows that push to GHCR: `packages: write`
- Workflows that use OIDC: `id-token: write`

**Why this matters:** If a supply chain attack compromises a GitHub Action you use (e.g., a malicious version of `actions/checkout`), minimal permissions limit what the attacker can do. They cannot push code, create releases, or read your secrets.

---

#### B1d — No Long-Lived Credentials: OIDC

Instead of storing cloud credentials as GitHub Secrets (which never expire), use OIDC (OpenID Connect). GitHub Actions can prove its identity to AWS, Azure, or GCP without a stored secret. The cloud provider issues a short-lived token just for that job run — it expires when the job ends.

```yaml
- name: Configure AWS credentials via OIDC
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1
```

No secret stored anywhere. No rotation needed. Automatically scoped to the specific GitHub repo and branch.

**What real enterprises use:** HashiCorp Vault for dynamic secrets that are generated per-job and expire after use. AWS IAM roles with OIDC federation. Google Workload Identity Federation. Azure Managed Identities. The pattern is always: short-lived credentials, minimal scope, automatic expiry, no human-readable secrets stored anywhere.

**What can be improved:** Add `.trufflehogignore` for documented false positives. Implement secret rotation schedules with automated reminders. Use GitHub Environments with required reviewers before secrets are injected into workflows.

---

### B2 — Code Security: SAST with Semgrep

#### The Vulnerability

Source code contains patterns that lead to vulnerabilities — SQL injection, XSS, command injection, weak cryptography — that only become exploitable at runtime. Finding these issues in production costs 30x more than finding them at commit time. SAST (Static Application Security Testing) finds them by analysing code without running it.

**Why Semgrep (not SonarQube or CodeQL)?**

| Tool | Pros | Cons | Best for |
|---|---|---|---|
| Semgrep | Fast, custom rules in readable YAML, free OSS | Fewer built-in rules than commercial tools | Open source, custom detection needs |
| SonarQube | Comprehensive, great UX, IDE integration | Self-hosted is complex, cloud is expensive | Enterprise teams with budget |
| CodeQL | Very deep analysis, GitHub-native | Slow (10–30 min per run), limited languages | Critical repositories needing depth |
| Snyk Code | PR comments, fix suggestions, good UX | Paid for teams | Teams wanting turn-key SAST |

Semgrep is right here because it is free, fast in CI, and the custom rule syntax is simple enough that you can write a new rule in 10 minutes. You understand exactly what is being detected because you wrote it.

**`.semgrep.yml` (custom rules):**
```yaml
rules:
  - id: no-eval
    pattern: eval($X)
    message: "eval() is dangerous — user input can execute arbitrary code."
    severity: ERROR
    languages: [javascript]
    metadata:
      cwe: "CWE-95"

  - id: no-innerhtml
    pattern: $EL.innerHTML = $INPUT
    message: "innerHTML can introduce XSS. Use textContent or sanitise with DOMPurify."
    severity: WARNING
    languages: [javascript]
    metadata:
      cwe: "CWE-79"

  - id: hardcoded-credential
    patterns:
      - pattern: $VAR = "..."
      - metavariable-regex:
          metavariable: $VAR
          regex: (password|passwd|secret|api_key|apikey|token|credential)
    message: "Potential hardcoded credential. Use environment variables or a secrets manager."
    severity: ERROR
    languages: [javascript, python]
    metadata:
      cwe: "CWE-798"

  - id: weak-random
    pattern: Math.random()
    message: "Math.random() is not cryptographically secure. Use crypto.getRandomValues() for security-sensitive operations."
    severity: WARNING
    languages: [javascript]
    metadata:
      cwe: "CWE-338"

  - id: debug-console-log
    pattern: console.log($X)
    message: "Remove console.log before production — may expose sensitive data in browser DevTools."
    severity: INFO
    languages: [javascript]
```

**`.github/workflows/semgrep.yml`:**
```yaml
name: SAST — Semgrep

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  security-events: write

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: returntocorp/semgrep

    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep
        run: |
          semgrep scan \
            --config=auto \
            --config=.semgrep.yml \
            --sarif \
            --output=semgrep.sarif \
            --metrics=off

      - name: Upload to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: semgrep.sarif
        if: always()
```

**What SARIF does:** SARIF (Static Analysis Results Interchange Format) is a standard JSON format that GitHub's Security tab understands. Every tool in this pipeline uploads SARIF — so all findings from Semgrep, Trivy, and Checkov appear in one place (Repository → Security → Code Scanning), regardless of which tool found them.

#### Branch Protection (Process Security)

No tool catches everything. Process controls add a human layer on top of automation.

GitHub → Repository Settings → Branches → Add rule for `main`:
- Require pull request before merging (minimum 1 approval)
- Require status checks to pass before merging (select: Semgrep, TruffleHog)
- Require branches to be up to date before merging
- Do not allow bypassing the above settings (including admins)

**What real enterprises use:** SonarQube quality gates that block merges below a defined security rating. CodeQL for deep analysis on repositories with elevated risk. IBM AppScan or Veracode for compliance-driven SAST with formal audit reports required by regulators.

**What can be improved:** Add Semgrep to the pre-commit hook alongside Gitleaks for instant local SAST feedback. Configure the pipeline to block only on ERROR severity, and allow WARNING with a notification. Add Semgrep's GitHub integration to post findings as PR review comments.

---

### B3 — Infrastructure Security: Checkov IaC Scanning

#### The Vulnerability

Infrastructure as Code (Dockerfile, Kubernetes YAML) contains security misconfigurations that are invisible to application SAST tools. A Dockerfile that runs as root, a Kubernetes deployment with no resource limits, a pod with `privileged: true` — all of these pass code review and automated testing but create serious holes at runtime.

**Why Checkov?**

| Tool | Scans | Best for |
|---|---|---|
| Checkov | Dockerfile, K8s, Terraform, CloudFormation, GitHub Actions | One tool for all IaC — best breadth |
| kube-score | Kubernetes YAML only | K8s-focused teams |
| Trivy | Dockerfile misconfigs + CVEs | Already in the stack — overlap with B5 |
| tfsec | Terraform only | Terraform-heavy teams |

Checkov wins here because one command scans all your IaC types. It maps findings to CIS benchmarks and common security standards.

**Add to the Semgrep workflow or create `checkov.yml`:**
```yaml
  checkov:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov on Dockerfile
        uses: bridgecrewio/checkov-action@master
        with:
          file: docker/Dockerfile
          framework: dockerfile
          output_format: sarif
          output_file_path: checkov-docker.sarif
          soft_fail: true

      - name: Run Checkov on Kubernetes manifests
        uses: bridgecrewio/checkov-action@master
        with:
          directory: k8s/
          framework: kubernetes
          output_format: sarif
          output_file_path: checkov-k8s.sarif
          soft_fail: true

      - name: Upload results
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: checkov-docker.sarif
        if: always()
```

**What Checkov will flag on your Phase A Dockerfile:**
- `CKV_DOCKER_2` — No HEALTHCHECK defined
- `CKV_DOCKER_3` — Container does not run as a non-root user
- `CKV_DOCKER_7` — Base image version not pinned

**What Checkov will flag on your Phase A K8s manifests:**
- `CKV_K8S_8` — No liveness probe
- `CKV_K8S_9` — No readiness probe
- `CKV_K8S_11` — No CPU limits
- `CKV_K8S_12` — No memory limits
- `CKV_K8S_14` — Container can run as root
- `CKV_K8S_20` — Privilege escalation not disabled
- `CKV_K8S_28` — Capabilities not dropped
- `CKV_K8S_30` — Root filesystem not read-only

Each violation is a real finding you will fix in later steps. Running Checkov on the insecure Phase A manifests first is the learning exercise.

**What real enterprises use:** Prisma Cloud (commercial, built on Checkov) for cloud-native visibility across AWS, Azure, and GCP. Snyk IaC for teams already using Snyk. Terraform Sentinel for policy enforcement in Terraform Cloud.

---

### B4 — Container Hardening: Securing the Dockerfile

#### The Vulnerability

Your Phase A Dockerfile runs as root. If the application is exploited (path traversal, RCE, dependency vulnerability), the attacker operates as root inside the container. Container escapes are rare but more dangerous from root. A minimal, patched, non-root image significantly reduces blast radius.

**`docker/Dockerfile` (replace the Phase A version):**
```dockerfile
FROM nginx:1.25-alpine

# Patch all OS packages — eliminates known CVEs present in the base image
RUN apk update && \
    apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user — nginx specifically needs UID 101
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx || true

# Custom nginx config with security headers
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy application
COPY quiz-site /usr/share/nginx/html

# Set ownership so the non-root user can serve files and write logs
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Drop to non-root — all subsequent operations and the running process use this user
USER nginx

# 8080 is unprivileged (above 1024) — no root required
EXPOSE 8080

# Kubernetes uses this to decide if the pod is healthy and ready for traffic
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**`docker/nginx.conf`:**
```nginx
user nginx;
worker_processes auto;
pid /var/run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    server_tokens off;  # Do not reveal nginx version in response headers

    # Browser security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;

    sendfile on;
    keepalive_timeout 65;

    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~ /\. {
            deny all;
        }
    }
}
```

**What changes and why:**

| Change | Phase A | Phase B | Why it matters |
|---|---|---|---|
| Base image pinning | `nginx:alpine` | `nginx:1.25-alpine` | Reproducible builds; no surprise upstream changes |
| OS packages | Unpatched at image creation | `apk upgrade` on every build | Removes CVEs present in the base image |
| Running user | root (UID 0) | nginx (UID 101) | Container escape gives limited user account, not host root |
| Port | 80 (requires root to bind) | 8080 (unprivileged) | Non-root process can bind without special privileges |
| Health check | None | HEALTHCHECK defined | Kubernetes can restart unhealthy pods automatically |
| Server header | nginx version exposed | `server_tokens off` | Attackers cannot target specific nginx CVE versions |
| Security headers | None | X-Frame, CSP, etc. | Browser-level protection against XSS, clickjacking, MIME sniffing |

**What real enterprises use:** Distroless images (no shell, no package manager — nothing to attack). Chainguard images (hardened, CVE-free Alpine alternatives). Automated base image updates via Renovate or Dependabot so CVEs are patched within hours of disclosure, not months.

---

### B5 — Container Scanning: Trivy

#### The Vulnerability

Your container image contains an operating system and nginx — both with published CVEs in public vulnerability databases. Without scanning, you push and deploy an image containing known, patchable vulnerabilities. An attacker who reaches the container layer can exploit those CVEs to escalate privileges or move laterally within the cluster.

**Why Trivy (not Snyk Container or Grype)?**

| Tool | Strengths | Weaknesses | Best for |
|---|---|---|---|
| Trivy | Scans OS CVEs + app deps + Dockerfile misconfigs + K8s misconfigs, fast, free, offline mode | Fewer integrations than commercial | Open source, one-tool breadth |
| Snyk Container | PR comments, developer UX, auto fix PRs | Paid for teams, rate limited on free | Teams wanting developer-facing UX |
| Grype | Fast, good SBOM integration | Fewer language ecosystems | SBOM-focused workflows |
| AWS ECR scanning | Built-in if using ECR | Only works in AWS ECR | AWS-native teams |

Trivy handles container CVEs, Dockerfile misconfigs, and secrets in image layers — all in one tool. It is the standard in the Kubernetes ecosystem.

**Add to `pipeline.yml` after the Docker build step, before push:**
```yaml
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: quiz-site:${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: trivy-results.sarif
        if: always()
```

`exit-code: 1` is the security gate. If Trivy finds CRITICAL or HIGH CVEs, the pipeline fails and the image is never pushed to GHCR. You must fix the image (update packages, change base image) before the code can deploy.

**The before/after learning moment:** Run Trivy against your unpatched Phase A image and note the CVE count. Then harden the Dockerfile (Phase B4), rebuild, and run Trivy again. Watching the CVE count drop to near zero makes the impact of container hardening concrete.

**What real enterprises use:** Trivy Operator running inside the Kubernetes cluster for continuous rescanning of images that are already deployed. AWS Inspector for images in ECR. Google Artifact Registry with vulnerability scanning enabled. Snyk Container for developer-facing findings with fix recommendations. At scale, all of these feed into a central security dashboard showing CVE trends over time.

---

### B6 — Supply Chain Security: Image Signing with Cosign

#### The Vulnerability

After your pipeline builds and scans an image, it pushes it to GHCR. But nothing prevents an attacker with write access to GHCR from pushing a backdoored image with the `latest` tag. Your cluster would pull and deploy it on the next rollout — and you would have no way to know it was not built by your pipeline.

This is a supply chain attack. The SolarWinds breach happened this way: the build process itself was compromised, and malicious code was inserted into signed software updates. Supply chain attacks are now the highest-priority threat category in enterprise security.

**Why Cosign?**

Cosign is part of the Sigstore project — a free, open-source standard for software artifact signing backed by Google, Red Hat, and the Linux Foundation. It attaches a cryptographic signature to a container image stored in the registry alongside the image. Before deployment, the signature is verified — if it does not match or is absent, deployment fails.

Alternatives:
- Notary v2 — Docker's signing specification, more complex setup
- AWS Signer — AWS-native, works only within the AWS ecosystem
- DigiCert — Enterprise commercial code signing

Cosign is the right choice here because it is free, widely adopted in the Kubernetes and cloud-native ecosystem, and integrates directly with OPA Gatekeeper (Phase B10) to enforce signature verification as a deployment policy.

**Setup (run in WSL2 once):**
```bash
cosign generate-key-pair
# Creates cosign.key (private) and cosign.pub (public)
# cosign.key is already in .gitignore — NEVER commit it
```

Add to GitHub Secrets:
- `COSIGN_PRIVATE_KEY` — contents of `cosign.key`
- `COSIGN_PASSWORD` — the passphrase you chose
- `COSIGN_PUBLIC_KEY` — contents of `cosign.pub`

**Add to `pipeline.yml` after Trivy passes:**
```yaml
      - name: Sign image with Cosign
        env:
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          cosign sign --key env://COSIGN_PRIVATE_KEY \
            ghcr.io/${{ github.repository }}/quiz-site:${{ github.sha }}

      - name: Verify image signature before deploy
        env:
          COSIGN_PUBLIC_KEY: ${{ secrets.COSIGN_PUBLIC_KEY }}
        run: |
          cosign verify --key env://COSIGN_PUBLIC_KEY \
            ghcr.io/${{ github.repository }}/quiz-site:${{ github.sha }}
```

**What real enterprises use:** Sigstore keyless signing — uses OIDC identity (GitHub Actions' ephemeral identity) instead of a stored key. No key management required. SLSA (Supply chain Levels for Software Artifacts) framework — a set of graduated standards published by Google for supply chain integrity. Enterprises aiming for SLSA Level 3 can cryptographically prove the build environment was not tampered with.

---

### B7 — Dependency Scanning

#### The Vulnerability

Your application's dependencies — npm packages, OS libraries — may have known CVEs. You did not write that code, but you are responsible for running it. Log4Shell (2021) affected hundreds of thousands of applications because they included a single vulnerable Java logging library. Organisations that had no dependency scanning took weeks to identify their exposure.

**Dependabot — GitHub native, zero configuration:**

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: docker
    directory: /docker
    schedule:
      interval: weekly

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly

  # Add if npm packages are added to the project:
  # - package-ecosystem: npm
  #   directory: /quiz-site
  #   schedule:
  #     interval: daily
```

Dependabot automatically opens PRs when a newer nginx base image is available with security fixes, or when a GitHub Action you use has a new version. You review and merge the PR — the pipeline handles the rest.

**SBOM Generation (Software Bill of Materials):**

An SBOM is a complete inventory of every component in your software — like an ingredients list. It is becoming a regulatory requirement in many industries following US Executive Order 14028. Insurance companies now ask for SBOMs before issuing cyber insurance.

```yaml
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ghcr.io/${{ github.repository }}/quiz-site:${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM as artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom-${{ github.sha }}
          path: sbom.spdx.json
```

**What real enterprises use:** Snyk for dependency scanning with developer-facing fix recommendations and a developer portal. JFrog Xray for artifact repository scanning integrated with JFrog Artifactory. GitHub Advanced Security with Dependabot at scale across hundreds of repositories. All outputs feed into a central dashboard showing dependency vulnerability trends across the entire organisation.

---

### B8 — Kubernetes Security Contexts

#### The Vulnerability

Your Phase A Kubernetes deployment runs the container as root with full Linux capabilities and a writable filesystem. Inside the cluster, a compromised root pod can: write arbitrary files to the container filesystem, escalate to the host node using specific capabilities like `SYS_ADMIN`, read environment variables from other pods, and use network capabilities to intercept cluster traffic.

**`k8s/base/deployment.yaml` (replace the Phase A version):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quiz-site
  namespace: quiz-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: quiz-site
  template:
    metadata:
      labels:
        app: quiz-site
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        runAsGroup: 101
        fsGroup: 101
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: quiz-site
          image: ghcr.io/YOUR_USERNAME/YOUR_REPO/quiz-site:latest
          ports:
            - containerPort: 8080

          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]

          resources:
            requests:
              memory: "32Mi"
              cpu: "25m"
            limits:
              memory: "64Mi"
              cpu: "100m"

          livenessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30

          readinessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10

          volumeMounts:
            - name: nginx-cache
              mountPath: /var/cache/nginx
            - name: nginx-pid
              mountPath: /var/run

      volumes:
        - name: nginx-cache
          emptyDir: {}
        - name: nginx-pid
          emptyDir: {}
```

**What each security control does:**

| Control | Without it | With it |
|---|---|---|
| `runAsNonRoot: true` | Container may start as root | Kubernetes rejects pods that try to run as root |
| `readOnlyRootFilesystem: true` | Attacker can write files (malware, modified configs) | Filesystem is immutable — writes fail at the kernel level |
| `allowPrivilegeEscalation: false` | Process can gain root via setuid binaries | Kernel blocks all privilege escalation attempts |
| `capabilities: drop: [ALL]` | Container has 30+ Linux capabilities | Zero capabilities — minimal attack surface |
| `resources.limits` | One pod can consume all node memory/CPU | Other pods are protected from resource starvation (DoS) |
| `seccompProfile: RuntimeDefault` | All 300+ Linux syscalls available | Only ~150 commonly needed syscalls permitted |

**What real enterprises use:** Pod Security Admission (built into Kubernetes since 1.25) with the `restricted` profile enforced at the namespace level — applies all of the above controls automatically to every pod in the namespace. Custom seccomp profiles tailored per application. AppArmor or SELinux profiles for Mandatory Access Control at the kernel level.

---

### B9 — Network Policies

#### The Vulnerability

By default in Kubernetes, every pod can communicate with every other pod in the cluster on any port. If an attacker compromises one pod — say, through a vulnerable npm dependency — they can immediately reach your database, your secrets store, your internal APIs, and every other service in the cluster. This lateral movement is how most Kubernetes breaches escalate from a single compromised pod to full cluster access.

**`k8s/base/networkpolicy.yaml`:**
```yaml
# Default deny: block all traffic in and out of every pod in this namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: quiz-app
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# Allow traffic to the quiz-site pod on port 8080 only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-quiz-site-ingress
  namespace: quiz-app
spec:
  podSelector:
    matchLabels:
      app: quiz-site
  policyTypes:
    - Ingress
  ingress:
    - ports:
        - port: 8080
          protocol: TCP

---
# Allow DNS resolution — pods need this to resolve any hostname
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: quiz-app
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

**What real enterprises use:** Calico or Cilium as the CNI (Container Network Interface) — both offer richer network policy capabilities than the default Kubernetes implementation, including Layer 7 (HTTP-level) policies. A service mesh (Istio, Linkerd) for mutual TLS between every pod — all pod-to-pod communication is authenticated and encrypted by default. Cilium's eBPF-based policies with near-zero performance overhead at scale.

---

### B10 — Policy as Code: OPA Gatekeeper

#### The Vulnerability

Security contexts, network policies, and resource limits exist as YAML that developers can forget, skip under deadline pressure, or misconfigure. There is no enforcement at the cluster level — a deployment submitted without a security context will happily run. Security is dependent on developer memory and code review thoroughness.

OPA Gatekeeper is a Kubernetes admission controller that intercepts every resource creation request and evaluates it against your policy rules (written in Rego). A deployment that violates a policy is rejected at the API server before it ever runs — not logged, not warned about, blocked.

**Why OPA Gatekeeper (not Kyverno)?**

| Tool | Pros | Cons |
|---|---|---|
| OPA Gatekeeper | Industry standard, powerful Rego language, used in enterprise | Rego has a learning curve |
| Kyverno | YAML-native policies (no new language), easier to start | Less flexible for complex logic |

OPA is more widely adopted in enterprise environments and teaches Rego — a policy language used beyond Kubernetes in API authorisation, cloud config validation, and data access control.

**Install:**
```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
```

**Example policy — require non-root user:**

`k8s/gatekeeper/require-non-root.yaml`:
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireNonRootUser
metadata:
  name: require-non-root-user
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces: ["quiz-app"]
```

**Example policy — require resource limits:**

`k8s/gatekeeper/require-limits.yaml`:
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredResources
metadata:
  name: require-resource-limits
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    limits: ["cpu", "memory"]
    requests: ["cpu", "memory"]
```

**What real enterprises use:** OPA Gatekeeper with the full Gatekeeper Policy Library covering the CIS Kubernetes Benchmark. Kyverno in teams preferring YAML-native policies. Styra DAS (commercial OPA management platform) for large-scale policy governance across many clusters. Both OPA and Kyverno integrating with GitOps pipelines — policy changes go through the same PR review and CI pipeline as application code.

---

### B11 — Runtime Security: Falco + Monitoring

#### The Vulnerability

Every security control so far is preventive — it stops known attack patterns. But attackers find novel techniques. Runtime security detects anomalous behaviour happening inside running containers: a container that suddenly spawns a shell, reads `/etc/shadow`, makes unexpected outbound connections, or executes a binary from `/tmp`.

Without monitoring, you also have no visibility into pipeline health, deployment frequency, or security posture trends.

---

#### B11a — Falco (Runtime Threat Detection)

Falco watches every Linux syscall made by every container in the cluster and alerts when the behaviour matches known attack patterns. It is the same engine that powers commercial products like Sysdig Secure and Aqua Runtime Security.

**Install via Helm:**
```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set falco.grpc.enabled=true \
  --set falcosidekick.enabled=true \
  --set falcosidekick.config.slack.webhookurl=YOUR_SLACK_WEBHOOK
```

**Default Falco rules that fire on real attack patterns:**

| Rule | What it detects | Why it matters |
|---|---|---|
| Terminal shell in container | `bash`, `sh`, `zsh` spawned in a running container | Attackers use interactive shells for manual exploration |
| Read sensitive file | Read of `/etc/shadow`, `/etc/passwd`, `/proc/*/environ` | Credential harvesting |
| Write below binary dirs | Write to `/bin`, `/usr/bin`, `/sbin` | Malware installation |
| Outbound connection from unexpected container | New outbound connection from a container with no prior egress | C2 (command and control) beaconing |
| Run shell in container via kubectl exec | `kubectl exec` into a production pod | Insider threat, post-compromise investigation |
| Execution from /tmp | Binary executed from temporary directory | Common malware staging pattern |

---

#### B11b — Prometheus + Grafana (Observability)

**Install via Helm:**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

**Security dashboard metrics to track:**

| Metric | What drift means |
|---|---|
| Pipeline failure rate | A spike means attempted attacks or broken security gates |
| Deployment frequency | A drop means teams are bypassing the pipeline |
| Trivy CVE count over time | Rising trend means base image is accumulating unpatched CVEs |
| Falco alert rate by rule | New patterns indicate novel attack techniques being attempted |
| Time to patch (CVE published → image updated) | Enterprise target: under 24 hours for CRITICAL CVEs |
| Failed Cosign verifications | Any nonzero value means something is trying to deploy unsigned images |

**What real enterprises use:** Datadog, Splunk, or Elastic Stack as a centralised SIEM. Falco with Falcosidekick routing alerts to PagerDuty, Slack, or AWS Security Hub. OpenTelemetry for vendor-neutral observability. Grafana Loki for log aggregation. The architecture you are building here is identical — the enterprise version just replaces the self-hosted components with managed services.

---

### B12 — The Complete Secured Pipeline

This is the full pipeline when every Phase B control is in place:

```
git push to main
        ↓
[ Gate 1: Secret Scanning ]
  TruffleHog — verified secrets block the pipeline
        ↓
[ Gate 2: Code Security ]
  Semgrep — ERROR severity findings fail the pipeline
  Checkov — CRITICAL IaC misconfigs fail the pipeline
        ↓
[ Gate 3: Build ]
  Docker build with hardened Dockerfile
        ↓
[ Gate 4: Container Scanning ]
  Trivy — CRITICAL/HIGH CVEs fail the pipeline
  Image is NOT pushed if Trivy fails
        ↓
[ Gate 5: Push + Sign ]
  Image pushed to GHCR
  Cosign signs the image with private key
        ↓
[ Gate 6: Verify + Deploy ]
  Cosign verifies signature (unsigned = deploy fails)
  kubectl apply — OPA Gatekeeper validates at admission
  Root containers, missing limits, unsigned images all rejected
        ↓
[ Gate 7: Rollout Confirmation ]
  kubectl rollout status — confirms pods healthy
        ↓
App running in Kubernetes:
  Non-root, read-only filesystem, dropped capabilities
  Resource limits, liveness/readiness probes
  Network policies (deny-all + explicit allows only)
  Falco monitoring every syscall
  Prometheus + Grafana tracking posture over time
```

---

### B13 — Configuration, Compliance and Signed Commits

#### GitHub Repository Security Settings

Settings → Security → Code security and analysis — enable all:
- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning (GitHub native, catches common token patterns)
- Push protection (blocks pushes that contain secrets before they land in history)
- Code scanning (receives all SARIF uploads from your workflows)

#### GPG Signed Commits

Signed commits prove that a commit was made by a specific person and was not tampered with after the fact. GitHub shows a "Verified" badge.

```bash
# In WSL2
gpg --full-generate-key
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Export public key and add to GitHub → Settings → SSH and GPG keys
gpg --armor --export YOUR_KEY_ID
```

Enable in branch protection: "Require signed commits."

#### `.gitignore` for Security

```
.env
*.env
cosign.key
*.pem
*.key
*.crt
*_rsa
secrets.yaml
*-secret.yaml
```

---

## Monthly Review Checklist

Run this every month to prevent security drift:

- [ ] Rotate any long-lived credentials (GitHub PATs, API keys, signing keys)
- [ ] Review and merge pending Dependabot security update PRs
- [ ] Check Trivy CVE count trend — rising means base image needs updating
- [ ] Review GitHub Security tab — any unresolved code scanning alerts?
- [ ] Review Falco alerts from the past month — any anomalous patterns?
- [ ] Audit who has access to the repository and to GitHub Secrets
- [ ] Check GitHub Actions versions — pin to a specific SHA for production-grade security
- [ ] Review OPA Gatekeeper policy violations from the past month
- [ ] Check if any secrets have been unused for 90+ days — rotate or revoke

---

## Incident Response

**If a secret is leaked (committed to git):**
1. Immediately rotate or revoke the credential at the source (GitHub, AWS, Stripe)
2. Within 1 hour: remove the secret from git history using `git filter-repo`
3. Within 1 hour: audit access logs — was the credential used after it was committed?
4. Document: what was exposed, for how long, what data was accessible
5. Fix the gap: which pre-commit hook or CI gate missed it?

**If a compromised image is deployed:**
1. Immediately: `kubectl rollout undo deployment/quiz-site -n quiz-app`
2. Block the image: remove it from GHCR, revoke the Cosign signature
3. Investigate: what did Falco detect? What did the container actually do?
4. Patch and redeploy through the full secured pipeline

---

## Tool Stack Reference

| Tool | Phase | Purpose | Free? | Enterprise Alternative |
|---|---|---|---|---|
| Gitleaks | B1 | Local secret detection (pre-commit) | Yes | HashiCorp Vault + pre-commit framework |
| TruffleHog | B1 | CI secret scanning with API verification | Yes | GitHub Advanced Security |
| Semgrep | B2 | SAST — source code vulnerability scanning | Yes (OSS) | SonarQube, Veracode, Snyk Code |
| Checkov | B3 | IaC misconfiguration scanning | Yes | Prisma Cloud, Snyk IaC |
| Trivy | B5 | Container CVE scanning | Yes | Snyk Container, Aqua, AWS Inspector |
| Cosign | B6 | Container image signing (supply chain) | Yes | Notary v2, DigiCert |
| Dependabot | B7 | Dependency update automation | Yes (GitHub) | Snyk, Renovate |
| OPA Gatekeeper | B10 | Policy enforcement at K8s admission | Yes | Kyverno, Styra DAS |
| Falco | B11 | Runtime syscall-level threat detection | Yes | Sysdig Secure, Aqua Runtime |
| Prometheus | B11 | Metrics collection | Yes | Datadog, New Relic |
| Grafana | B11 | Metrics visualisation + security dashboards | Yes | Datadog, Splunk |
