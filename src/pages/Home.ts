import { Page } from "./Page.js";
import { TextFromMD, TextWrapper } from "../primitives.js";
import { root } from "../assets/primitives/root.js";

export class Home extends Page {
    constructor() {
        super();

        const container: HTMLDivElement = document.createElement("div");

        const main: TextFromMD = new TextFromMD("../../multimedia/markdown/home-header.md");
        main.el.style.textAlign = "center";

        container.appendChild(main.el);

        const notesWrapper: HTMLDivElement = new TextWrapper().el;
        notesWrapper.style.display = "flex";
        notesWrapper.style.flexDirection = "column";
        notesWrapper.style.float = "left";
        notesWrapper.style.width = "60%";
        notesWrapper.style.maxHeight = "90vh";
        notesWrapper.style.overflow = "scroll";

        void fetch("/api/update-notes")
            .then((response) => response.json())
            .then((files: string[]) => {
                for (const file of files) {
                    const updateNotes = new TextFromMD(
                        `../../multimedia/markdown/update-notes/${file}`
                    );
                    notesWrapper.appendChild(updateNotes.el);
                }
            });

        container.appendChild(notesWrapper);

        root().appendChild(container);
    }
}
