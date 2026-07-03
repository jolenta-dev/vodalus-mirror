import { root } from "./root.js";

export class text {
  constructor(content: string, id?: string) {
    const el: HTMLDivElement = document.createElement("div");
    el.textContent = content;

    if (id) {
      el.id = id;
    }

    root().appendChild(el);
  }
}
