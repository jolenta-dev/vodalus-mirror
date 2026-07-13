import { TzadkielsBottom } from "../radicals.js";
import { JourneyTop } from "../radicals.js";
import { root } from "../assets/primitives/root.js";
import { Page } from "./Page.js";

export class Tzadkiels extends Page {
    list: HTMLUListElement;
    counter: HTMLSpanElement;

    constructor() {
        super({
            statusMessageText: "status msg aha",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "HAKUCAST #4728: The disappearance of the fih toy",
        });
        const container: HTMLDivElement = document.createElement("div");
        const top: JourneyTop = new JourneyTop();
        const bottom: TzadkielsBottom = new TzadkielsBottom();
        this.list = top.list;
        this.counter = top.counter;

        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.minHeight = "calc(100vh - 6rem)";
        container.style.maxWidth = "100%";

        container.appendChild(top.el);
        container.appendChild(bottom.el);
        root().appendChild(container);

        bottom.beginBtn.addEventListener("click", (): void => { this.incrementCounter(); this.append("clicked that button \n") }); // TODO : rm this when this gets wired up
    }

    public append(str: string): void {
        const li: HTMLLIElement = document.createElement("li");
        li.textContent = str;
        this.list.appendChild(li);
    }

    public incrementCounter(): void {
        let cur: number = Number(this.counter.textContent);
        cur++;
        this.counter.textContent = cur.toString();
    }
}
