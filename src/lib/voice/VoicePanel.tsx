import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationInput,
  useConversationMode,
  useConversationClientTool,
} from "@elevenlabs/react";
import { SimulationService } from "../simulation/service";
import { announceDemo } from "./announcer";
export default function VoicePanel(props: {
  service: SimulationService;
  close: () => void;
}) {
  const [messages, setMessages] = useState<
    { source: string; message: string }[]
  >([]);
  const [error, setError] = useState("");
  return (
    <ConversationProvider
      onMessage={(m) =>
        setMessages((v) => [
          ...v.slice(-19),
          { source: m.source, message: m.message },
        ])
      }
      onError={() =>
        setError(
          "Voice connection interrupted. Stop, then reconnect when ready.",
        )
      }
    >
      <VoiceControls {...props} error={error} messages={messages} />
    </ConversationProvider>
  );
}
function VoiceControls({
  service,
  close,
  error,
  messages,
}: {
  service: SimulationService;
  close: () => void;
  error: string;
  messages: { source: string; message: string }[];
}) {
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const {
    startSession,
    endSession,
    sendContextualUpdate,
    sendUserActivity,
    setVolume,
    sendUserMessage,
  } = useConversationControls();
  const { status } = useConversationStatus();
  const { isMuted, setMuted } = useConversationInput();
  const { isSpeaking } = useConversationMode();
  const [enabled, setEnabled] = useState(false),
    [code, setCode] = useState(""),
    [consent, setConsent] = useState(false),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false),
    [text, setText] = useState("");
  const alive = useRef(true),
    attempt = useRef(0),
    announced = useRef(""),
    mutedBefore = useRef(false),
    cancelAudio = useRef<(() => void) | null>(null);
  useConversationClientTool("simulate_payment", (p) =>
    JSON.stringify(service.tools.simulate_payment(p)),
  );
  useConversationClientTool("highlight_feature", (p) =>
    JSON.stringify(service.tools.highlight_feature(p)),
  );
  useConversationClientTool("get_demo_state", (p) =>
    JSON.stringify(service.tools.get_demo_state(p)),
  );
  useConversationClientTool("reset_demo", (p) =>
    JSON.stringify(service.tools.reset_demo(p)),
  );
  useEffect(() => {
    alive.current = true;
    fetch("/api/voice/config")
      .then((r) => r.json())
      .then((d) => {
        if (alive.current) setEnabled(d.enabled === true);
      })
      .catch(() => {});
    return () => {
      alive.current = false;
      attempt.current++;
      cancelAudio.current?.();
      endSession();
    };
  }, [endSession]);
  useEffect(() => {
    if (status === "connected")
      sendContextualUpdate(
        JSON.stringify({
          product: "illustrative Soundbox",
          stage: state.placed ? "placed" : "scanning",
          tracking: state.tracking,
          placement: state.placed,
          scenario: "merchant-counter",
          lastDemoAmount: state.payment?.amountPaise ?? null,
          simulationStatus: state.payment?.status ?? "IDLE",
          latestValidAction:
            state.placed && state.tracking ? "simulate_payment" : "scan",
          simulated: true,
          mode: state.mode,
        }),
      );
  }, [state, status, sendContextualUpdate]);
  useEffect(() => {
    const p = state.payment;
    if (p?.status !== "SUCCESS" || announced.current === p.id) return;
    announced.current = p.id;
    if (document.hidden) return;
    mutedBefore.current = isMuted;
    setMuted(true);
    setVolume({ volume: 0 });
    sendUserActivity();
    const timer = setTimeout(() => {
      if (!alive.current) return;
      cancelAudio.current = announceDemo(p.amountPaise, () => {
        if (alive.current) {
          setMuted(mutedBefore.current);
          setVolume({ volume: 1 });
        }
      });
    }, 120);
    return () => {
      clearTimeout(timer);
      cancelAudio.current?.();
    };
  }, [state.payment?.status, state.payment?.id]);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) {
        attempt.current++;
        cancelAudio.current?.();
        endSession();
        setBusy(false);
      }
    };
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("pagehide", stop);
    };
  }, [endSession]);
  const post = async (path: string, body = {}) => {
    const r = await fetch(`/api/voice/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Reality-Client": "1" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.code || "CONNECTION_FAILED");
    return d;
  };
  const connect = async () => {
    if (!enabled || !consent || busy) return;
    setIssue("");
    setBusy(true);
    const current = ++attempt.current;
    try {
      await post("session", { accessCode: code });
      const data = await post("signed-url");
      if (!alive.current || current !== attempt.current) return;
      startSession({ signedUrl: data.signedUrl, connectionType: "websocket" });
      setCode("");
    } catch (e) {
      if (alive.current)
        setIssue(e instanceof Error ? e.message : "Voice unavailable");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const stop = () => {
    attempt.current++;
    cancelAudio.current?.();
    endSession();
    void post("logout").catch(() => {});
    setBusy(false);
  };
  return (
    <section className="voice-panel" aria-label="Voice guide">
      <div className="section-title">
        <span>YOUR PRODUCT GUIDE</span>
        <button
          className="icon-button"
          onClick={() => {
            stop();
            close();
          }}
          aria-label="Close voice guide"
        >
          ×
        </button>
      </div>
      <div
        className={`voice-orb ${status === "connected" ? "active" : ""}`}
        aria-hidden="true"
      >
        ∿
      </div>
      <h3>
        {status === "connected"
          ? isSpeaking
            ? "Your guide is speaking"
            : "Go ahead, I’m listening"
          : enabled
            ? "Let’s talk Soundbox."
            : "Explore at your own pace."}
      </h3>
      <p>
        {enabled
          ? "Microphone audio and transcript go to ElevenLabs when you connect. Camera frames stay on your device."
          : "Demo mode (voice AI unavailable). Try the feature buttons and source-backed answers below."}
      </p>
      {enabled && status === "disconnected" && (
        <>
          <label>
            Private demo access code
            <input
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree to start a paid ElevenLabs session, limited to 5 minutes.
          </label>
          <button
            className="primary"
            onClick={connect}
            disabled={!consent || !code || busy}
          >
            {busy ? "Connecting…" : "Connect microphone"}
          </button>
        </>
      )}
      {status !== "disconnected" && (
        <div className="button-row">
          <button onClick={() => setMuted(!isMuted)}>
            {isMuted ? "Unmute microphone" : "Mute microphone"}
          </button>
          <button onClick={stop}>Stop voice</button>
        </div>
      )}
      <SessionLimit active={status === "connected"} stop={stop} />
      {status === "connected" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) sendUserMessage(text.slice(0, 500));
            setText("");
          }}
        >
          <label>
            Or type to your guide
            <input
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Show me a ₹250 demo payment"
            />
          </label>
          <button type="submit">Send message</button>
        </form>
      )}
      {(error || issue) && <p role="alert">{issue || error}</p>}
      <div
        className="transcript"
        role="log"
        aria-label="Conversation transcript"
      >
        {messages.map((m, i) => (
          <p key={i}>
            <strong>{m.source === "user" ? "You" : "AI guide"}</strong>{" "}
            {m.message}
          </p>
        ))}
      </div>
      <a
        href="https://elevenlabs.io/privacy-policy"
        target="_blank"
        rel="noreferrer"
      >
        ElevenLabs privacy policy ↗
      </a>
    </section>
  );
}
function SessionLimit({ active, stop }: { active: boolean; stop: () => void }) {
  const fn = useRef(stop);
  fn.current = stop;
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => fn.current(), 300000);
    return () => clearTimeout(t);
  }, [active]);
  return null;
}
