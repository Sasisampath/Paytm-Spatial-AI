import { useEffect, useRef } from "react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SoundboxModel } from "./SoundboxModel";
import { ARSession } from "../../lib/ar/engine";
import type { ARSnapshot } from "../../lib/ar/types";
import type { Feature } from "../../lib/simulation/service";

export default function Stage({
  mode,
  onStatus,
  sessionRef,
  feature,
  scale,
  rotation,
}: {
  mode: "ar" | "practice";
  onStatus: (s: ARSnapshot) => void;
  sessionRef: React.RefObject<ARSession | null>;
  feature: Feature | null;
  scale: number;
  rotation: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const paint = useRef<() => void>(() => {});
  const settings = useRef({ feature, scale, rotation });
  useEffect(() => {
    const element = canvas.current!;
    const annotate = (p: { x: number; y: number; visible: boolean }) => {
      if (!label.current) return;
      label.current.hidden = !p.visible;
      if (p.visible) {
        label.current.style.left = `${p.x * 100}%`;
        label.current.style.top = `${p.y * 100}%`;
      }
    };
    if (mode === "ar") {
      const session = new ARSession(element, onStatus, annotate);
      sessionRef.current = session;
      void session.start();
      return () => {
        session.dispose();
        sessionRef.current = null;
      };
    }
    const report = (error: string | null) =>
      onStatus({
        state: error ? "ERROR" : "READY",
        placed: false,
        tracking: !error,
        canPlace: !error,
        source: "practice",
        error,
      });
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas: element,
        antialias: true,
        alpha: true,
      });
    } catch {
      report(
        "This browser could not open the viewer. Try a WebGL-capable browser.",
      );
      return;
    }
    let disposed = false;
    let model: SoundboxModel | undefined;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.005, 5);
    camera.position.set(0.133, 0.132, 0.252);
    scene.add(new T.HemisphereLight(0xffffff, 0xb4c7db, 2.4));
    const key = new T.DirectionalLight(0xfffaf5, 2.2);
    key.position.set(-1, 2, 3);
    scene.add(key);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = T.NeutralToneMapping;
    renderer.setClearColor(0x000000, 0);
    const controls = new OrbitControls(camera, element);
    controls.target.set(0, 0.04, 0);
    controls.enablePan = false;
    controls.minDistance = 0.14;
    controls.maxDistance = 0.46;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();
    const draw = () => {
      if (!model || disposed) return;
      const { feature, scale, rotation } = settings.current;
      model.root.scale.setScalar(scale);
      model.root.rotation.y = rotation;
      model.highlight(feature);
      renderer.render(scene, camera);
      if (feature) {
        const p = model.anchor(feature).project(camera);
        annotate({ x: (p.x + 1) / 2, y: (1 - p.y) / 2, visible: true });
      } else annotate({ x: 0, y: 0, visible: false });
    };
    paint.current = draw;
    controls.addEventListener("change", draw);
    const resize = () => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      renderer.setSize(box.width, box.height, false);
      camera.aspect = box.width / box.height;
      camera.updateProjectionMatrix();
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const lost = (event: Event) => {
      event.preventDefault();
      report("The 3D display was interrupted. Retry the viewer.");
    };
    element.addEventListener("webglcontextlost", lost);
    SoundboxModel.load("hero")
      .then((asset) => {
        if (disposed) {
          asset.dispose();
          return;
        }
        model = asset;
        scene.add(asset.root);
        draw();
        report(null);
      })
      .catch(() => {
        if (!disposed)
          report(
            "The Soundbox model could not load. Check your connection and retry.",
          );
      });
    return () => {
      disposed = true;
      paint.current = () => {};
      observer.disconnect();
      element.removeEventListener("webglcontextlost", lost);
      controls.dispose();
      model?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [mode, onStatus, sessionRef]);
  useEffect(() => {
    settings.current = { feature, scale, rotation };
    sessionRef.current?.setFeature(feature);
    sessionRef.current?.setTransform(scale, rotation);
    paint.current();
  }, [feature, scale, rotation, sessionRef]);
  return (
    <>
      <canvas
        ref={canvas}
        className="scene-canvas"
        aria-label={
          mode === "ar"
            ? "World-tracked Soundbox camera view"
            : "Soundbox 5.0 in 3D. Drag to rotate."
        }
      />
      <span ref={label} hidden className="world-label">
        {feature &&
          {
            speaker: "Speaker",
            qr: "Demo QR",
            power: "Top controls",
            connectivity: "Status indicator",
          }[feature]}
      </span>
    </>
  );
}
