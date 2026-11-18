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
  const canvas = useRef<HTMLCanvasElement>(null),
    model = useRef<SoundboxModel | null>(null),
    featureRef = useRef(feature),
    label = useRef<HTMLSpanElement>(null);
  featureRef.current = feature;
  useEffect(() => {
    if (!canvas.current) return;
    if (mode === "ar") {
      const s = new ARSession(canvas.current, onStatus, (p) => {
        if (label.current) {
          label.current.hidden = !p.visible;
          label.current.style.left = `${p.x * 100}%`;
          label.current.style.top = `${p.y * 100}%`;
        }
      });
      sessionRef.current = s;
      void s.start();
      return () => {
        s.dispose();
        sessionRef.current = null;
      };
    }
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas: canvas.current,
        antialias: true,
        alpha: true,
      });
    } catch {
      onStatus({
        state: "ERROR",
        placed: false,
        tracking: false,
        canPlace: false,
        error:
          "This browser could not start a 3D view. Try a WebGL-capable browser.",
        source: "practice",
      });
      return;
    }
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(36, 1, 0.01, 20);
    camera.position.set(0.34, 0.24, 0.47);
    const m = new SoundboxModel();
    model.current = m;
    scene.add(m.root);
    scene.add(new T.HemisphereLight(0xffffff, 0x8fabc2, 3));
    const sun = new T.DirectionalLight(0xffffff, 4);
    sun.position.set(2, 3, 4);
    scene.add(sun);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const controls = new OrbitControls(camera, canvas.current);
    controls.target.set(0, 0.09, 0);
    controls.enablePan = false;
    controls.minDistance = 0.3;
    controls.maxDistance = 0.9;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();
    const resize = () => {
      const b = canvas.current!.getBoundingClientRect();
      renderer.setSize(b.width, b.height, false);
      camera.aspect = b.width / b.height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.current);
    resize();
    let raf = 0;
    const draw = (now: number) => {
      m.highlight(
        featureRef.current,
        matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : now,
      );
      controls.update();
      renderer.render(scene, camera);
      if (featureRef.current && label.current) {
        const p = m.anchor(featureRef.current).project(camera);
        label.current.hidden = false;
        label.current.style.left = `${(p.x + 1) * 50}%`;
        label.current.style.top = `${(1 - p.y) * 50}%`;
      } else if (label.current) label.current.hidden = true;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      m.dispose();
      renderer.dispose();
      model.current = null;
    };
  }, [mode]);
  useEffect(() => {
    sessionRef.current?.setFeature(feature);
  }, [feature]);
  useEffect(() => {
    sessionRef.current?.setTransform(scale, rotation);
    if (model.current) {
      model.current.root.scale.setScalar(scale);
      model.current.root.rotation.y = rotation;
    }
  }, [scale, rotation]);
  return (
    <>
      <canvas
        ref={canvas}
        className="scene-canvas"
        aria-label={
          mode === "ar"
            ? "World-tracked Soundbox camera view"
            : "Illustrative 3D Soundbox. Drag to orbit."
        }
      />
      <span ref={label} hidden className="world-label">
        {feature &&
          {
            speaker: "Speaker",
            qr: "Illustrative QR area",
            power: "Power",
            connectivity: "Connectivity",
          }[feature]}
      </span>
    </>
  );
}
