import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "home.html"));
});

app.use(express.static(rootDir));

app.listen(3000, () => console.log("Server running on :3000"));
