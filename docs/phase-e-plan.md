# Phase E — Advanced Supply Chain Security

**Theme:** Prove that every artefact is exactly what was built, by exactly who built it, from exactly the source it claims. Move from "we sign images" to "every artefact has a verifiable, tamper-proof chain of custody."

**Prerequisites:** Phase D fully complete.
**Status:** Not started.

---

## The Problem Phase E Solves

Phase B introduced Cosign image signing using a key pair. This is good but has limitations:
- The private key is a static secret — it can be stolen, leaked, or used without your knowledge
- There is no proof of *when* the image was built or *from which exact source commit*
- Images are referenced by mutable tags (`:latest`) — you cannot guarantee what version is actually running

Phase E moves to a higher level of supply chain security: cryptographic provenance, immutable references, and keyless signing tied to identity rather than secrets.

---

## Task List

| ID | Task | Effort | Status |
|----|------|--------|--------|
| E1 | Digest Pinning | Low | ⏳ Not started |
| E2 | SLSA Level 1 — Build Provenance | Medium | ⏳ Not started |
| E3 | Cosign Keyless Signing (OIDC) | Medium | ⏳ Not started |
| E4 | SBOM Attestation | Low | ⏳ Not started |

---

## E1 — Digest Pinning

**What it is:**
Replace all image tags with immutable SHA256 digests everywhere in the project — Dockerfile base image, Kubernetes deployments, and GitHub Actions steps.

**The problem with tags:**
```yaml
image: nginx:1.31-alpine  # This is mutable — the tag can be reassigned to a different image
```
If Docker Hub is compromised, or if a maintainer accidentally pushes a broken image under the same tag, your pipeline silently picks up the new (potentially malicious) image.

**Digest pinning:**
```yaml
image: nginx@sha256:a4c5c2a9c39e42b5c5e4b7e6f3d8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8
```
This reference is immutable. The SHA256 digest is a cryptographic hash of the image content. If the image changes by even one byte, the digest changes. The exact same image will always be deployed regardless of what the tag points to.

**Where to pin:**

1. **Dockerfile base image:**
```dockerfile
FROM nginx@sha256:<digest>
```

2. **GitHub Actions (already partially done via Dependabot, but verify):**
```yaml
uses: actions/checkout@<full-sha>   # not @v4
```

3. **Kubernetes deployment:**
```yaml
image: ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site@sha256:<digest>
```

**How to get the digest:**
```bash
docker pull nginx:1.31-alpine
docker inspect nginx:1.31-alpine --format='{{index .RepoDigests 0}}'
# OR
crane digest nginx:1.31-alpine
```

**Files to modify:**
- `docker/Dockerfile` — pin base image by digest
- `k8s/base/deployment.yaml` — pin quiz-site image by digest
- `.github/workflows/*.yml` — verify all Actions use full SHA pinning

**Definition of done:**
- [ ] Dockerfile base image uses digest, not tag
- [ ] `deployment.yaml` uses image digest, not tag
- [ ] All GitHub Actions steps use full SHA commit pins
- [ ] Dependabot configured to update digest pins automatically

---

## E2 — SLSA Level 1: Build Provenance

**What it is:**
SLSA (Supply-chain Levels for Software Artefacts, pronounced "salsa") is a security framework that defines levels of supply chain integrity. Level 1 requires generating a signed **provenance attestation** — a document that records exactly what built the artefact: which source commit, which build system, what inputs, and when.

**Why it matters:**
The SolarWinds attack (2020) inserted malicious code during the build process. The resulting binaries were signed and appeared legitimate. SLSA provenance would have made this impossible — the provenance would have recorded the tampered build inputs, and verification would have failed.

**SLSA Levels:**

| Level | Requirement | What it prevents |
|-------|-------------|-----------------|
| 1 | Provenance generated | Provides basic build documentation |
| 2 | Provenance signed by build system | Prevents forgeable provenance |
| 3 | Hardened build environment | Prevents insider threats in the build system |
| 4 | Two-party review + hermetic builds | Prevents sophisticated supply chain attacks |

We implement Level 1 now. Level 2 is achievable with GitHub Actions. Levels 3-4 require dedicated build infrastructure.

**Implementation:**
Use `slsa-framework/slsa-github-generator` — generates and signs provenance automatically as part of your GitHub Actions workflow.

```yaml
- uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2
  with:
    image: ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site
    digest: ${{ steps.build.outputs.digest }}
```

The provenance document records:
- The exact GitHub Actions workflow that ran
- The exact source commit SHA
- The exact build inputs
- The timestamp
- A cryptographic signature from GitHub's OIDC identity

**Verification:**
```bash
slsa-verifier verify-image \
  ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site@sha256:<digest> \
  --source-uri github.com/rishabhyadavm07/Secure-CI-CD-Project
```

**Files to create/modify:**
- `.github/workflows/pipeline.yml` — add SLSA provenance generation step
- `docs/slsa-verification.md` — how to verify provenance

**Definition of done:**
- [ ] SLSA provenance generated on every build
- [ ] Provenance attached to image in GHCR
- [ ] Verified: `slsa-verifier` successfully verifies the provenance
- [ ] Provenance contains correct source repo and commit SHA

