import { root } from "../primitives/root.js"
import { injectKeyframeRule } from "./keyframes.js"

export class PointerOrbit {
    private active: boolean = true;
    private orbitAnimationFrame: number = 0;
    private trailAnimationFrame: number = 0;
    private onDocMouseMove: ((e: MouseEvent) => void) | null = null;
    private onTrailMouseMove: ((e: MouseEvent) => void) | null = null;

    constructor() {
        injectKeyframeRule(`@keyframes orbitElementAnim { 
      from { 
        left: -12.5px;
        top: -6px; z-index:
        1; transform: scale(0.75);
      }
      25% {
        transform: scale(1.0);
      }
      50% {
        left: 32px;
        top: 16px;
        z-index: 1;
        transform: scale(0.75);
      }
      55% {
        z-index: -1;
      }
      75% {
        transform: scale(0.5);
      }
      90% {
        z-index: -1;
      }
      to {
        left: -12.5px;
        top: -6px;
        z-index: 1;
        transform: scale(0.75);
      }
    }`);
        injectKeyframeRule(`@keyframes orbitElementAnim2 { 
        from {
          left: -32px;
          top: 16px;
          z-index: 1;
          transform: scale(0.75);
        }
        5% {
          z-index: -1;
        }
        25% {
          transform: scale(0.5);
        }
        40% {
          z-index: -1;
        }
        50% {
          left: 12.5px;
          top: -6px;
          z-index: 1;
          transform: scale(0.75);
        }
        75% {
          transform: scale(1.0);
        }
        to {
          left: -32px;
          top: 16px;
          z-index: 1;
          transform: scale(0.75);
        }
      }`);

        const pOrbitRoot: HTMLDivElement = document.createElement("div");
        pOrbitRoot.id = "pointer-orbit-root";
        pOrbitRoot.ariaHidden = "true";
        pOrbitRoot.style.position = "fixed";
        pOrbitRoot.style.inset = "0";
        pOrbitRoot.style.pointerEvents = "none";
        pOrbitRoot.style.zIndex = "99999";
        pOrbitRoot.style.overflow = "hidden";

        root().appendChild(pOrbitRoot);

        const orbiter1 = document.createElement("div");
        orbiter1.id = "orbiter1";
        orbiter1.style.animationName = "orbitElementAnim";
        orbiter1.style.animationDuration = "4s";
        orbiter1.style.animationIterationCount = "infinite";
        orbiter1.style.animationTimingFunction = "ease-in-out";
        orbiter1.textContent = "✦";
        orbiter1.style.color = "lightpink";
        orbiter1.style.cursor = "pointer";
        orbiter1.style.position = "absolute";
        orbiter1.style.top = "-6px";
        orbiter1.style.left = "-12.5px";

        pOrbitRoot.appendChild(orbiter1);

        const orbiter2 = document.createElement("div");
        orbiter2.id = "orbiter2";
        orbiter2.style.animationName = "orbitElementAnim2";
        orbiter2.style.animationDuration = "4s";
        orbiter2.style.animationIterationCount = "infinite";
        orbiter2.style.animationTimingFunction = "ease-in-out"
        orbiter2.textContent = "✦";
        orbiter2.style.color = "rgb(202, 242, 255)";
        orbiter2.style.cursor = "pointer";
        orbiter2.style.position = "absolute";
        orbiter2.style.top = "6px";
        orbiter2.style.left = "12.5px";

        pOrbitRoot.appendChild(orbiter2);

        this.initOrbit(pOrbitRoot);
        this.initTrail(pOrbitRoot);
    }

    destroy(): void {
        if (!this.active) return;
        this.active = false;
        cancelAnimationFrame(this.orbitAnimationFrame);
        cancelAnimationFrame(this.trailAnimationFrame);
        if (this.onDocMouseMove) {
            document.removeEventListener("mousemove", this.onDocMouseMove);
            this.onDocMouseMove = null;
        }
        if (this.onTrailMouseMove) {
            window.removeEventListener("mousemove", this.onTrailMouseMove);
            this.onTrailMouseMove = null;
        }
        document.getElementById("pointer-orbit-root")?.remove();
    }

