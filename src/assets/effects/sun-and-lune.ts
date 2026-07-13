export class SunAndLune {
    constructor(main: HTMLElement) {
        if (document.documentElement.classList.contains("page-embed") || document.documentElement.classList.contains("chat-embed")) {
            return;
        }

        const field = main.querySelector("#starfield");
        if (!field) return;

        const lune: HTMLDivElement = document.createElement("div");
        lune.className = "lune";
        lune.setAttribute("aria-hidden", "true");
        lune.innerHTML = "<img src='/multimedia/images/lune.svg' alt='lune' width='120px' height='120px'>";
        lune.style.position = "fixed";
        const luneEw = 120;
        const luneEh = 120;

        let last = performance.now();
        let angle = Math.random() * Math.PI * 2;
        let spd = 1 + Math.random() * 12;
        let vx = Math.cos(angle) * spd;
        let vy = Math.sin(angle) * spd * 0.5;
        let w = window.innerWidth;
        let h = window.innerHeight;
        let x = Math.random() * Math.max(1, w - luneEw);
        let y = Math.random() * Math.max(1, h - luneEh);
        lune.style.left = x + "px";
        lune.style.top = y + "px";

        const wrap = (): void => {
            w = window.innerWidth;
            h = window.innerHeight;
            const maxX = w - luneEw;
            const maxY = h - luneEh;
            if (x > maxX) {
                x = maxX;
                vx = -Math.abs(vx);
            } else if (x < 0) {
                x = 0;
                vx = Math.abs(vx);
            }
            if (y > maxY) {
                y = maxY;
                vy = -Math.abs(vy);
            } else if (y < 0) {
                y = 0;
                vy = Math.abs(vy);
            }
        };

        const onResize = (): void => {
            wrap();
            lune.style.left = x + "px";
            lune.style.top = y + "px";
        };

        const tick = (now: number): void => {
            const dt = Math.min(0.05, (now - last) / 1e3);
            last = now;
            x += vx * dt;
            y += vy * dt;
            wrap();
            lune.style.left = x + "px";
            lune.style.top = y + "px";
            requestAnimationFrame(tick);
        };

        window.addEventListener("resize", onResize);
        requestAnimationFrame(tick);

        const sun: HTMLDivElement = document.createElement("div");
        sun.className = "sun";
        sun.setAttribute("aria-hidden", "true");
        sun.innerHTML = "";
        sun.style.borderRadius = "50%";
        sun.style.width = "40px";
        sun.style.height = "40px";
        sun.style.backgroundColor = "red";
        sun.style.position = "fixed";
        sun.style.boxShadow = "0px 0px 10px red";
        sun.style.top = Math.random() * 100 + "vh";
        sun.style.left = Math.random() * 100 + "vw";
        sun.style.transform = "translateY(-50%)";
        field.appendChild(sun);
        field.appendChild(lune);
    }
}
