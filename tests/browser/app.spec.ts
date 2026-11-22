import { test, expect } from "@playwright/test";
import { withSavedBusiness } from "./returning-business";
test.beforeEach(async ({ page }) => {
  await withSavedBusiness(page);
});

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
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      }),
    );
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
      page.getByRole("heading", { name: "Welcome to your counter." }),
    ).toBeVisible();
    expect(await page.evaluate(() => (window as any).__mediaCalls)).toBe(0);
    expect(
      await page.locator("body").evaluate((e) => e.scrollWidth <= innerWidth),
    ).toBe(true);
    const headerGap = await page
      .locator(".merchant-home-header")
      .evaluate((header) => {
        const [brand, action] = Array.from(header.children);
        return (
          action.getBoundingClientRect().left -
          brand.getBoundingClientRect().right
        );
      });
    expect(headerGap).toBeGreaterThan(0);
    if (browserName === "chromium")
      await page.screenshot({
        path: `docs/screenshots/home-grocery-${width}.png`,
      });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const bottomCard = (await page
      .getByRole("button", { name: "Merchant Loan", exact: true })
      .boundingBox())!;
    const stickyAction = (await page
      .getByRole("button", { name: "Try Soundbox in AR" })
      .boundingBox())!;
    expect(bottomCard.y + bottomCard.height).toBeLessThan(stickyAction.y);
    await page.getByRole("button", { name: "Try Soundbox in AR" }).click();
    await expect(
      page.getByRole("heading", { name: "Hear your payment confirmations." }),
    ).toBeVisible();
    await expect(
      page.getByText("Swipe to rotate", { exact: true }),
    ).toBeVisible();
    if (browserName === "chromium")
      await page.screenshot({
        path: `docs/screenshots/soundbox-details-${width}.png`,
      });
    await page.getByRole("button", { name: "Explore in 3D" }).click();
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
    await expect(
      page.getByRole("button", { name: "Ask your AI guide" }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__mediaCalls)).toBe(0);
    await page.getByRole("button", { name: "End session" }).click();
    await expect(
      page.getByRole("button", { name: "Place in my space" }),
    ).toBeVisible();
  });
}
for (const width of [1280, 1440]) {
  test(`desktop phone frame and camera-free handoff at ${width}`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      (window as any).cameraCalls = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        (window as any).cameraCalls++;
        throw Error("Desktop camera");
      };
    });
    await page.goto("/");
    const homeAction = page.getByRole("button", { name: "Try Soundbox in AR" });
    await expect(homeAction).toBeVisible();
    if (browserName === "chromium" && width === 1440)
      await page.screenshot({ path: "docs/screenshots/home-desktop-1440.png" });
    await page.getByRole("button", { name: "Try Soundbox in AR" }).click();
    await expect(
      page.getByText("Drag to rotate", { exact: false }),
    ).toBeVisible();
    const frame = await page.locator(".desktop").boundingBox();
    expect(frame!.width).toBeLessThan(450);
    expect(Math.abs(frame!.x * 2 + frame!.width - width)).toBeLessThan(2);
    expect(
      await page
        .locator(".phone-screen")
        .evaluate((el) => el.clientWidth === el.scrollWidth),
    ).toBe(true);
    if (browserName === "chromium")
      await page.screenshot({
        path: `docs/screenshots/soundbox-details-desktop-${width}.png`,
      });
    await page.getByRole("button", { name: "Place in my space" }).click();
    await expect(
      page.getByRole("heading", { name: "Open on your phone" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enable camera" }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).cameraCalls)).toBe(0);
  });
}
test("failed outcome, reset, reduced motion, keyboard access", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Try Soundbox in AR" }).click();
  await page.getByRole("button", { name: "Explore in 3D" }).click();
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
  await page.getByRole("button", { name: "Try Soundbox in AR" }).click();
  if (browserName === "chromium")
    await page.screenshot({
      path: "docs/screenshots/intro-desktop.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Explore in 3D" }).click();
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

test("Soundbox details keep the actions clear of a bottom safe area and return to Products", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    }),
  );
  await page.goto("/");
  const openSoundbox = page.getByRole("button", { name: "Try Soundbox in AR" });
  await openSoundbox.click();

  const back = page.getByRole("button", { name: "Back to products" });
  const place = page.getByRole("button", { name: "Place in my space" });
  const practice = page.getByRole("button", { name: "Explore in 3D" });
  for (const control of [back, place, practice]) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  const screen = page.locator(".soundbox-details");
  await screen.evaluate((element) =>
    element.style.setProperty("--soundbox-bottom-inset", "34px"),
  );
  const license = page.getByRole("link", { name: /8th Wall engine/ });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const actions = (await page.locator(".soundbox-actions").boundingBox())!;
  const licenseBox = (await license.boundingBox())!;
  const practiceBox = (await practice.boundingBox())!;
  expect(licenseBox.y + licenseBox.height).toBeLessThanOrEqual(actions.y);
  expect(practiceBox.y + practiceBox.height).toBeLessThanOrEqual(844 - 34);
  await expect(practice).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));

  await place.click();
  await expect(
    page.getByRole("button", { name: "Enable camera" }),
  ).toBeVisible();
  await back.click();
  await expect(openSoundbox).toBeVisible();
  await openSoundbox.click();
  await expect(place).toBeVisible();
});
