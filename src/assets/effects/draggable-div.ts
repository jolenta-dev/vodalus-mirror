import {
    VODALUS_CURSOR_LINK,
    VODALUS_CURSOR_MOVE,
    VODALUS_CURSOR_RESIZE,
    VODALUS_SANS,
    VODALUS_SERIF,
    VODALUS_GREEN,
    VODALUS_ALICEBLUE,
} from "../theme.js";

type PanelState = "minimized" | "maximized" | "default";

export class DraggableDiv {
    private readonly el!: HTMLDivElement;
    private readonly content!: HTMLIFrameElement;
    private readonly headerBar!: HTMLElement;
    private readonly closeBtn!: HTMLElement;
    private readonly minimizeBtn!: HTMLElement;
    private readonly contentEl!: HTMLElement;
    private readonly resizeEl!: HTMLElement;

    private preMinimizeTop = 0;
    private preMinimizeLeft = 0;
    private preMinimizeHeightStyle = "";

    constructor(src: string, header = "", state: PanelState = "minimized") {
        if (DraggableDiv.isEmbedContext()) return;

        const slot = DraggableDiv.claimSlot();
        if (!slot) return;

        this.el = slot;
        this.el.innerHTML = `
            <div id="draggable-div-header">
            <div id="draggable-div-close">x</div>
            <div id="draggable-div-minimize">-</div>
            <div id="draggable-div-header-text">${header}</div>
            </div>
            <div id="draggable-div-content"></div>
            <div id="draggable-div-resize" aria-hidden="true"></div>
        `;

        this.headerBar = this.el.querySelector("#draggable-div-header") as HTMLElement;
        this.closeBtn = this.el.querySelector("#draggable-div-close") as HTMLElement;
        this.minimizeBtn = this.el.querySelector("#draggable-div-minimize") as HTMLElement;
        const headerText = this.el.querySelector("#draggable-div-header-text") as HTMLElement;
        this.contentEl = this.el.querySelector("#draggable-div-content") as HTMLElement;
        this.resizeEl = this.el.querySelector("#draggable-div-resize") as HTMLElement;

        this.content = document.createElement("iframe");
        this.content.src = DraggableDiv.withEmbed(src);
        this.contentEl.appendChild(this.content);

        Object.assign(this.contentEl.style, { minHeight: "0" });
        Object.assign(this.content.style, {
            width: "100%",
            height: "100%",
            border: "0",
            boxSizing: "border-box",
            display: "block",
            verticalAlign: "top",
        });

        document.body.appendChild(this.el);

        Object.assign(headerText.style, {
            fontSize: "16px",
            fontWeight: "bold",
            color: "#fff",
            textAlign: "center",
            margin: "auto auto",
            width: "100%",
            fontFamily: VODALUS_SERIF,
        });

        Object.assign(this.el.style, {
            position: "absolute",
            zIndex: "9",
            width: "512px",
            height: "288px",
            backgroundColor: VODALUS_ALICEBLUE,
            textAlign: "center",
            border: "1px solid #d3d3d3",
            borderRadius: "8px",
            overflow: "visible",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            maxWidth: "calc(100vw - 16px)",
            maxHeight: "calc(100vh - 16px)",
        });
        Object.assign(this.contentEl.style, {
            overflow: "auto",
            minWidth: "0",
            flex: "1 1 auto",
            borderRadius: "0 0 8px 8px",
        });
        Object.assign(this.resizeEl.style, {
            position: "absolute",
            right: "0",
            bottom: "0",
            width: "14px",
            height: "14px",
            cursor: VODALUS_CURSOR_RESIZE,
            zIndex: "11",
        });

        const headerButtonStyle: Partial<CSSStyleDeclaration> = {
            cursor: VODALUS_CURSOR_LINK,
            borderStyle: "solid",
            padding: "5px",
            margin: "2.5px",
            height: "10px",
            width: "10px",
            borderRadius: "20%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: VODALUS_SANS,
        };
        Object.assign(this.closeBtn.style, headerButtonStyle, { backgroundColor: "red" });
        Object.assign(this.minimizeBtn.style, headerButtonStyle);

        Object.assign(this.headerBar.style, {
            display: "flex",
            padding: "10px",
            cursor: VODALUS_CURSOR_MOVE,
            zIndex: "10",
            border: `1px solid ${VODALUS_ALICEBLUE}`,
            backgroundColor: VODALUS_GREEN,
            color: "#fff",
            borderRadius: "8px 8px 0 0",
        });

        this.placeExpandedInMain();
        this.bindDrag();
        this.bindChrome();

        if (state === "minimized") {
            this.toggleMinimize(true);
        }
    }

    private static claimSlot(): HTMLDivElement | null {
        for (const i of [0, 1, 2, 3, 4]) {
            if (document.getElementById(`div-${i}`) != null) continue;
            const el = document.createElement("div");
            el.id = `div-${i}`;
            return el;
        }
        return null;
    }

    private static isEmbedContext(): boolean {
        return (
            document.documentElement.classList.contains("page-embed") ||
            document.documentElement.classList.contains("chat-embed") ||
            new URLSearchParams(location.search).get("embed") === "1"
        );
    }

    private static withEmbed(src: string): string {
        const url = new URL(src, location.origin);
        url.searchParams.set("embed", "1");
        return url.pathname + url.search + url.hash;
    }

