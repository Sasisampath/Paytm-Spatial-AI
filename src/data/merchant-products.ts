export const products = {
  soundbox: {
    name: "Soundbox 5.0",
    benefit: "Hear a payment confirmation",
    use: "Listen for a confirmation while your hands are busy at the counter.",
  },
  qr: {
    name: "All-in-One QR",
    benefit: "Scan at the counter",
    use: "Keep a payment QR within reach at checkout. A customer can scan it with their phone while you finish packing or wrap up an appointment.",
  },
  card: {
    name: "Card Machine",
    benefit: "Offer a card checkout",
    use: "A countertop card terminal gives customers another way to pay. Picture handing the terminal across the counter at the end of a sale.",
  },
  loan: {
    name: "Merchant Loan",
    benefit: "Plan for business expenses",
    use: "Consider how stock purchases or new equipment fit your cash flow. Compare repayment terms and costs before deciding whether borrowing suits your business.",
  },
} as const;
export type ProductId = keyof typeof products;
export function recommendedProducts(categoryId: string): ProductId[] {
  return categoryId === "individual-services"
    ? ["qr", "soundbox", "card", "loan"]
    : ["soundbox", "qr", "card", "loan"];
}
