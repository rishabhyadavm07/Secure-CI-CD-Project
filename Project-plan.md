# Secure CI/CD Pipeline Project Guide

## 📋 Project Overview

**Project Name:** Building a Production-Grade Secure CI/CD Pipeline  
**Duration:** 4-6 weeks  
**Difficulty:** Intermediate to Advanced  
**Outcome:** Deploy your website through a security-hardened, automated pipeline with container scanning, secret detection, policy enforcement, and Kubernetes orchestration

---

## 🎯 Learning Objectives

By completing this project, you will:
- ✅ Implement DevSecOps practices (shift-left security)
- ✅ Build automated security scanning into CI/CD
- ✅ Deploy containerized applications to Kubernetes
- ✅ Apply Pod Security Standards and Network Policies
- ✅ Implement runtime security monitoring
- ✅ Create security dashboards and alerting
- ✅ Document security controls (SSPM-style validation)

---

## 💻 Hardware Requirements

### Minimum Specifications
- **CPU:** 4 cores (Intel i5/AMD Ryzen 5 or equivalent)
- **RAM:** 8 GB (16 GB recommended)
- **Storage:** 50 GB free space (SSD recommended)
- **Network:** Stable internet connection (for container registries and cloud services)

### Your Current Setup (Mac Mini M4)
- ✅ **Exceeds requirements** - ARM64 architecture fully supported
- ✅ Can run local Kubernetes (minikube, kind, or Docker Desktop)
- ✅ Sufficient for running all security scanning tools

---

## 🛠️ Software & Tool Requirements

