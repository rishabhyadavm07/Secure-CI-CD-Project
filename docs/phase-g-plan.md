# Phase G — Jenkins CI/CD (Enterprise Alternative Pipeline)

**Theme:** Implement the same DevSecOps pipeline in Jenkins — the most widely used CI/CD platform in enterprise environments. Demonstrates that your security skills are platform-agnostic, not tied to GitHub Actions.

**Prerequisites:** Phase D (Vault running) and Phase C (ArgoCD running) fully complete.
**Status:** Not started.

---

## Why Jenkins

GitHub Actions is excellent for open source and cloud-native projects. But walk into most enterprise environments — banks, insurance companies, healthcare organisations, government agencies — and you will find Jenkins.

Jenkins has been the dominant CI/CD platform for over a decade. It has:
- 1800+ plugins covering every tool in the DevSecOps ecosystem
- A massive installed base — millions of instances worldwide
- Deep Kubernetes integration (build agents as ephemeral pods)
- Native HashiCorp Vault integration for secrets
- Shared Libraries — a way to package reusable pipeline steps and distribute them across hundreds of repos

Knowing how to implement a secure pipeline in Jenkins is a distinct, valuable skill that GitHub Actions experience does not cover. This phase builds exactly that.

---

## Task List

| ID | Task | Effort | Status |
|----|------|--------|--------|
| G1 | Deploy Jenkins in Kubernetes | Medium | ⏳ Not started |
| G2 | Write Jenkinsfile — mirror the GitHub Actions security pipeline | Medium | ⏳ Not started |
| G3 | Jenkins + Kubernetes Plugin — ephemeral pod agents | Medium | ⏳ Not started |
| G4 | Jenkins + Vault Plugin — pull secrets from HashiCorp Vault | Medium | ⏳ Not started |
| G5 | Jenkins Shared Library — reusable security scan steps | High | ⏳ Not started |

---

## G1 — Deploy Jenkins in Kubernetes

**What it is:**
Deploy Jenkins as a pod in your Kubernetes cluster using the official Helm chart. Jenkins runs as the controller — it manages the pipeline orchestration, stores job configuration, and coordinates build agents.

**Why Kubernetes instead of Docker Compose:**
Running Jenkins in Kubernetes gives you:
- Pod security contexts (same hardening as your quiz-site)
- Persistent storage via PersistentVolumeClaim
- Resource limits to prevent Jenkins consuming all cluster resources
- Integration with the Kubernetes plugin (G3) for ephemeral agents

**Architecture:**
```
Jenkins Controller (pod in jenkins namespace)
    ├── Persistent volume for Jenkins home (/var/jenkins_home)
    ├── Service: LoadBalancer or NodePort for UI access
    └── Kubernetes ServiceAccount with permissions to create agent pods
```

**Install commands:**
```bash
helm repo add jenkins https://charts.jenkins.io
helm repo update
helm install jenkins jenkins/jenkins \
  --namespace jenkins \
  --create-namespace \
  --set controller.serviceType=NodePort \
  --set controller.nodePort=32080 \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

**Post-install setup:**
```bash
# Get admin password
kubectl exec -n jenkins -it svc/jenkins -c jenkins -- \
  cat /run/secrets/additional/chart-admin-password

# Access Jenkins UI
http://localhost:32080
```

**Required plugins to install:**
- Kubernetes plugin (G3)
- HashiCorp Vault plugin (G4)
- Pipeline plugin (core)
- Git plugin
- Docker Pipeline plugin
- Credentials plugin
- Blue Ocean (modern UI — optional but recommended)

**Files to create:**
- `k8s/jenkins/namespace.yaml`
- `k8s/jenkins/serviceaccount.yaml`
- `k8s/jenkins/pvc.yaml`
- `k8s/jenkins/values.yaml` — Helm values override

**Security hardening for Jenkins pod:**
```yaml
securityContext:
  runAsUser: 1000       # jenkins user
  runAsNonRoot: true
  fsGroup: 1000
  readOnlyRootFilesystem: false   # Jenkins needs to write to JENKINS_HOME
