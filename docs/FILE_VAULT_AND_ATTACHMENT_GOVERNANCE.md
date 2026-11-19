# File Vault and Attachment Governance

## File Vault
The File Vault provides an isolated area to manage and distribute files within an AegisNet network or mission room. Currently, the vault relies on prototype local storage with basic access controls. True backend storage, E2EE, and RBAC must be integrated in future phases.

## Attachment Governance
To maintain security within the prototype, strict upload allowlisting is enforced:
- **Allowed:** `PDF`, `DOCX`, `TXT`, `PNG`, `JPG`, `JPEG`, `WEBP`, `GIF`
- **Blocked:** `SVG`, `HTML`, executable files, and untrusted scripts.

## File Permissions
Access logs record metadata-only events (e.g. `file.vault.opened`, `file.downloaded`). Permissions for "view" or "download" can be applied on a file-by-file basis via the `FilePermissionsEditor`.
