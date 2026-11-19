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
import { mobileDevice } from "../lib/ar/mobile";
const PhoneHandoff = lazy(() => import("../components/PhoneHandoff"));
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
  const [mode, setMode] = useState<"intro" | "details" | "ar" | "practice">(
      "intro",
    ),
    [service, setService] = useState(() => new SimulationService()),
    [prompt, setPrompt] = useState(false),
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
      service.setEnvironment(
        s.placed,
        s.tracking,
        s.source === "practice" ? "practice" : "ar",
      );
    },
    [service],
  );
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    document.querySelector(".phone-screen")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [mode]);
  useEffect(() => {
    if (state.payment?.status === "PROCESSING")
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
    setMode("details");
    setPrompt(false);
    setStatus(initial);
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
  const retryModel = () => {
    setStatus(initial);
    setRetry((n) => n + 1);
  };
  if (mode === "intro" || mode === "details") {
    const home = mode === "intro";
    return (
      <div className="catalog">
        <header className="catalog-nav">
          <Brand />
          {!home && (
            <button
              className="back-link"
              onClick={() => {
                setMode("intro");
                setPrompt(false);
              }}
            >
              ← Home
            </button>
          )}
        </header>
        <main>
          <div className="catalog-heading">
            <p className="kicker">
              {home ? "PRODUCT EXPERIENCES" : "PRODUCT DETAILS"}
            </p>
            <h1 ref={heading} tabIndex={-1}>
              {home ? (
                <>
                  Spatial <em>studio.</em>
                </>
              ) : (
                <>
                  Soundbox <em>5.0</em>
                </>
              )}
            </h1>
            <p>
              {home
                ? "Explore the devices behind the counter."
                : "Explore the speaker, controls and demo QR in 3D."}
            </p>
          </div>
          <article className="product-card">
            <div className="product-stage">
              <div className="stage-caption">
                <span className="live-dot" />
                3D preview
              </div>
              <LoadBoundary key={retry} label="Product viewer">
                <Suspense fallback={null}>
                  <Stage
                    mode="practice"
                    onStatus={setStatus}
                    sessionRef={sessionRef}
                    feature={null}
                    scale={1}
                    rotation={0}
                  />
                </Suspense>
              </LoadBoundary>
              {status.error ? (
                <div className="asset-message" role="alert">
                  <p>{status.error}</p>
                  <button onClick={retryModel}>Retry viewer</button>
                </div>
              ) : (
                <span className="orbit-hint" role="status">
                  {status.state === "READY"
                    ? "⟲  Drag to rotate"
                    : "Loading Soundbox…"}
                </span>
              )}
            </div>
            <div className="product-copy">
              {home ? (
                <>
                  <p className="kicker">COUNTERTOP AUDIO</p>
                  <h2>Soundbox 5.0</h2>
                  <p>
                    Discover the device and hear a simulated payment
                    confirmation.
                  </p>
                  <button
                    className="primary wide"
                    onClick={() => setMode("details")}
                  >
                    Explore Soundbox <Icon name="arrow" />
                  </button>
                </>
              ) : (
                <>
                  <h2>Try it on your counter</h2>
                  <p>
                    Place the Soundbox in your space, then try a ₹250 demo
                    payment.
                  </p>
                  {!prompt && (
                    <button
                      className="primary wide"
                      onClick={() => setPrompt(true)}
                    >
                      <Icon name="cube" />
                      Experience in AR <Icon name="arrow" />
                    </button>
                  )}
                  {prompt &&
                    (mobileDevice() ? (
                      <section className="permission-step">
                        <p>
                          AR uses your rear camera to find a surface. Camera
                          frames stay on this device.
                        </p>
                        <button
                          className="primary wide"
                          onClick={() => start("ar")}
                        >
                          Enable camera
                        </button>
                      </section>
                    ) : (
                      <Suspense fallback={<p>Preparing phone link…</p>}>
                        <PhoneHandoff />
                      </Suspense>
                    ))}
                  <button
                    className="alternate"
                    onClick={() => start("practice")}
                  >
                    Explore without camera <span>↗</span>
                  </button>
                </>
              )}
            </div>
          </article>
        </main>
        <footer className="catalog-footer">
          <Legal />
        </footer>
      </div>
    );
  }
  const canPlace =
    mode === "practice"
      ? status.state === "READY" && !state.placed
      : status.canPlace;
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
              <span className="eyebrow">SOUNDBOX 5.0</span>
              <h1 ref={heading} tabIndex={-1}>
                {mode === "practice"
                  ? "Practice tabletop"
                  : "Scan your counter"}
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
          <div className="model-note">DEMO MODEL · NON-PAYABLE QR</div>
          {!state.placed && !status.error && (
            <div className="placement-guide">
              <span className="scan-symbol">
                <Icon name="cube" />
              </span>
              <h2>
                {mode === "practice"
                  ? "Place your Soundbox"
                  : canPlace
                    ? "Surface found"
                    : "Find a flat counter"}
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
                {mode === "ar" ? "Retry AR" : "Retry viewer"}
              </button>
              {mode === "ar" && (
                <button
                  className="primary"
                  onClick={() => {
                    sessionRef.current?.dispose();
                    start("practice");
                  }}
                >
                  Explore without camera
                </button>
              )}
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
                : "Aim at a textured, well-lit surface"}
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
            <h2>Explore the Soundbox</h2>
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
            <summary>Adjust model</summary>
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
