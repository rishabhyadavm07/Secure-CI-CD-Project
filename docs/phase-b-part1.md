# Phase B — Part 1: Pipeline and Container Security

**Focus:** Secure everything from the moment code is written to the moment a verified image lands in GHCR.
**Covers:** B1 (complete) → B2 → B3 → B4 → B5 → B6 → B7

---

## The Big Picture of Part 1

In Phase A you built a pipeline that goes:

```
code → build → push to GHCR
```

Part 1 adds security at every stage of that journey:

```
code written
    ↓ [B1] Secret detection blocks leaked credentials at commit time
    ↓ [B2] SAST catches vulnerable code patterns before merge
    ↓ [B3] IaC scanning finds Dockerfile and K8s misconfigurations
    ↓ [B4] Dockerfile is hardened — minimal, patched, non-root
    ↓ [B5] Trivy scans the built image — CVEs block the push
    ↓ [B6] Cosign signs the image — tampered images are rejected
    ↓ [B7] Dependabot keeps dependencies patched automatically
    ↓
clean, signed, verified image sitting in GHCR
```

By the end of Part 1, nothing insecure can reach the registry. Part 2 then secures what happens after the image is deployed.

---

## B1 — Complete Secrets and Authentication

### What is already done
- Gitleaks pre-commit hook (blocks secrets locally at commit time)
- TruffleHog GitHub Actions workflow (scans full git history in CI)

### What is still missing

#### B1c — Lock down GitHub Actions permissions

**The vulnerability:** By default, GitHub gives every workflow `write` access to the repository contents. If a malicious package or a compromised GitHub Action runs inside your workflow, it can push code, delete branches, or read every secret your repository has.

**The fix:** Add a `permissions` block to every workflow file that restricts it to only what it needs. Nothing more.

**How it works in enterprises:** Large companies enforce this at the organisation level — a policy that sets the default to `read` for all repos, and individual workflows must explicitly declare what they need. Any workflow requesting write access triggers a security review. This is standard in any company running GitHub at scale.

**What to add to the top of every workflow file:**

For `trufflehog.yml` and `semgrep.yml`:
```yaml
permissions:
  contents: read
  security-events: write
```
- `contents: read` — can read your code, cannot modify it
- `security-events: write` — needed to upload SARIF to the GitHub Security tab

For `pipeline.yml`:
```yaml
permissions:
  contents: read
  packages: write
```
- `packages: write` — the only reason it needs more than read is to push to GHCR

For `security.yml`:
```yaml
permissions:
  contents: read
```
- This one just runs a smoke test, it needs nothing else

**Why this matters with a real example:** In 2023, the `tj-actions/changed-files` GitHub Action was compromised. It was used in thousands of pipelines. Repos with default write permissions had their secrets printed in workflow logs. Repos with locked-down permissions were safe — the Action could not read what it had no permission to access.

---

#### B1d — OIDC: No long-lived credentials stored anywhere

**The vulnerability:** Any secret stored in GitHub — an AWS key, a Docker Hub password, a cloud token — is a long-lived credential. It never expires unless you manually rotate it. If it leaks (through a log, a misconfigured action, or a breach of GitHub itself), the attacker has indefinite access.

**The fix:** OIDC (OpenID Connect). Instead of storing a credential, your pipeline proves its identity to the cloud provider using a short-lived token issued by GitHub for that specific job run. The token expires when the job ends. There is nothing to steal.

**How the flow works:**
```
GitHub Actions job starts
    ↓
GitHub issues a short-lived OIDC token for this specific job
(token is scoped to: this repo, this branch, this workflow)
    ↓
Workflow presents token to AWS/Azure/GCP
    ↓
Cloud provider verifies it with GitHub's public key
    ↓
Cloud provider issues a temporary session credential (expires in 1 hour)
    ↓
Job uses it, job ends, token is gone
```

**How enterprises use this:** OIDC federation is now the standard at any mature cloud-using organisation. AWS calls it IAM Roles Anywhere. Google calls it Workload Identity Federation. Azure calls it Managed Identity. The pattern is identical everywhere: no stored secrets, short-lived tokens, automatically scoped to exactly what the job needs.

