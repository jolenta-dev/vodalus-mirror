import { Component } from "./component.js";
import { VODALUS_ALICEBLUE } from "../theme.js";

export class TextInput extends Component<HTMLInputElement> {
    constructor(placeholder: string, id?: string) {
        const el: HTMLInputElement = document.createElement("input");
        el.placeholder = placeholder;

        if (id) {
            el.id = id;
        }

        // styling
        el.style.textAlign = "center";
        el.style.cursor = "url('/multimedia/cursors/pink/beam.cur'), text";
        el.style.margin = "0";
        el.style.padding = "6px 14px";
        el.style.font = "inherit";
        el.style.fontWeight = "bold";
        el.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
        el.style.boxSizing = "border-box";
        el.style.backgroundColor = "#0f001e";
        el.style.color = VODALUS_ALICEBLUE;
        el.style.borderRadius = "5px" // clever shennanigans will be needed for this soon....

        super(el);
        this.mount();
    }
}
