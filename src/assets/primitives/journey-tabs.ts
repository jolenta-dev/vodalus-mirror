import { Button } from "./button.js";
import { Component } from "./component.js";
import { root } from "./root.js";
import { VODALUS_PURPLE, VODALUS_ALICEBLUE, VODALUS_BUTTON_HOVER } from "../theme.js";

export class JourneyTabs extends Component<HTMLDivElement> {
  public active: HTMLButtonElement;
  private readonly onToggle: ((active: HTMLButtonElement) => void) | undefined;

  constructor(
    tabContent: string[] = ["I — Nessus", "II — Saltus and beyond", "III — Thrax", "IV — Autarchy"], // TODO: pull this array out to somewhere better
    onToggle?: (active: HTMLButtonElement) => void,
  ) {
    const el: HTMLDivElement = document.createElement("div");
    el.style.display = "flex";
    el.style.flexWrap = "wrap";
    el.style.overflow = "hidden";
    el.style.boxSizing = "border-box";
    el.style.width = "100%";
    el.style.maxWidth = "min(90%, 36rem)";
    el.style.marginTop = "1rem";
    el.style.backgroundColor = VODALUS_PURPLE;
    el.style.color = VODALUS_ALICEBLUE;

    super(el);
    this.onToggle = onToggle;

    this.active = new Button("error").el; // i hate this, but nice if it ever truly breaks somehow
    for (let i: number = 0; i < tabContent.length; i++) {
      const btn: Button = new Button(tabContent[i] as string, `journey-tab-btn-${i}`, false, false);
      btn.el.style.fontSize = "1rem";
      btn.el.style.display = "inline-flex";
      btn.el.style.alignItems = "center";
      btn.el.style.justifyContent = "center";
      btn.el.style.gap = "0.35em";
      btn.el.style.maxWidth = "100%";
      btn.el.style.flex = "1 1 0";
      btn.el.style.borderRadius = "0";
      btn.el.style.backgroundColor = VODALUS_PURPLE;
      if (i == 0) {
        root().removeChild(this.active);
        this.active = btn.el;
        this.active.dataset.active = "true";
        this.paint(this.active);
      }
      this.el.appendChild(btn.el);

      btn.el.addEventListener("mouseenter", (): void => this.hover(btn.el));
      btn.el.addEventListener("mouseleave", (): void => this.hover(btn.el));
      btn.el.addEventListener("click", (): void => this.toggleActive(btn.el));
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
    this.onToggle?.(this.active);
  }
}
