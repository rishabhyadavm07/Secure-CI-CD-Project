# Phase F — Compliance & Final Hardening

**Theme:** Verify the system meets industry security benchmarks, close any remaining gaps, and produce a documented security posture that can be presented to an auditor, an employer, or a security team.

**Prerequisites:** Phases C, D, and E fully complete.
**Status:** Not started.

---

## The Purpose of Phase F

Phases B through E built security controls. Phase F answers the question: **"How do we know it's actually secure?"**

Security benchmarks are industry-agreed checklists of what a secure system looks like. They are written by organisations like:
- **CIS (Center for Internet Security)** — the most widely used benchmark for Kubernetes, Docker, Linux
- **NSA/CISA** — US government Kubernetes hardening guide
- **NIST** — US National Institute of Standards and Technology cybersecurity framework
- **OWASP** — Open Web Application Security Project (CI/CD Security Top 10)

Phase F runs these benchmarks against your system, fixes the findings, and documents the result. This is exactly what a security audit looks like.

---

## Task List

| ID | Task | Effort | Status |
|----|------|--------|--------|
| F1 | kube-bench — CIS Kubernetes Benchmark | Medium | ⏳ Not started |
| F2 | Trivy Compliance Scanning | Low | ⏳ Not started |
| F3 | Remove Checkov soft_fail | Low | ⏳ Not started |
| F4 | Final Security Posture Report | Medium | ⏳ Not started |

---

## F1 — kube-bench: CIS Kubernetes Benchmark

**What it is:**
kube-bench is an open source tool by Aqua Security that runs the CIS Kubernetes Benchmark against your cluster — checking hundreds of settings across the API server, etcd, kubelet, scheduler, and controller manager.

**What the CIS Kubernetes Benchmark covers:**

| Section | What it checks |
|---------|---------------|
| API Server | Authentication settings, authorisation mode, audit logging, TLS configuration |
| etcd | Encryption at rest, TLS peer authentication, file permissions |
| Scheduler | TLS configuration, bind address |
| Controller Manager | Service account key files, TLS configuration |
| Worker nodes / Kubelet | Anonymous authentication disabled, webhook authorisation |
| Policies | Pod Security Standards, NetworkPolicy presence, RBAC settings |

**Why it matters:**
The CIS Benchmark is what cloud security teams run before certifying a cluster for production. It is referenced in PCI-DSS, HIPAA, and SOC2 audits. Running it against your cluster reveals gaps that are not visible from just reading the deployment YAML.

**Installation and run:**
```bash
# Run kube-bench in a pod against the local cluster
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
kubectl logs job/kube-bench
```

**Expected output:**
```
[INFO] 1 Master Node Security Configuration
[PASS] 1.1.1 Ensure that the API server pod specification file permissions are set to 600
[FAIL] 1.2.6 Ensure that the --authorization-mode argument includes Node
[WARN] 1.3.1 Ensure that the --terminated-pod-gc-threshold argument is set as appropriate
...
[INFO] 5 Kubernetes Policies
[PASS] 5.2.1 Ensure that the cluster has at least one active policy control mechanism in place
```

**Process:**
1. Run kube-bench — capture full output
2. Review all FAIL items — categorise by severity and fixability
3. Fix what is fixable in a local Docker Desktop cluster
4. Document what cannot be fixed (some CIS checks require cloud provider infrastructure)
5. Record the final pass/fail/warn counts

**Files to create:**
- `docs/kube-bench-results.md` — annotated benchmark results with fix status

**Definition of done:**
- [ ] kube-bench run against cluster, full output captured
- [ ] All FAIL items reviewed and categorised
- [ ] Fixable items resolved
- [ ] Results documented with explanations for items that cannot be fixed in local environment

---

## F2 — Trivy Compliance Scanning

**What it is:**
Trivy (already used for CVE scanning) also has a compliance scanning mode. It can scan your cluster configuration against multiple security standards and produce a compliance report showing pass/fail/skip for each control.

**Supported standards in Trivy compliance mode:**

| Standard | What it covers |
|----------|---------------|
| CIS Kubernetes Benchmark | Same as kube-bench but integrated into Trivy |
| NSA/CISA Kubernetes Hardening Guide | US government hardening requirements |
| CIS Docker Benchmark | Docker daemon and container configuration |
| NIST SP 800-190 | Container security guidelines |
| STIG (DISA) | US Department of Defense hardening requirements |

