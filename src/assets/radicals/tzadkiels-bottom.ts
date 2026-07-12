import { Button } from "../primitives/button.js";
import { Component } from "../primitives/component.js";
import { VODALUS_ALICEBLUE, VODALUS_SERIF } from "../theme.js";

export class TzadkielsBottom extends Component<HTMLDivElement> {
  journeyTitle: HTMLHeadingElement;
  beginBtn: HTMLButtonElement;

  constructor() {
    const container: HTMLDivElement = document.createElement("div");
    container.style.flex = "1 1 0";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.justifyContent = "flex-start";
    container.style.alignItems = "center";
    container.style.gap = "1rem";
    container.style.padding = "1.25rem 1rem 2rem";

    super(container);

    // heading
    const journeyTitle: HTMLHeadingElement = document.createElement("h1");
    this.journeyTitle = journeyTitle;
    journeyTitle.textContent = "You board the ship, but the journey to Yesod is long and fraught with adversaries.";
    journeyTitle.style.fontFamily = VODALUS_SERIF;
    journeyTitle.style.color = VODALUS_ALICEBLUE;
    journeyTitle.style.margin = "0";
    journeyTitle.style.textAlign = "center";
    journeyTitle.style.fontSize = "2em";
    journeyTitle.style.fontWeight = "inherit";
    journeyTitle.style.lineHeight = "1.25";

    // button
    const beginBtn: HTMLButtonElement = new Button("Begin your journey.").el;
    this.beginBtn = beginBtn;
    beginBtn.style.display = "inline-block";
    beginBtn.style.fontSize = "clamp(1.1rem, 2.8vw, 1.35rem)";
    beginBtn.style.lineHeight = "1.25";
    beginBtn.style.padding = "0.6em 1.2em";
    beginBtn.style.margin = "0.6rem auto 0";
    beginBtn.style.borderRadius = "0";

    container.appendChild(journeyTitle);
    container.appendChild(beginBtn);
    this.mount();
  }
}
