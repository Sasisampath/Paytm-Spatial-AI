import { test, expect } from "@playwright/test";
import { withSavedBusiness } from "./returning-business";
test.beforeEach(async ({ page }) => {
  await withSavedBusiness(page);
});

import { fileURLToPath } from "node:url";
for (const variant of ["ar", "hero"] as const) {
  test(`${variant} has decoded textures, scale, anchors, highlights and disposal`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.addScriptTag({
      path: fileURLToPath(import.meta.resolve("jsqr")),
    });
    const result = await page.evaluate(async (variant) => {
      const { SoundboxModel } = await import(
        /* @vite-ignore */ "/src/components/ar/SoundboxModel.ts"
      );
      const model = await SoundboxModel.load(variant);
      // Use the same Three module instance as the production asset.
      const root = model.root;
      const scene = root.children[0];
      const box = new (
        await import(/* @vite-ignore */ "/node_modules/.vite/deps/three.js")
      ).Box3().setFromObject(scene);
      const dimensions = box.getSize(scene.position.clone()).toArray();
      const qr = scene.getObjectByName("QR_Panel");
      const ground = scene.getObjectByName("Ground_Anchor");
      const groundPosition = ground
        .getWorldPosition(scene.position.clone())
        .toArray();
      let maps = new Set<any>(),
        materials = new Set<any>(),
        geometries = new Set<any>();
      root.traverse((node: any) => {
        if (!node.isMesh) return;
        geometries.add(node.geometry);
        for (const m of [node.material].flat()) {
          materials.add(m);
          for (const value of Object.values(m) as any[])
            if (value?.isTexture) maps.add(value);
        }
      });
      let disposed = 0;
      for (const resource of [...maps, ...materials, ...geometries])
        resource.addEventListener("dispose", () => disposed++);
      const highlights = Object.entries({
        qr: "QR_Panel",
        speaker: "Speaker_Region",
        power: "Top_Controls",
        connectivity: "Status_Indicator",
      }).every(([feature, name]) => {
        const mesh = scene
          .getObjectByName(name)
          .getObjectByProperty("isMesh", true);
        const original = mesh.material;
        model.highlight(feature);
        const visible =
          mesh.material !== original &&
          model.anchor(feature).toArray().every(Number.isFinite);
        model.highlight(null);
        return visible && mesh.material === original;
      });
      const mappedTextures = [...maps].filter(
        (t) => t.image?.naturalWidth > 0,
      ).length;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const context = canvas.getContext("2d")!;
      const qrMesh = qr.getObjectByProperty("isMesh", true);
      context.drawImage(qrMesh.material.map.image, 0, 0, 512, 512);
      const decoded = (window as any).jsQR(
        context.getImageData(0, 0, 512, 512).data,
        512,
        512,
      )?.data;
      const qrFront = model.anchor("qr").z > 0;
      model.dispose();
      return {
        decoded,
        dimensions,
        groundPosition,
        qrFront,
        minY: box.min.y,
        metadata: qr.userData,
        mappedTextures,
        highlights,
        disposed,
        resources: maps.size + materials.size + geometries.size,
      };
    }, variant);
    result.dimensions.forEach((value: number, i: number) =>
      expect(value).toBeCloseTo([0.0944, 0.091, 0.1144][i], 3),
    );
    expect(result.minY).toBeCloseTo(0, 4);
    expect(result.groundPosition).toEqual([0, 0, 0]);
    expect(result.metadata).toMatchObject({
      payable: false,
      qr_payload: "PAYTM REALITY LAB DEMO - NOT A PAYMENT CODE",
    });
    expect(result.decoded).toBe("PAYTM REALITY LAB DEMO - NOT A PAYMENT CODE");
    expect(result.qrFront && result.highlights).toBe(true);
    expect(result.mappedTextures).toBeGreaterThanOrEqual(3);
    expect(result.disposed).toBe(result.resources);
  });
}
test("hero fetch failure retries and product navigation shares one download", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/models/*-hero.glb", async (route) => {
    if (++requests === 1)
      await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Retry viewer" }).click();
  await expect(
    page.getByText("Drag to rotate", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore Soundbox" }).click();
  await page.getByRole("button", { name: "Explore without camera" }).click();
  await expect(
    page.getByRole("button", { name: "Place practice device" }),
  ).toBeEnabled();
  expect(requests).toBe(2);
});
