import { Wiggly } from "./assets/effects/wiggly.js";

export class text {
  constructor(content: string, id?: string) {
    const el: HTMLDivElement = document.createElement("div");
    el.textContent = content;

    if (id) {
      el.id = id;
    }

    document.body.appendChild(el);
  }
}

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

    document.body.appendChild(el);
  }

  makeWiggly(): void {
    new Wiggly(this.el);
  }
}

export class textInput {
  constructor(placeholder: string, id?: string) {
    const el: HTMLInputElement = document.createElement("input");
    el.placeholder = placeholder;

    if (id) {
      el.id = id;
    }

    // styling
    el.style.textAlign = "center";
    el.style.cursor = "url('/assets/crusors/pink/beam.cur'), text";
    el.style.margin = "0";
    el.style.padding = "6px 14px";
    el.style.font = "inherit";
    el.style.fontWeight = "bold";
    el.style.border = "1px solid aliceblue";
    el.style.boxSizing = "border-box";
    el.style.backgroundColor = "#0f001e";
    el.style.color = "aliceblue";
    el.style.borderRadius = "5px" // clever shennanigans will be needed for this soon....

    document.body.appendChild(el);
  }
}
