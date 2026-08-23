// @ts-expect-error browser-resolved path to marked esm bundle
import { marked } from "../../../node_modules/marked/lib/marked.esm.js";
import { Component } from "./component.js";
import { VODALUS_ALICEBLUE } from "../theme.js";

export class TextWrapper extends Component<HTMLDivElement> {
    constructor(id?: string) {
        const el: HTMLDivElement = document.createElement("div");

        el.style.borderRadius = "15px";
        el.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
        el.style.backgroundColor = "rgba(15, 0, 29, 0.3)";
        el.style.padding = "1em";
        el.style.margin = "1em";
        el.style.scrollbarWidth = "none";

        if (id) {
            el.id = id;
        }

        super(el);
    }

    readMarkdown(filePath: string): void {
        void fetch(filePath)
            .then((response) => response.text())
            .then((markdown) => {
                this.el.innerHTML = marked(markdown) as string;
            });
    }
}
