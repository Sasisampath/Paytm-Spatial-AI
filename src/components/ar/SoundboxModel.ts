import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Feature } from "../../lib/simulation/service";

type Variant = "hero" | "ar";
const bytes = new Map<Variant, Promise<ArrayBuffer>>();
const featureNodes: Record<Feature, string> = {
  qr: "QR_Panel",
  speaker: "Speaker_Region",
  power: "Top_Controls",
  connectivity: "Status_Indicator",
};

function asset(variant: Variant) {
  let result = bytes.get(variant);
  if (!result) {
    result = fetch(`/models/paytm-soundbox-5-${variant}.glb`)
      .then((response) => {
        if (!response.ok) throw Error("Soundbox download failed");
        return response.arrayBuffer();
      })
      .catch((error) => {
        bytes.delete(variant);
        throw error;
      });
    bytes.set(variant, result);
  }
  return result;
}

function release(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((node) => {
    if (!(node instanceof T.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of [node.material].flat()) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof T.Texture) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  root.removeFromParent();
  root.clear();
}

export class SoundboxModel {
  readonly root = new T.Group();
  private active: Feature | null = null;
  private originals = new Map<T.Mesh, T.Material | T.Material[]>();
  private accents: T.Material[] = [];
  private anchors = new Map<Feature, T.Vector3>();

  static async load(variant: Variant) {
    const loader = new GLTFLoader();
    // Embedded WebP goes through img-src blob: under the existing production CSP.
    loader.register((parser) => {
      parser.textureLoader = new T.TextureLoader(parser.options.manager);
      return { name: "SoundboxEmbeddedImages" };
    });
    const data = await asset(variant);
    try {
      const { scene } = await loader.parseAsync(data, "");
      try {
        return new SoundboxModel(scene);
      } catch (error) {
        release(scene);
        throw error;
      }
    } catch (error) {
      bytes.delete(variant);
      throw error;
    }
  }

  private constructor(private scene: T.Group) {
    const ground = scene.getObjectByName("Ground_Anchor");
    const qr = scene.getObjectByName("QR_Panel");
    if (
      !ground ||
      qr?.userData.payable !== false ||
      qr.userData.qr_payload !== "PAYTM REALITY LAB DEMO - NOT A PAYMENT CODE"
    )
      throw Error("Invalid Soundbox asset");
    let texturedQR = false;
    qr.traverse((node) => {
      if (node instanceof T.Mesh)
        texturedQR ||= [node.material].flat().some((m) => m.map?.image);
    });
    if (!texturedQR) throw Error("Soundbox sticker could not load");
    scene.position.sub(ground.getWorldPosition(new T.Vector3()));
    this.root.add(scene);
    for (const [feature, name] of Object.entries(featureNodes)) {
      const node = scene.getObjectByName(name);
      if (!node) throw Error(`Missing ${name}`);
      this.anchors.set(
        feature as Feature,
        new T.Box3().setFromObject(node).getCenter(new T.Vector3()),
      );
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(8,26,48,0.38)");
    gradient.addColorStop(1, "rgba(8,26,48,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const shadow = new T.Mesh(
      new T.PlaneGeometry(0.16, 0.18),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.0001;
    this.root.add(shadow);
  }

  highlight(feature: Feature | null) {
    if (feature === this.active) return;
    this.originals.forEach((material, mesh) => {
      mesh.material = material;
    });
    this.originals.clear();
    this.accents.forEach((material) => material.dispose());
    this.accents = [];
    this.active = feature;
    if (!feature) return;
    this.scene.getObjectByName(featureNodes[feature])!.traverse((node) => {
      if (!(node instanceof T.Mesh)) return;
      this.originals.set(node, node.material);
      const accent = (material: T.MeshStandardMaterial) => {
        const copy = material.clone();
        copy.emissive?.setHex(0x009eca);
        copy.emissiveIntensity = 0.65;
        this.accents.push(copy);
        return copy;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(accent)
        : accent(node.material);
    });
  }
  anchor(feature: Feature) {
    return this.root.localToWorld(this.anchors.get(feature)!.clone());
  }
  dispose() {
    this.highlight(null);
    release(this.root);
  }
}