For this project: when you later push to a cloud registry (AWS ECR, GCP Artifact Registry) in a real job, you use OIDC instead of an access key. For GHCR it is already handled by `GITHUB_TOKEN` which GitHub creates and destroys automatically per job — that is already OIDC in practice.

---

## B2 — Custom Semgrep Rules and Branch Protection

### What is already done
- Semgrep running in CI with `--config=auto` (community rules)
- SARIF uploading to GitHub Security tab

### What is missing

#### Custom rules targeting your codebase

**The vulnerability with only community rules:** Semgrep's `--config=auto` runs thousands of generic rules written for all codebases. It will not know that your app uses `Math.random()` for something security-sensitive, or that certain patterns in your JavaScript are dangerous in your specific context. Custom rules let you codify your own security decisions.

**How enterprises use custom rules:** Every mature AppSec team maintains a private rule repository. Rules encode company-specific decisions — "we never use eval()", "all database calls must go through our ORM wrapper", "no console.log in files under /src/api". New developers get these rules enforced automatically without needing to memorise every policy.

**The five rules to write for your codebase:**

Rule 1 — Block `eval()`:
```yaml
- id: no-eval
  pattern: eval($X)
  message: "eval() executes arbitrary code. Never use with user input."
  severity: ERROR
  languages: [javascript]
```

Rule 2 — Block `innerHTML` assignments (XSS):
```yaml
- id: no-innerhtml
  pattern: $EL.innerHTML = $INPUT
  message: "innerHTML can introduce XSS. Use textContent or DOMPurify."
  severity: WARNING
  languages: [javascript]
```

Rule 3 — Detect hardcoded credentials:
```yaml
- id: hardcoded-credential
  patterns:
    - pattern: $VAR = "..."
    - metavariable-regex:
        metavariable: $VAR
        regex: (password|passwd|secret|api_key|apikey|token|credential)
  message: "Hardcoded credential detected. Use environment variables."
  severity: ERROR
  languages: [javascript, python]
```

Rule 4 — Block weak randomness:
```yaml
- id: weak-random
  pattern: Math.random()
  message: "Math.random() is not cryptographically secure. Use crypto.getRandomValues()."
  severity: WARNING
  languages: [javascript]
```

Rule 5 — Catch debug statements left in production:
```yaml
- id: no-console-log
  pattern: console.log($X)
  message: "Remove console.log before production — may expose sensitive data."
  severity: INFO
  languages: [javascript]
```

**File to update:** `.semgrep.yml` — add all five rules to the existing file.

**How to test locally (in WSL2):**
```bash
semgrep scan --config=.semgrep.yml quiz-site/
```

---

#### Branch protection rules

**The vulnerability:** Right now anyone with push access (including you) can push directly to `main` and bypass every GitHub Actions security check. A direct push skips TruffleHog, skips Semgrep, and deploys untested code.

**The fix:** GitHub branch protection rules. No one — including repo owners — can push to `main` directly. Every change must go through a pull request, and the PR cannot be merged until all required status checks pass.

**How to set this up:**
1. Go to your repository on GitHub
2. Settings → Branches → Add branch protection rule
3. Branch name pattern: `main`
4. Enable:
   - Require a pull request before merging
   - Require status checks to pass (add: TruffleHog Scan, Semgrep SAST)
   - Require branches to be up to date before merging
   - Do not allow bypassing the above settings

**How enterprises use this:** Branch protection is table stakes — every company with more than one developer uses it. Enterprise-grade additions include requiring signed commits, requiring a minimum number of reviewers from specific teams (CODEOWNERS file), and preventing force pushes to any branch. Some companies lock production branches so tightly that even merging requires a ticket reference in the PR title, which is validated by a CI check.

---

## B3 — IaC Scanning with Checkov

### What is IaC scanning

IaC (Infrastructure as Code) is your Dockerfile and your Kubernetes YAML files. They define your infrastructure — what runs, how it runs, who it runs as. They contain security misconfigurations that look harmless but create real vulnerabilities at runtime.

