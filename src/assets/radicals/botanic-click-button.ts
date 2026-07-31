import { Component } from "../primitives/component.js";
import { injectKeyframeRule } from "../effects/keyframes.js";
import {
    VODALUS_ALICEBLUE,
    VODALUS_BUTTON,
    VODALUS_BUTTON_HOVER,
    VODALUS_CURSOR_LINK,
    VODALUS_SANS,
} from "../theme.js";

let keyframesReady = false;

function ensureKeyframes(): void {
    if (keyframesReady) return;
    keyframesReady = true;
    injectKeyframeRule(`
        @keyframes botanicHoverAnim {
            from { scale: 1; }
            to { scale: 0.9; }
        }
    `);
    injectKeyframeRule(`
        @keyframes botanicClickAnim {
            from { scale: 0.9; }
            to { scale: 1; }
        }
    `);
    injectKeyframeRule(`
        @keyframes botanicClickAdditionAnim {
            from { opacity: 1; }
            to {
                transform: translateY(-100vh);
                opacity: 0;
            }
        }
    `);
}

export class BotanicClickButton extends Component<HTMLButtonElement> {
    constructor(label = "click me!") {
        ensureKeyframes();

        const el: HTMLButtonElement = document.createElement("button");
        el.type = "button";
        el.id = "botanic-click-btn";
        el.textContent = label;

        el.style.width = "300px";
        el.style.height = "300px";
        el.style.borderRadius = "50%";
        el.style.margin = "5em";
        el.style.marginTop = "2em";
        el.style.backgroundColor = VODALUS_BUTTON;
        el.style.color = VODALUS_ALICEBLUE;
        el.style.border = `2px solid ${VODALUS_ALICEBLUE}`;
        el.style.fontSize = "2em";
        el.style.fontFamily = VODALUS_SANS;
        el.style.cursor = VODALUS_CURSOR_LINK;
        el.style.boxSizing = "border-box";

        el.addEventListener("mouseenter", (): void => {
            el.style.backgroundColor = VODALUS_BUTTON_HOVER;
            el.style.animation = "botanicHoverAnim 0.5s forwards";
        });
        el.addEventListener("mouseleave", (): void => {
            el.style.backgroundColor = VODALUS_BUTTON;
            el.style.animation = "";
        });
        el.addEventListener("animationend", (): void => {
            if (el.style.animation.includes("botanicClickAnim")) {
                el.style.animation = "";
            }
        });

        super(el);
    }

    playClickAnim(): void {
        this.el.style.animation = "none";
        void this.el.offsetHeight;
        this.el.style.animation = "botanicClickAnim 0.3s forwards";
    }
}
