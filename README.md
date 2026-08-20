# nz-app-template

## Secrets (SOPS + age)

Secrets live encrypted in git under `secrets/<env>/*.sops.yaml`. Each file decrypts for a fixed
list of recipients (age public keys) declared in `.sops.yaml`. Non-secret config (domain, app
name) lives in `deploy/env/<env>.env` as plaintext instead — see `CLAUDE.md`.

Prerequisites: `sops` and `age` installed, and `SOPS_AGE_KEY_FILE` pointing at your private key
(default `~/.config/sops/age/keys.txt`).

### Everyday use

```bash
sops secrets/production/server.sops.yaml   # opens $EDITOR with plaintext, re-encrypts on save
sops -d secrets/production/server.sops.yaml
sops -d --output-type dotenv secrets/production/server.sops.yaml > apps/server/.env
```

There is no separate "encrypt" command — `sops <file>` always leaves the file encrypted on disk;
plaintext only exists transiently in the editor.

### Adding a team member

1. The new member generates their own keypair and sends you **only the public key**:
   ```bash
   age-keygen -o keys.txt   # prints "Public key: age1..." — private key never leaves their machine
   ```
2. Add that public key to the relevant `key_groups` in `.sops.yaml`, with a comment naming whom
   it belongs to.
3. Re-encrypt every secrets file under that `path_regex` for the new recipient list:
   ```bash
   sops updatekeys secrets/production/server.sops.yaml
   sops updatekeys secrets/production/web.sops.yaml
   sops updatekeys secrets/production/infra.sops.yaml
   ```
4. Commit `.sops.yaml` and the re-encrypted files together.

### Revoking access

1. Remove the person's public key line from `.sops.yaml`.
2. Run `sops updatekeys` on every secrets file under that `path_regex` (same three commands as
   above) — this re-wraps the data key without them, so their private key can no longer decrypt
   the file **going forward**.
3. Commit.

`updatekeys` only protects future versions of the file. Anyone who already decrypted it kept a
plaintext copy outside git's control, so if the revocation is for cause (compromised laptop,
departing team member with sensitive access), also rotate the actual secret values — see below —
not just the recipient list.

### Rotating a secret value

```bash
sops secrets/production/server.sops.yaml   # edit the value in $EDITOR, save
```
Then redeploy so the running app picks up the new value. Do this for JWT signing keys, DB
passwords, or Garage credentials whenever a holder of the decrypted value leaves or is suspected
compromised.

### Where private keys live

| Holder | Location |
|---|---|
| Developer | `~/.config/sops/age/keys.txt` |
| CI (GitHub Actions) | secret `SOPS_AGE_KEY` |
| Production host | `/etc/sops/age/keys.txt` (root, `0600`) |

Back these up somewhere durable (password manager) — losing a private key without revoking it
first just means re-generating and re-running the "adding a team member" steps for yourself; losing
**every** developer/CI/host key at once makes the ciphertext unrecoverable.

On Windows, `chmod 600` does not actually restrict NTFS permissions (`ls -la` still shows
group/other read afterwards) — use `icacls` if that matters on a shared machine.
