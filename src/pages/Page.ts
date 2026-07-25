import { PointerOrbit } from "../effects.js";
import { Background } from "../primitives.js";
import { Sidebar } from "../radicals.js";

export interface PageOptions {
    stars?: boolean;
    sunAndLune?: boolean;
    statusMessageText?: string;
    nowPlayingImage?: string;
    nowPlayingAttribution?: string;
}

export class Page {
    PointerOrbit: PointerOrbit;

    constructor(options: PageOptions = {}) {
        const {
            stars = true,
            sunAndLune = true,
            statusMessageText,
            nowPlayingImage,
            nowPlayingAttribution,
        } = options;

        this.PointerOrbit = new PointerOrbit();
        new Background(stars, sunAndLune);
        new Sidebar(statusMessageText, nowPlayingImage, nowPlayingAttribution);
    }
}
