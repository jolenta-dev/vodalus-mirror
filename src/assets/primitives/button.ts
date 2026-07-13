import { Wiggly } from "../effects/wiggly.js";
import { Component } from "./component.js";
import { VODALUS_ALICEBLUE, VODALUS_BUTTON, VODALUS_BUTTON_HOVER, VODALUS_CURSOR_LINK } from "../theme.js";

export class Button extends Component<HTMLButtonElement> {
    constructor(content: string, id?: string, wiggles?: boolean, hasHover: boolean = true) {
        const el: HTMLButtonElement = document.createElement("button");
        el.textContent = content;

        if (id) {
            el.id = id;
        }

        // styling
        el.style.textAlign = "center";
        el.style.cursor = VODALUS_CURSOR_LINK;
        el.style.font = "inherit";
        el.style.boxSizing = "border-box";
        el.style.padding = "6px 14px";
        el.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
        el.style.color = VODALUS_ALICEBLUE;
        el.style.borderRadius = "5px"; // clever shennanigans will be needed for this soon...
        el.style.backgroundColor = VODALUS_BUTTON;

        super(el);

        if (wiggles) {
            this.makeWiggly();
        }

        if (hasHover) {
            el.addEventListener("mouseenter", () => this.hover(el));
            el.addEventListener("mouseleave", () => this.hover(el));
        }

        this.mount();
    }

    makeWiggly(): void {
        new Wiggly(this.el);
    }

    hover(el: HTMLButtonElement): void {
        if (el.style.backgroundColor === "rgb(112, 141, 133)") {
            el.style.backgroundColor = VODALUS_BUTTON;
            el.style.color = VODALUS_ALICEBLUE;
        } else {
            el.style.backgroundColor = VODALUS_BUTTON_HOVER;
            el.style.color = "black";
        }
    }
}
