import { button } from "../primitives/button.js";
import { journeyTabs } from "../primitives/journey-tabs.js";
import { root } from "../primitives/root.js";
import { VODALUS_ALICEBLUE, VODALUS_SERIF } from "../theme.js";

const defaultTitles: string[] = [
  "The road to Thrax is long, torturer.",
  "A world beyond the walls.",
  "Thrax and the journey yet to come.",
  "The war and the Autarch."
]

export class journeyBottom extends journeyTabs {
  journeyTitle: HTMLHeadingElement;
  constructor(titles: string[] = defaultTitles) {
    super();
    const container: HTMLDivElement = document.createElement("div");
    const journeyTitle: HTMLHeadingElement = document.createElement("h1");
    const beginBtn: HTMLButtonElement = new button("Begin your journey.").btn;

    // container
    container.style.flex = "1 1 0";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.justifyContent = "flex-start";
    container.style.alignItems = "center";
    container.style.gap = "1rem";
    container.style.padding = "1.25rem 1rem 2rem";

    // heading
    this.journeyTitle = journeyTitle;
    journeyTitle.textContent = titles[0] as string;
    journeyTitle.style.fontFamily = VODALUS_SERIF;
    journeyTitle.style.color = VODALUS_ALICEBLUE;
    journeyTitle.style.margin = "0";
    journeyTitle.style.textAlign = "center";
    journeyTitle.style.fontSize = "2em";
    journeyTitle.style.fontWeight = "inherit";
    journeyTitle.style.lineHeight = "1.25";

    // button
    beginBtn.style.display = "inline-block";
    beginBtn.style.fontSize = "clamp(1.1rem, 2.8vw, 1.35rem)";
    beginBtn.style.lineHeight = "1.25";
    beginBtn.style.padding = "0.6em 1.2em";
    beginBtn.style.margin = "0.6rem auto 0";
    beginBtn.style.borderRadius = "0";


    container.appendChild(journeyTitle);
    container.appendChild(beginBtn);
    container.appendChild(this.tabContainer);
    root().appendChild(container);
  }

  override toggleActive(el: HTMLButtonElement): void {
    super.toggleActive(el);
    this.journeyTitle.textContent = defaultTitles[Number(this.active.id.slice(-1))] as string;
  }
}