```

Note: Jenkins cannot use `readOnlyRootFilesystem: true` because it writes to its home directory. This is an accepted exception — documented with justification.

**Definition of done:**
- [ ] Jenkins running in `jenkins` namespace
- [ ] UI accessible at `localhost:32080`
- [ ] Persistent volume mounted — jobs survive pod restarts
- [ ] Required plugins installed
- [ ] Jenkins ServiceAccount created with minimum permissions

---

## G2 — Jenkinsfile: Mirror the GitHub Actions Security Pipeline

**What it is:**
A `Jenkinsfile` (declarative pipeline) that runs the same security scans as your GitHub Actions pipeline: TruffleHog, Semgrep, Checkov, Docker build, Trivy, push to GHCR, and Cosign signing.

**Why a Jenkinsfile:**
A Jenkinsfile is Pipeline as Code — the pipeline definition lives in the repository alongside the application code. It is version-controlled, reviewed, and audited the same way application code is. This is the same principle as your GitHub Actions workflows.

**The Jenkinsfile structure:**
```groovy
pipeline {
    agent any

    environment {
        IMAGE = "ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site"
        REGISTRY = "ghcr.io"
    }

    stages {
        stage('Secret Scan') {
            steps {
                sh 'trufflehog git file://. --only-verified --fail'
            }
        }

        stage('SAST — Semgrep') {
            steps {
                sh 'semgrep --config .semgrep.yml --error .'
            }
        }

        stage('IaC Scan — Checkov') {
            steps {
                sh '''
                    checkov -f docker/Dockerfile --framework dockerfile --exit-code 1
                    checkov -d k8s/ --framework kubernetes --exit-code 1
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh "docker build -f docker/Dockerfile -t ${IMAGE}:${BUILD_NUMBER} ."
            }
        }

        stage('CVE Scan — Trivy') {
            steps {
                sh '''
                    trivy image \
                      --severity CRITICAL,HIGH \
                      --exit-code 1 \
                      ${IMAGE}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Push to GHCR') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'ghcr-credentials',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_TOKEN'
                )]) {
                    sh '''
                        echo $REGISTRY_TOKEN | docker login ghcr.io -u $REGISTRY_USER --password-stdin
                        docker push ${IMAGE}:${BUILD_NUMBER}
                    '''
                }
            }
        }

        stage('Sign Image — Cosign') {
            steps {
                sh '''
                    cosign sign --yes \
                      ${IMAGE}:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            echo 'Pipeline failed — image not pushed or signed'
        }
        success {
            echo "Image ${IMAGE}:${BUILD_NUMBER} built, scanned, pushed, and signed"
        }
    }
}
```

**Key differences from GitHub Actions:**
| GitHub Actions | Jenkins |
|---------------|---------|
| YAML syntax | Groovy DSL |
| Steps in `.github/workflows/` | Steps in `Jenkinsfile` at repo root |
| Secrets in GitHub Secrets | Credentials in Jenkins Credentials store (or Vault) |
| Triggered by GitHub events | Triggered by webhooks or polling |
| Runners managed by GitHub | Agents managed by you (or Kubernetes plugin) |

**Files to create:**
- `Jenkinsfile` — at repo root

**Definition of done:**
- [ ] Jenkinsfile committed to repo root
- [ ] Jenkins job created pointing at the repo
- [ ] Pipeline runs end-to-end: secret scan → SAST → IaC scan → build → CVE scan → push → sign
- [ ] Pipeline fails correctly when a security gate fails (test with a known vulnerable image)
- [ ] Pipeline succeeds on clean code

---

## G3 — Jenkins + Kubernetes Plugin: Ephemeral Pod Agents

**What it is:**
The Jenkins Kubernetes plugin dynamically creates a new Kubernetes pod for each build, runs the pipeline inside it, and destroys the pod when the build is done. Each build gets a clean, isolated environment.

**Why ephemeral agents:**

| Static Jenkins agents | Ephemeral pod agents |
|-----------------------|---------------------|
| Persistent VMs or containers | Created fresh for each build |
| State accumulates between builds | Zero state carryover |
| Compromise of one build can affect the next | Complete isolation |
| Scaling requires pre-provisioned machines | Scales to zero when idle |
| Fixed resources — wasted when idle | Uses only what each build needs |

This is the modern enterprise Jenkins architecture. The controller just orchestrates — all build work happens in ephemeral pods.

**How it works:**
```
Git push → Jenkins controller triggered
        ↓
Jenkins requests a new pod from Kubernetes
        ↓
Kubernetes creates the pod (using your security contexts from Phase B)
        ↓
Pipeline runs inside the pod
        ↓
Pod deleted — no trace left
```

**Pod template configuration:**
```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  serviceAccountName: jenkins-agent
                  securityContext:
                    runAsNonRoot: true
                    runAsUser: 1000
                  containers:
                    - name: jnlp
                      image: jenkins/inbound-agent:latest
                    - name: docker
                      image: docker:24-dind
                      securityContext:
                        privileged: true   # Required for Docker-in-Docker
                    - name: tools
                      image: aquasec/trivy:latest
                      command: ["cat"]
                      tty: true
            '''
        }
    }
    // ... stages
}
```

**Note on Docker-in-Docker:**
Building Docker images inside a pod requires either Docker-in-Docker (DinD, needs privileged) or Kaniko (daemonless, no privilege needed). We will use **Kaniko** to avoid privileged containers — consistent with our PSA restricted policy.

**Kaniko-based build (no privileged required):**
```groovy
stage('Build Image') {
    container('kaniko') {
        sh '''
            /kaniko/executor \
              --context=. \
              --dockerfile=docker/Dockerfile \
              --destination=${IMAGE}:${BUILD_NUMBER}
        '''
    }
}
```

**Files to create:**
- `k8s/jenkins/agent-serviceaccount.yaml` — ServiceAccount for build agents
- `k8s/jenkins/agent-role.yaml` — minimum permissions for agents
- Update `Jenkinsfile` with kubernetes agent block

**Definition of done:**
- [ ] Kubernetes plugin configured in Jenkins
- [ ] Pod template defined with security contexts
- [ ] Build runs inside an ephemeral pod (verify: pod created, job runs, pod deleted)
- [ ] Kaniko used for Docker build (no privileged containers)
- [ ] Agent ServiceAccount has only necessary permissions

---

## G4 — Jenkins + Vault Plugin: Pull Secrets from HashiCorp Vault

**What it is:**
Configure the Jenkins HashiCorp Vault plugin to pull credentials (GHCR token, Cosign key) directly from Vault at runtime. Jenkins never stores secrets locally — they are fetched from Vault when needed and discarded after the build.

**Why this matters:**
Without Vault integration, secrets are stored in Jenkins' credential store — encrypted at rest but living inside Jenkins. With Vault integration:
- Secrets live only in Vault — single source of truth
- Every secret access is logged in Vault's audit log (who, what, when)
- Secrets can be rotated in Vault without updating Jenkins
- If Jenkins is compromised, the attacker cannot read secrets from disk — they only exist in memory during a build

**How it works:**
```
Jenkins build starts
        ↓
