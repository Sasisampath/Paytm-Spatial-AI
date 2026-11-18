/** Browser TTS, original demo wording. Never an official Paytm recording. */
export function announceDemo(
  amountPaise: number,
  onEnd: () => void,
): () => void {
  let finished = false;
  const finish = () => {
    if (!finished) {
      finished = true;
      clearTimeout(timeout);
      onEnd();
    }
  };
  const timeout = setTimeout(() => {
    window.speechSynthesis?.cancel();
    finish();
  }, 10000);
  if (!("speechSynthesis" in window)) {
    finish();
    return finish;
  }
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(
    `Demo payment of ${(amountPaise / 100).toFixed(2)} rupees received. This is a simulation.`,
  );
  speech.lang = "en-IN";
  speech.rate = 0.95;
  speech.onend = finish;
  speech.onerror = finish;
  window.speechSynthesis.speak(speech);
  return () => {
    window.speechSynthesis.cancel();
    finish();
  };
}
