# Phase D — Secrets Management

**Theme:** Secrets should never be stored in git, plain environment variables, or unencrypted Kubernetes Secrets. Phase D replaces all static secret storage with a proper secrets management architecture.

**Prerequisites:** Phase C fully complete.
**Status:** Not started.

---

## The Problem Phase D Solves

Right now your secrets are stored in:
- GitHub Secrets (Cosign private key, Docker credentials) — acceptable but not rotatable automatically
- Kubernetes Secrets — stored unencrypted in etcd by default
- Environment variables in pod specs — visible to anyone who can `kubectl describe pod`

This is the most common way production systems get compromised. Leaked secrets account for the majority of cloud breaches. Phase D closes this gap.

---

## Task List

| ID | Task | Effort | Status |
|----|------|--------|--------|
| D1 | GitHub Push Protection | Low | ⏳ Not started |
| D2 | Kubernetes Secrets Encryption at Rest | Low | ⏳ Not started |
| D3 | External Secrets Operator | Medium | ⏳ Not started |
| D4 | HashiCorp Vault | High | ⏳ Not started |
| D5 | Secret Rotation | Medium | ⏳ Not started |

---

## D1 — GitHub Push Protection

**What it is:**
GitHub's built-in secret scanner with push protection. When you try to push a commit containing a known secret pattern (AWS keys, GitHub PATs, Stripe keys, 200+ other patterns), the push is rejected at the git protocol level — before the secret ever enters git history.

**Why it is different from TruffleHog:**
TruffleHog runs after the code is pushed. Push protection runs before — the commit is stopped at the `git push` command. The secret never lands in the repository at all. This is the difference between:
- TruffleHog: "we detected a secret that was just committed — please clean it up"
- Push protection: "we detected a secret — your push has been rejected, it never happened"

**Implementation:**
Enable in GitHub repository settings:
`Settings → Security → Code security and analysis → Secret scanning → Push protection → Enable`

No code changes required. Entirely configured in GitHub.

**Definition of done:**
- [ ] Push protection enabled on the repository
- [ ] Verified: attempt to push a test secret pattern is rejected
- [ ] GitHub Secret Scanning alerts visible in Security tab

---

## D2 — Kubernetes Secrets Encryption at Rest

**What it is:**
By default, Kubernetes Secrets are stored in etcd as base64-encoded plaintext. Anyone with access to the etcd database (or an etcd backup) can read all secrets. Encryption at rest means secrets in etcd are encrypted with a key — unreadable without it.

**Why it matters:**
If an attacker gains access to your etcd data (common in misconfigured clusters), unencrypted secrets are trivially readable. `base64 -d` is not encryption. Encrypting etcd secrets is a CIS Kubernetes Benchmark requirement.

**What gets encrypted:**
All Kubernetes `Secret` resources — including your Cosign key, any database passwords, TLS certificates, and service account tokens.

**Implementation:**
For Docker Desktop's local Kubernetes:
```bash
# Create encryption config
cat > /etc/kubernetes/enc/encryption-config.yaml << EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: $(head -c 32 /dev/urandom | base64)
      - identity: {}
EOF
```

For production clusters (EKS, GKE, AKS) — enable envelope encryption via the cloud KMS (AWS KMS, Google Cloud KMS, Azure Key Vault).

**Files to create:**
- `docs/encryption-config-setup.md` — setup instructions and key rotation procedure

**Definition of done:**
- [ ] Encryption at rest configured for the cluster
- [ ] Verified: secrets in etcd are encrypted (not base64 plaintext)
- [ ] Key rotation procedure documented

---

## D3 — External Secrets Operator

**What it is:**
External Secrets Operator (ESO) is a Kubernetes operator that pulls secrets from external secret stores (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) and creates Kubernetes Secrets from them automatically.

**Why it matters:**
Instead of storing secrets in the cluster, you store them in a dedicated secrets manager. The cluster pulls them on demand. Benefits:
- Single source of truth for all secrets
- Automatic rotation — when the secret changes in the vault, ESO updates the Kubernetes Secret automatically
- Full audit log — every secret access is logged
- Least privilege — pods only get the secrets they are allowed to access

**How it works:**
```
HashiCorp Vault (or AWS Secrets Manager)
        ↓ ESO pulls secret every 1 hour
Kubernetes Secret (created/updated automatically)
        ↓
Pod reads from Kubernetes Secret as usual
```

