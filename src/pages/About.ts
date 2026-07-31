import { AboutBlock } from "../radicals.js";
import { Page } from "./Page.js";

export class About extends Page {
    constructor() {
        super({
            statusMessageText: "i'm running out of funny things to put on these",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "Laser -- White Cat",
        });

        void fetch("/api/about")
            .then((response) => response.json())
            .then((files: string[]) => {
                // append page-order first last so early questions sit on top of the heap
                for (const file of files.slice().reverse()) {
                    new AboutBlock(`../../multimedia/markdown/about/${file}`).mount();
                }
            });
    }
}
