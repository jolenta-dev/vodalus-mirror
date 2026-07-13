import { JourneyList } from "../primitives/journey-list.js";
import { JourneyMidline } from "../primitives/journey-midline.js";
import { Component } from "../primitives/component.js";

export class JourneyTop extends Component<HTMLDivElement> {
    list: HTMLUListElement;
    counter: HTMLSpanElement;

    constructor() {
        const container: HTMLDivElement = document.createElement("div");
        container.style.flex = "1 1 0";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.padding = "0 1rem 1rem";

        super(container);

        const journeySubtitle: HTMLHeadingElement = document.createElement("h2");
        const list: HTMLUListElement = new JourneyList().el;
        const midline: HTMLDivElement = new JourneyMidline().el;
        this.list = list;

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

        container.appendChild(journeySubtitle);
        container.appendChild(list);
        container.appendChild(midline);
    }
}
