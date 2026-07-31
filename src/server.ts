import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// routes for pages --------------------------------------------

app.get("/", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/home.html"));
});

app.get("/guestbook", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/guestbook.html"));
});

app.get("/journey", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/journey.html"));
});

app.get("/atrium", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/atrium.html"));
});

app.get("/tzadkiels", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/tzadkiels.html"));
});

app.get("/about", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/about.html"));
});

app.get("/technical", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/technical.html"));
});

app.get("/admin", (_req, res) => {
    res.sendFile(path.join(rootDir, "./pages/admin.html"));
});

// prod linking (temporary) ------------------------------------

app.get("/api/names", async (_req, res) => { // TODO: this cannot be left in.
    const response = await fetch("https://vodalus.org/api/names");
    res.json(await response.json());
});

// to serve the md-to-text pages -------------------------------

app.get("/api/update-notes", (_req, res) => {
    const dir = path.join(rootDir, "multimedia/markdown/update-notes");
    const files = fs.readdirSync(dir)
        .filter((file) => file.endsWith(".md"))
        .sort()
        .reverse();
    res.json(files);
});

app.get("/api/about", (_req, res) => {
    const dir = path.join(rootDir, "multimedia/markdown/about");
    const pageOrder = [
        "what-is-this.md",
        "what-is-that.md",
        "who-are-you.md",
        "anything-else-to-know-about-you.md",
        "i-have-even-more-questions-now.md",
        "who-made-all-this-cool-art.md",
        "how-can-i-support-vodalus.md",
        "what-is-vodalus-running-off-of.md",
        "this-chat-seems-really-cool-can-i-use-it-for-my-site.md",
        "how-do-i-contact-you.md",
    ];
    const present = new Set(
        fs.readdirSync(dir).filter((file) => file.endsWith(".md"))
    );
    res.json(pageOrder.filter((file) => present.has(file)));
});

app.get("/api/technical", (_req, res) => {
    const dir = path.join(rootDir, "multimedia/markdown/technical");
    const pageOrder = [
        "what-is-this.md",
        "so-whats-the-stack.md",
        "so-whats-the-backend-look-like.md",
        "what-are-the-main-highlights.md",
        "what-other-things-have-you-made.md",
        "how-do-we-get-in-touch.md",
    ];
    const present = new Set(
        fs.readdirSync(dir).filter((file) => file.endsWith(".md"))
    );
    res.json(pageOrder.filter((file) => present.has(file)));
});

// boilerplate express stuff -----------------------------------

app.use(express.static(rootDir));

app.listen(4000, () => console.log("Server running on :4000"));
