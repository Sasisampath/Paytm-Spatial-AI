import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules/@8thwall/engine-binary/dist");
const target = path.join(root, "dist/vendor/8thwall");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let count = 0;
async function verify(directory = "") {
  for (const name of await readdir(path.join(source, directory))) {
    const relative = path.join(directory, name);
    if ((await stat(path.join(source, relative))).isDirectory()) {
      await verify(relative);
      continue;
    }
    const [original, built] = await Promise.all([
      readFile(path.join(source, relative)),
      readFile(path.join(target, relative)),
    ]);
    if (digest(original) !== digest(built))
      throw new Error(`Modified/missing AR runtime artifact: ${relative}`);
    count++;
  }
}
await verify();
for (const name of [
  "8thwall-engine-LICENSE.txt",
  "three-LICENSE.txt",
  "NOTICE.txt",
])
  await stat(path.join(root, "dist/licenses", name));
console.log(`Verified ${count} unchanged XR engine artifacts and notices.`);
