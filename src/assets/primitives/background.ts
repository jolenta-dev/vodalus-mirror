import { Stars } from "../effects/stars.js";
import { SunAndLune } from "../effects/sun-and-lune.js";

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
    el.style.backgroundColor = "#1a0033"; // TODO: un-magic number all of these
    el.style.position = "relative";
    el.style.isolation = "isolate";
    el.style.cursor = "url('/assets/cursors/pink/default_pink.cur'), auto";
    el.style.minHeight = "100dvh";
    el.style.boxSizing = "border-box";

    if (stars) {
      new Stars(el, this.NUM_STARS);
    }

    if (sunAndLune) {
      new SunAndLune(el);
    }

    document.body.style.margin = "0";
    document.body.append(el);
  }
}
