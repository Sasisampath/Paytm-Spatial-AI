import { test, expect } from "@playwright/test";
import { withSavedBusiness } from "./returning-business";
test.beforeEach(async ({ page }) => {
  await withSavedBusiness(page);
});

async function mockXR(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", { value: "Android Mobile" });
    const w = window as any;
    const t = (w.testAR = {
      calls: 0,
      stops: 0,
      pauses: 0,
      resumes: 0,
      modules: [] as any[],
      scene: null as any,
      hits: [] as any[],
      streams: [] as MediaStream[],
      disposed: 0,
    });
    const notify = (event: any) =>
      t.modules.forEach((m: any) => m.onCameraStatusChange?.(event));
    t.emit = (status = "NORMAL", hits: any[] = [], x = 0) => {
      t.hits = hits;
      t.scene.camera.position.set(x, 1.5, 0);
      t.scene.camera.lookAt(x, 0, -1);
      t.scene.camera.updateMatrixWorld(true);
      t.modules.forEach((m: any) =>
        m.onUpdate?.({
          processCpuResult: {
            reality: { trackingStatus: status, worldPoints: [] },
          },
        }),
      );
    };
    w.XR8 = {
      initialize: async () => {},
      loadChunk: async () => {},
      XrConfig: {
        camera: () => ({ BACK: "back" }),
        device: () => ({ MOBILE: "mobile" }),
      },
      XrDevice: { isDeviceBrowserCompatible: () => true },
      GlTextureRenderer: { pipelineModule: () => ({ name: "camera" }) },
      Threejs: {
        pipelineModule: () => ({
          name: "three",
          onStart: () => {
            const T = w.THREE;
            t.scene = {
              scene: new T.Scene(),
              camera: new T.PerspectiveCamera(
                60,
                innerWidth / innerHeight,
                0.01,
                100,
              ),
              renderer: { dispose: () => t.disposed++ },
            };
          },
        }),
        xrScene: () => t.scene,
      },
      XrController: {
        configure: () => {},
        pipelineModule: () => ({ name: "reality" }),
        updateCameraProjectionMatrix: () => {},
        hitTest: () => t.hits,
      },
      clearCameraPipelineModules: () => {
        t.modules = [];
      },
      addCameraPipelineModules: (modules: any) => {
        t.modules = modules;
      },
      run: () => {
        t.calls++;
        const c = document.createElement("canvas");
        c.width = 16;
        c.height = 16;
        c.getContext("2d")!.fillRect(0, 0, 16, 16);
        const s = c.captureStream(1);
        t.streams.push(s);
        notify({ status: "hasStream", stream: s });
        notify({ status: "hasVideo" });
        t.modules.forEach((m: any) => m.onStart?.({ canvas: c }));
      },
      stop: () => {
        t.stops++;
        t.streams.forEach((s: MediaStream) =>
          s.getTracks().forEach((track) => track.stop()),
        );
      },
      pause: () => t.pauses++,
      resume: () => t.resumes++,
    };
  });
}
const hit = {
  type: "DETECTED_SURFACE",
  position: { x: 0, y: 0, z: -0.8 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};
async function frames(page: any, hits: any[], status = "NORMAL", count = 6) {
  for (let i = 0; i < count; i++) {
    await page.evaluate(
      ({ hits, status }: any) => (window as any).testAR.emit(status, hits),
      { hits, status },
    );
    await page.waitForTimeout(130);
  }
}
test("synthetic XR requires real support, keeps a world anchor, blocks loss and releases camera", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Synthetic stream fixture uses Chromium canvas captureStream.",
  );
  await mockXR(page);
  await page.goto("/");
  expect(await page.evaluate(() => (window as any).testAR.calls)).toBe(0);
  await page.getByRole("button", { name: "Try Soundbox in AR" }).click();
  await page.getByRole("button", { name: "Experience in AR" }).click();
  expect(await page.evaluate(() => (window as any).testAR.calls)).toBe(0);
  await page.getByRole("button", { name: "Enable camera" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).testAR.calls))
    .toBe(1);
  await frames(page, []);
  await expect(
    page.getByRole("button", { name: "Place on this surface" }),
  ).toBeDisabled();
  await frames(page, [{ ...hit, type: "FEATURE_POINT" }]);
  await expect(
    page.getByRole("button", { name: "Place on this surface" }),
  ).toBeDisabled();
  await frames(page, [hit]);
  await expect(
    page.getByRole("button", { name: "Place on this surface" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Place on this surface" }).click();
  await frames(page, [hit], "NORMAL", 1);
  await expect(
    page.getByRole("button", { name: "Simulate payment", exact: true }),
  ).toBeEnabled();
  const before = await page.evaluate(() => {
    const t = (window as any).testAR;
    const group = t.scene.scene.children.find((o: any) => o.type === "Group");
    return group.position.toArray();
  });
  await page.evaluate(() => {
    (window as any).testAR.emit("NORMAL", [], 0.3);
  });
  const after = await page.evaluate(() => {
    const t = (window as any).testAR;
    return t.scene.scene.children
      .find((o: any) => o.type === "Group")
      .position.toArray();
  });
  expect(after).toEqual(before);
  await frames(page, [], "LIMITED", 1);
  await expect(
    page.getByRole("button", { name: "Simulate payment", exact: true }),
  ).toBeDisabled();
  await frames(page, [hit]);
  await expect(
    page.getByRole("button", { name: "Simulate payment", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "End session" }).click();
  expect(
    await page.evaluate(() => {
      const t = (window as any).testAR;
      return (
        t.streams.every((s: MediaStream) =>
          s.getTracks().every((track) => track.readyState === "ended"),
        ) &&
        t.stops === 1 &&
        t.modules.length === 0 &&
        t.disposed === 1
      );
    }),
  ).toBe(true);
});
test("real binary initializes WASM and SLAM without camera use", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Real runtime initialization is a Chromium desktop check.",
  );
  test.setTimeout(60000);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    let calls = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      calls++;
      throw Error("No camera in initialization-only test");
    };
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/vendor/8thwall/xr.js";
      s.onerror = reject;
      s.onload = () => {
        if ((window as any).XR8) resolve();
      };
      window.addEventListener("xrloaded", () => resolve(), { once: true });
      document.head.append(s);
    });
    const xr = (window as any).XR8;
    await xr.initialize();
    await xr.loadChunk("slam");
    return { initialized: xr.isInitialized(), calls };
  });
  expect(result).toEqual({ initialized: true, calls: 0 });
});

test("AR model failure retries before camera ownership; denied camera is recoverable", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Synthetic camera uses canvas captureStream",
  );
  await mockXR(page);
  let requests = 0;
  await page.route("**/models/*-ar.glb", async (route) => {
    if (++requests === 1)
      return route.fulfill({ status: 503, body: "Unavailable" });
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try Soundbox in AR" }).click();
  await page.getByRole("button", { name: "Experience in AR" }).click();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await expect(page.getByRole("alert")).toContainText("model could not load");
  expect(await page.evaluate(() => (window as any).testAR.calls)).toBe(0);
  await page.getByRole("button", { name: "Retry AR" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).testAR.calls))
    .toBe(1);
  await page.evaluate(() =>
    (window as any).testAR.modules
      .at(-1)
      .onException("NotAllowedError: Permission denied"),
  );
  await expect(page.getByRole("alert")).toContainText("Camera access is off");
  await page.getByRole("button", { name: "Explore without camera" }).click();
  await expect(
    page.getByRole("button", { name: "Place practice device" }),
  ).toBeEnabled();
});
