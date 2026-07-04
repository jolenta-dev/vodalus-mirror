import { Stars } from "../effects/stars.js";
import { SunAndLune } from "../effects/sun-and-lune.js";
import { loadFonts } from "./fonts.js";

export class background {
  public NUM_STARS: number = 100;

  constructor(stars?: boolean, sunAndLune?: boolean) {
    const el = ((): HTMLDivElement => {
      if (document.getElementById("main")) {
        const el: HTMLDivElement = document.getElementById("main") as HTMLDivElement;
        return el;
      } else {
        const el: HTMLDivElement = document.createElement("div");
        el.id = "main";
        return el;
      }
    })();

    // styling
    el.style.color = "aliceblue";
    el.style.backgroundColor = "transparent";
    el.style.position = "relative";
    el.style.isolation = "isolate";
    el.style.cursor = "url('/multimedia/cursors/pink/default_pink.cur'), auto";
    el.style.minHeight = "100dvh";
    el.style.boxSizing = "border-box";

    if (stars) {
      new Stars(el, this.NUM_STARS);
    }

    if (sunAndLune) {
      new SunAndLune(el);
    }

    loadFonts();

    document.documentElement.style.backgroundColor = "#1a0033";
    document.body.style.margin = "0";
    document.body.style.backgroundColor = "#1a0033";
    document.body.style.fontFamily = "'Nedar', ui-sans-serif, system-ui, sans-serif";
    document.body.append(el);
  }
}
