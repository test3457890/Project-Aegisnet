# Screenshot & Screen-Recording Protection — Planning Notes

This is a **planning document**. AegisNet does **not** currently block screenshots or screen recording,
and the web prototype fundamentally cannot. These notes exist so we plan honestly and never imply a
protection that is not real.

## The honest reality

- **Web browsers provide no reliable way to block screenshots or OS-level screen recording.** A web page
  cannot detect or prevent the operating system's screenshot tools, an external camera, or a phone
  pointed at the screen. Any claim otherwise would be false.
- Therefore, in the current React/web prototype, "screenshot protection" can only ever be **deterrence
  and signaling**, not prevention.

## What is realistic per platform

| Platform | What is actually possible | Notes |
|----------|---------------------------|-------|
| **Web (today)** | Nothing enforceable. Optional deterrents only (watermark overlays, blur-on-blur, hidden previews). | Already partially delivered via Shield/Lockdown blur + preview hiding. |
| **Windows native shell (future Tauri/PWA)** | `SetWindowDisplayAffinity(WDA_MONITOR)` can exclude a window from capture in some configurations. Not universal; bypassable. | Requires a signed native shell (see AMI lessons #8–10). |
| **Android (future native)** | `FLAG_SECURE` blocks screenshots and screen recording for the app window. Reasonably effective. | Native app only. |
| **iOS (future native)** | Cannot block screenshots; can detect them (`userDidTakeScreenshot`) and detect screen recording (`isCaptured`). Can blur on app switcher. | Detection + reaction, not prevention. |
| **macOS native** | Limited; can blur on resign-active. No reliable capture block. | |

## Deterrents we can honestly offer now (web)

These reduce casual leakage and signal intent, without claiming prevention:

1. **Preview hiding** (done — Shield/Lockdown): list/dashboard previews are masked.
2. **Blur on switch-away** (done — Shield/Lockdown): screen obscures when the window loses focus.
3. **Tap-to-reveal media** (done — Shield/Lockdown): media stays covered until tapped.
4. **Visible watermark overlay** (future): overlay the viewer's name/time on sensitive content so a leaked
   screenshot is attributable. Honest framing: "watermark, not prevention."
5. **Screenshot-intent hints** (future, web): there is no reliable web event; do not promise detection.

## Recommended planning stance

- Keep all UI wording as "hide / blur / deter," never "prevent" or "block," until a native shell ships a
  real capability (Android `FLAG_SECURE` is the strongest near-term option).
- Treat watermarking as the first genuinely useful addition, because it is honest and attributable.
- Revisit real capture-blocking only inside a signed native shell, and document its exact limits per OS.
