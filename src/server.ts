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

app.get("/journey", (_req, res) => {
  res.sendFile(path.join(rootDir, "./pages/journey.html"));
})

app.get("/tzadkiels", (_req, res) => {
  res.sendFile(path.join(rootDir, "./pages/tzadkiels.html"));
})

app.get("/api/names", async (_req, res) => { // TODO: this cannot be left in.
  const response = await fetch("https://vodalus.org/api/names");
  res.json(await response.json());
});

app.use(express.static(rootDir));

app.listen(4000, () => console.log("Server running on :4000"));