**The vulnerability without IaC scanning:** A developer writes a Deployment with no resource limits, running as root, with privilege escalation enabled. It passes code review (the reviewer is not a K8s security expert), it passes the SAST scan (Semgrep scans JavaScript, not YAML), and it deploys to production. No one knows it is misconfigured until an incident happens.

**The fix:** Checkov automatically scans your Dockerfile and Kubernetes YAML against hundreds of security rules based on CIS benchmarks. It finds misconfigurations before they ship.

### Why Checkov specifically

Checkov is built by Bridgecrew (now part of Palo Alto Networks). It is free and open source. It scans everything in your repo in one command — Dockerfile, Kubernetes YAML, Terraform, GitHub Actions workflows. Other tools specialise: `kube-score` only scans Kubernetes, `tfsec` only scans Terraform. Checkov gives you full breadth for free.

**Enterprise context:** Large organisations run Checkov (or its commercial sibling Prisma Cloud) across every repository. Every IaC file is scanned on every PR. Misconfigurations are treated the same as code bugs — they block the merge until fixed. Some teams score their repositories against the full CIS benchmark monthly and report the score to their CISO.

### What Checkov will find on your Phase A files

**On your current Dockerfile:**

| Check ID | Finding | Why it matters |
|---|---|---|
| CKV_DOCKER_2 | No HEALTHCHECK defined | Kubernetes cannot detect and recover from app failures |
| CKV_DOCKER_3 | Container runs as root | Any exploit gives attacker root inside the container |
| CKV_DOCKER_7 | Base image not pinned to a specific version | Builds are not reproducible, unexpected changes can ship |

**On your current deployment.yaml:**

| Check ID | Finding | Why it matters |
|---|---|---|
| CKV_K8S_8 | No liveness probe | K8s cannot restart a frozen app automatically |
| CKV_K8S_9 | No readiness probe | K8s sends traffic to pods that are not ready yet |
| CKV_K8S_11 | No CPU limits | One pod can consume all node CPU, starving other pods |
| CKV_K8S_12 | No memory limits | One pod can consume all node memory, causing OOM kills |
| CKV_K8S_14 | Container runs as root | Full host root access on container escape |
| CKV_K8S_20 | Privilege escalation not disabled | Process can gain more privileges than its parent |
| CKV_K8S_28 | No capabilities dropped | Container has 30+ Linux capabilities it does not need |
| CKV_K8S_30 | Root filesystem not read-only | Attacker can write malware or modify configs at runtime |

Run Checkov and **see all of these** before fixing them. That is the learning exercise — seeing the exact violations your Phase A setup has. Then B4 and B8 fix them one by one.

### How to run Checkov locally (in WSL2)
```bash
# Install
pip3 install checkov

# Scan Dockerfile
checkov -f docker/Dockerfile

# Scan Kubernetes manifests
checkov -d k8s/base/ --framework kubernetes
```

### How to add Checkov to GitHub Actions

Add a new file `.github/workflows/checkov.yml`:
```yaml
name: IaC Security — Checkov

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  security-events: write

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan Dockerfile
        uses: bridgecrewio/checkov-action@master
        with:
          file: docker/Dockerfile
          framework: dockerfile
          output_format: sarif
          output_file_path: checkov-docker.sarif
          soft_fail: true

      - name: Scan Kubernetes manifests
        uses: bridgecrewio/checkov-action@master
        with:
          directory: k8s/
          framework: kubernetes
          output_format: sarif
          output_file_path: checkov-k8s.sarif
          soft_fail: true

      - name: Upload results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: checkov-docker.sarif
        if: always()
```

`soft_fail: true` means the pipeline does not fail yet — you first want to see all the findings. After you fix them in B4 and B8, you change this to `soft_fail: false` to enforce the gate.

---

## B4 — Harden the Dockerfile

### Why this comes after Checkov

You run Checkov first (B3) so you can see every violation listed out. Then you fix them in this step. The before/after is concrete — you go from eight violations to zero.

### What changes and exactly why each change matters

