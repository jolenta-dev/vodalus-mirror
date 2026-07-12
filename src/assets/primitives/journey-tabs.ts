import { button } from "./button.js";
import { root } from "./root.js";
import { VODALUS_PURPLE, VODALUS_ALICEBLUE, VODALUS_BUTTON_HOVER } from "../theme.js";

export class journeyTabs {
  readonly tabContainer: HTMLDivElement;
  public active: HTMLButtonElement;

  constructor(tabContent: string[] = ["I — Nessus", "II — Saltus and beyond", "III — Thrax", "IV — Autarchy"]) {
    this.tabContainer = document.createElement("div");
    this.tabContainer.style.display = "flex";
    this.tabContainer.style.flexWrap = "wrap";
    this.tabContainer.style.overflow = "hidden";
    this.tabContainer.style.boxSizing = "border-box";
    this.tabContainer.style.width = "100%";
    this.tabContainer.style.maxWidth = "min(90%, 36rem)";
    this.tabContainer.style.marginTop = "1rem";
    this.tabContainer.style.backgroundColor = VODALUS_PURPLE;
    this.tabContainer.style.color = VODALUS_ALICEBLUE;

    this.active = new button("error").btn; // i hate this, but nice if it ever truly breaks somehow
    for (let i: number = 0; i < tabContent.length; i++) {
      const btn: button = new button(tabContent[i] as string, `journey-tab-btn-${i}`, false, false);
      if (i == 0) {
        root().removeChild(this.active);
        this.active = btn.btn;
      }
      btn.btn.style.fontSize = "1rem";
      btn.btn.style.display = "inline-flex";
      btn.btn.style.alignItems = "center";
      btn.btn.style.justifyContent = "center";
      btn.btn.style.gap = "0.35em";
      btn.btn.style.maxWidth = "100%";
      btn.btn.style.flex = "1 1 0";
      btn.btn.style.borderRadius = "0";
      btn.btn.style.backgroundColor = VODALUS_PURPLE;
      this.tabContainer.appendChild(btn.btn);

      btn.btn.addEventListener("mouseenter", (): void => this.hover(btn.btn));
      btn.btn.addEventListener("mouseleave", (): void => this.hover(btn.btn));
      btn.btn.addEventListener("click", (): void => this.toggleActive(btn.btn));
    }
  }

  // resolves the resting/hover color from the button's active + hover state
  paint(el: HTMLButtonElement): void {
    const active: boolean = el.dataset.active === "true";
    const hover: boolean = el.dataset.hover === "true";
    if (active) {
      el.style.backgroundColor = hover ? "#83a69d" : "#4b6961"; // active hover / active
    } else {
      el.style.backgroundColor = hover ? VODALUS_BUTTON_HOVER : VODALUS_PURPLE; // default hover / default
    }
  }

  hover(el: HTMLButtonElement): void { // this should prob be an override
    el.dataset.hover = el.dataset.hover === "true" ? "false" : "true";
    this.paint(el);
  }

  toggleActive(el: HTMLButtonElement): void {
    if (el == this.active) {
      el.dataset.active = el.dataset.active === "true" ? "false" : "true";
      this.paint(el);
    } else {
      this.active.style.backgroundColor = VODALUS_PURPLE;
      this.active.dataset.active = "false";
      this.active = el;
      el.dataset.active = "true";
      this.paint(el);
    }
  }
}
