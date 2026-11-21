import { expect, test } from "@playwright/test";
import { businessCategories } from "../../src/data/business-categories";

test("the nine mapped business icons decode as transparent PNGs", async ({ page }) => {
  const [retail, services] = businessCategories;
  expect(retail.subcategories.map(item => item.id)).toEqual([
    "grocery", "pan-shop", "meat-shop", "hardware", "cosmetics", "electrical", "clothing",
  ]);
  expect(services.subcategories.map(item => item.id)).toEqual(["salon", "freelance"]);
  await page.goto("/assets/subcategories/subcategory-grocery.png");
  for (const { id, iconSrc } of [...retail.subcategories, ...services.subcategories]) {
    expect(iconSrc).toBe(`/assets/subcategories/subcategory-${id}.png`);
    const dimensions = await page.evaluate(async src => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const context = document.createElement("canvas").getContext("2d")!;
      context.drawImage(img, 0, 0);
      return [img.naturalWidth, img.naturalHeight, context.getImageData(0, 0, 1, 1).data[3]];
    }, iconSrc);
    expect(dimensions).toEqual([256, 256, 0]);
  }
});
