import * as T from "three";
import { GroundPlacement, aim } from "./placement";
import { GroundRaycast } from "./ground-raycast";
import type { GroundPose } from "./ground-raycast";
import { SoundboxModel } from "../../components/ar/SoundboxModel";
import type {
  ARSnapshot,
  CameraUpdate,
  Reality,
  XR8Engine,
  XrScene,
} from "./types";
import type { Feature } from "../simulation/service";
let runtime: Promise<XR8Engine> | null = null;
let owner: ARSession | null = null;
function loadRuntime() {
  if (runtime) return runtime;
  window.THREE = T;
  runtime = new Promise<XR8Engine>((resolve, reject) => {
    if (window.XR8) {
      resolve(window.XR8);
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/8thwall/xr.js";
    script.async = true;
    script.dataset.preloadChunks = "slam";
    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("xrloaded", ready);
      script.onload = null;
      script.onerror = null;
    };
    const ready = () => {
      if (window.XR8) {
        cleanup();
        resolve(window.XR8);
      }
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error("AR download failed. Check your connection and retry."));
    };
    const timeout = window.setTimeout(fail, 30000);
    window.addEventListener("xrloaded", ready);
    script.onload = ready;
    script.onerror = fail;
    document.head.append(script);
  }).catch((e) => {
    runtime = null;
    throw e;
  });
  return runtime;
}
/** XR8 owns both the camera and render loop. No permission preflight stream. */
export class ARSession {
  private xr: XR8Engine | null = null;
  private scene: XrScene | null = null;
  private model: SoundboxModel | null = null;
  private ring: T.Mesh | null = null;
  private estimator = new GroundPlacement();
  private ray = new GroundRaycast();
  private pose: GroundPose | null = null;
  private disposed = false;
  private stopped = false;
  private placed = false;
  private paused = false;
  private camera = "";
  private lastFrame = 0;
  private lastEstimate = 0;
  private watchdog: number | undefined;
  private observer: ResizeObserver | null = null;
  private streams = new Set<MediaStream>();
  private tracks = new Map<MediaStreamTrack, () => void>();
  private feature: Feature | null = null;
  private scale = 1;
  private rotation = 0;
  private recovery = 0;
  private lastRecovery = 0;
  private previousPosition = new T.Vector3();
  private previousRotation = new T.Quaternion();
  private previousTime = 0;
  private snap: ARSnapshot = {
    state: "INITIALIZING",
    placed: false,
    tracking: false,
    canPlace: false,
    error: null,
    source: "none",
  };
  constructor(
    private canvas: HTMLCanvasElement,
    private publish: (snapshot: ARSnapshot) => void,
    private annotate: (p: { x: number; y: number; visible: boolean }) => void,
  ) {}
  private live() {
    return !this.disposed && !this.stopped && owner === this;
  }
  private update(patch: Partial<ARSnapshot>) {
    if (this.disposed) return;
    const next = { ...this.snap, ...patch };
    if (JSON.stringify(next) !== JSON.stringify(this.snap)) {
      this.snap = next;
      this.publish(next);
    }
  }
  async start() {
    owner?.dispose();
    owner = this;
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof WebGLRenderingContext === "undefined"
      ) {
        this.fail(
          "Use HTTPS on an iPhone or Android phone with camera and WebGL support.",
          "UNSUPPORTED",
        );
        return;
      }
      this.xr = await loadRuntime();
      if (!this.live()) return;
      const allowedDevices = this.xr.XrConfig.device().MOBILE;
      if (!this.xr.XrDevice.isDeviceBrowserCompatible({ allowedDevices })) {
        this.fail(
          "Open AR in Safari on iPhone or Chrome on a supported Android phone.",
          "UNSUPPORTED",
        );
        return;
      }
      await this.xr.initialize();
      if (!this.live()) return;
      await this.xr.loadChunk("slam");
      if (!this.live()) return;
      if (document.hidden) {
        this.fail("Return to the app and try again.");
        return;
      }
      this.xr.clearCameraPipelineModules();
      this.xr.XrController.configure({
        disableWorldTracking: false,
        enableWorldPoints: true,
        scale: "absolute",
      });
      this.xr.addCameraPipelineModules([
        this.xr.GlTextureRenderer.pipelineModule(),
        this.xr.Threejs.pipelineModule(),
        this.xr.XrController.pipelineModule(),
        {
          name: "reality-lab",
          onStart: () => this.onStart(),
          onUpdate: (e) => this.frame(e.processCpuResult?.reality),
          onCameraStatusChange: (e) => this.onCamera(e),
          onException: (e) =>
            this.fail(
              /denied|permission|notallowed/i.test(String(e))
                ? "Camera access is off. Enable it in browser settings, then retry."
                : "The AR camera stopped. Close other camera apps and retry.",
            ),
        },
      ]);
      this.resize();
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.canvas);
      window.addEventListener("resize", this.resize);
      window.addEventListener("orientationchange", this.orientation);
      document.addEventListener("visibilitychange", this.visibility);
      window.addEventListener("pagehide", this.pagehide);
      this.canvas.addEventListener("webglcontextlost", this.contextLost);
      await this.xr.run({
        canvas: this.canvas,
        cameraConfig: { direction: this.xr.XrConfig.camera().BACK },
        allowedDevices,
        glContextConfig: { alpha: false, antialias: false },
      });
      if (!this.live()) return;
      this.lastFrame = performance.now();
      this.watchdog = window.setInterval(() => {
        if (
          this.live() &&
          !this.paused &&
          performance.now() - this.lastFrame > 1500
        )
          this.lose();
      }, 400);
    } catch {
      if (this.live())
        this.fail(
          "AR could not start. Check camera permission, connection and device support.",
        );
    }
  }
  private onStart() {
    if (!this.live() || !this.xr) return;
    this.scene = this.xr.Threejs.xrScene();
    this.scene.camera.position.set(0, 1.5, 0);
    this.xr.XrController.updateCameraProjectionMatrix({
      origin: this.scene.camera.position,
      facing: this.scene.camera.quaternion,
    });
    this.model = new SoundboxModel();
    this.model.root.visible = false;
    this.scene.scene.add(this.model.root);
    this.scene.scene.add(new T.HemisphereLight(0xffffff, 0x617688, 3));
    const light = new T.DirectionalLight(0xffffff, 3);
    light.position.set(2, 4, 3);
    this.scene.scene.add(light);
    this.ring = new T.Mesh(
      new T.RingGeometry(0.095, 0.1, 64),
      new T.MeshBasicMaterial({
        color: 0x00b9e8,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.scene.add(this.ring);
    this.update({ state: "SEARCHING" });
  }
  private onCamera(e: CameraUpdate) {
    if (!this.live()) {
      e.stream?.getTracks().forEach((t) => t.stop());
      return;
    }
    this.camera = e.status;
    if (e.stream) {
      this.streams.add(e.stream);
      for (const t of e.stream.getTracks()) {
        if (t.kind === "video" && t.getSettings?.().facingMode === "user") {
          this.fail("A rear camera is required. Please try another device.");
          return;
        }
        if (this.tracks.has(t)) continue;
        const ended = () => {
          if (this.live()) this.fail("Camera access ended. Tap Retry.");
        };
        t.addEventListener("ended", ended);
        this.tracks.set(t, ended);
      }
    }
    if (e.status === "failed")
      this.fail("Camera could not open. Check permission and retry.");
  }
  private frame(reality?: Reality) {
    if (!this.live() || this.paused || !this.scene || !this.model || !reality)
      return;
    const now = performance.now();
    this.lastFrame = now;
    const sudden =
      this.previousTime > 0 &&
      now - this.previousTime < 300 &&
      (this.scene.camera.position.distanceTo(this.previousPosition) > 0.65 ||
        this.scene.camera.quaternion.angleTo(this.previousRotation) >
          Math.PI / 4);
    this.previousPosition.copy(this.scene.camera.position);
    this.previousRotation.copy(this.scene.camera.quaternion);
    this.previousTime = now;
    if (sudden) {
      this.lose();
      return;
    }
    if (
      reality.trackingStatus !== "NORMAL" ||
      reality.trackingReason === "INITIALIZING" ||
      this.camera !== "hasVideo"
    ) {
      this.lose();
      return;
    }
    if (now - this.lastEstimate >= 120) {
      this.lastEstimate = now;
      let candidate;
      try {
        candidate = this.estimator.estimate(
          this.scene.camera,
          this.xr!.XrController.hitTest(aim.x, aim.y),
          reality.worldPoints ?? [],
          now,
        );
      } catch {
        this.fail("Surface tracking failed. Please retry.");
        return;
      }
      this.pose = this.ray.cast(this.scene.camera, candidate, now);
    }
    if (this.placed) {
      if (now - this.lastRecovery >= 120) {
        this.lastRecovery = now;
        this.recovery++;
      }
      if (this.recovery < 4) {
        this.model.root.visible = false;
        this.update({
          state: "TRACKING_LOST",
          tracking: false,
          canPlace: false,
        });
        return;
      }
    }
    const ready = !!this.pose && now - this.pose.support.updatedAt <= 350;
    if (!this.placed && ready) {
      this.model.root.position.copy(this.pose!.position);
      this.model.root.quaternion
        .copy(this.pose!.rotation)
        .multiply(
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 1, 0),
            this.rotation,
          ),
        );
    }
    this.model.root.scale.setScalar(this.scale);
    this.model.root.visible = this.placed || ready;
    if (this.ring) {
      this.ring.visible = !this.placed && ready;
      if (ready)
        this.ring.position
          .copy(this.pose!.position)
          .add(new T.Vector3(0, 0.002, 0));
    }
    this.model.highlight(
      this.feature,
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : now,
    );
    if (this.feature && this.placed) {
      const p = this.model.anchor(this.feature).project(this.scene.camera);
      this.annotate({
        x: (p.x + 1) / 2,
        y: (1 - p.y) / 2,
        visible: p.z < 1 && p.z > -1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
      });
    } else this.annotate({ x: 0, y: 0, visible: false });
    this.update({
      state: this.placed ? "PLACED" : ready ? "READY" : "SEARCHING",
      tracking: true,
      placed: this.placed,
      canPlace: ready && !this.placed,
      source: ready ? this.pose!.support.source : "none",
    });
  }
  confirm() {
    if (
      !this.live() ||
      !this.snap.canPlace ||
      !this.pose ||
      performance.now() - this.lastFrame > 350 ||
      performance.now() - this.pose.support.updatedAt > 350
    )
      return false;
    this.placed = true;
    this.recovery = 4;
    this.update({ state: "PLACED", placed: true, canPlace: false });
    return true;
  }
  reposition() {
    this.placed = false;
    this.pose = null;
    this.estimator.reset();
    this.update({ state: "SEARCHING", placed: false, canPlace: false });
    if (this.model) this.model.root.visible = false;
  }
  setFeature(feature: Feature | null) {
    this.feature = feature;
  }
  setTransform(scale: number, rotation: number) {
    this.scale = scale;
    this.rotation = rotation;
    if (this.model) {
      this.model.root.scale.setScalar(Math.max(0.75, Math.min(1.25, scale)));
      this.model.root.rotation.y = rotation;
    }
  }
  private lose() {
    this.recovery = 0;
    this.lastRecovery = 0;
    this.pose = null;
    this.estimator.reset();
    if (this.model) this.model.root.visible = false;
    if (this.ring) this.ring.visible = false;
    this.annotate({ x: 0, y: 0, visible: false });
    this.update({ state: "TRACKING_LOST", tracking: false, canPlace: false });
  }
  private resize = () => {
    const b = this.canvas.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.max(1, Math.round(b.width * d));
    this.canvas.height = Math.max(1, Math.round(b.height * d));
  };
  private orientation = () => {
    this.resize();
    this.lose();
  };
  private visibility = () => {
    if (!this.live() || !this.xr) return;
    this.lose();
    this.paused = document.hidden;
    try {
      if (this.paused) this.xr.pause();
      else {
        this.lastFrame = performance.now();
        this.xr.resume();
      }
    } catch {
      this.fail("AR could not resume. Please retry.");
    }
  };
  private pagehide = () => {
    this.fail("Session ended. Start again when you return.");
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.fail("The 3D display was interrupted. Please retry.");
  };
  private fail(error: string, state: "ERROR" | "UNSUPPORTED" = "ERROR") {
    this.update({ state, error, tracking: false, canPlace: false });
    this.release();
  }
  private release() {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.watchdog);
    this.observer?.disconnect();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.orientation);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.pagehide);
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    for (const [t, fn] of this.tracks) t.removeEventListener("ended", fn);
    this.tracks.clear();
    if (owner === this) {
      try {
        this.xr?.stop();
        this.xr?.clearCameraPipelineModules();
      } catch {}
      owner = null;
    }
    for (const stream of this.streams)
      stream.getTracks().forEach((t) => t.stop());
    this.streams.clear();
    this.model?.dispose();
    this.ring?.geometry.dispose();
    if (this.ring) (this.ring.material as T.Material).dispose();
    this.ring?.removeFromParent();
    this.scene?.scene.clear();
    this.scene?.renderer.dispose();
    this.scene = null;
  }
  dispose() {
    this.release();
    this.disposed = true;
  }
}
