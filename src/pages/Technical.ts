import { AboutBlock } from "../radicals.js";
import { Page } from "./Page.js";

export class Technical extends Page {
    constructor() {
        super({
            statusMessageText: "for the technically inclined",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "KIDS SEE HAKU -- KIDS SEE HAKU",
        });

        void fetch("/api/technical")
            .then((response) => response.json())
            .then((files: string[]) => {
                // append page-order first last so early questions sit on top of the heap
                for (const file of files.slice().reverse()) {
                    new AboutBlock(`../../multimedia/markdown/technical/${file}`).mount();
                }
            });
    }
}
