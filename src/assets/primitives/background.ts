import { Stars } from "../effects/stars.js";
import { SunAndLune } from "../effects/sun-and-lune.js";
import { Component } from "./component.js";
import { loadFonts } from "./fonts.js";
import { VODALUS_PURPLE, VODALUS_ALICEBLUE, VODALUS_SANS, VODALUS_CURSOR_DEFAULT } from "../theme.js";

export class Background extends Component<HTMLDivElement> {
    public NUM_STARS: number = 300;

    constructor(stars?: boolean, sunAndLune?: boolean) {
        const el = ((): HTMLDivElement => {
            if (document.getElementById("main")) {
                const el: HTMLDivElement = document.getElementById("main") as HTMLDivElement;
                return el;
            } else {
                const el: HTMLDivElement = document.createElement("div");
                el.id = "main";
                return el;
            }
        })();

        // styling
        el.style.color = VODALUS_ALICEBLUE;
        el.style.backgroundColor = "transparent";
        el.style.position = "relative";
        el.style.isolation = "isolate";
        el.style.cursor = VODALUS_CURSOR_DEFAULT;
        el.style.minHeight = "100dvh";
        el.style.boxSizing = "border-box";

        super(el);

        if (stars) {
            new Stars(this.el, this.NUM_STARS);
        }

        if (sunAndLune) {
            new SunAndLune(this.el);
        }

        loadFonts();

        document.documentElement.style.backgroundColor = VODALUS_PURPLE;
        document.body.style.margin = "0";
        document.body.style.backgroundColor = VODALUS_PURPLE;
        document.body.style.fontFamily = VODALUS_SANS;
        this.mount(document.body);
    }
}
