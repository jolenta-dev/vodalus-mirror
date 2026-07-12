import { JourneyList } from "../primitives/journey-list.js";
import { JourneyMidline } from "../primitives/journey-midline.js";

export class JourneyTop {
  list: HTMLUListElement;
  container: HTMLDivElement;
  counter: HTMLSpanElement;

  constructor() {
    const container: HTMLDivElement = document.createElement("div");
    const journeySubtitle: HTMLHeadingElement = document.createElement("h2");
    const list: HTMLUListElement = new JourneyList().list;
    const midline: HTMLDivElement = new JourneyMidline().midline;
    this.list = list;
    this.container = container;

    // setup for the events counter
    journeySubtitle.id = "journey-subtitle";
    journeySubtitle.textContent = "Journey Attempts: ";
    journeySubtitle.style.margin = "0";
    journeySubtitle.style.width = "90%";
    journeySubtitle.style.maxWidth = "36rem";
    journeySubtitle.style.textAlign = "center";
    journeySubtitle.style.fontSize = "clamp(0.95rem, 2.8vw, 1.1rem)";
    journeySubtitle.style.fontWeight = "normal";

    const attemptCount: HTMLSpanElement = document.createElement("span");
    this.counter = attemptCount;
    attemptCount.id = "journey-attempts";
    attemptCount.textContent = "1";
    journeySubtitle.appendChild(attemptCount);

    container.style.flex = "1 1 0";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.padding = "0 1rem 1rem";

    container.appendChild(journeySubtitle);
    container.appendChild(list);
    container.appendChild(midline);
  }


}
