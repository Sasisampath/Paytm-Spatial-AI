import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Feature } from "../../lib/simulation/service";
/** Original illustrative geometry, approximately 14 × 19 × 10 cm. No payment QR. */
export class SoundboxModel {
  root = new T.Group();
  private features: Record<Feature, T.Object3D>;
  private glow: T.Mesh;
  constructor() {
    const white = new T.MeshStandardMaterial({
      color: 0xf5f8fa,
      roughness: 0.36,
    });
    const blue = new T.MeshStandardMaterial({
      color: 0x00b9e8,
      roughness: 0.3,
    });
    const dark = new T.MeshStandardMaterial({
      color: 0x102c43,
      roughness: 0.8,
    });
    const mesh = (g: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) => {
      const a = new T.Mesh(g, m);
      a.position.set(x, y, z);
      this.root.add(a);
      return a;
    };
    mesh(new RoundedBoxGeometry(0.14, 0.18, 0.095, 3, 0.012), white, 0, 0.1, 0);
    mesh(
      new RoundedBoxGeometry(0.145, 0.024, 0.1, 2, 0.008),
      blue,
      0,
      0.017,
      0,
    );
    const panel = mesh(
      new RoundedBoxGeometry(0.118, 0.115, 0.009, 2, 0.006),
      dark,
      0,
      0.116,
      0.047,
    );
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#142f45";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SOUNDBOX", 256, 75);
    // Decorative pattern deliberately crossed out; cannot encode a payment destination.
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++)
        if ((x * 7 + y * 3) % 5 < 2) {
          ctx.fillRect(120 + x * 30, 115 + y * 30, 21, 21);
        }
    ctx.fillStyle = "#fff";
    ctx.fillRect(90, 210, 340, 90);
    ctx.fillStyle = "#15344d";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText("DEMO", 256, 273);
    ctx.font = "23px sans-serif";
    ctx.fillText("NOT A PAYMENT QR", 256, 458);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    mesh(
      new T.PlaneGeometry(0.102, 0.102),
      new T.MeshBasicMaterial({ map: texture }),
      0,
      0.117,
      0.052,
    );
    const speaker = new T.Group();
    speaker.position.set(0, 0.04, 0.049);
    this.root.add(speaker);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 12; x++) {
        const hole = new T.Mesh(new T.CircleGeometry(0.0013, 6), dark);
        hole.position.set((x - 5.5) * 0.006, (y - 1) * 0.004, 0.003);
        speaker.add(hole);
      }
    const power = mesh(
      new T.CylinderGeometry(0.006, 0.006, 0.003, 16),
      dark,
      0.071,
      0.08,
      0,
    );
    power.rotation.z = Math.PI / 2;
    const led = mesh(
      new T.SphereGeometry(0.0023, 8, 8),
      new T.MeshBasicMaterial({ color: 0x00b9e8 }),
      0.045,
      0.174,
      0.047,
    );
    this.glow = new T.Mesh(
      new T.TorusGeometry(0.024, 0.0015, 6, 40),
      new T.MeshBasicMaterial({ color: 0x00caf1, depthTest: false }),
    );
    this.root.add(this.glow);
    this.glow.visible = false;
    this.features = { speaker, qr: panel, power, connectivity: led };
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const s = shadowCanvas.getContext("2d")!;
    const gradient = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(8,30,50,.35)");
    gradient.addColorStop(1, "rgba(8,30,50,0)");
    s.fillStyle = gradient;
    s.fillRect(0, 0, 64, 64);
    const shadow = mesh(
      new T.PlaneGeometry(0.26, 0.22),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
      0,
      0.001,
      0,
    );
    shadow.rotation.x = -Math.PI / 2;
  }
  highlight(feature: Feature | null, now: number) {
    this.glow.visible = !!feature;
    if (feature) {
      this.glow.position.copy(this.features[feature].position);
      this.glow.position.z += 0.012;
      this.glow.scale.setScalar(1 + Math.sin(now / 220) * 0.1);
    }
  }
  anchor(feature: Feature) {
    return this.features[feature].getWorldPosition(new T.Vector3());
  }
  dispose() {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m))
            if (v instanceof T.Texture) v.dispose();
          m.dispose();
        }
      }
    });
  }
}
