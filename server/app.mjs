import express from "express";
import { rateLimit } from "express-rate-limit";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export function createApp(env = process.env, providerFetch = fetch) {
  const app = express();
  app.disable("x-powered-by");
  const origin = env.APP_ORIGIN || "http://localhost:5173";
  const enabled =
    env.VOICE_ENABLED === "true" &&
    !!env.ELEVENLABS_API_KEY &&
    !!env.ELEVENLABS_AGENT_ID &&
    (env.SESSION_SECRET?.length ?? 0) >= 32 &&
    (env.DEMO_ACCESS_CODE?.length ?? 0) >= 12;
  const secret = env.SESSION_SECRET || randomBytes(32).toString("hex");
  const sign = (value) =>
    createHmac("sha256", secret).update(value).digest("hex");
  const equal = (a, b) =>
    typeof a === "string" &&
    typeof b === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const sessionValid = (req) => {
    const raw =
      req.headers.cookie
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("reality_session="))
        ?.slice(16) || "";
    const [expiry, signature] = raw.split(".");
    return (
      Number(expiry) > Date.now() &&
      Number(expiry) < Date.now() + 11 * 60 * 1000 &&
      equal(signature, sign(expiry))
    );
  };
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
    });
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    else
      res.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://api.elevenlabs.io wss://api.elevenlabs.io https://*.elevenlabs.io wss://*.elevenlabs.io; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
    next();
  });
  app.use(express.json({ limit: "2kb" }));
  app.get("/api/voice/config", (_req, res) =>
    res.json({ enabled, mode: enabled ? "authenticated" : "demo" }),
  );
  app.use("/api/voice", (req, res, next) => {
    if (req.method !== "POST")
      return res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
    if (
      req.headers.origin !== origin ||
      req.headers["x-reality-client"] !== "1"
    )
      return res.status(403).json({ code: "INVALID_ORIGIN" });
    next();
  });
  // Process-local limiter suits the single-process private MVP. Distributed deployments
  // require a shared store / upstream gateway. Never trust arbitrary forwarded IPs.
  app.use(
    "/api/voice",
    rateLimit({
      windowMs: 600000,
      limit: 8,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { code: "RATE_LIMITED" },
    }),
  );
  app.post("/api/voice/session", (req, res) => {
    if (!enabled) return res.status(503).json({ code: "VOICE_UNAVAILABLE" });
    if (!equal(req.body?.accessCode, env.DEMO_ACCESS_CODE))
      return res.status(401).json({ code: "UNAUTHORIZED" });
    const expiry = String(Date.now() + 600000);
    res.set(
      "Set-Cookie",
      `reality_session=${expiry}.${sign(expiry)}; HttpOnly; SameSite=Strict; Path=/api/voice; Max-Age=600${env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    res.json({ ok: true });
  });
  app.post("/api/voice/signed-url", async (req, res) => {
    if (!enabled) return res.status(503).json({ code: "VOICE_UNAVAILABLE" });
    if (!sessionValid(req))
      return res.status(401).json({ code: "UNAUTHORIZED" });
    try {
      const u = new URL(
        "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
      );
      u.searchParams.set("agent_id", env.ELEVENLABS_AGENT_ID);
      const upstream = await providerFetch(u, {
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok)
        return res
          .status(upstream.status === 429 ? 429 : 502)
          .json({
            code:
              upstream.status === 429
                ? "PROVIDER_QUOTA"
                : "PROVIDER_UNAVAILABLE",
          });
      const data = await upstream.json();
      if (
        typeof data.signed_url !== "string" ||
        !data.signed_url.startsWith("wss://")
      )
        throw Error();
      res.json({ signedUrl: data.signed_url });
    } catch {
      return res.status(502).json({ code: "PROVIDER_UNAVAILABLE" });
    }
  });
  app.post("/api/voice/logout", (_req, res) => {
    res.set(
      "Set-Cookie",
      "reality_session=; HttpOnly; SameSite=Strict; Path=/api/voice; Max-Age=0",
    );
    res.json({ ok: true });
  });
  app.use("/api", (_req, res) => res.status(404).json({ code: "NOT_FOUND" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res
      .status(error?.status === 413 ? 413 : 400)
      .json({ code: "INVALID_REQUEST" });
  });
  return app;
}
