# Physical-device acceptance — NOT TESTED

Browser emulation, synthetic signals and WASM initialization cannot prove physical SLAM, audio or camera performance. Both columns below require a person with each phone. Record exact hardware, OS/browser versions, date, scene lighting, observations and evidence before replacing NOT TESTED.

| Check | iPhone Safari | Android Chrome |
| --- | --- | --- |
| Cold launch over HTTPS; no camera/mic before relevant gesture | NOT TESTED | NOT TESTED |
| Camera permission grant, denial, retry, rear camera selection | NOT TESTED | NOT TESTED |
| Measured horizontal support on a textured counter | NOT TESTED | NOT TESTED |
| Wall, reflective/blank surface and unsupported area stay blocked | NOT TESTED | NOT TESTED |
| Placement at approximate scale; orbit and walk-around drift | NOT TESTED | NOT TESTED |
| Dim room, occlusion, abrupt pose jump, tracking loss/recovery | NOT TESTED | NOT TESTED |
| Reposition, scale .75–1.25 and rotation on measured support | NOT TESTED | NOT TESTED |
| Background/foreground, rotation and browser toolbar resize | NOT TESTED | NOT TESTED |
| Private agent answers grounded FAQs; unknown price/settlement | NOT TESTED | NOT TESTED |
| Spoken simulate ₹250 executes once; repeat/retry/button overlap | NOT TESTED | NOT TESTED |
| Interrupted speech / barge-in, microphone mute/unmute | NOT TESTED | NOT TESTED |
| Demo TTS distinct from agent; no speaker-to-mic feedback | NOT TESTED | NOT TESTED |
| Airplane mode, network switch, quota and disconnect/reconnect | NOT TESTED | NOT TESTED |
| Multiple success/failure demos; labels remain visible | NOT TESTED | NOT TESTED |
| Exit stops camera, microphone and sockets; repeat ten sessions | NOT TESTED | NOT TESTED |
| Five-minute voice timeout and configured provider limit | NOT TESTED | NOT TESTED |
| Screen reader, captions, keyboard and safe areas | NOT TESTED | NOT TESTED |
| 10-minute thermal, FPS, battery and memory observations | NOT TESTED | NOT TESTED |

## HTTPS phone testing

Run `npm run dev` (web 5173 + API 3001). Use a trusted HTTPS tunnel to port 5173, e.g. `cloudflared tunnel --url http://localhost:5173` if installed, or an operator-managed HTTPS reverse proxy. Tunnel creation has NOT been performed here. Set APP_ORIGIN to that exact HTTPS URL and restart the API before voice. Keep the access code private. Do not bypass browser certificate warnings. Plain LAN HTTP will not provide phone camera/microphone APIs; localhost privileges on the development computer do not transfer to a phone.