**Why run Trivy compliance in addition to kube-bench:**
- Different tools catch different things
- Trivy compliance scans the cluster *resources* (deployments, pods, namespaces) — not just the node configuration that kube-bench checks
- Trivy produces a SARIF report that can be uploaded to GitHub Security tab
- Can be added to the CI pipeline to catch compliance regressions on every PR

**Implementation:**

Scan cluster:
```bash
trivy k8s --compliance k8s-cis --report summary cluster
```

Scan Docker configuration:
```bash
trivy image --compliance docker-cis ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site:latest
```

Add to CI pipeline:
```yaml
- name: Trivy compliance scan
  run: |
    trivy k8s \
      --compliance k8s-nsa \
      --format sarif \
      --output trivy-compliance.sarif \
      cluster

- name: Upload compliance results
  uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: trivy-compliance.sarif
  if: github.event_name == 'push'
```

**Files to create/modify:**
- `.github/workflows/security.yml` — add Trivy compliance scan step
- `docs/compliance-scan-results.md` — annotated compliance results

**Definition of done:**
- [ ] Trivy compliance scan run against cluster for NSA/CISA standard
- [ ] Trivy compliance scan run against Docker image for CIS Docker standard
- [ ] Results uploaded to GitHub Security tab
- [ ] Results documented with fix status for each failed control
- [ ] Compliance scan added to CI pipeline

---

## F3 — Remove Checkov soft_fail

**What it is:**
In the current `checkov.yml` workflow, both the Dockerfile and Kubernetes manifest scans use `soft_fail: true`. This means Checkov reports violations but the pipeline succeeds regardless. This is appropriate while setting up and learning — but in a production security posture, IaC violations should block the pipeline.

**Why it matters:**
`soft_fail: true` means security findings are visible but not enforced. An engineer under deadline pressure can merge a deployment with known Checkov violations because the pipeline does not block them. Removing `soft_fail` makes the security gate a hard gate — the same way Trivy already works.

**What to expect when removing soft_fail:**
Before removing, run Checkov and review all current findings. Some findings may be intentional (e.g. Checkov flags `emptyDir` volumes as a finding — but we use them for the read-only nginx filesystem, which is correct). These need to be explicitly skipped with a comment explaining why, rather than silently suppressed with `soft_fail`.

**Example of explicit skip with justification:**
```yaml
# checkov:skip=CKV_K8S_28:emptyDir is required for nginx read-only root filesystem
```

**Process:**
1. Run Checkov with `soft_fail: true` — capture all current findings
2. For each finding: fix, explicitly skip with justification, or accept as known risk
3. Remove `soft_fail: true` from `checkov.yml`
4. Verify pipeline still passes with clean result

**Files to modify:**
- `.github/workflows/checkov.yml` — remove `soft_fail: true` from both scan steps
- `k8s/base/*.yaml` — add `checkov:skip` annotations where needed

**Definition of done:**
- [ ] All current Checkov findings reviewed and addressed
- [ ] `soft_fail: true` removed from both scan steps
- [ ] Pipeline passes without soft_fail
- [ ] Any skipped checks have explicit justification comments

---

## F4 — Final Security Posture Report

**What it is:**
A comprehensive document that describes every security control in the system, maps it to an industry standard or framework, and assesses the overall security posture. This is the capstone document for the entire project.

**Why it matters:**
When applying for DevSecOps, Platform Security, or Security Engineering roles — this document proves you did not just follow a tutorial. It shows you understand what each control does, why it matters, and how it fits into a security framework.

**Structure of the report:**

### Section 1: Executive Summary
- Project scope and objectives
- Overall security posture assessment
- Key controls implemented
- Residual risks

### Section 2: Controls Inventory
Every control mapped to a framework:

