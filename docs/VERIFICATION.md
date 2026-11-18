# Verification — 18 November 2026

Build performed locally with Node v26.7.0 / npm 11.19.0. Factual evidence only. This is an MVP with remaining provider/device acceptance work, not a production-readiness certification.

| Command / check | Actual result |
| --- | --- |
| `npm ci --cache /private/tmp/reality-npm-cache` | PASS. 172 packages installed from lockfile; postinstall prepared full unmodified engine. Cache override avoids host ~/.npm write restrictions; ordinary npm ci remains the documented command. |
| `npm run typecheck` | PASS, TypeScript strict compilation. |
| `npm run build` | PASS. 208 modules transformed. All 13 runtime files hash-equal to pinned package, notices present. Vite emitted harmless upstream Zod comment-annotation warnings. |
| `npm test` | PASS. 4 files, 30 tests: malformed/bounded amounts, idempotency and UI/tool races, accepted payment during tracking loss, failure/reset/teardown, strict feature tools, measured support/normal/staleness/hull validation, world-parent transform, exact-origin/private-cookie/rate-limit/provider error handling. |
| `npx playwright install chromium webkit` | Installed matching Chromium 159 / WebKit 27.2 binaries. |
| `npm run test:e2e -- --project=chromium` | ENVIRONMENT BLOCKED before test bodies. 9 launches failed in macOS process sandbox: `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`, SIGTRAP. A first system Chrome attempt also aborted. No Chromium test pass claimed. |
| `npm run test:e2e -- --project=webkit tests/browser/app.spec.ts` | ENVIRONMENT BLOCKED before test bodies. 7 browser launches aborted (`Abort trap: 6`). No WebKit test pass claimed. |
| Real SDK WASM/SLAM initialization-only Playwright test | Included, NOT RUN successfully because browser launch is blocked. Build hash checks prove packaging integrity, not runtime SLAM. |
| Codex in-app browser, actual running dev + production app | Observed introduction, lazy 3D practice model, place, source-backed speaker highlight, ₹250 SUCCESS, explicit FAILED outcome, reset, invalid ₹0 error, voice-unavailable fallback, session end and the unsupported-desktop AR fallback. See screenshots. These are interactive checks, not Playwright suite passes. |
| Responsive DOM/layout inspection | PASS for introduction and placed/confirmed practice view at 320×568, 375×812, 390×844, 428×926, plus desktop introduction at 1440×1000. No horizontal overflow. Canvas stays aligned to its frame; simulation labels displayed. `layout-checks.json`, `practice-layout-checks.json`. This is not a full screen-reader or phone safe-area certification. |
| Production Express smoke test | HTTP 200 for introduction, expected CSP/security headers, `/api/voice/config` = disabled/demo. Built practice flow and provider-unavailable panel observed in the browser. |
| `npm audit --omit=dev --json` | PASS: zero production dependency advisories at time checked. `production-audit.json`. |
| `npm audit --json` | Outstanding development-only picomatch advisory propagated through build/test tools. Registry latest affected; mitigation and residual risk in SECURITY.md. `dependency-audit.json`. |
| Client source + built JS pattern scan | No API-key token patterns, xi-api-key header, VITE_ELEVENLABS_API_KEY or real Paytm transaction endpoint patterns in application src/built JS. `client-security-scan.json`. Pattern scanning is not a comprehensive security audit. |
| `git diff --check` | PASS. |
| Private ElevenLabs agent/session/KB attachment | NOT CONFIGURED / NOT TESTED. No provider credentials supplied. Mock HTTP backend tests only; setup/export provided. |
| Physical iPhone Safari / Android Chrome AR, audio echo, thermal performance | NOT TESTED. DEVICE_TEST_CHECKLIST.md remains explicit. |
| Hosted deployment / HTTPS tunnel | NOT PERFORMED. Source delivery was requested; no hosting action taken. |

## Remaining browser work

Run `npm run test:e2e` in an ordinary development shell or the included Ubuntu GitHub Actions workflow with installed browsers. The checked-in synthetic XR fixture tests lifecycle, world anchoring and loss/cleanup; it never ships in production. SDK callback fixtures cannot prove real horizontal tracking or camera permissions. Original demo announcement completion/cancellation/timeout is also covered by unit tests. The agent tools use the same service tested above, but actual live ElevenLabs barge-in, language quality and SDK microphone/socket teardown still require a private agent and physical tests.

A live-edit dependency reinstall invalidated development-module URLs during inspection. The resulting lazy import error was contained by a new error boundary; the final built app's voice-unavailable panel loaded and worked under production CSP. Restart Vite after dependency changes rather than relying on stale optimized-module URLs.

## Measured build payloads

Initial JavaScript approximately 315 KB / 98 KB gzip. Lazy voice approximately 663 KB / 178 KB gzip. Lazy AR/Three approximately 762 KB / 197 KB gzip. Full generated vendor engine about 34 MB on disk, loaded only after AR entry; these file sizes are not measured transfer/FPS/latency results. Original CSS device avoids a WebGL/camera startup on introduction.
