import { test, expect } from "@playwright/test";
for (const [width, height] of [
  [320, 568],
  [375, 812],
  [390, 844],
  [428, 926],
]) {
  test(`practice payment and accessible mobile layout ${width}x${height}`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      (window as any).__mediaCalls = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        (window as any).__mediaCalls++;
        throw new DOMException("Not allowed", "NotAllowedError");
      };
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Hear it. See it. Try it." }),
    ).toBeVisible();
    expect(await page.evaluate(() => (window as any).__mediaCalls)).toBe(0);
    expect(
      await page.locator("body").evaluate((e) => e.scrollWidth <= innerWidth),
    ).toBe(true);
    if (browserName === "chromium")
      await page.screenshot({
        path: `docs/screenshots/intro-${width}.png`,
        fullPage: true,
      });
    await page.getByRole("button", { name: "Explore without camera" }).click();
    await expect(
      page.getByRole("button", { name: "Simulate payment", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Place practice device" }).click();
    await expect(
      page.getByRole("button", { name: "Simulate payment", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /Speaker/ }).click();
    await expect(
      page.getByText("A little sound. A lot of certainty."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Simulate payment", exact: true })
      .click();
    await expect(page.getByText("Demo confirmation received")).toBeVisible();
    await expect(
      page.getByText("NO MONEY MOVED", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("₹250.00", { exact: true })).toBeVisible();
    expect(
      await page.locator("body").evaluate((e) => e.scrollWidth <= innerWidth),
    ).toBe(true);
    if (browserName === "chromium")
      await page.screenshot({
        path: `docs/screenshots/practice-${width}.png`,
        fullPage: true,
      });
    await page.getByRole("button", { name: "Try another demo" }).click();
    await page
      .getByRole("spinbutton", { name: "Demo amount in rupees" })
      .fill("0");
    await page
      .getByRole("button", { name: "Simulate payment", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("₹1 to ₹10,000");
    await page.getByRole("button", { name: "Ask your AI guide" }).click();
    await expect(
      page.getByText("Demo mode (voice AI unavailable).", { exact: false }),
    ).toBeVisible();
    expect(await page.evaluate(() => (window as any).__mediaCalls)).toBe(0);
    await page.getByRole("button", { name: "End session" }).click();
    await expect(
      page.getByRole("button", { name: "Experience in AR" }),
    ).toBeVisible();
  });
}
test("AR errors preserve an honest camera-free fallback", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: "Experience in AR" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s try another way." }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Explore without camera" }).click();
  await expect(
    page.getByRole("button", { name: "Place practice device" }),
  ).toBeVisible();
});
test("failed outcome, reset, reduced motion, keyboard access", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without camera" }).click();
  await page.getByRole("button", { name: "Place practice device" }).click();
  await page.getByText("Demo outcome", { exact: true }).click();
  await page.getByLabel("Demo outcome").selectOption("FAILED");
  await page
    .getByRole("button", { name: "Simulate payment", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Demo failed — selected test outcome"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try another demo" }).click();
  await expect(page.getByText("NO MONEY MOVED", { exact: true })).toHaveCount(
    0,
  );
});
test("desktop view renders the product and source-backed answers", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  if (browserName === "chromium")
    await page.screenshot({
      path: "docs/screenshots/intro-desktop.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Explore without camera" }).click();
  await page.getByRole("button", { name: "Place practice device" }).click();
  await page.getByRole("button", { name: /Connectivity/ }).click();
  await expect(page.getByText("Connected for confirmation.")).toBeVisible();
  if (browserName === "chromium")
    await page.screenshot({
      path: "docs/screenshots/practice-desktop.png",
      fullPage: true,
    });
  await page.getByText("Does it use a SIM?", { exact: true }).click();
  await expect(
    page
      .locator(".faq")
      .getByText(
        "The support page describes SIM-based connectivity. Exact network support depends on the device.",
        { exact: true },
      ),
  ).toBeVisible();
});
