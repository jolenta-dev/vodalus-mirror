import { Wiggly } from "../effects/wiggly.js";
import { root } from "./root.js";

export class button {
  readonly el: HTMLButtonElement;

  constructor(content: string, id?: string, wiggles?: boolean) {
    const el: HTMLButtonElement = document.createElement("button");
    el.textContent = content;

    if (id) {
      el.id = id;
    }

    // styling
    el.style.textAlign = "center";
    el.style.cursor = "url('/assets/cursors/pink/link.cur'), pointer";
    el.style.font = "inherit";
    el.style.boxSizing = "border-box";
    el.style.padding = "6px 14px";
    el.style.border = "1px solid aliceblue";
    el.style.color = "aliceblue";
    el.style.borderRadius = "5px"; // clever shennanigans will be needed for this soon...
    el.style.backgroundColor = "#a387be";

    this.el = el;

    if (wiggles) {
      this.makeWiggly();
    }

    el.addEventListener("mouseenter", () => this.hover(el));
    el.addEventListener("mouseleave", () => this.hover(el));

    root().appendChild(el);
  }

  makeWiggly(): void {
    new Wiggly(this.el);
  }

  hover(el: HTMLButtonElement): void {
    if (el.style.backgroundColor === "rgb(220, 194, 244)") {
      el.style.backgroundColor = "#a387be";
    } else {
      el.style.backgroundColor = "#dcc2f4";
    }
  }
}