    private placeExpandedInMain(): void {
        void this.el.offsetHeight;
        const w = this.el.offsetWidth || 256;
        const h = this.el.offsetHeight || 144;
        const pad = 8;
        const main = document.querySelector(".main");
        if (main) {
            const m = main.getBoundingClientRect();
            let left = m.right - w - pad;
            let top = m.top + pad;
            left = Math.max(m.left + pad, Math.min(left, m.right - w - pad));
            top = Math.max(m.top + pad, Math.min(top, m.bottom - h - pad));
            this.el.style.left = left + "px";
            this.el.style.top = top + "px";
        } else {
            this.el.style.left = Math.max(pad, window.innerWidth - w - pad) + "px";
            this.el.style.top = pad + "px";
        }
    }

    private bindDrag(): void {
        let pos1 = 0;
        let pos2 = 0;
        let pos3 = 0;
        let pos4 = 0;
        const element = this.el;
        const content = this.content;
        const contentEl = this.contentEl;

        const dragMouseDown = (e: MouseEvent): void => {
            if (contentEl.style.display === "none") return;
            e.preventDefault();
            element.style.transition = "";
            if (element.style.position === "fixed") {
                const br = element.getBoundingClientRect();
                const sx = window.scrollX || 0;
                const sy = window.scrollY || 0;
                element.style.position = "absolute";
                element.style.top = br.top + sy + "px";
                element.style.left = br.left + sx + "px";
                element.style.bottom = "auto";
                element.style.right = "auto";
            } else if (element.style.bottom || element.style.right) {
                element.style.top = element.offsetTop + "px";
                element.style.left = element.offsetLeft + "px";
                element.style.bottom = "auto";
                element.style.right = "auto";
            }
            pos3 = e.clientX;
            pos4 = e.clientY;
            content.style.pointerEvents = "none";
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e: MouseEvent): void => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = element.offsetTop - pos2 + "px";
            element.style.left = element.offsetLeft - pos1 + "px";
        };

        const closeDragElement = (): void => {
            document.onmouseup = null;
            document.onmousemove = null;
            content.style.pointerEvents = "";
        };

        this.headerBar.onmousedown = dragMouseDown;
    }

    private toggleMinimize(immediate = false): void {
        const element = this.el;
        const contentEl = this.contentEl;
        const minimizeEl = this.minimizeBtn;
        const resizeEl = this.resizeEl;
        const headerBar = this.headerBar;

        if (contentEl.style.display === "none") {
            const sx0 = window.scrollX || 0;
            const sy0 = window.scrollY || 0;
            const r0 = element.getBoundingClientRect();
            element.style.position = "absolute";
            element.style.top = r0.top + sy0 + "px";
            element.style.left = r0.left + sx0 + "px";
            element.style.bottom = "auto";
            element.style.right = "auto";
            element.style.height = this.preMinimizeHeightStyle;
            contentEl.style.display = "block";
            contentEl.style.opacity = "1";
            contentEl.style.transition = "opacity 0.3s ease";
            element.style.transition = "none";
            void element.offsetHeight;
            requestAnimationFrame((): void => {
                requestAnimationFrame((): void => {
                    element.style.transition = "top 0.5s ease, left 0.5s ease";
                    element.style.top = this.preMinimizeTop + "px";
                    element.style.left = this.preMinimizeLeft + "px";
                });
            });
            minimizeEl.textContent = "-";
            resizeEl.style.display = "";
        } else {
            this.preMinimizeTop = element.offsetTop;
            this.preMinimizeLeft = element.offsetLeft;
            this.preMinimizeHeightStyle = element.style.height;
            contentEl.style.display = "none";
            contentEl.style.opacity = "0";
            resizeEl.style.display = "none";
            element.style.height = headerBar.offsetHeight + "px";
            const rect = element.getBoundingClientRect();
            const pad = 8;
            const main = document.querySelector(".main");
            const mrect = main ? main.getBoundingClientRect() : null;
            let wantRightX = (mrect ? mrect.right : window.innerWidth) - pad;
            const minRightX = (mrect ? mrect.left : 0) + pad + rect.width;
            wantRightX = Math.max(
                minRightX,
                Math.min(wantRightX, (mrect ? mrect.right : window.innerWidth) - pad)
            );
            const endRight = window.innerWidth - wantRightX;
            element.style.transition = "none";
            element.style.position = "fixed";
            element.style.top = "auto";
            element.style.left = "auto";
            if (immediate) {
                element.style.right = endRight + "px";
                element.style.bottom = pad + "px";
            } else {
                const startRight = window.innerWidth - rect.right;
                const startBottom = window.innerHeight - rect.bottom;
                element.style.right = startRight + "px";
                element.style.bottom = startBottom + "px";
                void element.offsetHeight;
                requestAnimationFrame((): void => {
                    requestAnimationFrame((): void => {
                        element.style.transition = "bottom 0.5s ease, right 0.5s ease";
                        element.style.bottom = pad + "px";
                        element.style.right = endRight + "px";
                    });
                });
            }
            minimizeEl.textContent = "+";
        }
        headerBar.style.cursor = VODALUS_CURSOR_MOVE;
    }

    private bindChrome(): void {
        this.closeBtn.addEventListener("click", (): void => {
            this.el.remove();
        });

        this.minimizeBtn.addEventListener("click", (): void => {
            this.toggleMinimize();
        });

        this.resizeEl.addEventListener("mousedown", (e: MouseEvent): void => {
            e.preventDefault();
            e.stopPropagation();
            if (this.contentEl.style.display === "none") return;
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = this.el.offsetWidth;
            const startH = this.el.offsetHeight;
            this.el.style.transition = "";
            this.content.style.pointerEvents = "none";
            const onMove = (ev: MouseEvent): void => {
                ev.preventDefault();
                this.el.style.width = Math.max(220, startW + ev.clientX - startX) + "px";
                this.el.style.height = Math.max(72, startH + ev.clientY - startY) + "px";
            };
            const onUp = (): void => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                this.content.style.pointerEvents = "";
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
    }
}
