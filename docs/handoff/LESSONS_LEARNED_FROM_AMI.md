# Lessons Learned from AMI

Document lessons learned from AMI OS that should guide AegisNet before serious development begins.

## AMI OS lessons that should carry into AegisNet

1. Keep the foundation simple and reliable first
   AMI OS became more stable when the working core was preserved instead of constantly rebuilding everything. For AegisNet, do not rewrite the foundation unless there is a clear reason. Build the simplest working version first, then layer features carefully.

2. Separate the project clearly
   AMI benefited from separating app areas into clear folders such as frontend apps, backend services, shared packages, and release bundles. AegisNet should keep a clean structure from the beginning:

* apps/
* services/
* packages/
* docs/
* release/
* scripts/

3. Keep reusable shared code in packages
   AMI kept shared API, auth, config, and type clients in shared packages. AegisNet should use shared packages later for:

* UI components
* theme tokens
* types
* mock data
* API clients
* auth clients
* encryption helpers when real security work begins

4. Do not hardcode personal computer paths
   AMI had broken shortcuts because old launch files hardcoded personal paths. AegisNet must avoid hardcoded local paths in scripts, launchers, installers, configs, and shortcuts.

5. Build diagnostics early
   AMI improved when installer diagnostics and logs were added. AegisNet should eventually include clear logs for:

* app startup
* install setup
* launcher behavior
* API health
* frontend build errors
* backend startup
* failed dependency checks

6. Add update logs after every build
   AMI needed better continuity between coding assistants. AegisNet must require every coding assistant, developer, or contributor to update the handoff logs after each task.

7. Avoid scary terminal windows for normal users
   AMI worked better when the Windows app launched cleanly without black terminal windows. AegisNet should eventually aim for a consumer-friendly launcher and setup process, especially because the product must feel civilian-first.

8. Respect Windows Smart App Control and signing realities
   AMI learned that unsigned native executables can be blocked on Windows machines with Smart App Control enforced. If AegisNet later builds a Windows desktop app, do not assume unsigned Tauri, Rust, or installer binaries will work everywhere. Plan code signing, trusted runtime options, or a PWA-style launcher strategy before committing to desktop packaging.

9. Do not retry a blocked native desktop approach without a signing plan
   AMI archived the old Tauri shell because unsigned builds were blocked. For AegisNet, Tauri may still be useful later, but only if code signing, installer trust, and Windows security controls are planned first.

10. A PWA can be a strong desktop bridge
    AMI’s rebuilt Windows app used an installable PWA in a standalone Microsoft Edge app window launched by a Python orchestrator. AegisNet should remember this as a possible future desktop approach if native desktop signing becomes a blocker.

11. Make one-click setup a priority later
    AMI improved when setup became simpler. AegisNet should eventually have a setup flow that checks required dependencies and explains problems clearly instead of forcing users to debug terminal errors.

12. Add repair tools later
    AMI added a repair tool to clean corrupted temporary folders without destroying user data. AegisNet should eventually include a safe repair flow for broken local installs, caches, dependencies, or corrupted temporary files.

13. Add release packaging discipline
    AMI added a release packager that excluded large folders like node_modules and virtual environments. AegisNet should eventually include release scripts that exclude:

* node_modules
* venv
* dist if not needed
* build caches
* logs
* secrets
* local databases
* personal files

14. Keep logs visible to admins or developers
    AMI added setup logs and diagnostics. AegisNet should eventually expose appropriate diagnostics for developers or admins without exposing private user data.

15. Least privilege matters
    AMI improved RBAC by separating Owner, Super Admin, Security Admin, Billing, Support, Developer, Content Admin, Read-Only, Audit-Only, and Temporary Admin roles. AegisNet should later use least privilege for all admin and team permissions.

16. MFA setup must not trap users
    AMI had an MFA loop where admins were asked for a code before setup. AegisNet must avoid auth loops. If MFA or device approval is added later, the flow must clearly handle:

