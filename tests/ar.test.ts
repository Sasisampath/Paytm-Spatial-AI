import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3, Quaternion, Group, Scene } from "three";
import { GroundPlacement } from "../src/lib/ar/placement";
import { GroundRaycast } from "../src/lib/ar/ground-raycast";
import type { Hit, Placement } from "../src/lib/ar/types";
function camera() {
  const c = new PerspectiveCamera(60, 1, 0.01, 100);
  c.position.set(0, 1.5, 0);
  c.lookAt(0, 0, -1);
  c.updateMatrixWorld(true);
  return c;
}
const hit: Hit = {
  type: "DETECTED_SURFACE",
  position: { x: 0, y: 0, z: -0.8 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};
const support: Placement = {
  position: { x: 0, y: 0, z: -0.8 },
  normal: { x: 0, y: 1, z: 0 },
  source: "engine-surface",
  updatedAt: 600,
  support: 1,
};
describe("conservative observed support", () => {
  it("requires four fresh, stable observed samples", () => {
    const g = new GroundPlacement(),
      c = camera();
    for (let i = 1; i < 4; i++)
      expect(g.estimate(c, [hit], [], i * 120)).toBeNull();
    expect(g.estimate(c, [hit], [], 480)).toMatchObject({
      source: "engine-surface",
    });
  });
  it.each(["FEATURE_POINT", "WALL", ""])(
    "rejects unsupported hit type %s",
    (type) => {
      const g = new GroundPlacement();
      for (let i = 1; i < 8; i++)
        expect(
          g.estimate(camera(), [{ ...hit, type }], [], i * 120),
        ).toBeNull();
    },
  );
  it("rejects wall normals, stale samples, distant hits and unstable positions", () => {
    const q = new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      Math.PI / 2,
    );
    for (const h of [
      { ...hit, rotation: q },
      { ...hit, position: { x: 0, y: 0, z: -10 } },
    ]) {
      const g = new GroundPlacement();
      for (let i = 1; i < 8; i++)
        expect(g.estimate(camera(), [h], [], i * 120)).toBeNull();
    }
    const g = new GroundPlacement();
    for (let i = 1; i < 8; i++)
      expect(g.estimate(camera(), [hit], [], i * 500)).toBeNull();
  });
  it("accepts dense horizontal support and rejects collinear points", () => {
    const c = camera();
    const points = Array.from({ length: 49 }, (_, i) => ({
      confidence: 1,
      position: {
        x: ((i % 7) - 3) * 0.2,
        y: 0,
        z: -0.8 + (Math.floor(i / 7) - 3) * 0.2,
      },
    }));
    const g = new GroundPlacement();
    let p;
    for (let i = 1; i <= 5; i++) p = g.estimate(c, [], points, i * 120);
    expect(p).toMatchObject({ source: "slam-point-cloud" });
    g.reset();
    for (let i = 1; i <= 5; i++)
      expect(
        g.estimate(
          c,
          [],
          points.map((p) => ({ ...p, position: { ...p.position, x: 0 } })),
          i * 120,
        ),
      ).toBeNull();
  });
  it("rejects stale and extrapolated support in final raycast", () => {
    const ray = new GroundRaycast();
    expect(ray.cast(camera(), support, 1000)).toBeNull();
    expect(
      ray.cast(
        camera(),
        { ...support, position: { x: 5, y: 0, z: -0.8 } },
        600,
      ),
    ).toBeNull();
    expect(ray.cast(camera(), support, 600)).not.toBeNull();
  });
  it("places a child of the world scene with no camera-pose coupling", () => {
    const c = camera(),
      scene = new Scene(),
      root = new Group();
    const pose = new GroundRaycast().cast(c, support, 600)!;
    root.position.copy(pose.position);
    root.quaternion.copy(pose.rotation);
    scene.add(root);
    const before = root.getWorldPosition(new Vector3()).clone();
    c.position.set(3, 2, 1);
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld(true);
    expect(root.getWorldPosition(new Vector3()).distanceTo(before)).toBe(0);
    expect(root.parent).toBe(scene);
  });
});
