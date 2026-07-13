import { Button } from "../primitives/button.js";
import { JourneyTabs } from "../primitives/journey-tabs.js";
import { Component } from "../primitives/component.js";
import { VODALUS_ALICEBLUE, VODALUS_SERIF } from "../theme.js";

const defaultTitles: string[] = [ // TODO: pull this out to somewhere else
    "The road to Thrax is long, torturer.",
    "A world beyond the walls.",
    "Thrax and the journey yet to come.",
    "The war and the Autarch."
]

export class JourneyBottom extends Component<HTMLDivElement> {
    journeyTitle: HTMLHeadingElement;
    beginBtn: HTMLButtonElement;
    tabs: JourneyTabs;

    constructor(titles: string[] = defaultTitles) {
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
        journeyTitle.textContent = titles[0] as string;
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

        // tabs drive the heading text
        this.tabs = new JourneyTabs(undefined, (active: HTMLButtonElement): void => {
            this.journeyTitle.textContent = defaultTitles[Number(active.id.slice(-1))] as string;
        });

        container.appendChild(journeyTitle);
        container.appendChild(beginBtn);
        container.appendChild(this.tabs.el);
        this.mount();
    }
}
