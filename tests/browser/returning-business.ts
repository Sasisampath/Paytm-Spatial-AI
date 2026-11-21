import type { Page } from "@playwright/test";

export async function withSavedBusiness(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "reality-lab.business",
      JSON.stringify({
        categoryId: "retail-shopping",
        subcategoryId: "grocery",
      }),
    );
  });
}
