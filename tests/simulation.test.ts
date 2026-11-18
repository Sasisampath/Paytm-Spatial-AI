import { describe, it, expect, vi, afterEach } from "vitest";
import { SimulationService } from "../src/lib/simulation/service";
afterEach(() => vi.useRealTimers());
const ready = () => {
  const s = new SimulationService();
  s.setEnvironment(true, true, "ar");
  return s;
};
describe("validated synthetic payments", () => {
  it.each([0, -1, NaN, Infinity, "250", 10001, null, 1.001])(
    "rejects unsafe amount %s",
    (value) => {
      const s = ready();
      expect(s.simulate({ amount_inr: value }, "a").ok).toBe(false);
      expect(s.getSnapshot().payment).toBeNull();
    },
  );
  it("creates an integer-paise demo and exactly one terminal event for racing UI/tools", () => {
    vi.useFakeTimers();
    const s = ready();
    let completed = 0;
    s.subscribe(() => {
      if (s.getSnapshot().payment?.status === "SUCCESS") completed++;
    });
    const a = s.simulate({ amount_inr: 250 }, "UI");
    const b = s.tools.simulate_payment({ amount_inr: 250 });
    expect(a.ok && a.payment?.amountPaise).toBe(25000);
    expect(b.ok && b.payment?.id).toMatch(/^DEMO-/);
    expect(s.getSnapshot().payment?.simulated).toBe(true);
    vi.advanceTimersByTime(900);
    expect(completed).toBe(1);
    expect(s.tools.simulate_payment({ amount_inr: 250 })).toMatchObject({
      ok: true,
      payment: { status: "SUCCESS" },
    });
    s.dispose();
  });
  it("keeps operation IDs idempotent across resets and requires explicit reset for new amounts", () => {
    vi.useFakeTimers();
    const s = ready();
    const a = s.simulate({ amount_inr: 1.05 }, "a");
    expect(s.simulate({ amount_inr: 2 }, "b").ok).toBe(false);
    expect(s.reset()).toMatchObject({ ok: false, code: "BUSY" });
    vi.advanceTimersByTime(900);
    s.reset();
    expect(s.simulate({ amount_inr: 1.05 }, "a")).toMatchObject({
      ok: true,
      payment: { id: a.ok ? a.payment?.id : "" },
    });
    expect(s.getSnapshot().payment).toBeNull();
    s.dispose();
  });
  it("settles accepted payment once during tracking loss, blocks new placement-dependent actions", () => {
    vi.useFakeTimers();
    const s = ready();
    s.simulate({ amount_inr: 250 }, "a", "FAILED");
    s.setEnvironment(true, false, "ar");
    vi.advanceTimersByTime(900);
    expect(s.getSnapshot()).toMatchObject({
      payment: { status: "FAILED" },
      soundbox: "TRACKING_LOST",
    });
    expect(s.highlight({ feature: "speaker" }).ok).toBe(false);
    s.reset();
    expect(s.simulate({ amount_inr: 250 }, "b").ok).toBe(false);
    s.dispose();
  });
  it("strictly allowlists tool input and never produces a real financial record", () => {
    const s = ready();
    expect(s.highlight({ feature: "<img onerror=alert(1)>" }).ok).toBe(false);
    expect(s.highlight({ feature: "power", html: "x" }).ok).toBe(false);
    expect(s.simulate({ amount_inr: 250, real: true }, "x").ok).toBe(false);
    expect(s.tools.get_demo_state({ extra: true })).toMatchObject({
      ok: false,
    });
    expect(s.highlight({ feature: "power" })).toMatchObject({
      ok: true,
      simulated: true,
    });
    expect(s.tools.get_demo_state()).toMatchObject({ simulated: true });
    s.dispose();
  });
  it("cancels accepted timers on session teardown", () => {
    vi.useFakeTimers();
    const s = ready();
    const f = vi.fn();
    s.subscribe(f);
    s.simulate({ amount_inr: 250 }, "a");
    s.dispose();
    vi.advanceTimersByTime(2000);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
