import { getOrCreateStarfield } from "./starfield.js";
import { Twinkle } from "./twinkle.js";

export class Stars {
  constructor(main: HTMLElement, numStars = 100) {
    const field = getOrCreateStarfield(main);
    for (let i = 0; i < numStars; i++) {
      const star: HTMLDivElement = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 3 + 1;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.position = "fixed";
      star.style.left = Math.random() * 100 + "vw";
      star.style.top = Math.random() * 100 + "vh";
      star.style.background = "white";
      star.style.borderRadius = "50%";
      star.style.opacity = "0.8";
      new Twinkle(star);
      field.appendChild(star);
    }
  }
}
