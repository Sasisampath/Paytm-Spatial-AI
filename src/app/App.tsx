import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { SimulationService, type Feature } from "../lib/simulation/service";
import type { ARSnapshot } from "../lib/ar/types";
import type { ARSession } from "../lib/ar/engine";
import { LoadBoundary } from "../components/LoadBoundary";
import {
  featureInfo,
  knowledge,
  sources,
} from "../data/paytm-soundbox-knowledge";
import { announceDemo } from "../lib/voice/announcer";
const Stage = lazy(() => import("../components/ar/Stage"));
const Voice = lazy(() => import("../lib/voice/VoicePanel"));
function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    cube: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="13" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6" />
      </>
    ),
    speaker: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
      </>
    ),
    qr: (
      <>
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h4v4h-7z" />
      </>
    ),
    power: (
      <>
        <path d="M12 2v10M6 5a9 9 0 1 0 12 0" />
      </>
    ),
    connectivity: (
      <>
        <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0" />
        <circle cx="12" cy="20" r="1" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 8V3l-3 3a9 9 0 1 0 3 9M20 3h-5" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.cube}
    </svg>
  );
}
function Brand() {
  return (
    <a href="/" className="brand" aria-label="Paytm Reality Lab home">
      <span className="brand-mark">
        <Icon name="cube" />
      </span>
      <span>
        paytm<span className="brand-light"> reality lab</span>
        <small>INDEPENDENT SPATIAL EXPERIENCE</small>
      </span>
    </a>
  );
}
function Legal() {
  return (
    <div className="legal">
      <span>Unofficial concept. Not affiliated with Paytm.</span>
      <a
        href="/licenses/8thwall-engine-LICENSE.txt"
        target="_blank"
        rel="noreferrer"
      >
        8th Wall engine & license ↗
      </a>
    </div>
  );
}
const initial: ARSnapshot = {
  state: "INITIALIZING",
  placed: false,
  tracking: false,
  canPlace: false,
  error: null,
  source: "none",
};
export default function App() {
  const [mode, setMode] = useState<"intro" | "ar" | "practice">("intro"),
    [service, setService] = useState(() => new SimulationService()),
    [voice, setVoice] = useState(false),
    [amount, setAmount] = useState("250"),
    [issue, setIssue] = useState(""),
    [status, setStatus] = useState(initial),
    [scale, setScale] = useState(1),
    [rotation, setRotation] = useState(0),
    [outcome, setOutcome] = useState<"SUCCESS" | "FAILED">("SUCCESS"),
    [retry, setRetry] = useState(0);
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const sessionRef = useRef<ARSession | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    spoken = useRef(""),
    viewportRef = useRef<HTMLElement>(null);
  const receive = useCallback(
    (s: ARSnapshot) => {
      setStatus(s);
      service.setEnvironment(s.placed, s.tracking, "ar");
    },
    [service],
  );
  useEffect(() => {
    heading.current?.focus();
  }, [mode]);
  useEffect(() => {
    if (
      state.payment?.status === "PROCESSING" &&
      matchMedia("(max-width:760px)").matches
    )
      viewportRef.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [state.payment?.id]);
  useEffect(() => () => service.dispose(), [service]);
  useEffect(() => {
    const p = state.payment;
    if (voice || p?.status !== "SUCCESS" || spoken.current === p.id) return;
    spoken.current = p.id;
    if (document.hidden) return;
    return announceDemo(p.amountPaise, () => {});
  }, [state.payment, voice]);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) {
        window.speechSynthesis?.cancel();
        if (mode === "practice")
          service.setEnvironment(state.placed, false, "practice");
      } else if (mode === "practice")
        service.setEnvironment(state.placed, true, "practice");
    };
    document.addEventListener("visibilitychange", stop);
    return () => document.removeEventListener("visibilitychange", stop);
  }, [mode, state.placed, service]);
  const start = (next: "ar" | "practice") => {
    setStatus(initial);
    setMode(next);
    setIssue("");
    if (next === "practice") service.setEnvironment(false, true, "practice");
  };
  const end = () => {
    sessionRef.current?.dispose();
    window.speechSynthesis?.cancel();
    service.dispose();
    setVoice(false);
    setService(new SimulationService());
    setMode("intro");
    setScale(1);
    setRotation(0);
    setOutcome("SUCCESS");
  };
  const place = () => {
    if (mode === "practice") service.setEnvironment(true, true, "practice");
    else sessionRef.current?.confirm();
  };
  const simulate = () => {
    setIssue("");
    const result = service.simulate(
      { amount_inr: amount.trim() ? Number(amount) : NaN },
      `button-${crypto.randomUUID()}`,
      outcome,
    );
    if (!result.ok) setIssue(result.message);
  };
  const reset = () => {
    const r = service.reset();
    if (!r.ok) setIssue(r.message);
    else setIssue("");
  };
  if (mode === "intro")
    return (
      <div className="landing">
        <header className="nav">
          <Brand />
          <a href="#how-it-works" className="nav-link">
            The experience <span>↗</span>
          </a>
          <span className="pill">
            <i />
            UNOFFICIAL CONCEPT
          </span>
        </header>
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="line" /> A NEW DIMENSION OF UNDERSTANDING
              </div>
              <h1 ref={heading} tabIndex={-1}>
                Hear it.
                <br />
                See it.
                <br />
                <span>Try it.</span>
              </h1>
              <p className="hero-sub">
                Meet the Soundbox.
                <br />
                On your counter. In your world.
              </p>
              <p className="hero-description">
                Place an illustrative device in your space, discover how it
                works, and hear a payment demo come to life.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => start("ar")}>
                  <Icon name="cube" />
                  Experience in AR
                  <Icon name="arrow" />
                </button>
                <button
                  className="text-button"
                  onClick={() => start("practice")}
                >
                  Explore without camera <span>↗</span>
                </button>
              </div>
              <p className="camera-note">
                <Icon name="shield" />
                Camera only for AR. Microphone only when you choose voice.
              </p>
            </div>
            <div
              className="hero-visual"
              aria-label="Original illustrative Soundbox model"
            >
              <div className="visual-grid" />
              <div className="visual-heading">
                <span>01 / SOUNDBOX</span>
                <span>SPATIAL PRODUCT DEMO</span>
              </div>
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="floating-label">
                <span className="sound-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                Small device.
                <br />
                <strong>Sound confidence.</strong>
              </div>
              <div className="device-shadow" />
              <div className="css-device">
                <div className="device-side" />
                <div className="device-top" />
                <div className="device-front">
                  <span className="device-name">
                    soundbox<span>●</span>
                  </span>
                  <div className="demo-pattern">
                    <div className="finder f1" />
                    <div className="finder f2" />
                    <div className="finder f3" />
                    <b>DEMO</b>
                  </div>
                  <span className="device-caption">
                    ILLUSTRATIVE · NO PAYMENT QR
                  </span>
                  <div className="speaker-grille" />
                  <span className="device-foot">reality lab</span>
                </div>
              </div>
              <div className="placement-mark">
                <span>+</span>
                <i />
                <span>+</span>
              </div>
              <div className="visual-footer">
                <span>
                  <i />
                  ORIGINAL ILLUSTRATIVE MODEL
                </span>
                <span>NO REAL MONEY MOVES</span>
              </div>
            </div>
          </section>
          <section
            className="steps"
            id="how-it-works"
            aria-label="How it works"
          >
            <div className="step-intro">
              <span className="eyebrow">FROM CURIOUS TO CONFIDENT</span>
              <h2>
                A closer look.
                <br />A clearer picture.
              </h2>
            </div>
            {[
              [
                "01",
                "Place in your space",
                "Scan a textured counter and place the device at an illustrative real-world scale.",
                "cube",
              ],
              [
                "02",
                "Ask. Explore. Understand.",
                "Discover the speaker, QR area and connectivity with a contextual product guide.",
                "mic",
              ],
              [
                "03",
                "Hear the moment",
                "Try a ₹250 simulated payment. A little sound brings the idea to life.",
                "speaker",
              ],
            ].map(([n, title, copy, icon]) => (
              <article key={n}>
                <div className="step-top">
                  <span>{n}</span>
                  <Icon name={icon} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </section>
          <div className="trust-line">
            <Icon name="shield" />
            <p>
              Built for learning. Every transaction is simulated. No payment
              details, no account connection, no money moved.
            </p>
            <span>EXPLORE WITH CONFIDENCE</span>
          </div>
        </main>
        <footer>
          <Brand />
          <Legal />
          <span className="edition">EXPERIMENT 001 · 2026</span>
        </footer>
      </div>
    );
  const canPlace = mode === "practice" ? !state.placed : status.canPlace;
  const feature = state.feature ? featureInfo[state.feature] : null;
  return (
    <div className={`experience ${mode}`}>
      <header className="session-nav">
        <Brand />
        <span className="pill">
          <i />
          {mode === "practice" ? "PRACTICE · NO CAMERA" : "WORLD-TRACKED AR"}
        </span>
        <button onClick={end} className="end-button">
          End session <span>×</span>
        </button>
      </header>
      <main className="workspace">
        <section
          ref={viewportRef}
          className="viewport"
          aria-label="Product experience"
        >
          <div className="viewport-top">
            <div>
              <span className="eyebrow">01 / SOUNDBOX</span>
              <h1 ref={heading} tabIndex={-1}>
                {mode === "practice"
                  ? "A closer look."
                  : "Your counter. Reimagined."}
              </h1>
            </div>
            <span className={`tracking ${state.tracking ? "good" : ""}`}>
              <i />
              {mode === "practice"
                ? "3D practice"
                : status.state.replaceAll("_", " ").toLowerCase()}
            </span>
          </div>
          <LoadBoundary key={`${mode}-${retry}`} label="3D view">
            <Suspense
              fallback={
                <div className="stage-loading" role="status">
                  Preparing your experience…
                </div>
              }
            >
              <Stage
                key={`${mode}-${retry}`}
                mode={mode}
                onStatus={receive}
                sessionRef={sessionRef}
                feature={state.feature}
                scale={scale}
                rotation={rotation}
              />
            </Suspense>
          </LoadBoundary>
          {mode === "practice" && <div className="practice-grid" />}
          <div className="model-note">
            ILLUSTRATIVE MODEL · NOT A PAYMENT QR
          </div>
          {!state.placed && !status.error && (
            <div className="placement-guide">
              <span className="scan-symbol">
                <Icon name="cube" />
              </span>
              <h2>
                {mode === "practice"
                  ? "Make yourself at home."
                  : canPlace
                    ? "A good spot. Make it yours."
                    : "Find a steady surface."}
              </h2>
              <p>
                {mode === "practice"
                  ? "Drag to look around, then place the virtual device. Practice mode uses a virtual tabletop."
                  : "Aim at a well-lit, textured counter and move slowly. Placement unlocks only with measured support."}
              </p>
              <button className="primary" onClick={place} disabled={!canPlace}>
                <Icon name="cube" />
                {mode === "practice"
                  ? "Place practice device"
                  : "Place on this surface"}
              </button>
            </div>
          )}
          {status.error && (
            <div className="error-card" role="alert">
              <h2>Let’s try another way.</h2>
              <p>{status.error}</p>
              <button
                onClick={() => {
                  setStatus(initial);
                  setRetry((n) => n + 1);
                }}
              >
                Retry AR
              </button>
              <button
                className="primary"
                onClick={() => {
                  sessionRef.current?.dispose();
                  start("practice");
                }}
              >
                Explore without camera
              </button>
            </div>
          )}
          {mode === "ar" &&
            state.placed &&
            !state.tracking &&
            !status.error && (
              <div className="tracking-help" role="status">
                Tracking interrupted. Move slowly back to the counter. Actions
                resume with live tracking.
              </div>
            )}
          {state.payment && (
            <div
              className={`payment-card ${state.payment.status.toLowerCase()}`}
              role="status"
            >
              <div className="payment-top">
                <span className="payment-check">
                  <Icon
                    name={
                      state.payment.status === "SUCCESS" ? "check" : "refresh"
                    }
                  />
                </span>
                <span>
                  SIMULATED PAYMENT<small>NO MONEY MOVED</small>
                </span>
              </div>
              <strong>
                ₹
                {(state.payment.amountPaise / 100).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </strong>
              <p>
                {state.payment.status === "SUCCESS"
                  ? "Demo confirmation received"
                  : state.payment.status === "FAILED"
                    ? "Demo failed — selected test outcome"
                    : "Simulating confirmation…"}
              </p>
              <div className="receipt-meta">
                <span>
                  {new Date(state.payment.createdAtISO).toLocaleTimeString(
                    "en-IN",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </span>
                <span>{state.payment.id.slice(0, 18)}</span>
              </div>
              <button
                className="text-button"
                disabled={state.payment.status === "PROCESSING"}
                onClick={reset}
              >
                Try another demo ↗
              </button>
            </div>
          )}
          <div className="viewport-bottom">
            <span>
              {mode === "practice"
                ? "Drag to rotate · Scroll to zoom"
                : "8th Wall world tracking · Device testing unverified"}
            </span>
            {state.placed && (
              <button
                disabled={state.payment?.status === "PROCESSING"}
                onClick={() => {
                  if (mode === "ar") sessionRef.current?.reposition();
                  else service.setEnvironment(false, true, "practice");
                }}
              >
                <Icon name="refresh" />
                Reposition
              </button>
            )}
          </div>
        </section>
        <aside className="inspector">
          <div className="inspector-heading">
            <span className="eyebrow">MEET YOUR COUNTER COMPANION</span>
            <h2>
              More than
              <br />a little speaker.
            </h2>
            <p>A simple idea, brought into your space.</p>
          </div>
          <div className="feature-buttons" aria-label="Explore features">
            {(["speaker", "qr", "power", "connectivity"] as Feature[]).map(
              (f) => (
                <button
                  key={f}
                  className={state.feature === f ? "selected" : ""}
                  disabled={!state.placed || !state.tracking}
                  onClick={() => {
                    const r = service.highlight({ feature: f });
                    if (!r.ok) setIssue(r.message);
                  }}
                >
                  <Icon name={f} />
                  <span>
                    {f === "qr" ? "QR area" : f[0].toUpperCase() + f.slice(1)}
                  </span>
                  <span>↗</span>
                </button>
              ),
            )}
          </div>
          {feature && (
            <div className="feature-detail">
              <h3>{feature.label}</h3>
              <p>{feature.text}</p>
              <a
                target="_blank"
                rel="noreferrer"
                href={sources[feature.source].url}
              >
                Source: Paytm for Business ↗
              </a>
            </div>
          )}
          <details className="adjust">
            <summary>Adjust illustrative model</summary>
            <label>
              Scale · {Math.round(scale * 100)}%
              <input
                aria-label="Model scale"
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </label>
            <label>
              Rotation
              <input
                aria-label="Model rotation"
                type="range"
                min="-3.14"
                max="3.14"
                step="0.1"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
            </label>
          </details>
          <section className="demo-controls">
            <div className="section-title">
              <span>TRY THE MOMENT</span>
              <span className="tiny-pill">SIMULATION</span>
            </div>
            <h3>Hear a payment come to life.</h3>
            <label className="amount-label">
              Demo amount in rupees
              <div className="amount-input">
                <span>₹</span>
                <input
                  aria-label="Demo amount in rupees"
                  inputMode="decimal"
                  type="number"
                  min="1"
                  max="10000"
                  step=".01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </label>
            <button
              className="primary wide"
              disabled={!state.placed || !state.tracking || !!state.payment}
              onClick={simulate}
            >
              <Icon name="speaker" />
              Simulate payment
              <Icon name="arrow" />
            </button>
            <p className="fine-print">₹1–₹10,000 · Synthetic demo only</p>
            <details className="test-options">
              <summary>Demo outcome</summary>
              <label>
                <select
                  aria-label="Demo outcome"
                  value={outcome}
                  onChange={(e) =>
                    setOutcome(e.target.value as "SUCCESS" | "FAILED")
                  }
                >
                  <option value="SUCCESS">Successful demo</option>
                  <option value="FAILED">Failed demo (for testing)</option>
                </select>
              </label>
            </details>
            {issue && (
              <p role="alert" className="issue">
                {issue}
              </p>
            )}
          </section>
          <button className="ask-ai" onClick={() => setVoice((v) => !v)}>
            <span className="mini-orb">∿</span>
            <span>
              <strong>Ask your AI guide</strong>
              <small>Explore together with voice</small>
            </span>
            <Icon name="arrow" />
          </button>
          {voice && (
            <LoadBoundary label="Voice guide">
              <Suspense fallback={<p role="status">Loading voice controls…</p>}>
                <Voice service={service} close={() => setVoice(false)} />
              </Suspense>
            </LoadBoundary>
          )}
          <section className="faq">
            <div className="section-title">A LITTLE MORE TO KNOW</div>
            {knowledge.map((k) => (
              <details key={k.id}>
                <summary>{k.question}</summary>
                <p>{k.answer}</p>
                <a
                  href={sources[k.source].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Official source ↗
                </a>
              </details>
            ))}
          </section>
        </aside>
      </main>
      <footer className="session-footer">
        <Legal />
        <span>
          Camera frames stay on this device. Demo speech uses browser TTS.
        </span>
      </footer>
    </div>
  );
}
