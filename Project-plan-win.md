# Secure CI/CD Pipeline Project Guide (Windows 11 Edition)

## 📋 Project Overview

**Project Name:** Building a Production-Grade Secure CI/CD Pipeline  
**Duration:** 4-6 weeks  
**Difficulty:** Intermediate to Advanced  
**Platform:** Windows 11 with WSL2  
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

## 💻 Hardware Specifications

### Your Hardware (Perfect for This Project!)
- **CPU:** Multi-core (sufficient for Kubernetes)
- **RAM:** 16 GB ✅ (Recommended for K8s cluster)
- **GPU:** RTX 3050 (Not needed for CI/CD, but great for future ML/AI projects)
- **Storage:** SSD recommended for Docker performance
- **OS:** Windows 11
- **Network:** Stable internet connection

**Assessment:** Your laptop exceeds requirements! 16GB RAM is perfect for running:
- Docker Desktop with Kubernetes
- Multiple security scanning tools
- Prometheus + Grafana monitoring stack
- Development environment

---

## 🛠️ Software & Tool Requirements

### Core Tools (Required)

| Tool | Purpose | Installation Method |
|------|---------|---------------------|
| **WSL2** | Linux environment on Windows | PowerShell: `wsl --install` |
| **Docker Desktop** | Containerization + K8s | [Download for Windows](https://www.docker.com/products/docker-desktop) |
| **Git** | Version control | [Git for Windows](https://git-scm.com/download/win) |
| **Windows Terminal** | Modern terminal | Microsoft Store |
| **VS Code** | Code editor | [Download](https://code.visualstudio.com/) |
| **kubectl** | Kubernetes CLI | Included with Docker Desktop |
| **Helm** | Kubernetes package manager | Chocolatey or manual install |

### Security Scanning Tools

| Tool | Purpose | Cost | Installation (WSL2) |
|------|---------|------|---------------------|
| **TruffleHog** | Secret detection | Free | `wget -qO trufflehog.tar.gz https://github.com/trufflesecurity/trufflehog/releases/latest/download/trufflehog_Linux_amd64.tar.gz && tar -xzf trufflehog.tar.gz && sudo mv trufflehog /usr/local/bin/` |
| **Trivy** | Container vulnerability scanning | Free | `wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key \| sudo apt-key add - && echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" \| sudo tee -a /etc/apt/sources.list.d/trivy.list && sudo apt update && sudo apt install trivy` |
| **Semgrep** | SAST | Free tier | `python3 -m pip install semgrep` |
| **Checkov** | IaC security scanning | Free | `pip3 install checkov` |
| **Cosign** | Container image signing | Free | Download from GitHub releases |

### Kubernetes Options (Choose One)

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **Docker Desktop K8s** | Built-in, easy setup | Basic features | Windows users (RECOMMENDED) |
| **Minikube on WSL2** | Full K8s features | Requires WSL2 config | Advanced users |
| **Kind (K8s in Docker)** | Fast, lightweight | Limited features | Testing |
| **Google GKE** | Production-grade, free tier | Requires GCP account | Cloud deployment |
| **Azure AKS** | Microsoft ecosystem | Requires Azure account | Windows integration |

**Recommendation:** Start with **Docker Desktop Kubernetes** (easiest on Windows 11), then optionally move to **Azure AKS** (free tier) for cloud deployment.

### Optional Tools (Recommended)

- **PowerShell 7** - Modern PowerShell (`winget install Microsoft.PowerShell`)
- **Windows Subsystem for Linux 2 (Ubuntu)** - For native Linux tools
- **k9s** - Terminal UI for Kubernetes (install in WSL2)
- **Lens** - Kubernetes IDE with GUI ([Download](https://k8slens.dev/))
- **Postman** - API testing
- **Chocolatey** - Windows package manager (`Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`)

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Windows 11 Development Machine                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Docker Desktop + WSL2                    │   │
│  │  ┌────────────────┐  ┌──────────────────────────┐   │   │
│  │  │  Kubernetes    │  │   Security Tools (WSL2)  │   │   │
│  │  │   Cluster      │  │   • TruffleHog           │   │   │
│  │  │                │  │   • Trivy                │   │   │
│  │  │  Production    │  │   • Semgrep              │   │   │
│  │  │  Namespace     │  │   • Checkov              │   │   │
│  │  └────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
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
```

---

## 📅 Project Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| **Week 1** | Windows Setup + Foundation | WSL2, Docker, basic pipeline |
| **Week 2** | Security Scanning | Secret detection, SAST, container scanning |
| **Week 3** | Kubernetes Deployment | K8s cluster, secure deployments |
| **Week 4** | Advanced Security | Policy enforcement, network policies |
| **Week 5** | Monitoring & Observability | Dashboards, alerts, logging |
| **Week 6** | Documentation & Portfolio | Write-up, diagrams, case study |

---

## 🚀 Implementation Steps

<details>
<summary><h3>Phase 0: Windows 11 Environment Setup (Week 1, Day 1)</h3></summary>

#### Tasks

- [ ] **Task 0.1: Enable WSL2**
  ```powershell
  # Open PowerShell as Administrator
  
  # Enable WSL
  wsl --install
  
  # Restart computer when prompted
  
  # After restart, verify WSL2
  wsl --list --verbose
  
  # Set WSL2 as default
  wsl --set-default-version 2
  
  # Install Ubuntu (if not already installed)
  wsl --install -d Ubuntu-22.04
  ```

- [ ] **Task 0.2: Configure WSL2 Resource Limits**
  
  Create `C:\Users\YOUR_USERNAME\.wslconfig`:
  ```ini
  [wsl2]
  memory=8GB    # Limit WSL2 to 8GB (half of your 16GB)
  processors=4  # Use 4 CPU cores
  swap=4GB      # Swap space
  localhostForwarding=true
  ```
  
  Restart WSL:
  ```powershell
  wsl --shutdown
  wsl
  ```

- [ ] **Task 0.3: Update Ubuntu in WSL2**
  ```bash
  # Inside WSL2 Ubuntu terminal
  sudo apt update && sudo apt upgrade -y
  
  # Install essential tools
  sudo apt install -y curl wget git build-essential python3 python3-pip
  
  # Verify
  python3 --version
  git --version
  ```

- [ ] **Task 0.4: Install Docker Desktop for Windows**
  - Download from: https://www.docker.com/products/docker-desktop
  - Install with default settings
  - **IMPORTANT:** During installation:
    - ✅ Enable WSL2 backend
    - ✅ Enable Kubernetes
  - Start Docker Desktop
  - In Settings:
    - General → ✅ Use WSL 2 based engine
    - Resources → WSL Integration → ✅ Enable Ubuntu
    - Kubernetes → ✅ Enable Kubernetes
  
  Verify:
  ```powershell
  # In PowerShell
  docker --version
  docker ps
  
  # In WSL2
  docker --version
  kubectl version --client
  ```

- [ ] **Task 0.5: Install Windows Terminal**
  ```powershell
  # Using winget
  winget install Microsoft.WindowsTerminal
  
  # Or install from Microsoft Store
  ```
  
  Configure Windows Terminal:
  - Set Ubuntu (WSL) as default profile
  - Configure color scheme and font
  - Add keyboard shortcuts

- [ ] **Task 0.6: Install Git for Windows**
  ```powershell
  # Using winget
  winget install Git.Git
  
  # Or download from: https://git-scm.com/download/win
  ```
  
  Configure Git:
  ```bash
  # In WSL2
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  git config --global core.autocrlf input
  ```

- [ ] **Task 0.7: Install VS Code with WSL Extension**
  ```powershell
  # Install VS Code
  winget install Microsoft.VisualStudioCode
  ```
  
  Install extensions:
  - WSL (ms-vscode-remote.remote-wsl)
  - Docker (ms-azuretools.vscode-docker)
  - Kubernetes (ms-kubernetes-tools.vscode-kubernetes-tools)
  - YAML (redhat.vscode-yaml)
  
  Open WSL from VS Code:
  ```bash
  # In WSL2 terminal
  code .
  ```

- [ ] **Task 0.8: Install Chocolatey (Optional)**
  ```powershell
  # In PowerShell as Administrator
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
  
  # Verify
  choco --version
  ```

- [ ] **Task 0.9: Install Helm**
  
  **Option A: Using Chocolatey (Windows)**
  ```powershell
  choco install kubernetes-helm
  ```
  
  **Option B: In WSL2**
  ```bash
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  
  # Verify
  helm version
  ```

- [ ] **Task 0.10: Configure Docker Desktop Performance**
  
  Docker Desktop Settings:
  - Resources → Advanced:
    - CPUs: 4
    - Memory: 8 GB
    - Swap: 2 GB
    - Disk image size: 100 GB
  - Apply & Restart

- [ ] **Task 0.11: Test Environment**
  ```bash
  # In WSL2, create test directory
  mkdir -p ~/projects/cicd-pipeline
  cd ~/projects/cicd-pipeline
  
  # Test Docker
  docker run hello-world
  
  # Test Kubernetes
  kubectl cluster-info
  kubectl get nodes
  
  # Test access from Windows
  # Open PowerShell and navigate to WSL directory
  cd \\wsl$\Ubuntu-22.04\home\YOUR_USERNAME\projects\cicd-pipeline
  ```

#### Deliverables
- ✅ WSL2 installed and configured
- ✅ Docker Desktop running with K8s enabled
- ✅ Git configured
- ✅ VS Code with WSL integration
- ✅ All tools accessible from both Windows and WSL2

#### Windows-Specific Notes
- **File System:** Work inside WSL2 filesystem (`~/projects/`) for best performance
- **Accessing Files:** Windows can access WSL2 files via `\\wsl$\Ubuntu-22.04\`
- **Docker:** Use Docker Desktop, not Docker inside WSL2
- **Port Forwarding:** Automatic between WSL2 and Windows
- **Clipboard:** Copy/paste works between Windows and WSL2

#### Troubleshooting

**WSL2 Not Starting:**
```powershell
# Enable required features
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart computer
```

**Docker Desktop Not Starting:**
- Ensure virtualization is enabled in BIOS
- Check Windows Features: Hyper-V, Virtual Machine Platform, WSL
- Restart Docker Desktop

**Performance Issues:**
- Check `.wslconfig` memory allocation
- Don't mix WSL1 and WSL2 distributions
- Keep project files inside WSL2, not Windows filesystem

</details>

<details>
<summary><h3>Phase 1: Project Setup & Prerequisites (Week 1, Day 2-3)</h3></summary>

#### Tasks

- [ ] **Task 1.1: Set Up Project Directory Structure**
  ```bash
  # In WSL2
  cd ~/projects
  mkdir cicd-pipeline
  cd cicd-pipeline
  
  # Create directory structure
  mkdir -p .github/workflows
  mkdir -p k8s/{base,overlays/production,overlays/staging}
  mkdir -p docker
  mkdir -p docs
  mkdir -p scripts
  
  # Create .gitignore
  cat > .gitignore << 'EOF'
  # Secrets
  cosign.key
  *.pem
  *.key
  .env
  
  # IDE
  .vscode/
  .idea/
  
  # OS
  .DS_Store
  Thumbs.db
  
  # Dependencies
  node_modules/
  __pycache__/
  
  # Build
  dist/
  build/
  *.log
  EOF
  ```

- [ ] **Task 1.2: Initialize Git Repository**
  ```bash
  # Initialize repo
  git init
  
  # Create README
  cat > README.md << 'EOF'
  # Secure CI/CD Pipeline
  
  Production-grade secure CI/CD pipeline with automated security scanning.
  
  ## Tech Stack
  - Platform: Windows 11 + WSL2
  - Containers: Docker Desktop
  - Orchestration: Kubernetes
  - CI/CD: GitHub Actions
  - Monitoring: Prometheus + Grafana
  EOF
  
  # Initial commit
  git add .
  git commit -m "Initial commit: Project structure"
  ```

- [ ] **Task 1.3: Create GitHub Repository**
  ```bash
  # On GitHub.com:
  # 1. Create new repository
  # 2. Name: cicd-pipeline
  # 3. Public or Private (your choice)
  # 4. Don't initialize with README (we already have one)
  
  # Link local repo to GitHub
  git remote add origin https://github.com/YOUR_USERNAME/cicd-pipeline.git
  git branch -M main
  git push -u origin main
  ```

- [ ] **Task 1.4: Prepare Website for Containerization**
  
  **If you have an existing website:**
  ```bash
  # Copy your website files to project directory
  # Example structure:
  # ~/projects/cicd-pipeline/
  #   ├── index.html
  #   ├── css/
  #   ├── js/
  #   └── assets/
  ```
  
  **If starting fresh (static site example):**
  ```bash
  # Create simple HTML website
  cat > index.html << 'EOF'
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Secure CI/CD Pipeline Demo</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
          }
          .container {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
          }
          h1 { font-size: 2.5em; margin-bottom: 20px; }
          .badge {
              display: inline-block;
              padding: 5px 15px;
              background: rgba(255,255,255,0.2);
              border-radius: 20px;
              margin: 5px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>🔐 Secure CI/CD Pipeline</h1>
          <p>This website is deployed through a production-grade secure CI/CD pipeline.</p>
          <h2>Security Features:</h2>
          <div class="badge">Secret Detection</div>
          <div class="badge">SAST Scanning</div>
          <div class="badge">Container Scanning</div>
          <div class="badge">Image Signing</div>
          <div class="badge">Policy Enforcement</div>
          <div class="badge">Network Policies</div>
          <p><strong>Build:</strong> <span id="build"><!-- Injected via CI/CD --></span></p>
          <p><strong>Deployed:</strong> <span id="timestamp"></span></p>
      </div>
      <script>
          document.getElementById('timestamp').textContent = new Date().toLocaleString();
      </script>
  </body>
  </html>
  EOF
  ```

- [ ] **Task 1.5: Create Secure Dockerfile**
  
  Create `docker/Dockerfile`:
  ```dockerfile
  # Multi-stage build for security and size optimization
  FROM nginx:1.25-alpine as base
  
  # Security: Update packages
  RUN apk update && \
      apk upgrade && \
      apk add --no-cache ca-certificates && \
      rm -rf /var/cache/apk/*
  
  # Security: Create non-root user
  RUN addgroup -g 101 -S nginx && \
      adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx
  
  # Copy nginx configuration
  COPY docker/nginx.conf /etc/nginx/nginx.conf
  
  # Copy website files
  COPY index.html /usr/share/nginx/html/
  COPY css /usr/share/nginx/html/css
  COPY js /usr/share/nginx/html/js
  COPY assets /usr/share/nginx/html/assets
  
  # Security: Set ownership
  RUN chown -R nginx:nginx /usr/share/nginx/html && \
      chown -R nginx:nginx /var/cache/nginx && \
      chown -R nginx:nginx /var/log/nginx && \
      chown -R nginx:nginx /etc/nginx/conf.d && \
      touch /var/run/nginx.pid && \
      chown -R nginx:nginx /var/run/nginx.pid && \
      chmod -R 755 /usr/share/nginx/html
  
  # Security: Switch to non-root user
  USER nginx
  
  # Expose non-privileged port
  EXPOSE 8080
  
  # Health check
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
  
  # Start nginx
  CMD ["nginx", "-g", "daemon off;"]
  ```

- [ ] **Task 1.6: Create nginx Configuration**
  
  Create `docker/nginx.conf`:
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
      
      log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent"';
      
      access_log /var/log/nginx/access.log main;
      
      sendfile on;
      tcp_nopush on;
      tcp_nodelay on;
      keepalive_timeout 65;
      types_hash_max_size 2048;
      
      # Security headers
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
      
      # Gzip compression
      gzip on;
      gzip_vary on;
      gzip_proxied any;
      gzip_comp_level 6;
      gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
      
      server {
          listen 8080;
          server_name _;
          
          root /usr/share/nginx/html;
          index index.html;
          
          # Disable server tokens
          server_tokens off;
          
          location / {
              try_files $uri $uri/ /index.html;
          }
          
          # Deny access to hidden files
          location ~ /\. {
              deny all;
              access_log off;
              log_not_found off;
          }
          
          # Cache static assets
          location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
              expires 1y;
              add_header Cache-Control "public, immutable";
          }
      }
  }
  ```

- [ ] **Task 1.7: Create .dockerignore**
  
  Create `.dockerignore`:
  ```
  # Version control
  .git
  .gitignore
  .github
  
  # Documentation
  README.md
  docs/
  *.md
  
  # Kubernetes
  k8s/
  
  # CI/CD
  .github/
  
  # IDE
  .vscode/
  .idea/
  
  # OS
  .DS_Store
  Thumbs.db
  
  # Secrets
  *.key
  *.pem
  .env
  
  # Dependencies (if using Node.js build step)
  node_modules/
  npm-debug.log
  
  # Build artifacts
  dist/
  build/
  ```

- [ ] **Task 1.8: Build and Test Docker Image Locally**
  ```bash
  # Build image
  docker build -t cicd-pipeline:local -f docker/Dockerfile .
  
  # Check image size
  docker images cicd-pipeline:local
  
  # Run container
  docker run -d -p 8080:8080 --name test-website cicd-pipeline:local
  
  # Test in browser
  # From Windows, open: http://localhost:8080
  
  # Check logs
  docker logs test-website
  
  # Test health check
  docker inspect test-website | grep -A 10 Health
  
  # Clean up
  docker stop test-website
  docker rm test-website
  ```

- [ ] **Task 1.9: Verify Docker Image Security**
  ```bash
  # Check that container runs as non-root
  docker run --rm cicd-pipeline:local id
  # Expected: uid=101(nginx) gid=101(nginx)
  
  # Verify no root processes
  docker run --rm cicd-pipeline:local ps aux
  # Should show nginx user, not root
  ```

- [ ] **Task 1.10: Create Initial Documentation**
  
  Create `docs/SETUP.md`:
  ```markdown
  # Development Setup
  
  ## Environment
  - **OS:** Windows 11
  - **WSL:** Ubuntu 22.04
  - **Docker:** Docker Desktop with WSL2 backend
  - **Kubernetes:** Docker Desktop K8s
  
  ## Prerequisites
  - 16GB RAM (8GB allocated to WSL2)
  - Docker Desktop installed
  - WSL2 enabled
  - Git installed
  
  ## Local Development
  
  ### Build Docker Image
  \```bash
  docker build -t cicd-pipeline:local -f docker/Dockerfile .
  \```
  
  ### Run Locally
  \```bash
  docker run -d -p 8080:8080 cicd-pipeline:local
  \```
  
  ### Access Website
  Open http://localhost:8080 in browser
  
  ## File Locations
  - **Project Root:** `~/projects/cicd-pipeline` (WSL2)
  - **Windows Access:** `\\wsl$\Ubuntu-22.04\home\YOUR_USERNAME\projects\cicd-pipeline`
  - **Docker Context:** WSL2 filesystem
  
  ## Common Commands
  \```bash
  # Build
  docker build -t cicd-pipeline:test .
  
  # Run
  docker run -d -p 8080:8080 cicd-pipeline:test
  
  # Logs
  docker logs -f CONTAINER_ID
  
  # Stop
  docker stop CONTAINER_ID
  \```
  ```

#### Deliverables
- ✅ Project directory structure created
- ✅ Git repository initialized and pushed to GitHub
- ✅ Dockerfile created with security best practices
- ✅ nginx configuration for non-root user
- ✅ Docker image builds successfully
- ✅ Website accessible on port 8080
- ✅ Documentation started

#### Success Criteria
- Docker image builds without errors
- Container runs as non-root user (nginx, UID 101)
- Website loads in browser at localhost:8080
- Health check passes
- Image size optimized (<50MB for static site)

#### Windows-Specific Tips
- **Build Performance:** Build inside WSL2 filesystem, not Windows filesystem
- **Port Access:** Windows can access localhost:8080 directly
- **File Editing:** Use VS Code with WSL extension for best performance
- **Docker Context:** Ensure Docker Desktop is using WSL2 backend

</details>

<details>
<summary><h3>Phase 2: Secret Detection Implementation (Week 1, Day 4-5)</h3></summary>

#### Tasks

- [ ] **Task 2.1: Install TruffleHog in WSL2**
  ```bash
  # In WSL2
  cd ~/projects/cicd-pipeline
  
  # Download TruffleHog
  wget https://github.com/trufflesecurity/trufflehog/releases/download/v3.63.0/trufflehog_3.63.0_linux_amd64.tar.gz
  
  # Extract
  tar -xzf trufflehog_3.63.0_linux_amd64.tar.gz
  
  # Move to PATH
  sudo mv trufflehog /usr/local/bin/
  
  # Clean up
  rm trufflehog_3.63.0_linux_amd64.tar.gz
  
  # Verify
  trufflehog --version
  ```

- [ ] **Task 2.2: Install git-secrets (Optional Additional Layer)**
  ```bash
  # Clone git-secrets
  cd ~/
  git clone https://github.com/awslabs/git-secrets.git
  cd git-secrets
  sudo make install
  
  # Return to project
  cd ~/projects/cicd-pipeline
  
  # Initialize git-secrets for this repo
  git secrets --install
  git secrets --register-aws
  ```

- [ ] **Task 2.3: Create Pre-commit Hook**
  ```bash
  # Create pre-commit hook
  cat > .git/hooks/pre-commit << 'EOF'
  #!/bin/bash
  
  echo "🔍 Running secret detection..."
  
  # Get list of staged files
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
  
  if [ -z "$STAGED_FILES" ]; then
    echo "✅ No files to scan"
    exit 0
  fi
  
  # Run TruffleHog on staged files
  echo "$STAGED_FILES" | xargs trufflehog filesystem --no-update --fail
  
  if [ $? -ne 0 ]; then
      echo "❌ Secret detected! Commit blocked."
      echo "Remove secrets before committing."
      echo "If this is a false positive, add to .trufflehogignore"
      exit 1
  fi
  
  echo "✅ No secrets detected"
  exit 0
  EOF
  
  # Make executable
  chmod +x .git/hooks/pre-commit
  ```

- [ ] **Task 2.4: Create .trufflehogignore File**
  
  Create `.trufflehogignore`:
  ```
  # Ignore test files
  **/test/**
  **/*test*.txt
  **/*test*.json
  
  # Ignore documentation
  docs/**
  *.md
  README.md
  
  # Ignore package lock files (high false positive rate)
  package-lock.json
  yarn.lock
  Gemfile.lock
  poetry.lock
  
  # Ignore build artifacts
  dist/**
  build/**
  
  # Ignore known false positives
  # Add specific file paths here if needed
  ```

- [ ] **Task 2.5: Test Secret Detection Locally**
  ```bash
  # Create test file with fake AWS key
  echo "aws_access_key_id=AKIAIOSFODNN7EXAMPLE" > test-secret.txt
  
  # Try to commit (should be blocked)
  git add test-secret.txt
  git commit -m "test: secret detection"
  # Expected: ❌ Secret detected! Commit blocked.
  
  # Remove test file
  git reset HEAD test-secret.txt
  rm test-secret.txt
  
  # Test with real files (should pass)
  git add docker/Dockerfile
  git commit -m "test: dockerfile"
  # Expected: ✅ No secrets detected
  ```

- [ ] **Task 2.6: Create GitHub Actions Secret Scanning Workflow**
  
  Create `.github/workflows/security-secrets.yml`:
  ```yaml
  name: Secret Detection
  
  on:
    push:
      branches: [ main, develop, feature/* ]
    pull_request:
      branches: [ main ]
  
  jobs:
    trufflehog:
      name: TruffleHog Secret Scanning
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
          with:
            fetch-depth: 0  # Full history for comprehensive scan
        
        - name: TruffleHog OSS
          uses: trufflesecurity/trufflehog@main
          with:
            path: ./
            base: ${{ github.event.repository.default_branch }}
            head: HEAD
            extra_args: --debug --only-verified
        
        - name: Upload Results (on failure)
          if: failure()
          uses: actions/upload-artifact@v3
          with:
            name: trufflehog-results
            path: trufflehog-results.json
            retention-days: 30
  ```

- [ ] **Task 2.7: Enable GitHub Native Secret Scanning**
  
  On GitHub repository:
  1. Go to Settings → Security → Code security and analysis
  2. Enable:
     - ✅ Dependency graph
     - ✅ Dependabot alerts
     - ✅ Dependabot security updates
     - ✅ Secret scanning
     - ✅ Push protection (prevents commits with secrets)
  
  Note: Some features require public repo or GitHub Advanced Security

- [ ] **Task 2.8: Create Secret Management Documentation**
  
  Create `docs/SECURITY.md`:
  ```markdown
  # Security Policy
  
  ## Secret Detection
  
  This project implements multiple layers of secret detection:
  
  ### 1. Pre-commit Hooks (Local)
  - **Tool:** TruffleHog
  - **Scope:** Staged files
  - **Action:** Blocks commit if secret detected
  
  ### 2. CI/CD Pipeline (GitHub Actions)
  - **Tool:** TruffleHog GitHub Action
  - **Scope:** Full repository history
  - **Action:** Fails build if secret detected
  
  ### 3. GitHub Secret Scanning (Native)
  - **Tool:** GitHub Advanced Security
  - **Scope:** All pushes to repository
  - **Action:** Alerts and prevents push (if push protection enabled)
  
  ## How to Handle Detected Secrets
  
  ### If Secret is Real
  1. **DO NOT** commit the secret
  2. Remove from file
  3. Rotate/invalidate the compromised credential
  4. Use environment variables or secret management tools
  5. Add `.env` to `.gitignore`
  
  ### If False Positive
  1. Add file/pattern to `.trufflehogignore`
  2. Document why it's a false positive
  3. Re-run scan to verify
  
  ## Secret Management Best Practices
  
  ### Local Development
  - Use `.env` files (never commit these)
  - Use environment variables
  - Use secure credential storage (e.g., Windows Credential Manager, pass)
  
  ### CI/CD
  - Use GitHub Secrets for pipeline
  - Never log secrets
  - Rotate secrets regularly
  
  ### Kubernetes
  - Use Kubernetes Secrets
  - Consider External Secrets Operator
  - Never commit secrets to Git
  
  ## Allowed Patterns
  
  The following are NOT considered secrets:
  - Example credentials in documentation (clearly marked as examples)
  - Public test keys (with "test" or "example" in name)
  - Placeholder values (e.g., "YOUR_API_KEY_HERE")
  
  ## Reporting Security Issues
  
  If you discover a security vulnerability:
  1. **DO NOT** open a public issue
  2. Email: security@your-domain.com
  3. Include: Description, reproduction steps, impact
  4. We'll respond within 48 hours
  ```

- [ ] **Task 2.9: Test GitHub Actions Workflow**
  ```bash
  # Commit workflow
  git add .github/workflows/security-secrets.yml
  git add .trufflehogignore
  git commit -m "feat: add secret detection workflow"
  git push origin main
  
  # Check GitHub Actions tab
  # Navigate to: https://github.com/YOUR_USERNAME/cicd-pipeline/actions
  # Verify "Secret Detection" workflow runs and passes
  ```

- [ ] **Task 2.10: Create Secret Detection Verification Script**
  
  Create `scripts/scan-secrets.sh`:
  ```bash
  #!/bin/bash
  
  echo "🔍 Running comprehensive secret scan..."
  
  # Scan entire repository
  trufflehog filesystem . \
    --no-update \
    --json \
    --output=secret-scan-results.json
  
  if [ $? -eq 0 ]; then
    echo "✅ No secrets detected"
    rm -f secret-scan-results.json
    exit 0
  else
    echo "❌ Secrets detected! See secret-scan-results.json"
    cat secret-scan-results.json
    exit 1
  fi
  ```
  
  Make executable:
  ```bash
  chmod +x scripts/scan-secrets.sh
  
  # Test
  ./scripts/scan-secrets.sh
  ```

#### Deliverables
- ✅ TruffleHog installed locally
- ✅ Pre-commit hook blocks secrets
- ✅ GitHub Actions workflow for secret scanning
- ✅ GitHub native secret scanning enabled
- ✅ .trufflehogignore configured
- ✅ Security documentation created

#### Success Criteria
- Pre-commit hook blocks test secrets
- GitHub Actions workflow passes
- No secrets in repository
- False positives handled via .trufflehogignore

#### Windows-Specific Notes
- **Pre-commit hooks:** Work in WSL2 Git, may not work with Git for Windows
- **Recommendation:** Always commit from WSL2 terminal
- **Path handling:** Use WSL2 paths in hooks, not Windows paths
- **Line endings:** Ensure LF (not CRLF) for shell scripts: `git config core.autocrlf input`

</details>

<details>
<summary><h3>Phase 3: Static Application Security Testing (Week 2, Day 1-2)</h3></summary>

#### Tasks

- [ ] **Task 3.1: Install Semgrep in WSL2**
  ```bash
  # Install Python pip if not already installed
  sudo apt install python3-pip -y
  
  # Install Semgrep
  pip3 install semgrep
  
  # Add to PATH (add to ~/.bashrc for persistence)
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  source ~/.bashrc
  
  # Verify
  semgrep --version
  ```

- [ ] **Task 3.2: Install Checkov for IaC Scanning**
  ```bash
  # Install Checkov
  pip3 install checkov
  
  # Verify
  checkov --version
  ```

- [ ] **Task 3.3: Run Initial SAST Scan**
  ```bash
  # Scan with Semgrep (uses community rules)
  semgrep --config=auto --metrics=off .
  
  # Save results
  semgrep --config=auto --json --output=semgrep-results.json .
  
  # Scan Dockerfile
  checkov -f docker/Dockerfile
  
  # Scan Kubernetes manifests (will create later)
  # checkov -d k8s/
  ```

- [ ] **Task 3.4: Create Custom Semgrep Rules**
  
  Create `.semgrep/rules.yml`:
  ```yaml
  rules:
    # Hardcoded secrets
    - id: hardcoded-password
      patterns:
        - pattern: password = "..."
        - pattern: PASSWORD = "..."
        - pattern-not: password = ""
      message: Potential hardcoded password detected
      severity: ERROR
      languages: [javascript, python, go, java]
      metadata:
        category: security
        cwe: "CWE-798: Use of Hard-coded Credentials"
    
    - id: hardcoded-api-key
      patterns:
        - pattern: api_key = "..."
        - pattern: API_KEY = "..."
        - pattern-not: api_key = ""
      message: Potential hardcoded API key detected
      severity: ERROR
      languages: [javascript, python, go, java]
    
    # SQL Injection
    - id: sql-injection-risk
      patterns:
        - pattern: |
            $DB.execute($SQL + ...)
        - pattern: |
            $DB.query($SQL + ...)
      message: Possible SQL injection vulnerability - use parameterized queries
      severity: WARNING
      languages: [python, javascript]
      metadata:
        category: security
        cwe: "CWE-89: SQL Injection"
    
    # XSS vulnerabilities
    - id: dom-xss
      patterns:
        - pattern: $EL.innerHTML = $INPUT
        - pattern: document.write($INPUT)
      message: Potential XSS vulnerability - avoid innerHTML with user input
      severity: WARNING
      languages: [javascript]
      metadata:
        category: security
        cwe: "CWE-79: Cross-site Scripting"
    
    # Unsafe eval
    - id: eval-usage
      pattern: eval($X)
      message: Use of eval() is dangerous and should be avoided
      severity: ERROR
      languages: [javascript, python]
    
    # Insecure random
    - id: weak-random
      patterns:
        - pattern: Math.random()
        - pattern: random.random()
      message: Cryptographically weak random number generator - use crypto.randomBytes() or secrets module
      severity: WARNING
      languages: [javascript, python]
      metadata:
        category: security
        cwe: "CWE-338: Use of Cryptographically Weak PRNG"
  ```

- [ ] **Task 3.5: Test Custom Rules**
  ```bash
  # Run with custom rules
  semgrep --config=.semgrep/rules.yml .
  
  # Run both custom and community rules
  semgrep --config=auto --config=.semgrep/rules.yml .
  ```

- [ ] **Task 3.6: Create SAST GitHub Workflow**
  
  Create `.github/workflows/security-sast.yml`:
  ```yaml
  name: SAST Scanning
  
  on:
    push:
      branches: [ main, develop ]
    pull_request:
      branches: [ main ]
    schedule:
      - cron: '0 0 * * 0'  # Weekly Sunday midnight
  
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
            semgrep scan \
              --config=auto \
              --config=.semgrep/rules.yml \
              --sarif \
              --output=semgrep.sarif \
              --metrics=off \
              --verbose
        
        - name: Upload SARIF to GitHub Security
          uses: github/codeql-action/upload-sarif@v3
          with:
            sarif_file: semgrep.sarif
          if: always()
        
        - name: Upload Semgrep Results
          uses: actions/upload-artifact@v3
          with:
            name: semgrep-results
            path: semgrep.sarif
          if: always()
    
    checkov:
      name: Checkov IaC Security Scan
      runs-on: ubuntu-latest
      
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Set up Python
          uses: actions/setup-python@v4
          with:
            python-version: '3.11'
        
        - name: Install Checkov
          run: pip install checkov
        
        - name: Run Checkov on Dockerfile
          run: |
            checkov -f docker/Dockerfile \
              --output sarif \
              --output-file-path checkov-docker.sarif \
              --quiet
        
        - name: Run Checkov on Kubernetes
          run: |
            checkov -d k8s/ \
              --framework kubernetes \
              --output sarif \
              --output-file-path checkov-k8s.sarif \
              --quiet
          continue-on-error: true  # k8s folder might not exist yet
        
        - name: Upload Checkov Results
          uses: github/codeql-action/upload-sarif@v3
          with:
            sarif_file: |
              checkov-docker.sarif
              checkov-k8s.sarif
          if: always()
  ```

- [ ] **Task 3.7: Configure SARIF Viewer in GitHub**
  
  After pushing workflow:
  1. Navigate to GitHub repository
  2. Go to Security → Code scanning
  3. View SARIF results from Semgrep and Checkov
  4. Results will appear as alerts with severity levels

- [ ] **Task 3.8: Create SAST Quality Gates**
  
  Update `.github/workflows/security-sast.yml` to add quality gate:
  ```yaml
  # Add this job after semgrep job
    
    quality-gate:
      name: SAST Quality Gate
      needs: [semgrep, checkov]
      runs-on: ubuntu-latest
      
      steps:
        - name: Download Semgrep Results
          uses: actions/download-artifact@v3
          with:
            name: semgrep-results
        
        - name: Check for Critical Issues
          run: |
            # Count ERROR severity issues
            ERROR_COUNT=$(jq '[.runs[].results[] | select(.level=="error")] | length' semgrep.sarif)
            
            echo "Found $ERROR_COUNT critical issues"
            
            if [ "$ERROR_COUNT" -gt 0 ]; then
              echo "❌ SAST Quality Gate Failed: $ERROR_COUNT critical issues found"
              exit 1
            fi
            
            echo "✅ SAST Quality Gate Passed"
  ```

- [ ] **Task 3.9: Create Local SAST Scan Script**
  
  Create `scripts/scan-sast.sh`:
  ```bash
  #!/bin/bash
  
  echo "🔍 Running SAST scans..."
  
  # Run Semgrep
  echo ""
  echo "Running Semgrep..."
  semgrep --config=auto --config=.semgrep/rules.yml . --metrics=off
  SEMGREP_EXIT=$?
  
  # Run Checkov on Dockerfile
  echo ""
  echo "Running Checkov on Dockerfile..."
  checkov -f docker/Dockerfile --compact --quiet
  CHECKOV_EXIT=$?
  
  # Run Checkov on Kubernetes (if exists)
  if [ -d "k8s" ]; then
    echo ""
    echo "Running Checkov on Kubernetes manifests..."
    checkov -d k8s/ --framework kubernetes --compact --quiet
  fi
  
  # Summary
  echo ""
  echo "======================================"
  echo "SAST Scan Summary"
  echo "======================================"
  
  if [ $SEMGREP_EXIT -eq 0 ] && [ $CHECKOV_EXIT -eq 0 ]; then
    echo "✅ All SAST scans passed"
    exit 0
  else
    echo "❌ SAST scans found issues"
    exit 1
  fi
  ```
  
  Make executable:
  ```bash
  chmod +x scripts/scan-sast.sh
  
  # Test
  ./scripts/scan-sast.sh
  ```

- [ ] **Task 3.10: Document SAST Process**
  
  Add to `docs/SECURITY.md`:
  ```markdown
  ## SAST (Static Application Security Testing)
  
  ### Tools
  - **Semgrep**: General-purpose SAST for code
  - **Checkov**: Infrastructure as Code (IaC) security
  
  ### Scan Coverage
  
  #### Semgrep
  - JavaScript/TypeScript: XSS, injection, crypto issues
  - Python: SQL injection, command injection, crypto
  - Dockerfile: Best practices (via Checkov)
  - Custom rules: Hardcoded secrets, weak random, unsafe eval
  
  #### Checkov
  - Dockerfile: Security best practices, rootless containers
  - Kubernetes: CIS benchmarks, Pod Security Standards
  - GitHub Actions: Workflow security
  
  ### Running Locally
  \```bash
  # Quick scan
  semgrep --config=auto .
  
  # With custom rules
  semgrep --config=auto --config=.semgrep/rules.yml .
  
  # Scan Dockerfile
  checkov -f docker/Dockerfile
  
  # Comprehensive scan
  ./scripts/scan-sast.sh
  \```
  
  ### CI/CD Integration
  - Runs on every push to main/develop
  - Runs on all pull requests
  - Weekly scheduled scans
  - Results uploaded to GitHub Security tab
  
  ### Quality Gates
  - **ERROR severity** → Pipeline fails
  - **WARNING severity** → Alert but allow
  - Zero tolerance for critical issues
  
  ### False Positives
  If Semgrep flags false positives:
  1. Add inline comment: `# nosemgrep: rule-id`
  2. Document why it's safe
  3. Consider refactoring if possible
  ```

#### Deliverables
- ✅ Semgrep installed and configured
- ✅ Checkov installed for IaC scanning
- ✅ Custom Semgrep rules created
- ✅ GitHub Actions SAST workflow
- ✅ Quality gates enforced
- ✅ Local scan script

#### Success Criteria
- SAST scans run successfully
- Results appear in GitHub Security tab
- Custom rules detect security issues
- Quality gates block critical issues
- Documentation complete

#### Windows-Specific Notes
- **Python PATH:** Ensure `~/.local/bin` in PATH (WSL2)
- **Performance:** SAST scans faster in WSL2 than Windows filesystem
- **Semgrep Cache:** Located at `~/.semgrep` (WSL2)
- **Editor Integration:** VS Code can show Semgrep results inline

</details>

---

## 🎓 Windows-Specific Best Practices

### File System Performance
- **Always work in WSL2 filesystem** (`~/projects/`) not Windows filesystem (`/mnt/c/`)
- Docker builds are 10x faster in WSL2
- Git operations are significantly faster

### Path Handling
```bash
# Good (WSL2 path)
cd ~/projects/cicd-pipeline

# Avoid (Windows path via /mnt/c/)
cd /mnt/c/Users/YourName/projects/cicd-pipeline
```

### Accessing Files from Windows
```
# From Windows Explorer
\\wsl$\Ubuntu-22.04\home\YOUR_USERNAME\projects\cicd-pipeline

# From PowerShell
cd \\wsl$\Ubuntu-22.04\home\YOUR_USERNAME\projects
```

### Resource Management
```ini
# Optimize .wslconfig for 16GB RAM system
[wsl2]
memory=8GB       # 50% of total RAM
processors=4     # Leave some for Windows
swap=4GB
localhostForwarding=true
```

### Docker Desktop Tips
- Use WSL2 backend (not Hyper-V)
- Enable Kubernetes in Docker Desktop
- Allocate 8GB RAM, 4 CPUs to Docker
- Enable "Use the WSL 2 based engine"

### VS Code Integration
- Install "Remote - WSL" extension
- Open project from WSL: `code ~/projects/cicd-pipeline`
- Terminal in VS Code will use WSL2 bash

---

## 🚨 Common Windows-Specific Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Slow Docker builds** | Move project to WSL2 filesystem (`~/<projects/`) |
| **Git line endings** | `git config --global core.autocrlf input` |
| **WSL2 using too much RAM** | Configure `.wslconfig` with memory limit |
| **Can't access localhost** | Ensure `localhostForwarding=true` in `.wslconfig` |
| **Docker not starting** | Enable Hyper-V and Virtual Machine Platform in Windows Features |
| **PATH not working** | Add to `~/.bashrc`: `export PATH="$HOME/.local/bin:$PATH"` |
| **Permission denied** | Run `chmod +x script.sh` in WSL2 |

---

## 📊 Remaining Phases (Abbreviated for Space)

The following phases follow the same structure as the Mac guide but with Windows/WSL2-specific adjustments:

- **Phase 4:** Dependency Scanning (npm audit in WSL2)
- **Phase 5:** Container Security with Trivy (install via apt)
- **Phase 6:** Image Signing with Cosign (Windows binary available)
- **Phase 7:** Kubernetes on Docker Desktop
- **Phase 8:** Secure K8s Deployment (WSL2 kubectl)
- **Phase 9:** CI/CD Integration (GitHub Actions)
- **Phase 10:** OPA Gatekeeper Policies
- **Phase 11:** Prometheus + Grafana Monitoring
- **Phase 12:** Documentation & Portfolio

*All phases work identically on Windows + WSL2 once the base environment is configured.*

---

## 🎯 Success Criteria

### Technical
- ✅ WSL2 and Docker Desktop running smoothly
- ✅ All builds complete in < 10 minutes
- ✅ Zero critical vulnerabilities
- ✅ 100% policy compliance
- ✅ Works from both Windows and WSL2

### Performance Benchmarks (on your hardware)
- Docker build: < 2 minutes
- SAST scan: < 1 minute
- Container scan: < 30 seconds
- Kubernetes deployment: < 1 minute

---

## 🎉 Your Laptop is Perfect for This!

**Why your setup is great:**
- ✅ **16GB RAM** - Plenty for Docker + K8s + monitoring
- ✅ **RTX 3050** - Future-proofing for ML/AI security tools
- ✅ **Windows 11** - Latest WSL2 improvements
- ✅ **SSD** - Fast Docker layer caching

**You can run:**
- Full Kubernetes cluster (2-3 nodes)
- Prometheus + Grafana + Loki
- Multiple container builds simultaneously
- All security scanning tools
- VS Code + browser + terminals

---

## 💡 Next Steps

1. **Start with Phase 0** - Get WSL2 + Docker Desktop running
2. **Follow sequentially** - Each phase builds on previous
3. **Test thoroughly** - Verify each step before moving forward
4. **Document everything** - Great for portfolio
5. **Join communities** - WSL Discord, Docker forums, K8s Slack

---

**Good luck! Your hardware is more than capable. Let's build something awesome! 🚀**

*Windows + WSL2 gives you the best of both worlds: Windows desktop + Linux development environment.*