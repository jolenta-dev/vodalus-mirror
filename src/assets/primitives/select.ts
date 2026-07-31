import { Component } from "./component.js";
import { VODALUS_ALICEBLUE } from "../theme.js";

export class Select extends Component<HTMLSelectElement> {
    constructor(id?: string) {
        const el: HTMLSelectElement = document.createElement("select");

        if (id) {
            el.id = id;
        }

        // styling
        el.style.backgroundColor = "#0f001e";
        el.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
        el.style.color = VODALUS_ALICEBLUE;
        el.style.padding = "6px 14px";
        el.style.font = "inherit";
        el.style.borderRadius = "5px";

        super(el);
        this.mount();
    }

    addOption(text: string, value?: string): void {
        const option: HTMLOptionElement = document.createElement("option");
        option.textContent = text;
        if (value !== undefined) {
            option.value = value;
        }
        this.el.options.add(option);
    }
}