**Change 1 — Pin the base image version**

From:
```dockerfile
FROM nginx:alpine
```
To:
```dockerfile
FROM nginx:1.25-alpine
```

Why: `nginx:alpine` is a floating tag. Tomorrow it might point to a different image with new packages, a different nginx version, or new CVEs. Pinning to `1.25` makes every build reproducible — you know exactly what you are building on. In enterprises, teams pin to the image digest (a SHA256 hash) for absolute certainty.

**Change 2 — Patch all OS packages**

Add:
```dockerfile
RUN apk update && \
    apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*
```

Why: The base image `nginx:1.25-alpine` was built weeks or months ago. Since then, CVEs have been discovered and patches released for Alpine Linux packages. `apk upgrade` applies every available patch at build time. Trivy (B5) will scan the image after this — the CVE count drops significantly.

**Change 3 — Create and switch to a non-root user**

Add:
```dockerfile
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx || true

USER nginx
```

Why: Your Phase A container runs as root (UID 0). If an attacker exploits a vulnerability in nginx or your app, they operate as root inside the container. Non-root means they get a limited user account with no special privileges. This is the most impactful single change you can make to a Dockerfile.

**Change 4 — Change port from 80 to 8080**

```dockerfile
EXPOSE 8080
```

Why: Port 80 is a privileged port (below 1024). Only root can bind to it. Since you are now running as a non-root user, the container cannot bind to port 80 — it would crash on startup. Port 8080 is unprivileged and works with any user.

**Change 5 — Add a HEALTHCHECK**

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
```

Why: Without this, Kubernetes has no way to know if your app is actually working. It only knows if the process is running — not if it is serving requests correctly. The health check hits your actual endpoint every 30 seconds. If it fails 3 times in a row, Kubernetes restarts the pod automatically.

**Change 6 — Add a custom nginx.conf with security headers**

Create `docker/nginx.conf` with:
```nginx
server_tokens off;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self';" always;
```

Why each header:
- `server_tokens off` — stops nginx from advertising its version number in HTTP responses. Attackers use this to look up version-specific CVEs.
- `X-Frame-Options` — prevents your page from being embedded in an iframe on another site. Blocks clickjacking attacks.
- `X-Content-Type-Options` — stops browsers from guessing the content type. Prevents MIME-sniffing attacks.
- `X-XSS-Protection` — activates the browser's built-in XSS filter (legacy browsers).
- `Content-Security-Policy` — tells the browser which sources are allowed to load scripts, styles, and images. Prevents injected scripts from running.

**How enterprises manage Dockerfiles:** Large companies maintain a library of approved base images — hardened, patched, and re-scanned on a schedule. Developers choose from the approved list; they cannot use arbitrary base images. Updates to the base images are automated via Renovate or Dependabot, opening PRs within hours of a CVE patch being released.

---

## B5 — Container Scanning with Trivy

### The vulnerability this fixes

You now have a hardened Dockerfile. But how do you know it is actually clean? Even after `apk upgrade`, new CVEs are published every day. And a CVE published yesterday would not have been caught by last week's build.

Trivy scans the built image against the National Vulnerability Database and other CVE sources. It reports every CVE in every OS package and application library in the image. The pipeline fails if CRITICAL or HIGH severity CVEs are found — the image never reaches GHCR.

### Why Trivy specifically

Trivy is built by Aqua Security and is open source. It is the most widely used container scanner in the Kubernetes ecosystem. It handles: OS package CVEs, application library CVEs (npm, pip, gem), Dockerfile misconfigurations, and secrets accidentally baked into image layers — all in one tool. It runs in GitHub Actions with zero setup.

**Enterprise context:** Every major cloud provider now includes container scanning as a built-in feature — AWS Inspector for ECR, Google Artifact Registry scanning, Azure Defender for Containers. They all do the same thing as Trivy but managed. At scale, results feed into a central dashboard that shows CVE trends across hundreds of images. Teams have SLAs: CRITICAL CVEs must be patched within 24 hours, HIGH within 7 days.

### Where Trivy goes in the pipeline

Trivy runs **after** the Docker build but **before** the push to GHCR. If Trivy fails, the push step never runs. A vulnerable image cannot reach the registry.

```
Build image → Trivy scan → (pass) → Push to GHCR → Cosign sign
                         → (fail) → Pipeline stops, image discarded
