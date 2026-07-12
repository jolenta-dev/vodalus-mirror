import { VODALUS_ALICEBLUE } from "../theme.js";

export class JourneyMidline {
  midline: HTMLDivElement;

  constructor() {
    const midline: HTMLDivElement = document.createElement("div");
    midline.style.flexShrink = "0";
    midline.style.height = "1px";
    midline.style.width = "min(90%, 36rem)";
    midline.style.margin = "0 auto";
    midline.style.background = "currentColor";
    midline.style.opacity = "0.45";
    midline.style.color = VODALUS_ALICEBLUE;

    this.midline = midline;
  }
}
