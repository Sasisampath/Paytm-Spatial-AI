import { z } from "zod";
export type PaymentStatus = "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED";
export type DemoPayment = {
  id: string;
  amountPaise: number;
  status: Exclude<PaymentStatus, "IDLE">;
  createdAtISO: string;
  simulated: true;
};
export type Feature = "speaker" | "qr" | "power" | "connectivity";
export type DemoState = {
  payment: DemoPayment | null;
  placed: boolean;
  tracking: boolean;
  mode: "practice" | "ar";
  feature: Feature | null;
  revision: number;
  soundbox:
    | "UNPLACED"
    | "PREVIEW"
    | "PLACED"
    | "HIGHLIGHTING"
    | "ANNOUNCING"
    | "TRACKING_LOST";
};
export type Result =
  | {
      ok: true;
      simulated: true;
      payment?: DemoPayment;
      feature?: Feature;
      state?: DemoState;
    }
  | { ok: false; code: string; message: string; simulated: true };
export const amountSchema = z
  .object({
    amount_inr: z
      .number()
      .finite()
      .min(1)
      .max(10000)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-7,
        "Use at most two decimal places",
      ),
  })
  .strict();
export const featureSchema = z
  .object({ feature: z.enum(["speaker", "qr", "power", "connectivity"]) })
  .strict();
const emptySchema = z.object({}).strict();
const error = (code: string, message: string): Result => ({
  ok: false,
  code,
  message,
  simulated: true,
});
export class SimulationService {
  private state: DemoState = {
    payment: null,
    placed: false,
    tracking: false,
    mode: "practice",
    feature: null,
    revision: 0,
    soundbox: "UNPLACED",
  };
  private listeners = new Set<() => void>();
  private operations = new Map<string, Result>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getSnapshot = () => this.state;
  private patch(patch: Partial<DemoState>) {
    this.state = { ...this.state, ...patch, revision: this.state.revision + 1 };
    this.listeners.forEach((cb) => cb());
  }
  setEnvironment(placed: boolean, tracking: boolean, mode: "practice" | "ar") {
    if (
      placed === this.state.placed &&
      tracking === this.state.tracking &&
      mode === this.state.mode
    )
      return;
    this.patch({
      placed,
      tracking,
      mode,
      soundbox: !tracking ? "TRACKING_LOST" : placed ? "PLACED" : "PREVIEW",
    });
  }
  simulate(
    input: unknown,
    operationId: string,
    outcome: "SUCCESS" | "FAILED" = "SUCCESS",
  ): Result {
    const parsed = amountSchema.safeParse(input);
    if (!parsed.success)
      return error(
        "INVALID_AMOUNT",
        "Use a demo amount from ₹1 to ₹10,000, with at most two decimals.",
      );
    if (this.operations.has(operationId))
      return this.operations.get(operationId)!;
    if (!this.state.placed || !this.state.tracking)
      return error(
        "NOT_READY",
        "Place the device with valid tracking before a simulation.",
      );
    if (this.state.payment) {
      if (
        this.state.payment.amountPaise ===
        Math.round(parsed.data.amount_inr * 100)
      )
        return { ok: true, simulated: true, payment: this.state.payment };
      return error(
        "PAYMENT_EXISTS",
        "Reset the current demo before trying a different amount.",
      );
    }
    if (this.operations.size >= 256)
      return error("SESSION_LIMIT", "End this session and start a new one.");
    const payment: DemoPayment = {
      id: `DEMO-${crypto.randomUUID()}`,
      amountPaise: Math.round(parsed.data.amount_inr * 100),
      status: "PROCESSING",
      createdAtISO: new Date().toISOString(),
      simulated: true,
    };
    const result: Result = { ok: true, simulated: true, payment };
    this.operations.set(operationId, result);
    const generation = this.generation;
    this.patch({ payment, feature: null, soundbox: "ANNOUNCING" });
    this.timer = setTimeout(() => {
      if (generation !== this.generation) return;
      const completed: DemoPayment = { ...payment, status: outcome };
      this.operations.set(operationId, {
        ok: true,
        simulated: true,
        payment: completed,
      });
      this.patch({
        payment: completed,
        soundbox: this.state.tracking ? "PLACED" : "TRACKING_LOST",
      });
    }, 900);
    return result;
  }
  highlight(input: unknown): Result {
    const p = featureSchema.safeParse(input);
    if (!p.success)
      return error(
        "INVALID_FEATURE",
        "Choose speaker, qr, power or connectivity.",
      );
    if (!this.state.placed || !this.state.tracking)
      return error("NOT_READY", "Place the device with valid tracking first.");
    this.patch({ feature: p.data.feature, soundbox: "HIGHLIGHTING" });
    return { ok: true, simulated: true, feature: p.data.feature };
  }
  reset(input: unknown = {}): Result {
    if (!emptySchema.safeParse(input).success)
      return error("INVALID_INPUT", "This tool takes no arguments.");
    if (this.state.payment?.status === "PROCESSING")
      return error("BUSY", "Wait for the accepted demo to finish.");
    this.generation++;
    clearTimeout(this.timer);
    this.patch({
      payment: null,
      feature: null,
      soundbox: this.state.tracking
        ? this.state.placed
          ? "PLACED"
          : "PREVIEW"
        : "TRACKING_LOST",
    });
    return { ok: true, simulated: true };
  }
  tools = {
    simulate_payment: (input: unknown) =>
      this.simulate(input, `voice-${this.generation}`),
    highlight_feature: (input: unknown) => this.highlight(input),
    get_demo_state: (input: unknown = {}) =>
      emptySchema.safeParse(input).success
        ? { ok: true, simulated: true, state: this.state }
        : error("INVALID_INPUT", "This tool takes no arguments."),
    reset_demo: (input: unknown = {}) => this.reset(input),
  };
  dispose() {
    this.generation++;
    clearTimeout(this.timer);
    this.listeners.clear();
  }
}
