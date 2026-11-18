import { describe, it, expect, vi, afterEach } from "vitest";
import { announceDemo } from "../src/lib/voice/announcer";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function setup() {
  vi.useFakeTimers();
  const spoken: any[] = [];
  const cancel = vi.fn();
  vi.stubGlobal("window", {
    speechSynthesis: { cancel, speak: (u: any) => spoken.push(u) },
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  return { spoken, cancel };
}
describe("demo announcement lifetime", () => {
  it("labels original speech as demo and finishes only once on repeated events", () => {
    const { spoken } = setup(),
      done = vi.fn();
    announceDemo(25000, done);
    expect(spoken[0].text).toContain("Demo payment of 250.00 rupees");
    expect(spoken[0].text).toContain("simulation");
    spoken[0].onend();
    spoken[0].onerror();
    vi.advanceTimersByTime(11000);
    expect(done).toHaveBeenCalledTimes(1);
  });
  it("cancellation stops speech and restores its caller once", () => {
    const { cancel } = setup(),
      done = vi.fn();
    const stop = announceDemo(100, done);
    stop();
    stop();
    expect(cancel).toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
  });
  it("times out a speech engine that never signals completion", () => {
    setup();
    const done = vi.fn();
    announceDemo(100, done);
    vi.advanceTimersByTime(10000);
    expect(done).toHaveBeenCalledOnce();
  });
});
