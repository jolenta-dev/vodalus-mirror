import { injectKeyframeRule } from "./keyframes.js";

declare global {
    interface Window {
        initWiggle: (root?: ParentNode) => void;
    }
}

interface WiggleState {
    el: HTMLElement;
    following: boolean;
    anchorCx: number;
    anchorCy: number;
    maxDx: number;
    maxDy: number;
    curTx: number;
    curTy: number;
}

export class Wiggly {
    private static mouseX = 0;
    private static mouseY = 0;
    private static instances: WiggleState[] = [];
    private static ready = false;

    constructor(el: HTMLElement) {
        Wiggly.ensureReady();
        Wiggly.attach(el);
    }

    private static ensureReady(): void {
        if (Wiggly.ready) return;
        Wiggly.ready = true;

        injectKeyframeRule(`
      @keyframes wiggle {
        from {
          rotate: 5deg;
        }
        25% {
          rotate: -5deg;
        }
        50% {
          rotate: 5deg;
        }
        75% {
          rotate: -5deg;
        }
        to {
          rotate: 5deg;
        }
      }
    `);

        document.addEventListener("mousemove", (e: MouseEvent): void => {
            Wiggly.mouseX = e.clientX;
            Wiggly.mouseY = e.clientY;
        });

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", (): void => {
                Wiggly.scan(document);
            });
        } else {
            Wiggly.scan(document);
        }

        window.initWiggle = Wiggly.scan;
        requestAnimationFrame(Wiggly.tick);
    }

    private static tick(): void {
        for (const s of Wiggly.instances) {
            if (!s.following) continue;
            const dcx = Math.max(-s.maxDx, Math.min(s.maxDx, Wiggly.mouseX - s.anchorCx));
            const dcy = Math.max(-s.maxDy, Math.min(s.maxDy, Wiggly.mouseY - s.anchorCy));
            s.curTx = dcx;
            s.curTy = dcy;
            s.el.style.transform = "translate(" + s.curTx + "px," + s.curTy + "px";
        }
        requestAnimationFrame(Wiggly.tick);
    }

    private static attach(el: HTMLElement): void {
        const s: WiggleState = {
            el,
            following: false,
            anchorCx: 0,
            anchorCy: 0,
            maxDx: 0,
            maxDy: 0,
            curTx: 0,
            curTy: 0,
        };
        Wiggly.instances.push(s);

        el.addEventListener("mouseenter", (e: MouseEvent): void => {
            Wiggly.mouseX = e.clientX;
            Wiggly.mouseY = e.clientY;
            const r = el.getBoundingClientRect();
            s.anchorCx = r.left + r.width / 2;
            s.anchorCy = r.top + r.height / 2;
            s.maxDx = el.offsetWidth * 0.1;
            s.maxDy = el.offsetHeight * 0.1;
            s.curTx = 0;
            s.curTy = 0;
            el.style.transform = "translate(0px, 0px)";
            s.following = true;
            el.style.animationName = "wiggle";
            el.style.animationIterationCount = "infinite";
            el.style.animationTimingFunction = "ease-in-out";
            el.style.animationDuration = "0.75s";
            el.style.animationDirection = "alternate";
        });

        el.addEventListener("mouseleave", (): void => {
            s.following = false;
            s.curTx = 0;
            s.curTy = 0;
            el.style.transform = "";
            el.style.animationName = "";
            el.style.animationIterationCount = "";
            el.style.animationDuration = "";
            el.style.animationDirection = "";
        });
    }

    private static scan(root: ParentNode = document): void {
        root.querySelectorAll("[data-wiggle]").forEach((el: Element): void => {
            if (!(el instanceof HTMLElement) || el.dataset.wiggleInit) return;
            el.dataset.wiggleInit = "1";
            new Wiggly(el);
        });
    }
}
