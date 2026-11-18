import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.mjs";
const app = createApp();
if (process.env.NODE_ENV === "production") {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  app.use(express.static(dist, { index: false }));
  app.get("/{*path}", (req, res) => {
    if (path.extname(req.path)) return res.sendStatus(404);
    res.sendFile(path.join(dist, "index.html"));
  });
}
const port = Number(process.env.PORT || 3001);
app.listen(port, "127.0.0.1", () =>
  console.log(`Reality Lab server: http://127.0.0.1:${port}`),
);
