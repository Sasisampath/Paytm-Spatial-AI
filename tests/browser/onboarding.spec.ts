import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [320, 568],
  [375, 812],
  [390, 844],
  [428, 926],
  [1440, 900],
]) {
  test(`business onboarding layout and confirmation at ${width}x${height}`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height });
    let releaseLogo!: () => void;
    const logo = new Promise<void>((resolve) => {
      releaseLogo = resolve;
    });
    await page.route("**/branding/paytm-for-business.png", async (route) => {
      await logo;
      await route.continue();
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Loading Reality Lab")).toBeVisible();
    releaseLogo();
    const confirm = page.getByRole("button", { name: "Confirm", exact: true });
    await expect(confirm).toBeDisabled();
    const grocery = page.getByRole("button", { name: /Grocery/ });
    await grocery.click();
    await expect(grocery).toHaveAttribute("aria-pressed", "true");
    const rect = await confirm.boundingBox();
    await page
      .getByRole("button", { name: "Clothing & Fashion" })
      .scrollIntoViewIfNeeded();
    expect(await confirm.boundingBox()).toEqual(rect);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(height);
    await grocery.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (browserName === "chromium")
      await page.screenshot({
        path: `docs/screenshots/onboarding-retail-${width}.png`,
      });
    await confirm.click();
    await expect(
      page.getByRole("button", { name: "Explore Soundbox" }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Change business" }).click();
    await expect(grocery).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Individual Services", exact: true })
      .click();
    await expect(confirm).toBeDisabled();
    const salon = page.getByRole("button", { name: "Salon / Beauty Services" });
    await salon.focus();
    await page.keyboard.press("Enter");
    await expect(salon).toHaveAttribute("aria-pressed", "true");
    if (browserName === "chromium" && width === 390)
      await page.screenshot({
        path: "docs/screenshots/onboarding-services-390.png",
      });
    await page
      .getByRole("button", { name: "Back to product experiences" })
      .click();
    await expect(
      page.getByRole("button", { name: "Explore Soundbox" }),
    ).toBeVisible();
  });
}
test("recovers from mismatched saved IDs and searches across categories", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "reality-lab.business",
      '{"categoryId":"retail-shopping","subcategoryId":"salon"}',
    ),
  );
  await page.goto("/");
  const search = page.getByRole("searchbox");
  await search.fill("unmatched");
  await expect(page.getByRole("status")).toHaveText("No matching categories.");
  await search.fill("individual");
  await expect(
    page.getByRole("button", { name: "Salon / Beauty Services" }),
  ).toBeVisible();
  await search.fill("freeLANCe");
  await page.getByRole("button", { name: "Freelance Services" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("reality-lab.business")!),
    ),
  ).toEqual({ categoryId: "individual-services", subcategoryId: "freelance" });
});

test("splash presents supplied branding before startup navigation", async ({page,browserName}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({time: new Date("2026-01-01T00:00:00Z")});
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.goto("/");
  const logo = page.getByRole("img",{name:"Paytm for Business"});
  await expect(logo).toBeVisible();
  await logo.evaluate(image => (image as HTMLImageElement).decode());
  if (browserName === "chromium") await page.screenshot({path:"docs/screenshots/onboarding-splash-390.png"});
  await page.clock.runFor(100);
  await expect(page.getByRole("searchbox")).toBeVisible();
});
