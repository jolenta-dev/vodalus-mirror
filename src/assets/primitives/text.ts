import { root } from "./root.js";
import { VODALUS_ALICEBLUE } from "../theme.js";

export class Text {
  constructor(inner: string, id?: string) {
    const el: HTMLDivElement = document.createElement("div");
    el.innerHTML = inner;

    el.style.borderRadius = "15px";
    el.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
    el.style.backgroundColor = "rgba(15, 0, 29, 0.3)";
    el.style.padding = "1em";
    el.style.margin = "1em";

    if (id) {
      el.id = id;
    }

    root().appendChild(el);
  }
}