```

### The quality gate

`exit-code: 1` means the pipeline fails on findings. `severity: CRITICAL,HIGH` means you are gating on the two most dangerous levels. MEDIUM and LOW are reported but do not block — this avoids alert fatigue while still enforcing meaningful standards.

**The before/after exercise:** Run Trivy against your unpatched Phase A image first. Note the CVE count. Then run it against your hardened Phase B Dockerfile. The count drops significantly. That difference is the value of container hardening made visible.

---

## B6 — Image Signing with Cosign

### The vulnerability this fixes

After Trivy passes and the image is pushed to GHCR, it sits there waiting to be deployed. But:
- Anyone with write access to GHCR can overwrite the `latest` tag with a different image
- A dependency in your GitHub Actions workflow could be compromised and tamper with the image before it is pushed
- A network-level attacker (rare but possible) could intercept the image pull and serve a different image

Without signing, your cluster has no way to verify that the image it pulls is the exact one your pipeline built and scanned.

**This is supply chain security.** The SolarWinds attack in 2020 used this exact vector — the build process was compromised and malicious code was inserted after code review. 18,000 organisations deployed the backdoored software because there was no mechanism to verify build integrity.

### How Cosign works

Cosign generates a key pair:
- Private key — stays secret, stored as a GitHub Secret, used to sign the image after Trivy passes
- Public key — shared, used to verify the signature before deployment

When you sign an image, Cosign attaches the signature to GHCR alongside the image. The signature is a cryptographic proof that:
- This specific image (identified by its SHA256 digest)
- Was signed by whoever holds the private key
- At this specific point in time

When you verify, Cosign checks the signature against the public key. If the image was modified even by a single byte after signing, the signature check fails and deployment is rejected.

### Why Cosign specifically

Cosign is part of the Sigstore project — a Linux Foundation initiative backed by Google, Red Hat, and Chainguard. It is the standard for container image signing in the cloud-native ecosystem. It integrates with OPA Gatekeeper (Phase B, Part 2) to enforce signature verification as a cluster-wide policy.

**Enterprise context:** Sigstore keyless signing is used at Google scale — every image in Google's internal systems is signed. The SLSA (Supply chain Levels for Software Artifacts) framework, published by Google, requires cryptographic image signing at Level 2 and above. Organisations working with the US federal government now face requirements for SLSA compliance following Executive Order 14028. Banks and financial institutions are starting to require SBOM and signing from their software vendors.

### The signing flow in the pipeline

```
Trivy passes
    ↓
Image pushed to GHCR
    ↓
Cosign signs the image using COSIGN_PRIVATE_KEY (from GitHub Secrets)
Signature stored in GHCR alongside the image
    ↓
Before deploy: Cosign verifies signature using public key
If verification fails → deployment is rejected
```

### Setup steps

**Step 1 — Generate the key pair (run once in WSL2):**
```bash
cosign generate-key-pair
```
This creates `cosign.key` (private) and `cosign.pub` (public). The `cosign.key` file is already in your `.gitignore` — never commit it.

**Step 2 — Add to GitHub Secrets:**
- `COSIGN_PRIVATE_KEY` — paste the contents of `cosign.key`
- `COSIGN_PASSWORD` — the passphrase you set during key generation
- `COSIGN_PUBLIC_KEY` — paste the contents of `cosign.pub`

**Step 3 — Add to pipeline.yml after the push step:**
```yaml
- name: Sign image
  env:
    COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
    COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
  run: |
    cosign sign --key env://COSIGN_PRIVATE_KEY \
      ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site:${{ github.sha }}

- name: Verify signature
  env:
    COSIGN_PUBLIC_KEY: ${{ secrets.COSIGN_PUBLIC_KEY }}
  run: |
    cosign verify --key env://COSIGN_PUBLIC_KEY \
      ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site:${{ github.sha }}