Jenkins authenticates to Vault using Kubernetes ServiceAccount token
        ↓
Vault verifies the token with Kubernetes API
        ↓
Vault returns the secret (GHCR token)
        ↓
Secret available as environment variable for the duration of the build
        ↓
Build finishes — secret is gone from memory
```

**Vault configuration:**
```bash
# In Vault — create policy for Jenkins
vault policy write jenkins-policy - <<EOF
path "secret/data/ghcr" {
  capabilities = ["read"]
}
path "secret/data/cosign" {
  capabilities = ["read"]
}
EOF

# Create Kubernetes auth role for Jenkins
vault write auth/kubernetes/role/jenkins \
  bound_service_account_names=jenkins \
  bound_service_account_namespaces=jenkins \
  policies=jenkins-policy \
  ttl=1h
```

**Jenkinsfile with Vault secrets:**
```groovy
pipeline {
    agent any

    environment {
        IMAGE = "ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site"
    }

    stages {
        stage('Push to GHCR') {
            steps {
                withVault(
                    vaultSecrets: [[
                        path: 'secret/ghcr',
                        secretValues: [
                            [envVar: 'REGISTRY_TOKEN', vaultKey: 'token'],
                            [envVar: 'REGISTRY_USER', vaultKey: 'username']
                        ]
                    ]]
                ) {
                    sh '''
                        echo $REGISTRY_TOKEN | docker login ghcr.io -u $REGISTRY_USER --password-stdin
                        docker push ${IMAGE}:${BUILD_NUMBER}
                    '''
                }
            }
        }
    }
}
```

**Files to create/modify:**
- `k8s/vault/jenkins-policy.hcl` — Vault policy for Jenkins
- `k8s/vault/jenkins-auth-role.yaml` — Kubernetes auth role
- Update `Jenkinsfile` — replace hardcoded credential IDs with Vault references

**Definition of done:**
- [ ] Jenkins Vault plugin installed and configured
- [ ] Jenkins authenticates to Vault via Kubernetes ServiceAccount
- [ ] GHCR credentials pulled from Vault (not Jenkins credential store)
- [ ] Cosign key pulled from Vault
- [ ] Verified: Vault audit log shows secret access during each build
- [ ] Jenkins credential store is empty — all secrets in Vault

---

## G5 — Jenkins Shared Library: Reusable Security Scan Steps

**What it is:**
A Jenkins Shared Library is a reusable package of pipeline steps stored in a separate Git repository. Instead of copying TruffleHog, Semgrep, Trivy, and Checkov steps into every project's Jenkinsfile, you write them once in the shared library and import them everywhere.

**Why this is the enterprise standard:**
Large organisations have hundreds of repositories. If security scan configuration lives in each Jenkinsfile, you have hundreds of copies to update when a tool changes. A shared library means:
- Update the security scan logic in one place — all pipelines pick up the change automatically
- Standardise security gates across all teams — every repo uses the same Trivy severity threshold, the same Semgrep rules
- Version the library — teams can pin to `@v1.2` or use `@latest`
- Security team owns the library — developers cannot weaken the gates

**What the shared library provides:**

```
vars/
  secretScan.groovy       — TruffleHog step
  sastScan.groovy         — Semgrep step
  iacScan.groovy          — Checkov step
  trivyScan.groovy        — Trivy CVE scan step
  signImage.groovy        — Cosign sign + verify step
  securityPipeline.groovy — Full pipeline combining all steps
