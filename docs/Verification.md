# Verification and limits

## Reproduce the checks

Run these commands from the repository root after installing the dependencies as described in [Getting started](Getting-Started.md).

```bash
npm test
npm run build
npx playwright install chrome
npm run test:browser
npm run typecheck --prefix services/api
npm test --prefix services/api
for suite in components/cap/tests/*.js; do node "$suite" || exit 1; done
```

The browser suite exercises desktop and mobile browser layouts, right through the app UI. The API suite uses disposable databases and includes a smoke test covering startup, seeded data, messaging, WebSocket delivery, uploads, and simulated call state. The [GitHub Actions workflow](../.github/workflows/checks.yml) repeats the core checks.

## Import checks

- The web production build completed and all 122 web unit and component tests passed.
- The API type check, 15 API tests, and the API smoke test passed.
- All eight CAP component suites passed, with 207 assertions. The training board rendered in Chromium.
- All 13 SkyMesh navigation tabs switched to the expected view in Chromium without browser exceptions. The local health, icon, and setup routes responded.
- The web and API dependency audit commands reported zero vulnerabilities at verification time.
- The native mobile scaffold passed TypeScript checking. Its separate Expo dependencies still have advisories.

## Prototype limits

- AegisNet uses demo identity tokens. Browser-local Vault encryption protects local file bytes. It does not provide end-to-end messaging encryption.
- The offline queue and browser storage support prototype workflows. Conflicting edits and full offline synchronization still need validation.
- The responsive web app and native Expo scaffold are different entry points. Native device builds, real voice and video calls, and a live multi-user deployment are outside this verification.
- SkyMesh hardware, receiver feeds, radio transmission, cross-node links, and third-party transport integrations require separate tests. Some routes are placeholders.
- The CAP-inspired board demonstrates training workflows with simulated inputs. Use approved systems for real missions.
