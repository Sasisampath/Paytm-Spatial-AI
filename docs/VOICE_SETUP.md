# ElevenLabs setup and remaining validation

Status: integration implemented against @elevenlabs/react 1.23.0 and its installed declarations. No ElevenLabs credentials supplied; no real agent, microphone session, knowledge attachment, provider retention configuration or barge-in test performed.

Official references checked 18 November 2026:
- https://elevenlabs.io/docs/eleven-agents/libraries/react
- https://elevenlabs.io/docs/eleven-agents/customization/authentication
- https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base

1. Create a **private** agent with authentication required. Select and test an Indian English voice; enable conversational interruption. Paste AGENT_PROMPT.md as the system prompt.
2. Run `npm run knowledge:export`. In the ElevenLabs agent dashboard knowledge base, upload `docs/KNOWLEDGE_BASE.md` as a text document and explicitly attach it to THIS agent. Enable retrieval for it as appropriate in the dashboard. A local FAQ module alone does not ground the provider. Re-export and reattach when sources change.
3. Add the four tools below as **client tools**, requiring a response / blocking conversation until the result arrives. Match names and types exactly. Do not configure payment webhooks or arbitrary code tools.
4. Copy `.env.example` to `.env`. Set VOICE_ENABLED=true, private ELEVENLABS_AGENT_ID, server-only ELEVENLABS_API_KEY, a random SESSION_SECRET (at least 32 random bytes), and a separate strong DEMO_ACCESS_CODE (at least 12 characters). Set APP_ORIGIN to the exact browser origin (scheme, hostname and port). Restart the backend after edits. Never put secrets in VITE_ variables or commit .env.
5. In the app, choose Ask your AI guide. Enter the private access code and opt in to provider audio processing and possible charges. Connect microphone; the SDK owns its audio stream and socket. No separate app getUserMedia preflight runs. A 5 minute client timer stops the session. Set an equivalent **provider-side max conversation duration**, provider concurrency/usage budget and spend alerts; a browser timer is not an enforceable cost limit against a malicious client.
6. The UI supports mute, stop/reconnect, captions and typed messages while connected. Demo announcement temporarily mutes microphone and ducks agent output, then restores it. Test actual speaker echo, barge-in, TTS availability and disconnect cleanup on phones. Browser TTS is original demo wording, not a Paytm recording. Headphones are advisable during initial echo tests.
7. Verify grounded answers for all FAQs and unknown pricing/settlement questions, out-of-range amounts, simulated wording and tracking loss. Ask 'Show me a ₹250 simulated payment'; inspect the card, tool response and structured contextual updates. Reset before another payment. Mark actual provider/device results in DEVICE_TEST_CHECKLIST.md. Do not mark them from unit tests.
8. Configure provider recording, analytics and transcript retention in its dashboard, then document actual settings in PRIVACY.md. They are currently unknown. See https://elevenlabs.io/privacy-policy.

## Tool contract

All outputs are JSON strings with `simulated: true`. Unknown properties are rejected. The server never executes these actions.

| Tool | Input JSON schema | Output |
| --- | --- | --- |
| simulate_payment | object, required amount_inr:number; min 1, max 10000; at most 2 decimals; additionalProperties:false | `{ok:true, simulated:true, payment:{id,amountPaise,status,createdAtISO,simulated:true}}` or `{ok:false,code,message,simulated:true}` |
| highlight_feature | object, required feature:string enum speaker, qr, power, connectivity; additionalProperties:false | `{ok:true,simulated:true,feature}` or structured error |
| get_demo_state | empty object; additionalProperties:false | `{ok:true,simulated:true,state:{payment,placed,tracking,mode,feature,revision,soundbox}}` |
| reset_demo | empty object; additionalProperties:false | `{ok:true,simulated:true}` or structured error |

The current demo cycle supplies an internal voice operation ID because SDK hook callbacks expose arguments, not an authoritative invocation ID. Repeated calls within the cycle return the same payment. UI/tool overlaps return the same amount’s active/terminal payment; a different amount requires explicit reset. Accepted UI operation IDs remain cached until session end, with a bounded 256-operation session limit. Reset is blocked while PROCESSING. A lost track blocks new actions but does not replay or cancel an accepted synthetic payment.

## Deployment limits

The signed URL is a short-lived provider bearer credential, **not end-user authentication**. The app first validates a private shared code, issues a 10-minute HMAC-signed HttpOnly/SameSite cookie, enforces an exact Origin and client header, and rate-limits requests. Signing, provider secrets and calls live in server/app.mjs. Cookie is Secure in production. No server transcript persistence or provider body/error logging.

This is a private MVP gate, not a multi-user identity system. Do not expose paid voice publicly without proper user authentication, a distributed rate-limit store/upstream gateway and provider-enforced budgets. Vercel function instances do not share the in-memory limiter; add a shared store before enabling VOICE_ENABLED there. Leave VOICE_ENABLED=false for public source/demo hosting until that work is done. Set false to disable future signed-URL issuance; terminating an existing provider session additionally requires provider-side controls.
