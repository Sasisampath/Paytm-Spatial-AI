export const sources = [
  {
    title: "What is a SoundBox? — Paytm for Business Support",
    url: "https://business.paytm.com/support/what-is-a-soundbox",
    retrieved: "2026-11-18",
  },
  {
    title: "How does the SoundBox work? — Paytm for Business Support",
    url: "https://business.paytm.com/support/how-does-the-soundbox-work",
    retrieved: "2026-11-18",
  },
  {
    title: "Paytm Soundbox product range",
    url: "https://business.paytm.com/soundbox",
    retrieved: "2026-11-18",
  },
];
export const knowledge = [
  {
    id: "alerts",
    question: "What does a Soundbox do?",
    answer:
      "It gives audible notifications for successful payments, helping a merchant hear confirmations at the counter.",
    source: 0,
  },
  {
    id: "qr",
    question: "How does it work with a QR?",
    answer:
      "Paytm describes mapping a Soundbox to a merchant’s Paytm QR. Successful payments received through that QR are announced.",
    source: 1,
  },
  {
    id: "amount",
    question: "Does it announce the amount?",
    answer:
      "Yes. Paytm’s support page says it announces the amount of successful payments aloud.",
    source: 1,
  },
  {
    id: "sim",
    question: "Does it use a SIM?",
    answer:
      "The support page describes SIM-based connectivity. Exact network support depends on the device.",
    source: 0,
  },
  {
    id: "network",
    question: "Will it work without a network?",
    answer:
      "The product range advertises 4G connectivity. Offline confirmation is not established by these sources; do not rely on this demo for network guarantees.",
    source: 2,
  },
  {
    id: "portable",
    question: "Who is it designed for?",
    answer:
      "Paytm describes a small, portable speaker for daily payment alerts. This experience illustrates a merchant counter.",
    source: 0,
  },
  {
    id: "battery",
    question: "How long does the battery last?",
    answer:
      "Paytm says battery life depends on the device. This illustrative model does not represent a specific battery specification.",
    source: 2,
  },
  {
    id: "variants",
    question: "Are all Soundboxes the same?",
    answer:
      "No. The product page lists several models, including display, solar and music variants. Features vary by model.",
    source: 2,
  },
  {
    id: "price",
    question: "What does it cost?",
    answer:
      "A current quote for a specific device and plan is not verified in this knowledge base. Check with Paytm for the applicable terms.",
    source: 2,
  },
  {
    id: "settlement",
    question: "Does an alert prove bank settlement?",
    answer:
      "The support page describes payment alerts, not a settlement-time guarantee. This app cannot verify payments or settlement.",
    source: 1,
  },
];
export const featureInfo = {
  speaker: {
    label: "A little sound. A lot of certainty.",
    text: knowledge[2].answer,
    source: 1,
  },
  qr: {
    label: "The connection at your counter.",
    text: knowledge[1].answer,
    source: 1,
  },
  power: {
    label: "Made to move with your day.",
    text: knowledge[6].answer,
    source: 2,
  },
  connectivity: {
    label: "Connected for confirmation.",
    text: knowledge[3].answer,
    source: 0,
  },
};
