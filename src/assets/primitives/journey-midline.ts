import { Component } from "./component.js";
import { VODALUS_ALICEBLUE } from "../theme.js";

export class JourneyMidline extends Component<HTMLDivElement> {
  constructor() {
    const el: HTMLDivElement = document.createElement("div");
    el.style.flexShrink = "0";
    el.style.height = "1px";
    el.style.width = "min(90%, 36rem)";
    el.style.margin = "0 auto";
    el.style.background = "currentColor";
    el.style.opacity = "0.45";
    el.style.color = VODALUS_ALICEBLUE;

    super(el);
  }
}