### Core Tools (Required)

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Git** | Version control | `brew install git` |
| **Docker** | Containerization | [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop) |
| **kubectl** | Kubernetes CLI | `brew install kubectl` |
| **Helm** | Kubernetes package manager | `brew install helm` |
| **GitHub Account** | Source control & CI/CD | [github.com](https://github.com) |

### Security Scanning Tools

| Tool | Purpose | Cost | Installation |
|------|---------|------|--------------|
| **TruffleHog** | Secret detection | Free | `brew install trufflesecurity/trufflehog/trufflehog` |
| **Trivy** | Container vulnerability scanning | Free | `brew install aquasecurity/trivy/trivy` |
| **Semgrep** | SAST (Static Application Security Testing) | Free tier | `brew install semgrep` |
| **Checkov** | IaC security scanning | Free | `pip install checkov` |
| **Cosign** | Container image signing | Free | `brew install cosign` |

### Kubernetes Options (Choose One)

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **Minikube** | Easy setup, full K8s features | Resource intensive | Local development |
| **Kind** | Fast, lightweight | Limited to Docker | Testing pipelines |
| **Docker Desktop K8s** | Built-in, easy | Basic features only | Mac users (you) |
| **Google GKE** | Production-grade, free tier | Requires GCP account | Cloud deployment |
| **Oracle Cloud** | Always free tier | Setup complexity | Budget-conscious |

**Recommendation for you:** Start with **Docker Desktop Kubernetes** (simplest on Mac M4), then move to **GKE free tier** for cloud deployment.

### Optional Tools (Recommended)

- **VS Code** - Code editor with extensions
- **k9s** - Terminal UI for Kubernetes (`brew install k9s`)
- **Lens** - Kubernetes IDE (GUI)
- **Postman** - API testing
- **jq** - JSON processing (`brew install jq`)

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    git push to GitHub
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Secret    │→ │     SAST     │→ │  Dependency      │   │
│  │  Scanning   │  │  (Semgrep)   │  │  Scanning        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                              ↓                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Docker    │→ │   Container  │→ │   Sign Image     │   │
│  │    Build    │  │   Scanning   │  │   (Cosign)       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                              ↓                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Policy    │→ │    Deploy    │→ │   Verify         │   │
│  │    Check    │  │  to K8s      │  │   Deployment     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Network    │  │   Pod        │  │   Runtime        │   │
│  │  Policies   │  │  Security    │  │   Security       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                              ↓                               │
│                    Your Website Running                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │   Monitoring     │
                    │  (Prometheus)    │
                    └──────────────────┘
```

---

## 📅 Project Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| **Week 1** | Foundation & Secret Detection | Basic pipeline, secret scanning |
| **Week 2** | Container Security | Docker security, vulnerability scanning |
| **Week 3** | Kubernetes Deployment | K8s cluster, secure deployments |
| **Week 4** | Advanced Security | Policy enforcement, network policies |
| **Week 5** | Monitoring & Observability | Dashboards, alerts, logging |
| **Week 6** | Documentation & Portfolio | Write-up, diagrams, case study |

---

## 🚀 Implementation Steps

<details>
<summary><h3>Phase 1: Project Setup & Prerequisites (Week 1, Day 1-2)</h3></summary>

#### Tasks

- [ ] **Task 1.1: Install Core Tools**
  ```bash
  # Install Homebrew (if not already installed)
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  
  # Install required tools
  brew install git kubectl helm jq
  
  # Verify installations
  git --version
  kubectl version --client
  helm version
  ```

- [ ] **Task 1.2: Install Docker Desktop**
  - Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
  - Install and start Docker Desktop
  - Enable Kubernetes in Docker Desktop settings
  - Verify:
    ```bash
    docker --version
    docker ps
    kubectl get nodes
    ```

- [ ] **Task 1.3: Set Up GitHub Repository**
  ```bash
  # Create new repository on GitHub
  # Clone your website repository
  git clone https://github.com/YOUR_USERNAME/YOUR_WEBSITE.git
  cd YOUR_WEBSITE
  
  # Create project structure
  mkdir -p .github/workflows
  mkdir -p k8s/{base,overlays}
  mkdir -p docker
  mkdir -p docs
  ```

- [ ] **Task 1.4: Prepare Your Website for Containerization**
  - Identify website type (static HTML, React, Node.js, etc.)
  - Create `Dockerfile` (example for static site):
    ```dockerfile
    # docker/Dockerfile
    FROM nginx:alpine
    
    # Copy website files
    COPY . /usr/share/nginx/html
    
    # Security: Run as non-root user
    RUN chown -R nginx:nginx /usr/share/nginx/html && \
        chmod -R 755 /usr/share/nginx/html
    
    USER nginx
    
    EXPOSE 8080
    
    # Health check
    HEALTHCHECK --interval=30s --timeout=3s \
      CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1
    ```

- [ ] **Task 1.5: Test Local Docker Build**
  ```bash
  # Build image
  docker build -t mywebsite:local -f docker/Dockerfile .
  
  # Run container
  docker run -d -p 8080:8080 --name test-website mywebsite:local
  
  # Test in browser
  open http://localhost:8080
  
  # Clean up
  docker stop test-website
  docker rm test-website
  ```

#### Deliverables
- ✅ All tools installed and verified
- ✅ GitHub repository structured
- ✅ Website containerized and tested locally
- ✅ Dockerfile optimized for security

#### Documentation
Create `docs/SETUP.md` documenting your environment setup and decisions.

</details>

<details>
<summary><h3>Phase 2: Secret Detection Implementation (Week 1, Day 3-4)</h3></summary>

#### Tasks

- [ ] **Task 2.1: Install Secret Scanning Tools**
  ```bash
  # Install TruffleHog
  brew install trufflesecurity/trufflehog/trufflehog
  
  # Install git-secrets (optional, additional layer)
  brew install git-secrets
  
  # Verify
  trufflehog --version
  ```

- [ ] **Task 2.2: Create Pre-commit Hook for Local Scanning**
  ```bash
  # Create pre-commit hook
  cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Running secret detection..."

# Run TruffleHog on staged files
git diff --cached --name-only | xargs trufflehog filesystem --no-update --fail

if [ $? -ne 0 ]; then
    echo "❌ Secret detected! Commit blocked."
    echo "Remove secrets before committing."
    exit 1
fi

echo "✅ No secrets detected"
exit 0
EOF

  # Make executable
  chmod +x .git/hooks/pre-commit
  ```

- [ ] **Task 2.3: Test Secret Detection Locally**
  ```bash
  # Create test file with fake secret
  echo "api_key=AKIAIOSFODNN7EXAMPLE" > test-secret.txt
  git add test-secret.txt
  git commit -m "test"  # Should be blocked
  
  # Remove test file
  git reset HEAD test-secret.txt
  rm test-secret.txt
  ```

- [ ] **Task 2.4: Create GitHub Actions Workflow for Secret Scanning**
  
  Create `.github/workflows/security-secrets.yml`:
  ```yaml
  name: Secret Detection
  
  on:
    push:
      branches: [ main, develop ]
    pull_request:
      branches: [ main ]
  
  jobs:
    secret-scan:
      name: TruffleHog Secret Scanning
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
          with:
            fetch-depth: 0  # Full history for secret detection
        
        - name: Run TruffleHog
          uses: trufflesecurity/trufflehog@main
          with:
            path: ./
            base: ${{ github.event.repository.default_branch }}
            head: HEAD
            extra_args: --debug --only-verified
        
        - name: Upload scan results
          if: failure()
          uses: actions/upload-artifact@v3
          with:
            name: secret-scan-results
            path: trufflehog-results.json
  ```

- [ ] **Task 2.5: Create .secretsignore File**
  
  Create `.secretsignore`:
  ```
  # Ignore test files
  **/test/**
  **/*test*.txt
  
  # Ignore documentation
  docs/**
  *.md
  
  # Ignore lock files
  package-lock.json
  yarn.lock
  Gemfile.lock
  ```

- [ ] **Task 2.6: Test CI/CD Secret Detection**
  ```bash
  # Push changes to trigger workflow
  git add .github/workflows/security-secrets.yml .secretsignore
  git commit -m "Add secret detection to CI/CD"
  git push origin main
  
  # Check GitHub Actions tab for workflow results
  ```

- [ ] **Task 2.7: Set Up Secret Detection Alerts**
  
  In GitHub repository settings:
  - Navigate to Settings → Security → Code security and analysis
  - Enable "Secret scanning"
  - Enable "Push protection"
  - Configure notification settings

#### Deliverables
- ✅ TruffleHog integrated locally (pre-commit hook)
- ✅ GitHub Actions workflow for secret scanning
- ✅ GitHub secret scanning enabled
- ✅ Documented secret handling policy

#### Success Criteria
- Pipeline blocks commits with secrets
- GitHub Actions workflow passes on clean code
- Test secret detection with fake credentials (verified it works)

#### Documentation
Add to `docs/SECURITY.md`:
```markdown
## Secret Detection

### Tools Used
- TruffleHog v3.x (primary)
- GitHub Secret Scanning (backup)

### Coverage
- Pre-commit hooks (local)
- CI/CD pipeline (GitHub Actions)
- Repository-level scanning (GitHub native)

### Remediation Process
1. Secret detected → pipeline fails
2. Developer removes secret
3. Rotate compromised credentials
4. Add to .secretsignore if false positive
```

</details>

<details>
<summary><h3>Phase 3: Static Application Security Testing (SAST) (Week 1, Day 5-7)</h3></summary>

#### Tasks

- [ ] **Task 3.1: Install SAST Tools**
  ```bash
  # Install Semgrep
  brew install semgrep
  
  # Install Checkov for IaC scanning
  pip3 install checkov
  
  # Verify
  semgrep --version
  checkov --version
  ```

- [ ] **Task 3.2: Configure Semgrep Rules**
  
  Create `.semgrep.yml`:
  ```yaml
  rules:
    # Security rules
    - id: hardcoded-secret
      patterns:
        - pattern: password = "..."
        - pattern: api_key = "..."
        - pattern: token = "..."
      message: Potential hardcoded secret detected
      severity: ERROR
      languages: [javascript, python, go]
    
    # SQL Injection
    - id: sql-injection
      patterns:
        - pattern: db.execute($X + ...)
        - pattern: cursor.execute($X + ...)
      message: Potential SQL injection vulnerability
      severity: ERROR
      languages: [python]
    
    # XSS vulnerabilities
    - id: xss-vulnerability
      patterns:
        - pattern: innerHTML = $X
        - pattern: document.write($X)
      message: Potential XSS vulnerability
      severity: WARNING
      languages: [javascript]
  ```

- [ ] **Task 3.3: Run Local SAST Scan**
  ```bash
  # Scan with Semgrep (auto mode uses community rules)
  semgrep --config=auto --metrics=off .
  
  # Scan specific rules
  semgrep --config=.semgrep.yml .
  
  # Output to JSON
  semgrep --config=auto --json --output=semgrep-results.json .
  ```

- [ ] **Task 3.4: Create SAST GitHub Workflow**
  
  Create `.github/workflows/security-sast.yml`:
  ```yaml
  name: SAST Scanning
  
  on:
    push:
      branches: [ main, develop ]
    pull_request:
      branches: [ main ]
    schedule:
      - cron: '0 0 * * 0'  # Weekly scan
  
  jobs:
    semgrep:
      name: Semgrep SAST
      runs-on: ubuntu-latest
      container:
        image: returntocorp/semgrep
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Run Semgrep
          run: |
            semgrep scan --config=auto \
              --sarif --output=semgrep.sarif \
              --metrics=off
        
        - name: Upload SARIF results
          uses: github/codeql-action/upload-sarif@v3
          with:
            sarif_file: semgrep.sarif
          if: always()
    
    checkov:
      name: IaC Security Scan
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Run Checkov
          uses: bridgecrewio/checkov-action@master
          with:
            directory: .
            framework: dockerfile,kubernetes
            output_format: sarif
            output_file_path: checkov.sarif
        
        - name: Upload Checkov results
          uses: github/codeql-action/upload-sarif@v3
          with:
            sarif_file: checkov.sarif
          if: always()
  ```

- [ ] **Task 3.5: Fix Common SAST Issues**
  
  Based on scan results, fix issues. Common fixes:
  
  **Example: Remove hardcoded credentials**
  ```javascript
  // ❌ Bad
  const apiKey = "sk_live_abc123";
  
  // ✅ Good
  const apiKey = process.env.API_KEY;
  ```
  
  **Example: Prevent XSS**
  ```javascript
  // ❌ Bad
  element.innerHTML = userInput;
  
  // ✅ Good
  element.textContent = userInput;
  // Or use DOMPurify for HTML sanitization
  ```

- [ ] **Task 3.6: Create SAST Baseline**
  ```bash
  # Run scan and save baseline
  semgrep --config=auto --json --output=sast-baseline.json .
  
  # Future scans compare against baseline
  semgrep --config=auto --baseline=sast-baseline.json .
  ```

- [ ] **Task 3.7: Configure SAST Quality Gates**
  
  Update workflow to fail on critical issues:
  ```yaml
  - name: Fail on Critical Issues
    run: |
      CRITICAL_COUNT=$(jq '.results[] | select(.extra.severity=="ERROR") | length' semgrep.sarif | wc -l)
      if [ $CRITICAL_COUNT -gt 0 ]; then
        echo "❌ Found $CRITICAL_COUNT critical issues"
        exit 1
      fi
  ```

#### Deliverables
- ✅ Semgrep integrated (local + CI/CD)
- ✅ Checkov scanning Dockerfiles and K8s manifests
- ✅ SARIF results uploaded to GitHub Security tab
- ✅ Quality gates enforce zero critical issues

#### Success Criteria
- SAST scans run on every push
- Results visible in GitHub Security → Code scanning
- Pipeline blocks merges with critical issues

#### Documentation
Add to `docs/SECURITY.md`:
```markdown
## SAST (Static Application Security Testing)

### Tools
- **Semgrep**: General code scanning
- **Checkov**: Infrastructure as Code scanning

### Scan Coverage
- JavaScript/TypeScript: XSS, injection, auth issues
- Python: SQL injection, command injection
- Dockerfile: Security best practices
- Kubernetes: CIS benchmarks, PSS violations

### Quality Gates
- ERROR severity → Pipeline fails
- WARNING severity → Alert but allow
- Scheduled weekly full scans
```

</details>

<details>
<summary><h3>Phase 4: Dependency Scanning (Week 2, Day 1-2)</h3></summary>

#### Tasks

- [ ] **Task 4.1: Enable GitHub Dependabot**
  
  Create `.github/dependabot.yml`:
  ```yaml
  version: 2
  updates:
    # Dependency updates for npm
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
        interval: "weekly"
      open-pull-requests-limit: 10
      reviewers:
        - "YOUR_GITHUB_USERNAME"
      labels:
        - "dependencies"
        - "security"
    
    # Docker base image updates
    - package-ecosystem: "docker"
      directory: "/docker"
      schedule:
        interval: "weekly"
      reviewers:
        - "YOUR_GITHUB_USERNAME"
    
    # GitHub Actions updates
    - package-ecosystem: "github-actions"
      directory: "/"
      schedule:
        interval: "weekly"
  ```

- [ ] **Task 4.2: Create Dependency Scan Workflow**
  
  Create `.github/workflows/security-dependencies.yml`:
  ```yaml
  name: Dependency Scanning
  
  on:
    push:
      branches: [ main ]
    pull_request:
      branches: [ main ]
    schedule:
      - cron: '0 0 * * 1'  # Monday midnight
  
  jobs:
    npm-audit:
      name: npm Audit
      runs-on: ubuntu-latest
      if: hashFiles('package.json') != ''
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '18'
        
        - name: Install dependencies
          run: npm ci
        
        - name: Run npm audit
          run: |
            npm audit --json > npm-audit.json
            npm audit --audit-level=high
        
        - name: Upload audit results
          uses: actions/upload-artifact@v3
          with:
            name: npm-audit-results
            path: npm-audit.json
          if: always()
    
    pip-audit:
      name: Python Dependency Audit
      runs-on: ubuntu-latest
      if: hashFiles('requirements.txt') != ''
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Setup Python
          uses: actions/setup-python@v4
          with:
            python-version: '3.11'
        
        - name: Install pip-audit
          run: pip install pip-audit
        
        - name: Run pip audit
          run: pip-audit --requirement requirements.txt
    
    snyk:
      name: Snyk Vulnerability Scan
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Run Snyk
          uses: snyk/actions/node@master
          env:
            SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
          with:
            args: --severity-threshold=high
  ```

- [ ] **Task 4.3: Set Up Snyk (Optional but Recommended)**
  ```bash
  # Sign up for free Snyk account at snyk.io
  # Get API token from Account Settings
  
  # Add to GitHub Secrets:
  # Settings → Secrets and variables → Actions → New repository secret
  # Name: SNYK_TOKEN
  # Value: <your-snyk-token>
  ```

- [ ] **Task 4.4: Create Dependency Review Action**
  
  Create `.github/workflows/dependency-review.yml`:
  ```yaml
  name: Dependency Review
  
  on:
    pull_request:
      branches: [ main ]
  
  permissions:
    contents: read
  
  jobs:
    dependency-review:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Dependency Review
          uses: actions/dependency-review-action@v3
          with:
            fail-on-severity: high
            allow-licenses: MIT, Apache-2.0, BSD-3-Clause, ISC
  ```

- [ ] **Task 4.5: Test Dependency Scanning**
  ```bash
  # Locally test npm audit (if using npm)
  npm audit
  npm audit fix  # Auto-fix non-breaking updates
  
  # Check for outdated packages
  npm outdated
  
  # For Python projects
  pip-audit -r requirements.txt
  ```

- [ ] **Task 4.6: Configure Vulnerability Alerts**
  
  In GitHub repository:
  - Settings → Security → Code security and analysis
  - Enable "Dependency graph"
  - Enable "Dependabot alerts"
  - Enable "Dependabot security updates"

- [ ] **Task 4.7: Create Dependency Update Policy**
  
  Create `docs/DEPENDENCY_POLICY.md`:
  ```markdown
  # Dependency Update Policy
  
  ## Update Frequency
  - **Critical vulnerabilities**: Immediate (within 24 hours)
  - **High vulnerabilities**: Within 1 week
  - **Medium/Low vulnerabilities**: Monthly cycle
  - **Regular updates**: Weekly Dependabot PRs
  
  ## Approval Process
  1. Dependabot creates PR
  2. CI/CD runs all security checks
  3. Review changelog for breaking changes
  4. Merge if tests pass
  
  ## Allowed Licenses
  - MIT
  - Apache-2.0
  - BSD-3-Clause
  - ISC
  
  ## Blocked Licenses
  - GPL (copyleft issues)
  - AGPL
  - Unlicensed packages
  ```

#### Deliverables
- ✅ Dependabot enabled and configured
- ✅ npm/pip audit in CI/CD
- ✅ Snyk integration (optional)
- ✅ Dependency review on PRs
- ✅ Vulnerability alerts enabled

#### Success Criteria
- Automated PRs for dependency updates
- CVE vulnerabilities trigger alerts
- Pipeline fails on high-severity issues
- License compliance enforced

</details>

<details>
<summary><h3>Phase 5: Container Security Scanning (Week 2, Day 3-5)</h3></summary>

#### Tasks

- [ ] **Task 5.1: Install Trivy Locally**
  ```bash
  # Install Trivy
  brew install aquasecurity/trivy/trivy
  
  # Verify
  trivy --version
  
  # Update vulnerability database
  trivy image --download-db-only
  ```

- [ ] **Task 5.2: Scan Local Docker Images**
  ```bash
  # Build your image
  docker build -t mywebsite:test -f docker/Dockerfile .
  
  # Scan for vulnerabilities
  trivy image mywebsite:test
  
  # Scan with severity filter
  trivy image --severity HIGH,CRITICAL mywebsite:test
  
  # Output to JSON
  trivy image --format json --output trivy-report.json mywebsite:test
  
  # Scan specific layers
  trivy image --scanners vuln,secret,config mywebsite:test
  ```

- [ ] **Task 5.3: Optimize Dockerfile for Security**
  
  Create `docker/Dockerfile.secure`:
  ```dockerfile
  # Multi-stage build
  FROM node:18-alpine AS builder
  
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  RUN npm run build
  
  # Production stage with minimal base image
  FROM nginx:alpine
  
  # Install security updates
  RUN apk update && \
      apk upgrade && \
      apk add --no-cache ca-certificates && \
      rm -rf /var/cache/apk/*
  
  # Create non-root user
  RUN addgroup -g 1001 -S appuser && \
      adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appuser -g appuser appuser
  
  # Copy built files from builder
  COPY --from=builder --chown=appuser:appuser /app/dist /usr/share/nginx/html
  
  # Copy nginx config
  COPY --chown=appuser:appuser docker/nginx.conf /etc/nginx/nginx.conf
  
  # Set proper permissions
  RUN chown -R appuser:appuser /usr/share/nginx/html && \
      chown -R appuser:appuser /var/cache/nginx && \
      chown -R appuser:appuser /var/log/nginx && \
      chown -R appuser:appuser /etc/nginx/conf.d && \
      touch /var/run/nginx.pid && \
      chown -R appuser:appuser /var/run/nginx.pid
  
  # Switch to non-root user
  USER appuser
  
  # Expose non-privileged port
  EXPOSE 8080
  
  # Health check
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
  
  CMD ["nginx", "-g", "daemon off;"]
  ```

- [ ] **Task 5.4: Create nginx.conf for Non-Root**
  
  Create `docker/nginx.conf`:
  ```nginx
  worker_processes auto;
  pid /var/run/nginx.pid;
  error_log /var/log/nginx/error.log warn;
  
  events {
      worker_connections 1024;
  }
  
  http {
      include /etc/nginx/mime.types;
      default_type application/octet-stream;
      
      log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
      
      access_log /var/log/nginx/access.log main;
      
      sendfile on;
      tcp_nopush on;
      keepalive_timeout 65;
      gzip on;
      
      # Security headers
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "no-referrer-when-downgrade" always;
      add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
      
      server {
          listen 8080;
          server_name localhost;
          
          root /usr/share/nginx/html;
          index index.html;
          
          location / {
              try_files $uri $uri/ /index.html;
          }
          
          # Deny access to hidden files
          location ~ /\. {
              deny all;
          }
      }
  }
  ```

- [ ] **Task 5.5: Create .dockerignore**
  ```
  # .dockerignore
  .git
  .github
  .gitignore
  README.md
  docs/
  node_modules/
  npm-debug.log
  .DS_Store
  .env
  .env.local
  *.md
  !README.md
  k8s/
  .vscode/
  .idea/
  ```

- [ ] **Task 5.6: Add Trivy to CI/CD Pipeline**
  
  Create `.github/workflows/security-container.yml`:
  ```yaml
  name: Container Security Scanning
  
  on:
    push:
      branches: [ main ]
    pull_request:
      branches: [ main ]
  
  env:
    IMAGE_NAME: mywebsite
    REGISTRY: ghcr.io
  
  jobs:
    build-and-scan:
      name: Build and Scan Container
      runs-on: ubuntu-latest
      permissions:
        contents: read
        packages: write
        security-events: write
      
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3
        
        - name: Build Docker image
          uses: docker/build-push-action@v5
          with:
            context: .
            file: docker/Dockerfile.secure
            push: false
            load: true
            tags: ${{ env.IMAGE_NAME }}:${{ github.sha }}
            cache-from: type=gha
            cache-to: type=gha,mode=max
        
        - name: Run Trivy vulnerability scanner
          uses: aquasecurity/trivy-action@master
          with:
            image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
            format: 'sarif'
            output: 'trivy-results.sarif'
            severity: 'CRITICAL,HIGH'
        
        - name: Upload Trivy results to GitHub Security
          uses: github/codeql-action/upload-sarif@v3
          with:
            sarif_file: 'trivy-results.sarif'
        
        - name: Run Trivy config scan
          uses: aquasecurity/trivy-action@master
          with:
            scan-type: 'config'
            scan-ref: '.'
            format: 'sarif'
            output: 'trivy-config.sarif'
        
        - name: Fail on critical vulnerabilities
          uses: aquasecurity/trivy-action@master
          with:
            image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
            format: 'table'
            exit-code: '1'
            severity: 'CRITICAL'
        
        - name: Generate SBOM
          uses: aquasecurity/trivy-action@master
          with:
            scan-type: 'image'
            format: 'cyclonedx'
            output: 'sbom.json'
            image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
        
        - name: Upload SBOM
          uses: actions/upload-artifact@v3
          with:
            name: sbom
            path: sbom.json
  ```

- [ ] **Task 5.7: Test Container Security Locally**
  ```bash
  # Build secure image
  docker build -t mywebsite:secure -f docker/Dockerfile.secure .
  
  # Scan for vulnerabilities
  trivy image mywebsite:secure
  
  # Verify non-root user
  docker run --rm mywebsite:secure id
  # Should output: uid=1001(appuser) gid=1001(appuser)
  
  # Test container runs correctly
  docker run -d -p 8080:8080 --name test mywebsite:secure
  curl http://localhost:8080
  docker stop test && docker rm test
  ```

- [ ] **Task 5.8: Create Container Security Policy**
  
  Create `docs/CONTAINER_SECURITY.md`:
  ```markdown
  # Container Security Standards
  
  ## Required Practices
  - ✅ Multi-stage builds (reduce attack surface)
  - ✅ Minimal base images (alpine, distroless)
  - ✅ Non-root user (UID > 1000)
  - ✅ Read-only root filesystem where possible
  - ✅ No secrets in images
  - ✅ Health checks defined
  - ✅ Security headers in nginx
  
  ## Scanning Requirements
  - Zero CRITICAL vulnerabilities
  - < 5 HIGH vulnerabilities
  - Regular base image updates
  - SBOM generated for every build
  
  ## Approved Base Images
  - nginx:alpine
  - node:18-alpine
  - python:3.11-alpine
  - gcr.io/distroless/static-debian11
  ```

#### Deliverables
- ✅ Trivy integrated (local + CI/CD)
- ✅ Secure multi-stage Dockerfile
- ✅ Non-root container user
- ✅ SBOM generation
- ✅ Container scanning in pipeline

#### Success Criteria
- All images scanned before deployment
- Zero critical vulnerabilities
- SBOM available for every release
- Non-root user verified

</details>

<details>
<summary><h3>Phase 6: Image Signing with Cosign (Week 2, Day 6-7)</h3></summary>

#### Tasks

- [ ] **Task 6.1: Install Cosign**
  ```bash
  # Install Cosign
  brew install cosign
  
  # Verify installation
  cosign version
  ```

- [ ] **Task 6.2: Generate Signing Keys**
  ```bash
  # Generate key pair (password protected)
  cosign generate-key-pair
  
  # This creates:
  # - cosign.key (private key - NEVER commit this)
  # - cosign.pub (public key - can be shared)
  
  # Store private key securely
  # Add to .gitignore
  echo "cosign.key" >> .gitignore
  ```

- [ ] **Task 6.3: Add Cosign Keys to GitHub Secrets**
  ```bash
  # Get base64 encoded private key
  cat cosign.key | base64
  
  # Add to GitHub Secrets:
  # Settings → Secrets → Actions → New repository secret
  # Name: COSIGN_PRIVATE_KEY
  # Value: <base64-encoded-private-key>
  
  # Name: COSIGN_PASSWORD
  # Value: <password-you-used-when-generating>
  ```

- [ ] **Task 6.4: Update CI/CD Pipeline with Signing**
  
  Update `.github/workflows/security-container.yml`:
  ```yaml
  # Add to existing workflow after build step
  
        - name: Install Cosign
          uses: sigstore/cosign-installer@main
        
        - name: Login to GitHub Container Registry
          uses: docker/login-action@v3
          with:
            registry: ghcr.io
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}
        
        - name: Push image to registry
          run: |
            docker tag ${{ env.IMAGE_NAME }}:${{ github.sha }} \
              ghcr.io/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            docker push ghcr.io/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        
        - name: Sign container image
          env:
            COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
          run: |
            echo "${{ secrets.COSIGN_PRIVATE_KEY }}" | base64 -d > cosign.key
            cosign sign --key cosign.key \
              ghcr.io/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            rm cosign.key
        
        - name: Verify signature
          run: |
            cosign verify --key cosign.pub \
              ghcr.io/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
  ```

- [ ] **Task 6.5: Test Local Image Signing**
  ```bash
  # Build image
  docker build -t mywebsite:signed -f docker/Dockerfile.secure .
  
  # Tag for local registry
  docker tag mywebsite:signed localhost:5000/mywebsite:signed
  
  # Run local registry (if needed)
  docker run -d -p 5000:5000 --name registry registry:2
  
  # Push to local registry
  docker push localhost:5000/mywebsite:signed
  
  # Sign the image
  cosign sign --key cosign.key localhost:5000/mywebsite:signed
  
  # Verify signature
  cosign verify --key cosign.pub localhost:5000/mywebsite:signed
  
  # Clean up
  docker stop registry && docker rm registry
  ```

- [ ] **Task 6.6: Create Signature Verification Policy**
  
  Create `k8s/base/image-policy.yaml`:
  ```yaml
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: image-verification-policy
  data:
    policy.json: |
      {
        "apiVersion": "policy.sigstore.dev/v1beta1",
        "kind": "ClusterImagePolicy",
        "metadata": {
          "name": "signed-images-only"
        },
        "spec": {
          "images": [
            {
              "glob": "ghcr.io/YOUR_USERNAME/*"
            }
          ],
          "authorities": [
            {
              "key": {
                "data": "-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"
              }
            }
          ]
        }
      }
  ```

- [ ] **Task 6.7: Document Signature Verification**
  
  Create `docs/IMAGE_SIGNING.md`:
  ```markdown
  # Container Image Signing
  
  ## Overview
  All production container images are signed using Cosign.
  
  ## Verification
  
  ### Verify an image signature:
  ```bash
  cosign verify --key cosign.pub ghcr.io/USERNAME/mywebsite:TAG
  ```
  
  ### Expected output:
  ```
  Verification for ghcr.io/USERNAME/mywebsite:TAG --
  The following checks were performed on each of these signatures:
    - The cosign claims were validated
    - The signatures were verified against the specified public key
  ```
  
  ## Public Key
  Located at: `cosign.pub` in repository root
  
  ## Policy
  - Only signed images deployed to production
  - Kubernetes admission controller enforces signature verification
  - Unsigned images rejected at deployment time
  ```

#### Deliverables
- ✅ Cosign integrated into CI/CD
- ✅ All images signed before deployment
- ✅ Signature verification in pipeline
- ✅ Public key documented

#### Success Criteria
- Every production image has valid signature
- Signature verification passes in CI/CD
- Public key available for verification

</details>

<details>
<summary><h3>Phase 7: Kubernetes Cluster Setup (Week 3, Day 1-3)</h3></summary>

#### Tasks

- [ ] **Task 7.1: Choose Kubernetes Platform**
  
  **Option A: Docker Desktop Kubernetes (Easiest for Mac)**
  ```bash
  # Enable in Docker Desktop Settings → Kubernetes → Enable
  # Verify
  kubectl cluster-info
  kubectl get nodes
  ```
  
  **Option B: Minikube (More features)**
  ```bash
  # Install
  brew install minikube
  
  # Start cluster
  minikube start --driver=docker --cpus=4 --memory=8192
  
  # Verify
  kubectl get nodes
  ```
  
  **Option C: Google GKE (Production-like)**
  ```bash
  # Install gcloud CLI
  brew install google-cloud-sdk
  
  # Authenticate
  gcloud auth login
  gcloud config set project YOUR_PROJECT_ID
  
  # Create cluster (free tier: 1 zonal cluster)
  gcloud container clusters create secure-pipeline \
    --zone=us-central1-a \
    --num-nodes=2 \
    --machine-type=e2-medium \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=3 \
    --enable-network-policy \
    --workload-pool=YOUR_PROJECT_ID.svc.id.goog
  
  # Get credentials
  gcloud container clusters get-credentials secure-pipeline \
    --zone=us-central1-a
  
  # Verify
  kubectl get nodes
  ```

- [ ] **Task 7.2: Install Essential Cluster Tools**
  ```bash
  # Install k9s (terminal UI)
  brew install k9s
  
  # Install kubectx and kubens (context/namespace switcher)
  brew install kubectx
  
  # Install Helm
  brew install helm
  
  # Verify
  k9s version
  helm version
  ```

- [ ] **Task 7.3: Create Namespace Structure**
  ```bash
  # Create namespaces
  kubectl create namespace production
  kubectl create namespace staging
  kubectl create namespace monitoring
  kubectl create namespace security
  
  # Label namespaces
  kubectl label namespace production environment=production
  kubectl label namespace staging environment=staging
  
  # Verify
  kubectl get namespaces --show-labels
  ```

- [ ] **Task 7.4: Set Up RBAC (Role-Based Access Control)**
  
  Create `k8s/base/rbac.yaml`:
  ```yaml
  ---
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: website-deployer
    namespace: production
  
  ---
  apiVersion: rbac.authorization.k8s.io/v1
  kind: Role
  metadata:
    name: website-deployer-role
    namespace: production
  rules:
    - apiGroups: ["apps"]
      resources: ["deployments", "replicasets"]
      verbs: ["get", "list", "watch", "create", "update", "patch"]
    - apiGroups: [""]
      resources: ["pods", "services", "configmaps", "secrets"]
      verbs: ["get", "list", "watch", "create", "update", "patch"]
    - apiGroups: [""]
      resources: ["pods/log"]
      verbs: ["get", "list"]
  
  ---
  apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    name: website-deployer-binding
    namespace: production
  roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: Role
    name: website-deployer-role
  subjects:
    - kind: ServiceAccount
      name: website-deployer
      namespace: production
  ```
  
  Apply:
  ```bash
  kubectl apply -f k8s/base/rbac.yaml
  ```

- [ ] **Task 7.5: Enable Pod Security Standards**
  
  Create `k8s/base/pod-security.yaml`:
  ```yaml
  apiVersion: v1
  kind: Namespace
  metadata:
    name: production
    labels:
      pod-security.kubernetes.io/enforce: restricted
      pod-security.kubernetes.io/audit: restricted
      pod-security.kubernetes.io/warn: restricted
  ```
  
  Apply:
  ```bash
  kubectl apply -f k8s/base/pod-security.yaml
  ```

- [ ] **Task 7.6: Install Ingress Controller**
  ```bash
  # Install nginx ingress controller
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
  
  # Wait for deployment
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s
  
  # Verify
  kubectl get pods -n ingress-nginx
  kubectl get svc -n ingress-nginx
  ```

- [ ] **Task 7.7: Set Up Persistent Storage (if needed)**
  
  Create `k8s/base/storage-class.yaml`:
  ```yaml
  apiVersion: storage.k8s.io/v1
  kind: StorageClass
  metadata:
    name: fast-ssd
  provisioner: kubernetes.io/gce-pd  # For GKE
  # provisioner: k8s.io/minikube-hostpath  # For Minikube
  parameters:
    type: pd-ssd
    replication-type: regional-pd
  allowVolumeExpansion: true
  ```
  
  Apply:
  ```bash
  kubectl apply -f k8s/base/storage-class.yaml
  ```

- [ ] **Task 7.8: Configure kubectl Context**
  ```bash
  # View contexts
  kubectl config get-contexts
  
  # Set default namespace
  kubectl config set-context --current --namespace=production
  
  # Create aliases (add to ~/.zshrc or ~/.bashrc)
  echo "alias k='kubectl'" >> ~/.zshrc
  echo "alias kgp='kubectl get pods'" >> ~/.zshrc
  echo "alias kgs='kubectl get svc'" >> ~/.zshrc
  echo "alias kgd='kubectl get deployments'" >> ~/.zshrc
  
  source ~/.zshrc
  ```

#### Deliverables
- ✅ Kubernetes cluster running
- ✅ Namespaces created and labeled
- ✅ RBAC configured
- ✅ Pod Security Standards enabled
- ✅ Ingress controller installed

#### Success Criteria
- `kubectl get nodes` shows Ready nodes
- All system pods running
- Namespaces properly isolated
- RBAC restricts access appropriately

#### Documentation
Create `docs/KUBERNETES_SETUP.md`:
```markdown
# Kubernetes Cluster Configuration

## Cluster Details
- Platform: [Docker Desktop / Minikube / GKE]
- Version: [kubectl version]
- Nodes: [number]

## Namespaces
- `production`: Production workloads
- `staging`: Staging environment
- `monitoring`: Monitoring stack
- `security`: Security tools

## Access
```bash
# Connect to cluster
kubectl config use-context [context-name]

# Switch namespace
kubens production
```

## Installed Components
- Ingress Controller: nginx
- Storage Class: [name]
- RBAC: Configured
- PSS: Restricted mode
```

</details>

<details>
<summary><h3>Phase 8: Secure Kubernetes Deployment (Week 3, Day 4-7)</h3></summary>

#### Tasks

- [ ] **Task 8.1: Create Base Deployment Manifest**
  
  Create `k8s/base/deployment.yaml`:
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: website
    namespace: production
    labels:
      app: website
      env: production
      owner: rishabh
  spec:
    replicas: 2
    strategy:
      type: RollingUpdate
      rollingUpdate:
        maxSurge: 1
        maxUnavailable: 0
    selector:
      matchLabels:
        app: website
    template:
      metadata:
        labels:
          app: website
          env: production
        annotations:
          prometheus.io/scrape: "true"
          prometheus.io/port: "8080"
          prometheus.io/path: "/metrics"
      spec:
        serviceAccountName: website-deployer
        
        # Security Context (Pod-level)
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          fsGroup: 1001
          seccompProfile:
            type: RuntimeDefault
        
        containers:
        - name: web
          image: ghcr.io/YOUR_USERNAME/mywebsite:latest
          imagePullPolicy: Always
          
          # Security Context (Container-level)
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1001
            capabilities:
              drop:
                - ALL
          
          ports:
          - name: http
            containerPort: 8080
            protocol: TCP
          
          # Resource limits
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          
          # Liveness probe
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          
          # Readiness probe
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          
          # Environment variables
          env:
          - name: NODE_ENV
            value: "production"
          - name: PORT
            value: "8080"
          
          # Volume mounts for writable directories
          volumeMounts:
          - name: tmp
            mountPath: /tmp
          - name: cache
            mountPath: /var/cache/nginx
          - name: run
            mountPath: /var/run
        
        volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
  ```

- [ ] **Task 8.2: Create Service**
  
  Create `k8s/base/service.yaml`:
  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    name: website-service
    namespace: production
    labels:
      app: website
  spec:
    type: ClusterIP
    selector:
      app: website
    ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
    sessionAffinity: ClientIP
    sessionAffinityConfig:
      clientIP:
        timeoutSeconds: 3600
  ```

- [ ] **Task 8.3: Create Ingress**
  
  Create `k8s/base/ingress.yaml`:
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: website-ingress
    namespace: production
    annotations:
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/rate-limit: "100"
      nginx.ingress.kubernetes.io/configuration-snippet: |
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  spec:
    ingressClassName: nginx
    tls:
    - hosts:
      - your-domain.com
      secretName: website-tls
    rules:
    - host: your-domain.com
      http:
        paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: website-service
              port:
                number: 80
  ```

- [ ] **Task 8.4: Create ConfigMap**
  
  Create `k8s/base/configmap.yaml`:
  ```yaml
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: website-config
    namespace: production
  data:
    app.conf: |
      # Application configuration
      LOG_LEVEL=info
      CACHE_TTL=3600
      MAX_REQUESTS_PER_MINUTE=100
  ```

- [ ] **Task 8.5: Create HorizontalPodAutoscaler**
  
  Create `k8s/base/hpa.yaml`:
  ```yaml
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: website-hpa
    namespace: production
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: website
    minReplicas: 2
    maxReplicas: 10
    metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    behavior:
      scaleDown:
        stabilizationWindowSeconds: 300
        policies:
        - type: Percent
          value: 50
          periodSeconds: 60
      scaleUp:
        stabilizationWindowSeconds: 0
        policies:
        - type: Percent
          value: 100
          periodSeconds: 30
  ```

- [ ] **Task 8.6: Create Network Policy**
  
  Create `k8s/base/network-policy.yaml`:
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: website-netpol
    namespace: production
  spec:
    podSelector:
      matchLabels:
        app: website
    policyTypes:
    - Ingress
    - Egress
    
    ingress:
    # Allow from ingress controller
    - from:
      - namespaceSelector:
          matchLabels:
            name: ingress-nginx
      ports:
      - protocol: TCP
        port: 8080
    
    # Allow from monitoring
    - from:
      - namespaceSelector:
          matchLabels:
            name: monitoring
      ports:
      - protocol: TCP
        port: 8080
    
    egress:
    # Allow DNS
    - to:
      - namespaceSelector: {}
        podSelector:
          matchLabels:
            k8s-app: kube-dns
      ports:
      - protocol: UDP
        port: 53
    
    # Allow HTTPS to external services
    - to:
      - namespaceSelector: {}
      ports:
      - protocol: TCP
        port: 443
  ```

- [ ] **Task 8.7: Create Kustomization**
  
  Create `k8s/base/kustomization.yaml`:
  ```yaml
  apiVersion: kustomize.config.k8s.io/v1beta1
  kind: Kustomization
  
  namespace: production
  
  commonLabels:
    app: website
    managed-by: kustomize
  
  resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - configmap.yaml
  - hpa.yaml
  - network-policy.yaml
  - rbac.yaml
  - pod-security.yaml
  
  images:
  - name: ghcr.io/YOUR_USERNAME/mywebsite
    newTag: latest
  ```

- [ ] **Task 8.8: Deploy to Kubernetes**
  ```bash
  # Build kustomization
  kubectl kustomize k8s/base
  
  # Dry run
  kubectl apply -k k8s/base --dry-run=client
  
  # Apply
  kubectl apply -k k8s/base
  
  # Watch rollout
  kubectl rollout status deployment/website -n production
  
  # Verify deployment
  kubectl get all -n production
  kubectl get networkpolicy -n production
  kubectl get hpa -n production
  ```

- [ ] **Task 8.9: Test Deployment**
  ```bash
  # Port forward to test locally
  kubectl port-forward -n production svc/website-service 8080:80
  
  # Test in browser
  open http://localhost:8080
  
  # Check logs
  kubectl logs -n production -l app=website --tail=100
  
  # Describe pod for security context verification
  kubectl describe pod -n production -l app=website
  ```

- [ ] **Task 8.10: Create Deployment Runbook**
  
  Create `docs/DEPLOYMENT.md`:
  ```markdown
  # Deployment Runbook
  
  ## Prerequisites
  - kubectl configured
  - Access to cluster
  - Image pushed to registry
  
  ## Deployment Steps
  
  ### 1. Update image tag
  ```bash
  cd k8s/base
  kustomize edit set image ghcr.io/USERNAME/mywebsite:NEW_TAG
  ```
  
  ### 2. Deploy
  ```bash
  kubectl apply -k k8s/base
  kubectl rollout status deployment/website -n production
  ```
  
  ### 3. Verify
  ```bash
  kubectl get pods -n production
  kubectl get svc -n production
  curl -I https://your-domain.com
  ```
  
  ### 4. Rollback (if needed)
  ```bash
  kubectl rollout undo deployment/website -n production
  kubectl rollout status deployment/website -n production
  ```
  
  ## Health Checks
  - Liveness: `http://POD_IP:8080/`
  - Readiness: `http://POD_IP:8080/`
  
  ## Troubleshooting
  ```bash
  # Check pod status
  kubectl get pods -n production
  
  # View logs
  kubectl logs -n production -l app=website
  
  # Describe pod
  kubectl describe pod -n production POD_NAME
  
  # Events
  kubectl get events -n production --sort-by='.lastTimestamp'
  ```
  ```

#### Deliverables
- ✅ Secure Kubernetes manifests
- ✅ Network policies enforced
- ✅ Pod Security Standards applied
- ✅ Autoscaling configured
- ✅ Application deployed and running

#### Success Criteria
- Deployment passes PSS restricted mode
- Network policy restricts traffic correctly
- HPA scales based on load
- All health checks passing
- No privileged containers

</details>

<details>
<summary><h3>Phase 9: CI/CD Integration with Kubernetes (Week 4, Day 1-3)</h3></summary>

#### Tasks

- [ ] **Task 9.1: Set Up GitHub Container Registry**
  ```bash
  # Create personal access token (PAT)
  # GitHub → Settings → Developer settings → Personal access tokens → Generate new token
  # Scopes: write:packages, read:packages, delete:packages
  
  # Login to GHCR
  echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
  
  # Test push
  docker tag mywebsite:latest ghcr.io/YOUR_USERNAME/mywebsite:latest
  docker push ghcr.io/YOUR_USERNAME/mywebsite:latest
  ```

- [ ] **Task 9.2: Add Kubernetes Credentials to GitHub Secrets**
  
  For GKE:
  ```bash
  # Create service account for GitHub Actions
  gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"
  
  # Grant permissions
  gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"
  
  # Create key
  gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
  
  # Add to GitHub Secrets:
  # GKE_PROJECT: YOUR_PROJECT_ID
  # GKE_SA_KEY: (contents of github-actions-key.json)
  # GKE_CLUSTER: secure-pipeline
  # GKE_ZONE: us-central1-a
  ```
  
  For other clusters:
  ```bash
  # Get kubeconfig
  kubectl config view --raw --minify
  
  # Add to GitHub Secrets:
  # KUBE_CONFIG: (base64 encoded kubeconfig)
  ```

- [ ] **Task 9.3: Create Complete CI/CD Pipeline**
  
  Create `.github/workflows/cicd-pipeline.yml`:
  ```yaml
  name: CI/CD Pipeline
  
  on:
    push:
      branches: [ main ]
    pull_request:
      branches: [ main ]
  
  env:
    IMAGE_NAME: mywebsite
    REGISTRY: ghcr.io
    GKE_CLUSTER: secure-pipeline
    GKE_ZONE: us-central1-a
    DEPLOYMENT_NAME: website
    NAMESPACE: production
  
  jobs:
    # Stage 1: Security Scanning
    security-checks:
      name: Security Checks
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
          with:
            fetch-depth: 0
        
        - name: Secret Scanning
          uses: trufflesecurity/trufflehog@main
          with:
            path: ./
            base: ${{ github.event.repository.default_branch }}
            head: HEAD
        
        - name: SAST Scanning
          uses: returntocorp/semgrep-action@v1
          with:
            config: auto
        
        - name: Dependency Scanning
          run: |
            npm audit --audit-level=high || true
    
    # Stage 2: Build & Container Scan
    build-and-scan:
      name: Build and Scan
      needs: security-checks
      runs-on: ubuntu-latest
      permissions:
        contents: read
        packages: write
        security-events: write
      outputs:
        image-tag: ${{ steps.meta.outputs.tags }}
      
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3
        
        - name: Log in to GitHub Container Registry
          uses: docker/login-action@v3
          with:
            registry: ${{ env.REGISTRY }}
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}
        
        - name: Extract metadata
          id: meta
          uses: docker/metadata-action@v5
          with:
            images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}
            tags: |
              type=ref,event=branch
              type=ref,event=pr
              type=semver,pattern={{version}}
              type=semver,pattern={{major}}.{{minor}}
              type=sha,prefix={{branch}}-
        
        - name: Build Docker image
          uses: docker/build-push-action@v5
          with:
            context: .
            file: docker/Dockerfile.secure
            push: false
            load: true
            tags: ${{ steps.meta.outputs.tags }}
            cache-from: type=gha
            cache-to: type=gha,mode=max
        
        - name: Run Trivy vulnerability scanner
          uses: aquasecurity/trivy-action@master
          with:
            image-ref: ${{ steps.meta.outputs.tags }}
            format: 'sarif'
            output: 'trivy-results.sarif'
        
        - name: Upload Trivy results
          uses: github/codeql-action/upload-sarif@v3
          with:
            sarif_file: 'trivy-results.sarif'
        
        - name: Fail on critical vulnerabilities
          uses: aquasecurity/trivy-action@master
          with:
            image-ref: ${{ steps.meta.outputs.tags }}
            exit-code: '1'
            severity: 'CRITICAL'
        
        - name: Push image to registry
          if: github.ref == 'refs/heads/main'
          uses: docker/build-push-action@v5
          with:
            context: .
            file: docker/Dockerfile.secure
            push: true
            tags: ${{ steps.meta.outputs.tags }}
        
        - name: Install Cosign
          if: github.ref == 'refs/heads/main'
          uses: sigstore/cosign-installer@main
        
        - name: Sign container image
          if: github.ref == 'refs/heads/main'
          env:
            COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
          run: |
            echo "${{ secrets.COSIGN_PRIVATE_KEY }}" | base64 -d > cosign.key
            cosign sign --key cosign.key \
              ${{ steps.meta.outputs.tags }}
            rm cosign.key
    
    # Stage 3: Deploy to Kubernetes
    deploy:
      name: Deploy to Kubernetes
      needs: build-and-scan
      runs-on: ubuntu-latest
      if: github.ref == 'refs/heads/main'
      environment:
        name: production
        url: https://your-domain.com
      
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Authenticate to Google Cloud
          uses: google-github-actions/auth@v2
          with:
            credentials_json: ${{ secrets.GKE_SA_KEY }}
        
        - name: Set up Cloud SDK
          uses: google-github-actions/setup-gcloud@v2
        
        - name: Get GKE credentials
          run: |
            gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} \
              --zone ${{ env.GKE_ZONE }}
        
        - name: Set up kubectl
          uses: azure/setup-kubectl@v3
        
        - name: Update deployment image
          run: |
            kubectl set image deployment/${{ env.DEPLOYMENT_NAME }} \
              web=${{ needs.build-and-scan.outputs.image-tag }} \
              -n ${{ env.NAMESPACE }}
        
        - name: Wait for rollout
          run: |
            kubectl rollout status deployment/${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }} \
              --timeout=5m
        
        - name: Verify deployment
          run: |
            kubectl get deployment ${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }}
            kubectl get pods -n ${{ env.NAMESPACE }} \
              -l app=website
        
        - name: Run smoke tests
          run: |
            kubectl run test-pod --rm -i --restart=Never \
              --image=curlimages/curl:latest \
              -n ${{ env.NAMESPACE }} \
              -- curl -s -o /dev/null -w "%{http_code}" \
              http://website-service
    
    # Stage 4: Post-Deployment Validation
    validate:
      name: Post-Deployment Validation
      needs: deploy
      runs-on: ubuntu-latest
      if: github.ref == 'refs/heads/main'
      
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Authenticate to Google Cloud
          uses: google-github-actions/auth@v2
          with:
            credentials_json: ${{ secrets.GKE_SA_KEY }}
        
        - name: Get GKE credentials
          run: |
            gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} \
              --zone ${{ env.GKE_ZONE }}
        
        - name: Check Pod Security
          run: |
            kubectl get pods -n ${{ env.NAMESPACE }} \
              -l app=website \
              -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext}{"\n"}{end}'
        
        - name: Verify Network Policy
          run: |
            kubectl get networkpolicy -n ${{ env.NAMESPACE }}
        
        - name: Check Resource Limits
          run: |
            kubectl describe deployment ${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }} | grep -A 5 "Limits\|Requests"
        
        - name: Notify on Success
          if: success()
          run: |
            echo "✅ Deployment successful!"
            echo "Image: ${{ needs.build-and-scan.outputs.image-tag }}"
  ```

- [ ] **Task 9.4: Test CI/CD Pipeline**
  ```bash
  # Make a small change
  echo "<!-- Pipeline test -->" >> index.html
  
  # Commit and push
  git add index.html
  git commit -m "test: trigger CI/CD pipeline"
  git push origin main
  
  # Watch GitHub Actions
  # Navigate to: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
  ```

- [ ] **Task 9.5: Create Rollback Procedure**
  
  Create `.github/workflows/rollback.yml`:
  ```yaml
  name: Rollback Deployment
  
  on:
    workflow_dispatch:
      inputs:
        revision:
          description: 'Revision to rollback to (0 for previous)'
          required: false
          default: '0'
  
  env:
    GKE_CLUSTER: secure-pipeline
    GKE_ZONE: us-central1-a
    DEPLOYMENT_NAME: website
    NAMESPACE: production
  
  jobs:
    rollback:
      name: Rollback to Previous Version
      runs-on: ubuntu-latest
      
      steps:
        - name: Authenticate to Google Cloud
          uses: google-github-actions/auth@v2
          with:
            credentials_json: ${{ secrets.GKE_SA_KEY }}
        
        - name: Get GKE credentials
          run: |
            gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} \
              --zone ${{ env.GKE_ZONE }}
        
        - name: Show rollout history
          run: |
            kubectl rollout history deployment/${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }}
        
        - name: Rollback deployment
          run: |
            kubectl rollout undo deployment/${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }} \
              --to-revision=${{ github.event.inputs.revision }}
        
        - name: Wait for rollback
          run: |
            kubectl rollout status deployment/${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }}
        
        - name: Verify rollback
          run: |
            kubectl get deployment ${{ env.DEPLOYMENT_NAME }} \
              -n ${{ env.NAMESPACE }}
  ```

- [ ] **Task 9.6: Set Up GitHub Environments**
  
  In GitHub repository:
  - Settings → Environments → New environment
  - Name: `production`
  - Environment protection rules:
    - ✅ Required reviewers (add yourself)
    - ✅ Wait timer: 5 minutes (optional)
  - Environment secrets: (add if needed)

- [ ] **Task 9.7: Create Pipeline Dashboard**
  
  Add status badges to `README.md`:
  ```markdown
  # Secure CI/CD Pipeline Project
  
  ![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/CD%20Pipeline/badge.svg)
  ![Security Scanning](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Security%20Scanning/badge.svg)
  
  ## Pipeline Status
  - **Last Deployment**: [View](https://github.com/YOUR_USERNAME/YOUR_REPO/actions)
  - **Production**: https://your-domain.com
  - **Monitoring**: [Grafana Dashboard](http://your-monitoring-url)
  ```

#### Deliverables
- ✅ Complete CI/CD pipeline (build → scan → deploy)
- ✅ Automated deployments to Kubernetes
- ✅ Image signing in pipeline
- ✅ Rollback procedure
- ✅ Environment protection rules

#### Success Criteria
- Pipeline completes successfully on main branch
- Deployment updates Kubernetes automatically
- Rollback workflow tested
- All security gates passing

</details>

<details>
<summary><h3>Phase 10: Policy Enforcement (Week 4, Day 4-5)</h3></summary>

#### Tasks

- [ ] **Task 10.1: Install OPA Gatekeeper**
  ```bash
  # Add Gatekeeper repo
  helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
  helm repo update
  
  # Install Gatekeeper
  helm install gatekeeper/gatekeeper \
    --name-template=gatekeeper \
    --namespace gatekeeper-system \
    --create-namespace
  
  # Verify installation
  kubectl get pods -n gatekeeper-system
  kubectl get crd | grep gatekeeper
  ```

- [ ] **Task 10.2: Create Constraint Templates**
  
  Create `k8s/policies/require-labels-template.yaml`:
  ```yaml
  apiVersion: templates.gatekeeper.sh/v1
  kind: ConstraintTemplate
  metadata:
    name: k8srequiredlabels
    annotations:
      description: "Requires specified labels to be present on all resources"
  spec:
    crd:
      spec:
        names:
          kind: K8sRequiredLabels
        validation:
          openAPIV3Schema:
            type: object
            properties:
              labels:
                type: array
                items:
                  type: string
    targets:
      - target: admission.k8s.gatekeeper.sh
        rego: |
          package k8srequiredlabels
          
          violation[{"msg": msg, "details": {"missing_labels": missing}}] {
            provided := {label | input.review.object.metadata.labels[label]}
            required := {label | label := input.parameters.labels[_]}
            missing := required - provided
            count(missing) > 0
            msg := sprintf("You must provide labels: %v", [missing])
          }
  ```

- [ ] **Task 10.3: Create Constraints**
  
  Create `k8s/policies/require-labels-constraint.yaml`:
  ```yaml
  apiVersion: constraints.gatekeeper.sh/v1beta1
  kind: K8sRequiredLabels
  metadata:
    name: deployment-must-have-labels
  spec:
    match:
      kinds:
        - apiGroups: ["apps"]
          kinds: ["Deployment"]
      namespaces:
        - production
    parameters:
      labels:
        - app
        - env
        - owner
  ```

- [ ] **Task 10.4: Create Container Security Policies**
  
  Create `k8s/policies/container-limits-template.yaml`:
  ```yaml
  apiVersion: templates.gatekeeper.sh/v1
  kind: ConstraintTemplate
  metadata:
    name: k8scontainerlimits
  spec:
    crd:
      spec:
        names:
          kind: K8sContainerLimits
    targets:
      - target: admission.k8s.gatekeeper.sh
        rego: |
          package k8scontainerlimits
          
          violation[{"msg": msg}] {
            container := input.review.object.spec.template.spec.containers[_]
            not container.resources.limits.cpu
            msg := sprintf("Container %v must specify CPU limits", [container.name])
          }
          
          violation[{"msg": msg}] {
            container := input.review.object.spec.template.spec.containers[_]
            not container.resources.limits.memory
            msg := sprintf("Container %v must specify memory limits", [container.name])
          }
          
          violation[{"msg": msg}] {
            container := input.review.object.spec.template.spec.containers[_]
            not container.securityContext.readOnlyRootFilesystem == true
            msg := sprintf("Container %v must use read-only root filesystem", [container.name])
          }
  ```
  
  Create `k8s/policies/container-limits-constraint.yaml`:
  ```yaml
  apiVersion: constraints.gatekeeper.sh/v1beta1
  kind: K8sContainerLimits
  metadata:
    name: container-must-have-limits
  spec:
    match:
      kinds:
        - apiGroups: ["apps"]
          kinds: ["Deployment", "StatefulSet", "DaemonSet"]
      namespaces:
        - production
  ```

- [ ] **Task 10.5: Create Image Registry Policy**
  
  Create `k8s/policies/allowed-repos-template.yaml`:
  ```yaml
  apiVersion: templates.gatekeeper.sh/v1
  kind: ConstraintTemplate
  metadata:
    name: k8sallowedrepos
  spec:
    crd:
      spec:
        names:
          kind: K8sAllowedRepos
        validation:
          openAPIV3Schema:
            type: object
            properties:
              repos:
                type: array
                items:
                  type: string
    targets:
      - target: admission.k8s.gatekeeper.sh
        rego: |
          package k8sallowedrepos
          
          violation[{"msg": msg}] {
            container := input.review.object.spec.template.spec.containers[_]
            satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
            not any(satisfied)
            msg := sprintf("Container %v has invalid image %v, must be from approved registries: %v", [container.name, container.image, input.parameters.repos])
          }
  ```
  
  Create `k8s/policies/allowed-repos-constraint.yaml`:
  ```yaml
  apiVersion: constraints.gatekeeper.sh/v1beta1
  kind: K8sAllowedRepos
  metadata:
    name: allowed-image-repos
  spec:
    match:
      kinds:
        - apiGroups: ["apps"]
          kinds: ["Deployment"]
      namespaces:
        - production
    parameters:
      repos:
        - "ghcr.io/YOUR_USERNAME/"
        - "gcr.io/YOUR_PROJECT/"
  ```

- [ ] **Task 10.6: Apply Policies**
  ```bash
  # Apply constraint templates
  kubectl apply -f k8s/policies/require-labels-template.yaml
  kubectl apply -f k8s/policies/container-limits-template.yaml
  kubectl apply -f k8s/policies/allowed-repos-template.yaml
  
  # Wait for templates to be ready
  kubectl wait --for=condition=established \
    crd/k8srequiredlabels.constraints.gatekeeper.sh \
    crd/k8scontainerlimits.constraints.gatekeeper.sh \
    crd/k8sallowedrepos.constraints.gatekeeper.sh
  
  # Apply constraints
  kubectl apply -f k8s/policies/require-labels-constraint.yaml
  kubectl apply -f k8s/policies/container-limits-constraint.yaml
  kubectl apply -f k8s/policies/allowed-repos-constraint.yaml
  
  # Verify
  kubectl get constraints
  ```

- [ ] **Task 10.7: Test Policy Enforcement**
  
  Create test deployment that violates policies:
  ```bash
  # Create test deployment without required labels
  cat <<EOF | kubectl apply -f - 2>&1 | grep -i "denied\|error"
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: test-violation
    namespace: production
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: test
    template:
      metadata:
        labels:
          app: test
      spec:
        containers:
        - name: nginx
          image: nginx:latest
  EOF
  
  # Should fail with: "You must provide labels: [env, owner]"
  ```

- [ ] **Task 10.8: Create Policy Audit Dashboard**
  ```bash
  # Check policy violations
  kubectl get constraints -o json | \
    jq '.items[] | {name: .metadata.name, violations: .status.totalViolations}'
  
  # Get detailed violations
  kubectl get k8srequiredlabels deployment-must-have-labels -o yaml
  ```

- [ ] **Task 10.9: Document Policies**
  
  Create `docs/POLICIES.md`:
  ```markdown
  # Policy Enforcement
  
  ## OPA Gatekeeper Policies
  
  ### Required Labels Policy
  **Enforcement**: All Deployments must have labels: `app`, `env`, `owner`
  **Scope**: production namespace
  **Action**: Block deployment if missing
  
  ### Container Limits Policy
  **Enforcement**: All containers must specify CPU and memory limits
  **Enforcement**: Read-only root filesystem required
  **Scope**: production namespace
  **Action**: Block deployment if missing
  
  ### Allowed Registries Policy
  **Enforcement**: Images must come from approved registries
  **Approved**: ghcr.io/YOUR_USERNAME/, gcr.io/YOUR_PROJECT/
  **Scope**: production namespace
  **Action**: Block deployment if from unapproved registry
  
  ## Testing Policies
  ```bash
  # Test deployment against policies
  kubectl apply --dry-run=server -f deployment.yaml
  
  # View violations
  kubectl get constraints
  ```
  
  ## Adding New Policies
  1. Create ConstraintTemplate
  2. Create Constraint
  3. Test in staging first
  4. Apply to production
  ```

#### Deliverables
- ✅ OPA Gatekeeper installed
- ✅ Constraint templates created
- ✅ Policies enforced in production
- ✅ Policy violations blocked
- ✅ Policies documented

#### Success Criteria
- Non-compliant deployments blocked
- Required labels enforced
- Resource limits enforced
- Approved registries enforced
- Zero policy violations in production

</details>

<details>
<summary><h3>Phase 11: Monitoring & Observability (Week 5, Day 1-4)</h3></summary>

#### Tasks

- [ ] **Task 11.1: Install Prometheus Stack**
  ```bash
  # Add Prometheus repo
  helm repo add prometheus-community \
    https://prometheus-community.github.io/helm-charts
  helm repo update
  
  # Install Prometheus + Grafana stack
  helm install prometheus prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --set prometheus.prometheusSpec.retention=30d \
    --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
    --set grafana.adminPassword=admin123
  
  # Verify
  kubectl get pods -n monitoring
  kubectl get svc -n monitoring
  ```

- [ ] **Task 11.2: Access Grafana Dashboard**
  ```bash
  # Port forward to Grafana
  kubectl port-forward -n monitoring \
    svc/prometheus-grafana 3000:80
  
  # Access: http://localhost:3000
  # Username: admin
  # Password: admin123 (change after first login)
  ```

- [ ] **Task 11.3: Create Custom Dashboards**
  
  Create Grafana dashboard JSON or import existing:
  - **Kubernetes Cluster Monitoring** (ID: 7249)
  - **Kubernetes Deployment** (ID: 8588)
  - **NGINX Ingress Controller** (ID: 9614)
  
  ```bash
  # Import via Grafana UI:
  # + → Import → Enter dashboard ID → Load
  ```

- [ ] **Task 11.4: Set Up Application Metrics**
  
  If using Node.js, add Prometheus metrics:
  ```javascript
  // Install prom-client
  npm install prom-client
  
  // app.js
  const promClient = require('prom-client');
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics({ timeout: 5000 });
  
  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  });
  
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });
  ```

- [ ] **Task 11.5: Configure ServiceMonitor**
  
  Create `k8s/monitoring/servicemonitor.yaml`:
  ```yaml
  apiVersion: monitoring.coreos.com/v1
  kind: ServiceMonitor
  metadata:
    name: website-metrics
    namespace: monitoring
    labels:
      release: prometheus
  spec:
    selector:
      matchLabels:
        app: website
    namespaceSelector:
      matchNames:
        - production
    endpoints:
      - port: http
        path: /metrics
        interval: 30s
  ```
  
  Apply:
  ```bash
  kubectl apply -f k8s/monitoring/servicemonitor.yaml
  ```

- [ ] **Task 11.6: Set Up Alerting Rules**
  
  Create `k8s/monitoring/prometheus-rules.yaml`:
  ```yaml
  apiVersion: monitoring.coreos.com/v1
  kind: PrometheusRule
  metadata:
    name: website-alerts
    namespace: monitoring
    labels:
      release: prometheus
  spec:
    groups:
      - name: website
        interval: 30s
        rules:
          # High Pod CPU Usage
          - alert: HighPodCPU
            expr: |
              rate(container_cpu_usage_seconds_total{namespace="production",pod=~"website-.*"}[5m]) > 0.8
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High CPU usage on {{ $labels.pod }}"
              description: "Pod {{ $labels.pod }} CPU usage is above 80%"
          
          # High Pod Memory Usage
          - alert: HighPodMemory
            expr: |
              container_memory_usage_bytes{namespace="production",pod=~"website-.*"} / 
              container_spec_memory_limit_bytes{namespace="production",pod=~"website-.*"} > 0.9
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High memory usage on {{ $labels.pod }}"
              description: "Pod {{ $labels.pod }} memory usage is above 90%"
          
          # Pod Not Ready
          - alert: PodNotReady
            expr: |
              kube_pod_status_phase{namespace="production",pod=~"website-.*",phase!="Running"} == 1
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "Pod {{ $labels.pod }} not ready"
              description: "Pod {{ $labels.pod }} has been not ready for 5 minutes"
          
          # Deployment Replica Mismatch
          - alert: DeploymentReplicaMismatch
            expr: |
              kube_deployment_spec_replicas{namespace="production",deployment="website"} !=
              kube_deployment_status_replicas_available{namespace="production",deployment="website"}
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "Deployment replica mismatch"
              description: "Deployment website has mismatched replicas for 10 minutes"
          
          # High HTTP Error Rate
          - alert: HighHTTPErrorRate
            expr: |
              rate(http_requests_total{namespace="production",status=~"5.."}[5m]) > 0.05
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "High HTTP 5xx error rate"
              description: "HTTP 5xx error rate is above 5%"
  ```
  
  Apply:
  ```bash
  kubectl apply -f k8s/monitoring/prometheus-rules.yaml
  ```

- [ ] **Task 11.7: Configure Alertmanager**
  
  Create `k8s/monitoring/alertmanager-config.yaml`:
  ```yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: alertmanager-prometheus-kube-prometheus-alertmanager
    namespace: monitoring
  type: Opaque
  stringData:
    alertmanager.yaml: |
      global:
        resolve_timeout: 5m
      
      route:
        group_by: ['alertname', 'cluster', 'service']
        group_wait: 10s
        group_interval: 10s
        repeat_interval: 12h
        receiver: 'default'
        routes:
          - match:
              severity: critical
            receiver: 'critical'
          - match:
              severity: warning
            receiver: 'warning'
      
      receivers:
        - name: 'default'
          webhook_configs:
            - url: 'http://localhost:5001/webhook'
        
        - name: 'critical'
          # Add your notification channels here
          # Slack example:
          # slack_configs:
          #   - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
          #     channel: '#alerts-critical'
          #     title: 'Critical Alert'
        
        - name: 'warning'
          # Email example:
          # email_configs:
          #   - to: 'your-email@example.com'
          #     from: 'alertmanager@example.com'
          #     smarthost: 'smtp.gmail.com:587'
          #     auth_username: 'your-email@example.com'
          #     auth_password: 'your-app-password'
  ```
  
  Apply:
  ```bash
  kubectl apply -f k8s/monitoring/alertmanager-config.yaml
  kubectl rollout restart statefulset alertmanager-prometheus-kube-prometheus-alertmanager -n monitoring
  ```

- [ ] **Task 11.8: Install Loki for Log Aggregation**
  ```bash
  # Add Grafana Loki repo
  helm repo add grafana https://grafana.github.io/helm-charts
  helm repo update
  
  # Install Loki stack
  helm install loki grafana/loki-stack \
    --namespace monitoring \
    --set grafana.enabled=false \
    --set prometheus.enabled=false
  
  # Verify
  kubectl get pods -n monitoring -l app=loki
  ```

- [ ] **Task 11.9: Configure Loki Data Source in Grafana**
  ```bash
  # Port forward to Grafana
  kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
  
  # In Grafana:
  # Configuration → Data Sources → Add data source → Loki
  # URL: http://loki:3100
  # Save & Test
  ```

- [ ] **Task 11.10: Create Monitoring Documentation**
  
  Create `docs/MONITORING.md`:
  ```markdown
  # Monitoring & Observability
  
  ## Stack Components
  - **Prometheus**: Metrics collection
  - **Grafana**: Visualization
  - **Alertmanager**: Alert routing
  - **Loki**: Log aggregation
  
  ## Access
  
  ### Grafana
  ```bash
  kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
  # http://localhost:3000
  ```
  
  ### Prometheus
  ```bash
  kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
  # http://localhost:9090
  ```
  
  ### Alertmanager
  ```bash
  kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
  # http://localhost:9093
  ```
  
  ## Key Metrics
  - **CPU Usage**: `container_cpu_usage_seconds_total`
  - **Memory Usage**: `container_memory_usage_bytes`
  - **HTTP Requests**: `http_requests_total`
  - **Pod Status**: `kube_pod_status_phase`
  
  ## Dashboards
  1. **Cluster Overview** (ID: 7249)
  2. **Website Deployment** (Custom)
  3. **NGINX Ingress** (ID: 9614)
  
  ## Alerts
  - High CPU/Memory usage
  - Pod not ready
  - Deployment replica mismatch
  - High HTTP error rate
  ```

#### Deliverables
- ✅ Prometheus + Grafana installed
- ✅ Custom dashboards created
- ✅ Application metrics exposed
- ✅ Alert rules configured
- ✅ Log aggregation set up

#### Success Criteria
- Metrics collected from all pods
- Dashboards display real-time data
- Alerts trigger correctly
- Logs centralized in Loki

</details>

<details>
<summary><h3>Phase 12: Documentation & Portfolio (Week 6)</h3></summary>

#### Tasks

- [ ] **Task 12.1: Create Architecture Diagram**
  
  Use draw.io or Lucidchart to create:
  - CI/CD pipeline flow
  - Kubernetes cluster architecture
  - Security scanning stages
  - Monitoring setup
  
  Save as: `docs/architecture-diagram.png`

- [ ] **Task 12.2: Write Project Case Study**
  
  Create `docs/CASE_STUDY.md`:
  ```markdown
  # Secure CI/CD Pipeline: A Case Study
  
  ## Executive Summary
  Built a production-grade secure CI/CD pipeline with automated security scanning, 
  container signing, Kubernetes deployment, and comprehensive monitoring.
  
  ## Problem Statement
  Manual deployments are error-prone and lack security validation. Modern applications 
  need automated, security-first deployment pipelines.
  
  ## Solution
  Implemented DevSecOps pipeline with:
  - Automated secret detection
  - SAST and dependency scanning
  - Container vulnerability scanning
  - Image signing with Cosign
  - Policy enforcement with OPA Gatekeeper
  - Kubernetes deployment with Pod Security Standards
  - Real-time monitoring with Prometheus/Grafana
  
  ## Technologies Used
  - **CI/CD**: GitHub Actions
  - **Security**: TruffleHog, Semgrep, Trivy, Cosign
  - **Orchestration**: Kubernetes (GKE)
  - **Policy**: OPA Gatekeeper
  - **Monitoring**: Prometheus, Grafana, Loki
  - **IaC**: Kustomize, Helm
  
  ## Key Achievements
  - ✅ Zero critical vulnerabilities in production
  - ✅ 100% container image signing
  - ✅ Automated rollbacks in <2 minutes
  - ✅ 99.9% uptime
  - ✅ Policy compliance: 100%
  
  ## Architecture
  [Insert architecture diagram]
  
  ## Security Controls Implemented
  1. **Secret Detection**: Pre-commit hooks + CI/CD
  2. **SAST**: Semgrep with custom rules
  3. **Dependency Scanning**: npm audit + Snyk
  4. **Container Scanning**: Trivy (CRITICAL/HIGH blocking)
  5. **Image Signing**: Cosign with private keys
  6. **Policy Enforcement**: OPA Gatekeeper (labels, limits, registries)
  7. **Network Policies**: Namespace isolation
  8. **Pod Security**: Restricted mode, non-root, read-only FS
  
  ## Metrics
  | Metric | Before | After |
  |--------|--------|-------|
  | Deployment Time | 30 min (manual) | 5 min (automated) |
  | Security Scans | 0 | 7 (per deployment) |
  | Production Incidents | 5/month | 0/month |
  | MTTR | 2 hours | 15 minutes |
  
  ## Lessons Learned
  - Security scanning early catches 80% of issues
  - Policy-as-code prevents misconfigurations
  - Monitoring is essential for debugging
  - Documentation saves time in incidents
  
  ## Future Enhancements
  - Multi-environment deployments (dev/staging/prod)
  - Chaos engineering with Litmus
  - Cost optimization with Kubecost
  - Service mesh with Istio
  ```

- [ ] **Task 12.3: Create README.md**
  ```markdown
  # Secure CI/CD Pipeline
  
  ![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/CD%20Pipeline/badge.svg)
  ![Security](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Security%20Scanning/badge.svg)
  
  Production-grade secure CI/CD pipeline for automated, security-first deployments.
  
  ## 🚀 Features
  
  - **Security-First**: 7-stage security scanning
  - **Automated**: Push to deploy
  - **Policy-Enforced**: OPA Gatekeeper
  - **Monitored**: Prometheus + Grafana
  - **Documented**: Comprehensive guides
  
  ## 🏗️ Architecture
  
  ![Architecture](docs/architecture-diagram.png)
  
  ## 📚 Documentation
  
  - [Setup Guide](docs/SETUP.md)
  - [Deployment Runbook](docs/DEPLOYMENT.md)
  - [Security Policies](docs/SECURITY.md)
  - [Monitoring](docs/MONITORING.md)
  - [Case Study](docs/CASE_STUDY.md)
  
  ## 🔐 Security Scanning
  
  | Stage | Tool | Purpose |
  |-------|------|---------|
  | 1 | TruffleHog | Secret detection |
  | 2 | Semgrep | SAST |
  | 3 | npm audit | Dependency scanning |
  | 4 | Checkov | IaC scanning |
  | 5 | Trivy | Container scanning |
  | 6 | Cosign | Image signing |
  | 7 | OPA | Policy enforcement |
  
  ## 🎯 Quick Start
  
  ```bash
  # Clone repository
  git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
  
  # Deploy to Kubernetes
  kubectl apply -k k8s/base
  
  # Access application
  kubectl port-forward -n production svc/website-service 8080:80
  ```
  
  ## 📊 Metrics
  
  - **Deployment Time**: < 5 minutes
  - **Uptime**: 99.9%
  - **Security Score**: A+
  - **Policy Compliance**: 100%
  
  ## 🛡️ Security
  
  See [SECURITY.md](docs/SECURITY.md) for security policy and reporting.
  
  ## 📝 License
  
  MIT License - see [LICENSE](LICENSE)
  ```

- [ ] **Task 12.4: Create Blog Post for fanaticalnerd.com**
  
  Write comprehensive blog post:
  - Title: "Building a Production-Grade Secure CI/CD Pipeline"
  - Sections:
    - Introduction
    - Why Security Matters in CI/CD
    - Architecture Overview
    - Implementation Journey
    - Challenges & Solutions
    - Results & Impact
    - Lessons Learned
  - Include code snippets, diagrams, screenshots
  - Add to your portfolio site

- [ ] **Task 12.5: Create Demo Video**
  
  Record screencast showing:
  1. Push code change
  2. CI/CD pipeline execution
  3. Security scans passing
  4. Deployment to Kubernetes
  5. Monitoring dashboard
  6. Rollback demo
  
  Upload to YouTube, embed in blog post

- [ ] **Task 12.6: Update LinkedIn Profile**
  
  Add to experience:
  ```
  Project: Secure CI/CD Pipeline
  
  Built production-grade DevSecOps pipeline with automated security scanning, 
  container signing, Kubernetes deployment, and comprehensive monitoring.
  
  Technologies: GitHub Actions, Kubernetes, OPA Gatekeeper, Prometheus, Grafana, 
  Trivy, Semgrep, Cosign
  
  Key achievements:
  • Implemented 7-stage security scanning pipeline
  • Achieved 100% policy compliance with OPA Gatekeeper
  • Automated deployments with zero downtime rollouts
  • Built real-time monitoring with Prometheus/Grafana
  
  Skills: DevSecOps • Kubernetes • CI/CD • Container Security • Policy as Code
  ```

- [ ] **Task 12.7: Create GitHub Repository Description**
  ```
  🔐 Production-grade secure CI/CD pipeline with automated security scanning, 
  container signing, Kubernetes deployment, and comprehensive monitoring. 
  DevSecOps best practices with OPA Gatekeeper, Trivy, Semgrep, and more.
  ```
  
  Add topics:
  - `cicd`
  - `devsecops`
  - `kubernetes`
  - `security`
  - `docker`
  - `github-actions`
  - `prometheus`
  - `grafana`
  - `opa`
  - `container-security`

- [ ] **Task 12.8: Create SECURITY.md**
  ```markdown
  # Security Policy
  
  ## Reporting a Vulnerability
  
  If you discover a security vulnerability, please email:
  security@your-domain.com
  
  We will respond within 48 hours.
  
  ## Security Measures
  
  This project implements:
  - Automated secret detection
  - SAST and dependency scanning
  - Container vulnerability scanning
  - Image signing with Cosign
  - Pod Security Standards (restricted)
  - Network policies
  - RBAC least privilege
  - OPA policy enforcement
  
  ## Vulnerability Disclosure
  
  We follow responsible disclosure practices. Vulnerabilities are:
  1. Acknowledged within 48 hours
  2. Assessed and prioritized
  3. Fixed according to severity
  4. Publicly disclosed after fix
  
  ## Security Updates
  
  Dependencies are automatically updated via Dependabot.
  Security patches are applied within:
  - Critical: 24 hours
  - High: 1 week
  - Medium/Low: Monthly cycle
  ```

#### Deliverables
- ✅ Architecture diagrams created
- ✅ Comprehensive documentation
- ✅ Case study written
- ✅ Blog post published
- ✅ Demo video created
- ✅ Portfolio updated

#### Success Criteria
- All documentation complete and accurate
- Blog post published on fanaticalnerd.com
- LinkedIn profile updated
- GitHub repo polished and professional
- Demo video showcases all features

</details>

---

## 🎓 Learning Resources

### Books
- **"The Phoenix Project"** - DevOps fundamentals
- **"Kubernetes Security"** by Liz Rice
- **"Container Security"** by Liz Rice

### Online Courses
- **KCNA Prep** - You already have this! (LFS250)
- **CKS (Certified Kubernetes Security Specialist)** - Next cert target
- **DevSecOps courses** on Udemy, A Cloud Guru

### Documentation
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [CNCF Security Whitepaper](https://www.cncf.io/blog/2022/06/07/introduction-to-the-cncf-kubernetes-project-security-paper/)

---

## 🎯 Success Criteria

### Technical
- ✅ Pipeline completes in < 10 minutes
- ✅ Zero critical vulnerabilities in production
- ✅ 100% policy compliance
- ✅ All images signed
- ✅ 99%+ uptime

### Portfolio Impact
- ✅ Published blog post
- ✅ GitHub repo with 100+ stars (share on Reddit, HN)
- ✅ LinkedIn post with engagement
- ✅ Demo video views
- ✅ Resume-ready project description

---

## 📊 Project Tracking

Use this checklist to track progress:

- [ ] Week 1: Foundation + Secret Detection + SAST
- [ ] Week 2: Dependency Scanning + Container Security + Image Signing
- [ ] Week 3: Kubernetes Setup + Secure Deployment
- [ ] Week 4: CI/CD Integration + Policy Enforcement + Monitoring
- [ ] Week 5: Advanced Monitoring + Dashboards
- [ ] Week 6: Documentation + Portfolio + Blog Post

---

## 🚨 Common Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| Pipeline too slow | Cache dependencies, parallelize jobs |
| Too many false positives | Tune scanners, create allowlists |
| Kubernetes resources exhausted | Set proper limits, use HPA |
| Monitoring data loss | Configure retention policies |
| Certificate expiration | Use cert-manager with auto-renewal |
| Secrets in logs | Use Sealed Secrets or External Secrets |

---

## 🎉 Next Steps After Completion

1. **Add to Resume** - Under projects section
2. **Share on Social Media** - LinkedIn, Twitter, Reddit
3. **Apply to Jobs** - Target: Vanta, Drata, Wiz, etc.
4. **Expand Project** - Multi-region, service mesh, chaos engineering
5. **Write More** - Turn into blog series
6. **Present** - Local meetups, conferences

---

## 💡 Interview Talking Points

When discussing this project:

> "I built a production-grade secure CI/CD pipeline that implements DevSecOps best practices. The pipeline includes 7 stages of security scanning - from secret detection with TruffleHog to container scanning with Trivy and policy enforcement with OPA Gatekeeper. Every container image is signed with Cosign before deployment to Kubernetes.
> 
> The most challenging part was implementing Pod Security Standards in restricted mode while maintaining application functionality - I had to configure read-only root filesystems with emptyDir volumes for cache directories.
> 
> The impact: deployment time reduced from 30 minutes to under 5 minutes, zero security incidents in production, and 100% policy compliance. This aligns with how SSPM vendors like Vanta automate security control validation - I essentially built an SSPM pipeline for my own infrastructure."

---

**Good luck with your project! 🚀**

*Remember: This is a marathon, not a sprint. Take breaks, celebrate small wins, and enjoy the learning process.*