```

---

## B7 — Dependency Scanning and SBOM

### The vulnerability this fixes

Your image contains packages and libraries you did not write — Alpine Linux packages, nginx, and whatever npm packages you may add later. These dependencies have their own CVE history. Log4Shell (2021) was a single vulnerable library in thousands of applications. Organisations with no dependency tracking took weeks to find all their exposure.

Dependency scanning automates the work of keeping every dependency patched.

### Dependabot — automatic dependency updates

Dependabot watches your project and opens pull requests automatically when:
- A newer `nginx:1.25-alpine` base image is available with security patches
- A GitHub Action you use (e.g., `actions/checkout`) has a new version
- Any npm package you add later has a known CVE with a patched version available

**File to create:** `.github/dependabot.yml`
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
```

This costs nothing and requires zero ongoing effort. PRs appear automatically. You review and merge them through your pipeline (which runs all security checks on the PR).

**Enterprise context:** At scale, Dependabot (or its commercial equivalent Renovate) runs across hundreds of repositories. Some teams auto-merge patch-level updates that pass all tests. Minor and major version updates require human review. The goal is a mean time to patch of under 24 hours for critical CVEs. Without automation, patching lags by weeks or months.

### SBOM — Software Bill of Materials

An SBOM is a complete machine-readable inventory of every component in your software — every OS package, every library, every dependency, with exact versions and known CVEs.

**Why enterprises need this:**
- US Executive Order 14028 (2021) requires SBOMs for software sold to the US federal government
- Cyber insurers now ask for SBOMs before issuing policies
- When a new CVE is published (e.g., a new nginx vulnerability), organisations with SBOMs can immediately query which of their products are affected. Without an SBOM this takes days of manual investigation.

**How to generate:** Add to `pipeline.yml` after the push step:
```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site:${{ github.sha }}
    format: spdx-json
    output-file: sbom.spdx.json

- name: Upload SBOM as artifact
  uses: actions/upload-artifact@v4
  with:
    name: sbom-${{ github.sha }}
    path: sbom.spdx.json
```

The SBOM is stored as an artifact attached to each GitHub Actions run. You can download it, search it, and query it when a new CVE is published.

---

## Part 1 — Completion Checklist

You are done with Part 1 when all of these are true:

- [ ] All workflow files have explicit `permissions` blocks locking them to minimum access
- [ ] Custom Semgrep rules added to `.semgrep.yml` — eval, innerHTML, hardcoded creds, weak random, console.log
- [ ] Branch protection enabled — no direct push to main, required status checks pass
- [ ] Checkov workflow added — scans Dockerfile and K8s YAML on every push
- [ ] Dockerfile hardened — non-root, pinned, patched, port 8080, HEALTHCHECK, nginx.conf
- [ ] Trivy scanning in pipeline — CRITICAL/HIGH CVEs block the push
- [ ] Cosign key pair generated, stored in GitHub Secrets, signing and verification in pipeline
- [ ] Dependabot configured for Docker and GitHub Actions
- [ ] SBOM generated and stored as artifact on every build

**What the pipeline looks like at end of Part 1:**
```
git push → TruffleHog → Semgrep → Checkov
                                    ↓
                            Docker build (hardened Dockerfile)
                                    ↓
                            Trivy CVE scan (blocks on CRITICAL/HIGH)
                                    ↓
                            Push to GHCR
                                    ↓
                            Cosign sign → Cosign verify
                                    ↓
                            SBOM generated
                                    ↓
                    clean, signed, verified image in GHCR
```

---

## What Part 2 Covers

Once the image is clean and verified in GHCR, Part 2 secures what happens when it is deployed and running:

- Kubernetes security contexts (non-root pods, read-only filesystem, dropped capabilities)
- Network policies (deny-all traffic, explicit allows only)
- OPA Gatekeeper (policy enforcement at admission — root pods rejected automatically)
- Falco (runtime threat detection — alerts on suspicious behaviour inside running containers)
- Prometheus and Grafana (security observability dashboard)