Your pod code does not change — it still reads a Kubernetes Secret. ESO handles the synchronisation.

**Implementation:**
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

Then create `SecretStore` and `ExternalSecret` resources pointing at your Vault.

**Files to create:**
- `k8s/external-secrets/secret-store.yaml`
- `k8s/external-secrets/cosign-secret.yaml`

**Definition of done:**
- [ ] ESO running in `external-secrets` namespace
- [ ] SecretStore configured pointing at Vault
- [ ] At least one ExternalSecret syncing successfully
- [ ] Verified: updating secret in Vault propagates to Kubernetes Secret automatically

---

## D4 — HashiCorp Vault

**What it is:**
HashiCorp Vault is a dedicated secrets management system. It stores, generates, and controls access to secrets. Every secret access is authenticated, authorised, and logged. Supports dynamic secrets (generated on demand, expired automatically), static secrets, PKI certificates, encryption as a service, and more.

**Why it matters:**
GitHub Secrets is convenient but limited — no audit log, no fine-grained access control, no rotation. Vault is the production-grade solution used at enterprises worldwide. It is the backbone of secrets management in cloud-native environments.

**Key Vault concepts:**

| Concept | What it means |
|---------|--------------|
| Auth methods | How Vault verifies identity — Kubernetes ServiceAccount, GitHub token, username/password |
| Secret engines | Where secrets are stored — KV (key-value), database, PKI, AWS, etc. |
| Policies | What an authenticated identity is allowed to read/write |
| Dynamic secrets | Generated on demand with a TTL — database credentials that expire in 1 hour |
| Audit log | Every secret read/write/delete logged with who, what, when |

**Dynamic secrets — the most important concept:**
Instead of a static database password stored somewhere, Vault generates a unique username and password for each request, with a 1-hour TTL. After 1 hour, the credentials expire and are deleted. An attacker who steals these credentials has a maximum 1-hour window. This is the enterprise standard for database access.

**Implementation:**
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.dev.enabled=true    # dev mode for local learning
```

**Initial setup:**
```bash
# Unseal and init (not needed in dev mode)
# Enable Kubernetes auth
vault auth enable kubernetes
# Enable KV secrets engine
vault secrets enable -path=secret kv-v2
# Store the Cosign private key
vault kv put secret/cosign private-key=@cosign.key
```

**Files to create:**
- `k8s/vault/vault-policy.yaml` — least-privilege policy for quiz-site
- `k8s/vault/vault-auth.yaml` — Kubernetes auth configuration
- `docs/vault-setup.md` — setup and usage guide

**Definition of done:**
- [ ] Vault running in `vault` namespace
- [ ] Kubernetes auth method enabled
- [ ] KV secrets engine enabled
- [ ] Cosign key stored in Vault
- [ ] ESO (from D3) pulling Cosign key from Vault into cluster
- [ ] Vault audit log enabled
- [ ] Verified: secret access appears in audit log

---

## D5 — Secret Rotation

**What it is:**
Rotate (replace) all existing secrets in the project. Existing secrets (Cosign key, any stored tokens) were created early in the project without rotation procedures. This task establishes rotation as a practice and documents the procedure.

**Why it matters:**
A secret that has never been rotated is a secret that has never been verified. Rotation:
- Limits the blast radius of an undetected past leak
- Proves the rotation procedure works before you need it in an emergency
- Establishes the habit — enterprise security policies typically require rotation every 90 days

**Secrets to rotate:**

| Secret | Where stored | Rotation procedure |
|--------|-------------|-------------------|
| Cosign private key | GitHub Secrets | Generate new key pair, update GitHub Secret, re-sign latest image |
| GitHub Actions tokens | GitHub | Review and revoke any PATs, switch to GITHUB_TOKEN where possible |

**Files to create:**
- `docs/secret-rotation-procedure.md` — step-by-step rotation runbook for each secret

**Definition of done:**
- [ ] All secrets inventoried
- [ ] Cosign key rotated and new key stored in Vault
- [ ] Rotation procedure documented for each secret
- [ ] Next rotation date scheduled (3 months from now)

---

## Phase D — Completion Checklist

- [ ] D1: GitHub push protection enabled and verified
- [ ] D2: Kubernetes Secrets encrypted at rest in etcd
- [ ] D3: External Secrets Operator running, at least one ExternalSecret syncing
- [ ] D4: HashiCorp Vault running, Cosign key stored, audit log enabled
- [ ] D5: All secrets rotated, rotation procedure documented
