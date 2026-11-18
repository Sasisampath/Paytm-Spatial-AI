# Privacy and data flow

Camera: explicit AR entry only. XR8 owns the rear-camera session. Application code does not capture, save or upload camera frames. AR pauses on backgrounding and stops on session exit, pagehide or errors. Known SDK tracks, listeners and renderer resources are released. Native phone indicator behaviour and SDK-internal network behaviour require device testing; no blanket zero-telemetry claim is made.

Microphone: separate opt-in in voice controls, available only when the backend is configured. ElevenLabs processes live microphone audio, transcript and structured product/demo context. No continuous camera frames are sent to that provider. The app keeps at most 20 transcript messages in component memory, cleared when the panel/session closes. No backend transcript storage, analytics or recordings are implemented by this application.

Provider recording, analytics, retention, model training and account region settings: **NOT CONFIGURED / NOT VERIFIED**. The operator must review and record actual choices before using paid live voice: https://elevenlabs.io/privacy-policy. Do not describe unknown provider retention as zero. Browser speech synthesis may use the OS/browser speech service for the synthetic amount wording; it does not read payment/account data because none is collected.

No account numbers, UPI PINs, OTPs, bank credentials, real transaction IDs, customer information or merchant records are needed. The pattern on the device is illustrative, not a payment QR. Every demo ID is DEMO-prefixed and all amounts are synthetic.

The private demo access code is sent only over same-origin requests to the app server and checked against server configuration; it is not persisted by the app UI. An HttpOnly, SameSite session cookie expires in ten minutes. Provider API keys never enter the frontend. Use HTTPS off localhost. Voice sessions may incur ElevenLabs charges; the UI asks for consent and stops after five minutes. Provider-side limits and a distributed limiter remain necessary before public paid use.