    initOrbit(root: HTMLElement): void {
        // remove the orbiters on the atrium page for effect swap
        let entrance: HTMLElement | null = document.getElementById("entrance");
        if (entrance && getComputedStyle(entrance).display === "none") {
            root.remove();
            return;
        }

        const orbiter1: HTMLElement | null = document.getElementById("orbiter1");
        const orbiter2: HTMLElement | null = document.getElementById("orbiter2");
        if (!orbiter1 || !orbiter2) return;

        let mouseX: number = 0;
        let mouseY: number = 0;
        const easing: number = 0.25;
        const offset: number = 8;
        let currentX: number = 0;
        let currentY: number = 0;

        this.onDocMouseMove = (abc: MouseEvent): void => {
            mouseX = abc.clientX;
            mouseY = abc.clientY;
        };
        document.addEventListener("mousemove", this.onDocMouseMove);

        const animateFollowers = (): void => {
            if (!this.active) return;
            const targetX: number = mouseX - offset;
            const targetY: number = mouseY - offset;
            currentX += (targetX - currentX) * easing;
            currentY += (targetY - currentY) * easing;
            const marginLeft: string = currentX + "px";
            const marginTop: string = currentY + "px";
            orbiter1.style.marginLeft = marginLeft;
            orbiter1.style.marginTop = marginTop;
            orbiter2.style.marginLeft = marginLeft;
            orbiter2.style.marginTop = marginTop;
            this.orbitAnimationFrame = requestAnimationFrame(animateFollowers);
        };

        this.orbitAnimationFrame = requestAnimationFrame(animateFollowers);
    }

    initTrail(container: HTMLElement): void {
        interface TrailStar {
            el: HTMLDivElement;
            bornAt: number;
            originY: number;
        }

        const trailLive: TrailStar[] = [];
        const trailAgeSpanMs: number = 1500;
        const trailFallPx: number = 21;
        const trailSpinDeg: number = 540;
        // spawn a star every nth move so the trail is sparse rather than solid
        const trailEveryNthMove: number = 10;
        let trailEventCounter: number = 0;
        let trailAnimating: boolean = false;

        const refreshTrailAges = (): void => {
            if (!this.active) {
                trailAnimating = false;
                return;
            }
            const now: number = Date.now();
            for (let i = trailLive.length - 1; i >= 0; i--) {
                const t: TrailStar = trailLive[i] as TrailStar;
                const age: number = now - t.bornAt;
                if (age >= trailAgeSpanMs) {
                    t.el.remove();
                    trailLive.splice(i, 1);
                    continue;
                }
                const progress: number = age / trailAgeSpanMs;
                t.el.style.top = t.originY + progress * trailFallPx + "px";
                t.el.style.opacity = String(1 - progress);
                t.el.style.transform = "rotate(" + progress * trailSpinDeg + "deg)";
            }
            if (trailLive.length === 0) {
                trailAnimating = false;
                return;
            }
            this.trailAnimationFrame = requestAnimationFrame(refreshTrailAges);
        };

        const ensureTrailAnimating = (): void => {
            if (trailAnimating || !this.active) return;
            trailAnimating = true;
            this.trailAnimationFrame = requestAnimationFrame(refreshTrailAges);
        };

        this.onTrailMouseMove = (event: MouseEvent): void => {
            if (!this.active) return;
            trailEventCounter++;
            if (trailEveryNthMove > 1 && trailEventCounter % trailEveryNthMove !== 0) return;

            const el: HTMLDivElement = document.createElement("div");
            el.textContent = "★";
            el.style.position = "absolute";
            el.style.pointerEvents = "none";
            el.style.userSelect = "none";
            el.style.color = "gold";
            el.style.transformOrigin = "left top";
            // container is position:fixed inset:0, so client coords map straight onto it
            el.style.left = event.clientX + 9 + "px";
            el.style.top = event.clientY + 9 + "px";
            container.appendChild(el);
            trailLive.push({ el, bornAt: Date.now(), originY: event.clientY + 9 });
            ensureTrailAnimating();
        };

        window.addEventListener("mousemove", this.onTrailMouseMove);
    }
}
