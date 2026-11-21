import { expect, test } from "@playwright/test";
test("salon product recommendations, previews and completed practice journey", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Individual Services", exact: true })
    .click();
  await page.getByRole("button", { name: "Salon / Beauty Services" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  const cards = page.locator(".merchant-grid button");
  expect(
    await cards.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("aria-label")),
    ),
  ).toEqual(["All-in-One QR", "Soundbox 5.0", "Card Machine", "Merchant Loan"]);
  await cards
    .locator("img")
    .evaluateAll(async (images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
  for (const name of ["All-in-One QR", "Card Machine", "Merchant Loan"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Experience in AR" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "← Home" }).click();
  }
  await page.getByRole("button", { name: "Soundbox 5.0", exact: true }).click();
  await expect(
    page.getByText("Drag to rotate", { exact: false }),
  ).toBeVisible();
  const canvas = page.locator(".product-stage canvas");
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.getByRole("button", { name: "Explore without camera" }).click();
  await page.getByRole("button", { name: "Place practice device" }).click();
  if (browserName === "chromium")
    await page.screenshot({ path: "docs/screenshots/demo-tabletop.png" });
  await page
    .getByRole("button", { name: "Simulate payment", exact: true })
    .click();
  await expect(page.getByText("Demo confirmation received")).toBeVisible();
  await page
    .getByRole("button", { name: "View summary" })
    .scrollIntoViewIfNeeded();
  if (browserName === "chromium")
    await page.screenshot({ path: "docs/screenshots/demo-confirmation.png" });
  await page.getByRole("button", { name: "View summary" }).click();
  await expect(
    page.getByRole("heading", { name: "Demo complete" }),
  ).toBeVisible();
  if (browserName === "chromium")
    await page.screenshot({ path: "docs/screenshots/demo-completion.png" });
  await page.getByRole("button", { name: "Explore another product" }).click();
  await expect(cards).toHaveCount(4);
  expect(errors).toEqual([]);
});
