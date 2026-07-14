// @ts-expect-error browser-resolved path to marked esm bundle
import { marked } from "../../../node_modules/marked/lib/marked.esm.js";
import { Text } from './text.js';
import { Component } from "./component.js";
import { VODALUS_SERIF, VODALUS_ALICEBLUE } from '../theme.js';

function headingFromFirstLine(line: string): string {
    return line.replace(/^#+\s*/, "").trim();
}

function bodyAfterFirstLine(markdown: string): string {
    const newlineIndex = markdown.indexOf("\n");
    if (newlineIndex === -1) {
        return "";
    }
    return markdown.slice(newlineIndex + 1);
}

export class UpdateNotes extends Component<HTMLDivElement> {
    constructor(filePath: string) {
        const el: HTMLDivElement = document.createElement("div");
        const title: HTMLHeadingElement = document.createElement("h1");
        const text: Text = new Text();
        el.appendChild(title);
        el.appendChild(text.el);
        el.style.borderRadius = "15px";
        el.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
        el.style.backgroundColor = "rgba(15, 0, 29, 0.3)";
        el.style.padding = "1em";
        el.style.margin = "1em";

        void fetch(filePath)
            .then((response) => response.text())
            .then((markdown) => {
                const firstLine = markdown.split("\n")[0] ?? "";
                title.textContent = headingFromFirstLine(firstLine);
                text.el.innerHTML = marked(bodyAfterFirstLine(markdown)) as string;
            });

        text.el.style.border = "0";

        title.style.fontFamily = VODALUS_SERIF;
        title.style.display = "flex";
        title.style.justifyContent = "center";
        title.style.textDecoration = "underline";

        super(el);
        this.mount();
    }
}
