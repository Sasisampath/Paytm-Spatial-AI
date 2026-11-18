import { writeFile } from "node:fs/promises";
// Node >=22.18 strips TypeScript in this data-only module; no build or credentials.
const { knowledge, sources } = await import(
  "../src/data/paytm-soundbox-knowledge.ts"
);
let text =
  "# Paytm Reality Lab — approved Soundbox knowledge\n\nIndependent concept. All app payments are simulated. Retrieved 18 November 2026. Features differ by model; unknown facts must remain unknown.\n";
for (const item of knowledge) {
  const source = sources[item.source];
  text += `\n## ${item.question}\n${item.answer}\nSource: ${source.title}\n${source.url}\nRetrieved: ${source.retrieved}\n`;
}
await writeFile(new URL("../docs/KNOWLEDGE_BASE.md", import.meta.url), text);
console.log(
  "Exported docs/KNOWLEDGE_BASE.md for explicit attachment in the private ElevenLabs agent dashboard.",
);
