import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "./pages/home.html"));
});

app.get("/guestbook", (_req, res) => {
  res.sendFile(path.join(rootDir, "./pages/guestbook.html"));
});

app.use(express.static(rootDir));

app.listen(4000, () => console.log("Server running on :4000"));
