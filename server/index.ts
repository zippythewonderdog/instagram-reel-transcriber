import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.PORT || 3001);

if (process.env.NODE_ENV === "production") {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Instagram transcript app listening at http://127.0.0.1:${port}`);
});
