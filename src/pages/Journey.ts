import { JourneyBottom } from "../radicals.js";
import { JourneyTop } from "../radicals.js";
import { PointerOrbit } from "../effects.js";
import { Background } from "../primitives.js";
import { Sidebar } from "../radicals.js";
import { root } from "../assets/primitives/root.js";

export class Journey {
  list: HTMLUListElement;
  counter: HTMLSpanElement;

  constructor() {
    new PointerOrbit();
    new Background(true, true);
    new Sidebar("status msg aha", "https://vodalus.org/assets/images/haku.png", "White cat beats to study and relax to");
    const container: HTMLDivElement = document.createElement("div");
    const top: JourneyTop = new JourneyTop();
    const bottom: JourneyBottom = new JourneyBottom();
    this.list = top.list;
    this.counter = top.counter;

    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.minHeight = "calc(100vh - 6rem)";
    container.style.maxWidth = "100%";

    container.appendChild(top.container);
    container.appendChild(bottom.container);
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
