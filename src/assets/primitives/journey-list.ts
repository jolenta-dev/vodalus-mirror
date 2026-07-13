import { Component } from "./component.js";

export class JourneyList extends Component<HTMLUListElement> {
    constructor() {
        const el: HTMLUListElement = document.createElement("ul");
        el.style.listStyle = "none";
        el.style.padding = "0 0.25rem 0.25rem";
        el.style.width = "90%";
        el.style.maxWidth = "36rem";
        el.style.textAlign = "center";
        el.style.flex = "1 1 0";
        el.style.minHeight = "0";
        el.style.overflowX = "hidden";
        el.style.overflowY = "auto";
        el.style.overscrollBehavior = "contain";
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.justifyContent = "flex-end";

        super(el);
    }

    public append(str: string): void {
        const li: HTMLLIElement = document.createElement("li");
        li.textContent = str;
        li.style.margin = "0.35em 0";
        li.style.flexShrink = "0";
        li.style.overflowWrap = "break-word";
        li.style.wordBreak = "break-word";

        this.el.appendChild(li);
    }
}
