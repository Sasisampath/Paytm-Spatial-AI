import { describe, it, expect, vi } from "vitest";
import { createApp } from "../server/app.mjs";
const env = {
  VOICE_ENABLED: "true",
  APP_ORIGIN: "http://localhost:5173",
  ELEVENLABS_API_KEY: "server-secret-example",
  ELEVENLABS_AGENT_ID: "private-example",
  SESSION_SECRET: "session-test-secret-at-least-32-characters",
  DEMO_ACCESS_CODE: "test-private",
};
async function withServer(
  fn,
  overrides = {},
  provider = vi.fn(async () =>
    Response.json({ signed_url: "wss://api.elevenlabs.io/test-session" }),
  ),
) {
  const server = createApp({ ...env, ...overrides }, provider).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`, provider);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
const post = (url, path, body = {}, cookie = "", origin = env.APP_ORIGIN) =>
  fetch(url + "/api/voice/" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Reality-Client": "1",
      Origin: origin,
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
describe("server-side voice gate", () => {
  it("returns safe config and disables absent setup", () =>
    withServer(
      async (u) => {
        const r = await fetch(u + "/api/voice/config");
        expect(await r.json()).toEqual({ enabled: false, mode: "demo" });
        expect((await post(u, "signed-url")).status).toBe(503);
      },
      { ELEVENLABS_API_KEY: "" },
    ));
  it("rejects cross-origin requests, invalid methods, absent or forged sessions", () =>
    withServer(async (u) => {
      expect((await fetch(u + "/api/voice/signed-url")).status).toBe(405);
      expect(
        (await post(u, "session", {}, "", "https://evil.invalid")).status,
      ).toBe(403);
      expect((await post(u, "signed-url")).status).toBe(401);
      expect(
        (await post(u, "signed-url", {}, "reality_session=9999999999999.fake"))
          .status,
      ).toBe(401);
      expect((await post(u, "session", { accessCode: "wrong" })).status).toBe(
        401,
      );
    }));
  it("issues an HttpOnly cookie, uses secret only upstream, and logs out", () =>
    withServer(async (u, provider) => {
      const r = await post(u, "session", { accessCode: "test-private" });
      expect(r.status).toBe(200);
      const raw = r.headers.get("set-cookie");
      expect(raw).toContain("HttpOnly");
      expect(raw).toContain("SameSite=Strict");
      const cookie = raw.split(";")[0];
      const signed = await post(u, "signed-url", {}, cookie);
      expect(await signed.json()).toEqual({
        signedUrl: "wss://api.elevenlabs.io/test-session",
      });
      expect(signed.headers.get("cache-control")).toBe("no-store");
      expect(provider.mock.calls[0][1].headers["xi-api-key"]).toBe(
        env.ELEVENLABS_API_KEY,
      );
      expect(
        (await post(u, "logout", {}, cookie)).headers.get("set-cookie"),
      ).toContain("Max-Age=0");
    }));
  it("bounds abusive requests", () =>
    withServer(async (u) => {
      for (let i = 0; i < 8; i++) await post(u, "session", {});
      expect((await post(u, "session", {})).status).toBe(429);
    }));
  it("does not echo upstream failures or credentials", () =>
    withServer(
      async (u) => {
        const session = await post(u, "session", {
          accessCode: "test-private",
        });
        const r = await post(
          u,
          "signed-url",
          {},
          session.headers.get("set-cookie").split(";")[0],
        );
        const body = await r.text();
        expect(r.status).toBe(502);
        expect(body).toBe('{"code":"PROVIDER_UNAVAILABLE"}');
        expect(body).not.toContain("secret");
      },
      {},
      async () => {
        throw Error("server-secret-example");
      },
    ));
  it("marks production cookies Secure", () =>
    withServer(
      async (u) => {
        const r = await post(u, "session", { accessCode: "test-private" });
        expect(r.headers.get("set-cookie")).toContain("; Secure");
      },
      { NODE_ENV: "production" },
    ));
});