* first-time setup
* lost device
* backup codes
* recovery
* admin reset
* unverified device state

17. Do not build security features as UI-only forever
    AegisNet may use mock security labels in the MVP, but future builds must clearly separate UI placeholders from real security. Do not claim real encryption, device trust, or zero-knowledge behavior until it is actually implemented and reviewed.

18. Keep AI integration delayed until AMI is reviewed
    AegisNet should not build a new AI system from scratch. The AI features will later be copied or adapted from AMI after inspection. Future contributors must review AMI’s AI routing, provider logic, local model support, admin controls, prompt tools, memory behavior, and assistant UI before adding AI to AegisNet.

19. Protect secrets and environment files
    AMI had backend environment requirements. AegisNet must never commit:

* .env files
* API keys
* provider keys
* database secrets
* tokens
* private logs
* user data

20. Consumer trust comes before advanced tools
    AMI became powerful, but AegisNet must be civilian-first. AegisNet should feel like a private family, group, and safety app first. Advanced Mission Mode tools should exist only as optional power tools.

21. Do not let feature creep break the MVP
    AMI gained many features quickly. AegisNet must avoid jumping too fast into backend, AI, mesh, encryption, billing, and desktop packaging. The first goal is a clean, understandable, working frontend prototype.

22. Always document what is mock-only
    AegisNet currently has mock encryption, mock calls, mock file vaults, mock trust states, and mock reconnect states. These must stay clearly documented so no one mistakes UI placeholders for production security.

23. Keep installers and app startup observable
    When AegisNet eventually gets desktop apps, the launcher should log startup steps, dependency checks, ports, backend readiness, frontend readiness, shutdown behavior, and errors.

24. Avoid duplicate maintained files
    AMI tracked duplicated files. AegisNet should eventually create a DUPLICATED_FILES.md if duplicate files appear, so future coding assistants know what is source-of-truth.

25. Keep a master handoff index
    AMI had a master handoff index. AegisNet should use docs/handoff/README.md as the master index for all handoff documents.

## AMI OS features that may be useful later but should not be built now

* RBAC and least-privilege admin roles
* MFA setup flow
* installer diagnostics
* repair tool
* release packager
* admin health dashboard
* local AI
* provider routing
* API key vault
* backend health checks
* startup launcher logs
* desktop app PWA launcher pattern

## AMI OS mistakes or risks to avoid

* hardcoded personal paths
* unsigned desktop builds without a signing plan
* hidden startup failures with no logs
* auth loops
* unclear handoff between coding assistants
* mixing mock security with real security claims
* copying old code without review
* building too many features before the core app works
* committing secrets or local databases
* shipping release bundles with node_modules, venv, logs, or private files

## Applied in AegisNet (June 8, 2026 — Admin Center)
The Admin Center prototype applied several AMI lessons:
* **Least privilege (lesson #15):** a 13-role RBAC catalog with narrow defaults (Owner = all, Read Only =
  view-only, Member = send/upload). Enforcement is being introduced gradually to avoid self-lockout.
* **Diagnostics/logs without exposing private data (lesson #14):** audit logs and the diagnostics/support
  bundle are metadata-only by construction; unit tests assert no message bodies, tokens, keys, or
  passwords are present.
* **Avoid auth loops (lesson #16):** the Admin Center is intentionally NOT gated by a half-built auth flow;
  production auth gating is documented as future work so we do not trap admins.
* **Don't mix mock security with real claims (#17, #22):** every admin/audit/support surface is clearly
  labelled local prototype, and tickets state plainly they are "saved locally, not submitted externally."
RBAC enforcement, MFA, and the real Stuff Studios LLC support endpoint remain future work — see NEXT_STEPS.
# November 19 engineering lesson

A prototype warning alone does not prevent deployment. Reject production mode
before importing modules that create databases or upload folders, and test both
the actual entry point and a directly imported HTTP app. Parser errors can contain
private request bodies; log only bounded operational metadata, not whole errors.
