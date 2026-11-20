# Windows verification checklist

Prepared November 19, 2026 for owner and Claude testing beginning November 25.
Use fictional identities/files and a separate browser profile. Record exact commit,
Windows build, browser and mode. These checks are pending, not completed evidence.

| Area | Owner and Claude checks | Status |
|---|---|---|
| Startup | Fresh checkout, Node 24, launcher path with spaces, missing Node/npm, API unavailable, occupied ports, normal exit and restart. Never expose the demo API publicly. | Windows not tested |
| Navigation | Open Prototype; every dashboard action, private/group message, Network, room, settings, profile, Vault and optional Mission Mode route. Verify Back/reload/mobile navigation. | Visual not tested |
| Messages | Synthetic one-to-one/group/room messages, Enter/Shift+Enter, typing, unread counts, offline fallback and two local profiles. Do not infer secure multi-user identity from demo IDs. | Windows not tested |
| Attachments/Vault | Allowed/blocked/oversized files, preview/cancel, download, deletion confirmation, browser quota, lost local key and missing binary recovery states. Use disposable files. | Windows not tested |
| Calls/devices | Simulated call states, mute/camera/end, local permission deny/cancel and missing devices. No real remote calling, dispatch or E2EE is implied. | Hardware not tested |
| Privacy/administration | Theme and privacy modes, convenience PIN limits, local-only expiry, safe diagnostics export, roles/invites and optional training controls with synthetic data. | Visual not tested |
| Errors/safety | Invalid JSON returns 400, large JSON 413, malformed Bearer 401; production API startup fails without creating data; imported production HTTP app denies requests. | Automated locally; Windows pending |
| Accessibility | Keyboard focus, dialogs, screen reader names, 200% zoom, light/dark/warm themes and phone width. Inspect exact-commit browser/accessibility CI. | Manual not tested |
| Other components | SkyMesh and training board simulation labels, offline/error states and no operational claims. Expo and Go are starter scaffolds; do not mark native operation complete. | Native not tested |

Central error logging is hardened in this branch; route-specific logging and the
remaining prototype identity/file-access model still require a broader privacy
review before production. A zero-entry dependency snapshot is not a security audit
of the complete product. Existing screenshots show seeded demos, not live users.
