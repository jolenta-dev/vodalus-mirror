import { Component } from "../primitives/component.js";
import {
    VODALUS_ALICEBLUE,
    VODALUS_BUTTON,
    VODALUS_BUTTON_HOVER,
    VODALUS_CURSOR_LINK,
    VODALUS_SANS,
} from "../theme.js";

export class BotanicUpgradeButton extends Component<HTMLButtonElement> {
    readonly levelSpan: HTMLSpanElement;
    readonly costSpan: HTMLSpanElement;
    readonly currentSpan: HTMLSpanElement;

    constructor(id: string, description: string) {
        const el: HTMLButtonElement = document.createElement("button");
        el.type = "button";
        el.id = id;

        el.style.width = "100%";
        el.style.padding = "20px";
        el.style.margin = "0.2em";
        el.style.borderRadius = "50px";
        el.style.border = `2px solid ${VODALUS_ALICEBLUE}`;
        el.style.backgroundColor = VODALUS_BUTTON;
        el.style.color = VODALUS_ALICEBLUE;
        el.style.fontSize = "2em";
        el.style.fontFamily = VODALUS_SANS;
        el.style.cursor = VODALUS_CURSOR_LINK;
        el.style.boxSizing = "border-box";
        el.style.textAlign = "left";

        const levelSpan = document.createElement("span");
        const costSpan = document.createElement("span");
        const currentSpan = document.createElement("span");

        levelSpan.textContent = "1";

        el.append("LVL. ", levelSpan, ` ${description} - `, costSpan, " (current: ", currentSpan, ")");

        el.addEventListener("mouseenter", (): void => {
            el.style.backgroundColor = VODALUS_BUTTON_HOVER;
        });
        el.addEventListener("mouseleave", (): void => {
            el.style.backgroundColor = VODALUS_BUTTON;
        });

        super(el);
        this.levelSpan = levelSpan;
        this.costSpan = costSpan;
        this.currentSpan = currentSpan;
    }

    setAffordable(affordable: boolean): void {
        this.el.style.opacity = affordable ? "100%" : "30%";
    }
}
