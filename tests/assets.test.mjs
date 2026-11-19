import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, test } from "vitest";

test.each([
  ["hero", "b77fa2e71b1ff584f867d54c52c54f5668fa4f15e5f57ecd7a36e1406bf48e61"],
  ["ar", "45efbc0d64c5e104bdd4f81d0ff44a6ebd5ea21b2056e3424ebd9cbd6ca65a6e"],
])("%s matches the validated source export", (variant, digest) => {
  const file = readFileSync(
    new URL(
      `../public/models/paytm-soundbox-5-${variant}.glb`,
      import.meta.url,
    ),
  );
  expect(createHash("sha256").update(file).digest("hex")).toBe(digest);
  const gltf = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)));
  expect(gltf.nodes.map((n) => n.name)).toEqual(
    expect.arrayContaining([
      "Ground_Anchor",
      "Soundbox_Body",
      "Front_Faceplate",
      "QR_Panel",
      "Speaker_Region",
      "Top_Controls",
      "Status_Indicator",
    ]),
  );
  expect(gltf.images.map((image) => image.mimeType)).toEqual(
    Array(3).fill(variant === "ar" ? "image/webp" : "image/png"),
  );
  if (variant === "ar")
    expect(gltf.extensionsRequired).toContain("EXT_texture_webp");
});