src/
  org/securepipeline/
    SecurityUtils.groovy  — Shared helper functions
resources/
  semgrep-rules.yml       — Shared Semgrep rules
```

**Jenkinsfile using the shared library:**
```groovy
@Library('secure-pipeline-library@v1.0') _

pipeline {
    agent {
        kubernetes { /* pod template */ }
    }

    stages {
        stage('Security Scan') {
            steps {
                secretScan()
                sastScan()
                iacScan(directory: 'k8s/', framework: 'kubernetes')
            }
        }

        stage('Build') {
            steps {
                script {
                    def image = buildImage(
                        dockerfile: 'docker/Dockerfile',
                        tag: env.BUILD_NUMBER
                    )
                    trivyScan(image: image)
                    pushImage(image: image)
                    signImage(image: image)
                }
            }
        }
    }
}
```

**Repository structure:**
The shared library lives in a separate repo: `Secure-CI-CD-SharedLibrary`

**Files to create:**
- New GitHub repo: `Secure-CI-CD-SharedLibrary`
- `vars/secretScan.groovy`
- `vars/sastScan.groovy`
- `vars/iacScan.groovy`
- `vars/trivyScan.groovy`
- `vars/signImage.groovy`
- `vars/securityPipeline.groovy`
- `src/org/securepipeline/SecurityUtils.groovy`
- Update `Jenkinsfile` in main repo to use the library

**Definition of done:**
- [ ] Shared library repo created with all scan steps
- [ ] Library registered in Jenkins global configuration
- [ ] Main repo `Jenkinsfile` updated to use library
- [ ] Pipeline runs identically using library steps
- [ ] Library versioned with a git tag (`v1.0`)
- [ ] Verified: changing a scan parameter in the library propagates to the pipeline

---

## Phase G — Completion Checklist

- [ ] G1: Jenkins running in `jenkins` namespace, UI accessible, plugins installed
- [ ] G2: Jenkinsfile committed, full security pipeline running end-to-end
- [ ] G3: Ephemeral Kubernetes pod agents, Kaniko for Docker builds
- [ ] G4: Jenkins pulls all secrets from Vault, credential store empty
- [ ] G5: Shared library created, Jenkinsfile using library steps

---

## GitHub Actions vs Jenkins — Side by Side

At the end of Phase G you will have the same DevSecOps pipeline implemented on both platforms:

| Capability | GitHub Actions | Jenkins |
|------------|---------------|---------|
| Secret scanning | TruffleHog action | TruffleHog in Jenkinsfile |
| SAST | Semgrep action | Semgrep in Jenkinsfile |
| IaC scan | Checkov action | Checkov in Jenkinsfile |
| CVE scan | Trivy action | Trivy in Jenkinsfile |
| Image signing | Cosign action | Cosign in Jenkinsfile |
| Secrets management | GitHub Secrets | HashiCorp Vault |
| Build agents | GitHub-hosted runners | Ephemeral Kubernetes pods |
| Reusable steps | Composite actions / reusable workflows | Shared Libraries |
| Trigger | GitHub events (push, PR) | Webhooks + polling |
| Access control | GitHub permissions | Jenkins RBAC + Vault policies |

This is a complete, enterprise-grade demonstration of platform-agnostic DevSecOps.
