import { injectKeyframeRule } from "./keyframes.js";

export class Twinkle {
  private static ready = false;

  constructor(el: HTMLElement, durationSec?: number) {
    Twinkle.ensureReady();
    const duration = durationSec ?? Math.random() * 20 + 1;
    el.style.animationName = "twinkle";
    el.style.animationIterationCount = "infinite";
    el.style.animationTimingFunction = "ease-in-out";
    el.style.animationDuration = duration + "s";
  }

  private static ensureReady(): void {
    if (Twinkle.ready) return;
    Twinkle.ready = true;

    injectKeyframeRule(`
      @keyframes twinkle {
        0%, 100% {
          opacity: 0.8;
        }
        50% {
          opacity: 0.3;
        }
      }
    `);
  }
}