---

## E3 — Cosign Keyless Signing (OIDC)

**What it is:**
Replace the current key-based Cosign signing with keyless signing using GitHub Actions' OIDC (OpenID Connect) identity. Instead of a private key, the signing identity is GitHub's proof that "this specific workflow, on this specific repository, at this specific commit ran and produced this image."

**Why move away from key-based signing:**

| Key-based (current) | Keyless (OIDC) |
|--------------------|----------------|
| Private key is a long-lived secret | No private key to store or leak |
| Key can be stolen and used outside CI | Signing only possible during the GitHub Actions run |
| No automatic key rotation | Certificate issued and expires in minutes |
| Key has no provenance — could be used by anyone | Identity is cryptographically tied to the specific repo and workflow |

**How keyless signing works:**
1. GitHub Actions requests a short-lived OIDC token from GitHub's identity provider
2. Cosign exchanges this token for a short-lived signing certificate from Sigstore's Fulcio CA
3. The image is signed with this certificate
4. The signature and certificate are logged in Sigstore's Rekor transparency log
5. The certificate expires — it is useless after a few minutes

Anyone can verify: "this image was signed by the GitHub Actions workflow `pipeline.yml` in the `main` branch of `rishabhyadavm07/Secure-CI-CD-Project`."

**Implementation:**
```yaml
# In pipeline.yml — replace existing Cosign steps
- name: Sign image (keyless)
  uses: sigstore/cosign-installer@v3
  
- name: Sign
  run: |
    cosign sign \
      --yes \
      ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site@${{ steps.build.outputs.digest }}
  env:
    COSIGN_EXPERIMENTAL: "1"

- name: Verify
  run: |
    cosign verify \
      --certificate-identity-regexp="https://github.com/rishabhyadavm07/Secure-CI-CD-Project/.*" \
      --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
      ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site@${{ steps.build.outputs.digest }}
```

**Files to modify:**
- `.github/workflows/pipeline.yml` — replace key-based signing with keyless
- Kyverno policy (C3) — update to verify keyless signature identity

**Definition of done:**
- [ ] Keyless signing working in pipeline
- [ ] Cosign private key removed from GitHub Secrets
- [ ] Signature verifiable with identity constraint (repo + workflow)
- [ ] Rekor transparency log entry visible for each signed image
- [ ] Kyverno policy updated to verify keyless identity

---

## E4 — SBOM Attestation

**What it is:**
Attach the SBOM generated in C1 directly to the container image in GHCR as a signed Cosign attestation. Instead of a downloadable GitHub Actions artefact, the SBOM travels with the image — wherever the image goes, the SBOM goes.

**Why it matters:**
A detached SBOM file can be lost, replaced, or faked. An SBOM attached as a signed attestation:
- Is cryptographically tied to the specific image digest
- Cannot be modified without invalidating the signature
- Is automatically available to anyone who pulls the image
- Is verifiable: "this SBOM was produced by this specific build of this specific image"

**How it works:**
```
Image at GHCR (signed with keyless Cosign)
    └── Attestation: SBOM (SPDX format, signed with keyless Cosign)
    └── Attestation: SLSA Provenance (signed by SLSA generator)
```

**Implementation:**
```yaml
- name: Attach SBOM as attestation
  run: |
    cosign attest \
      --yes \
      --type spdxjson \
      --predicate sbom.spdx.json \
      ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site@${{ steps.build.outputs.digest }}
```

**Verification:**
```bash
cosign verify-attestation \
  --type spdxjson \
  --certificate-identity-regexp="https://github.com/rishabhyadavm07/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  ghcr.io/rishabhyadavm07/secure-ci-cd-project/quiz-site@sha256:<digest>
```

**Files to modify:**
- `.github/workflows/pipeline.yml` — add SBOM attestation step after keyless signing

**Definition of done:**
- [ ] SBOM attached as signed attestation to every image
- [ ] SLSA provenance attached as signed attestation
- [ ] Verified: `cosign verify-attestation` succeeds
- [ ] Both attestations visible in GHCR image details

---

## Phase E — Completion Checklist

- [ ] E1: All images and Actions pinned by digest, not tag
- [ ] E2: SLSA provenance generated and verified on every build
- [ ] E3: Keyless signing active, key-based signing removed
- [ ] E4: SBOM and provenance attached as signed attestations to every image

## What the Full Supply Chain Looks Like After Phase E

```
Developer commits (GPG signed — Phase C)
        ↓
GitHub Actions runs pipeline.yml
        ↓
Docker build using pinned digest base image (E1)
        ↓
SBOM generated (C1)
        ↓
Trivy CVE scan
        ↓
Image pushed to GHCR with digest reference
        ↓
Cosign keyless sign (E3) — tied to GitHub Actions OIDC identity
SBOM attached as attestation (E4)
SLSA provenance generated and attached (E2)
        ↓
Kyverno verifies signature before any deployment (C3)
        ↓
ArgoCD deploys exact digest to cluster (C4)
        ↓
Anyone can verify: who built it, when, from which commit,
what it contains, and that it hasn't been tampered with
```
