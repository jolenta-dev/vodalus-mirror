import { PointerOrbit } from "../effects.js";
import { Background } from "../primitives.js";
import { Sidebar } from "../radicals.js";

export interface PageOptions {
    stars?: boolean;
    sunAndLune?: boolean;
}

export class Page {
    PointerOrbit: PointerOrbit | null = null;

    constructor(options: PageOptions = {}) {
        const {
            stars = true,
            sunAndLune = true,
        } = options;

        const isEmbed =
            new URLSearchParams(location.search).get("embed") === "1" ||
            document.documentElement.classList.contains("page-embed");
        if (isEmbed) {
            document.documentElement.classList.add("page-embed");
        }

        if (!isEmbed) {
            this.PointerOrbit = new PointerOrbit();
        }
        new Background(stars, sunAndLune);
        if (!isEmbed) {
            new Sidebar();
        }
    }
}