| Control | Category | Maps to | Status |
|---------|----------|---------|--------|
| Gitleaks pre-commit hook | Secrets | OWASP CI/CD-SEC-01 | ✅ |
| TruffleHog CI scanning | Secrets | OWASP CI/CD-SEC-01 | ✅ |
| GitHub Push Protection | Secrets | CIS GitHub Benchmark | ✅ |
| Semgrep SAST | Code Security | OWASP CI/CD-SEC-04 | ✅ |
| Checkov IaC scanning | IaC Security | OWASP CI/CD-SEC-06 | ✅ |
| Trivy CVE scanning | Vulnerability Mgmt | CIS Docker 4.1 | ✅ |
| Cosign keyless signing | Supply Chain | SLSA L2 | ✅ |
| SBOM generation + attestation | Supply Chain | EO 14028 | ✅ |
| SLSA provenance | Supply Chain | SLSA L1/L2 | ✅ |
| Digest pinning | Supply Chain | OWASP CI/CD-SEC-10 | ✅ |
| Dependabot | Dependency Mgmt | OWASP CI/CD-SEC-02 | ✅ |
| Hardened Dockerfile | Container | CIS Docker Benchmark | ✅ |
| Security contexts | Container | CIS K8s Benchmark 5.2 | ✅ |
| Network policies | Container | CIS K8s Benchmark 5.3 | ✅ |
| RBAC | Container | CIS K8s Benchmark 5.1 | ✅ |
| Pod Security Admission | Container | CIS K8s Benchmark 5.2 | ✅ |
| Resource quotas | Container | CIS K8s Benchmark 5.4 | ✅ |
| Falco runtime detection | Runtime | NSA K8s Hardening 7 | ✅ |
| Kyverno policies | Policy | NSA K8s Hardening 8 | ✅ |
| ArgoCD GitOps | Deployment | OWASP CI/CD-SEC-05 | ✅ |
| Prometheus + Grafana | Observability | NIST CSF DE.CM | ✅ |
| HashiCorp Vault | Secrets Mgmt | CIS K8s Benchmark 4.1 | ✅ |
| GPG signed commits | Identity | SLSA L2 | ✅ |
| kube-bench clean | Compliance | CIS K8s Benchmark | ✅ |
| Trivy compliance | Compliance | NSA/CISA K8s | ✅ |

### Section 3: Attack Surface Analysis
For each layer (developer workstation, CI/CD pipeline, container registry, Kubernetes cluster, runtime), document:
- What attacks are possible
- Which controls mitigate each attack
- What residual risk remains

### Section 4: Compliance Mapping
Map the project controls to:
- CIS Kubernetes Benchmark — pass/fail counts
- OWASP Top 10 CI/CD Security Risks — which risks are mitigated
- NSA/CISA Kubernetes Hardening Guide — coverage assessment

### Section 5: Residual Risks and Recommendations
What is not covered and why, with recommendations for a real production environment (multi-cluster, cloud KMS, hardware security keys, WAF, etc.)

**Files to create:**
- `docs/security-posture-report.md` — the full report

**Definition of done:**
- [ ] All sections written
- [ ] Every implemented control listed with framework mapping
- [ ] Attack surface analysis completed for all 5 layers
- [ ] CIS, OWASP, NSA/CISA compliance mapping complete
- [ ] Residual risks documented

---

## Phase F — Completion Checklist

- [ ] F1: kube-bench run, findings reviewed and fixed where possible, results documented
- [ ] F2: Trivy compliance scanning in CI pipeline, results in Security tab
- [ ] F3: Checkov `soft_fail` removed, all findings addressed with justification
- [ ] F4: Final security posture report complete with all framework mappings

---

## Project Complete — What You Will Have Built

When Phase F is done, you will have a fully documented, benchmark-verified DevSecOps pipeline covering:

| Layer | Controls |
|-------|---------|
| Developer | Gitleaks, GPG signing, local Semgrep |
| Source code | Branch protection, required reviews, SAST |
| Pipeline | Secret scanning, IaC scanning, CVE scanning, compliance scanning |
| Supply chain | Cosign keyless signing, SBOM, SLSA provenance, digest pinning |
| Registry | Kyverno policy enforcement, signature verification |
| Secrets | Vault, External Secrets Operator, rotation procedures |
| Cluster | Security contexts, network policies, RBAC, PSA, resource quotas |
| Runtime | Falco threat detection, ArgoCD GitOps |
| Observability | Prometheus, Grafana, AlertManager |
| Compliance | CIS Kubernetes Benchmark, NSA/CISA, OWASP CI/CD Top 10 |

This is an enterprise-grade DevSecOps pipeline. The same controls protect production systems at banks, healthcare companies, and government agencies.
