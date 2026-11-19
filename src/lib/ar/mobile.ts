// A coarse pointer or a narrow window alone can also describe a laptop.
export function mobileDevice() {
  const nav = navigator as Navigator & { userAgentData?: { mobile: boolean } };
  return (
    nav.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod/i.test(nav.userAgent) ||
    (/Mac/.test(nav.platform) && nav.maxTouchPoints > 1)
  );
}
