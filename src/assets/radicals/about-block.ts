import { Component } from "../primitives/component.js";
import { root } from "../primitives/root.js";
import { TextFromMD } from "../primitives/update-notes.js";
import { VODALUS_ALICEBLUE, VODALUS_CURSOR_GRAB } from "../theme.js";

let topZ = 0;

export class AboutBlock extends Component {
    constructor(filepath: string) {
        const wrapper: HTMLDivElement = document.createElement("div");
        super(wrapper);

        const text: HTMLDivElement = new TextFromMD(filepath).el;
        text.style.border = "";
        text.style.backgroundColor = "transparent";

        wrapper.style.position = "absolute";
        wrapper.style.overflow = "visible";
        wrapper.style.cursor = VODALUS_CURSOR_GRAB;
        wrapper.style.width = "30vw";
        wrapper.style.height = "30vh";
        wrapper.style.overflow = "scroll";
        wrapper.style.border = `1px solid ${VODALUS_ALICEBLUE}`;
        wrapper.style.borderRadius = "15px";
        wrapper.style.backgroundColor = "rgb(15, 0, 29)";
        wrapper.style.textAlign = "center";
        wrapper.style.scrollbarWidth = "none";

        wrapper.addEventListener("mousedown", (e: MouseEvent): void => {
            this.moveBlock(e);
        });
        wrapper.appendChild(text);
    }

    override mount(parent: HTMLElement = root()): void {
        super.mount(parent);
        const parentRect = parent.getBoundingClientRect();
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const offset = Math.random() * 5 * rem;
        const dirs: [number, number][] = [
            [0, -1],
            [0, 1],
            [1, 0],
            [-1, 0],
        ];
        const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)]!;
        this.el.style.left =
            (window.innerWidth - this.el.offsetWidth) / 2 - parentRect.left + dx * offset + "px";
        this.el.style.top =
            (window.innerHeight - this.el.offsetHeight) / 2 - parentRect.top + dy * offset + "px";
    }

    private moveBlock(e: MouseEvent): void {
        e.preventDefault();
        const el = this.el;
        el.style.zIndex = String(++topZ);
        // lock size so shrink-to-fit doesn't collapse width near the containing-block edge
        el.style.width = el.offsetWidth + "px";
        el.style.height = el.offsetHeight + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
        let prevX = e.clientX;
        let prevY = e.clientY;

        const onMove = (ev: MouseEvent): void => {
            ev.preventDefault();
            const dx = prevX - ev.clientX;
            const dy = prevY - ev.clientY;
            prevX = ev.clientX;
            prevY = ev.clientY;
            el.style.top = el.offsetTop - dy + "px";
            el.style.left = el.offsetLeft - dx + "px";
        };

        const onUp = (): void => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }
}
