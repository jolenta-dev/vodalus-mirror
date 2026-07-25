// originally from - https://web.archive.org/web/20041026003308/http://rainbow.arch.scriptmania.com/scripts/mouse_clock.html
import { root } from "../primitives/root.js";

interface Cursor {
    x: number;
    y: number;
}

interface ClockParticle {
    color: string;
    value: string;
    x?: number;
    y?: number;
}

export class ClockCursor {
    private canvas: HTMLCanvasElement | null = null;
    private context: CanvasRenderingContext2D | null = null;
    private animationFrame: number = 0;
    private width: number = window.innerWidth;
    private height: number = window.innerHeight;
    private cursor: Cursor = { x: this.width / 2, y: this.height / 2 };
    private readonly prefersReducedMotion: MediaQueryList = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    private readonly dateColor: string = "lightblue";
    private readonly faceColor: string = "pink";
    private readonly secondsColor: string = "red";
    private readonly minutesColor: string = "pink";
    private readonly hoursColor: string = "aliceblue";
    private readonly del: number = 0.4;

    private readonly theDays: string[] = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
    ];

    private readonly theMonths: string[] = [
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
    ];

    private readonly dateInWords: string[];
    private readonly clockNumbers: string[] = [
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "1",
        "2",
    ];

    private readonly F: number;
    private readonly hourHand: string[] = ["•", "•", "•"];
    private readonly minuteHand: string[] = ["•", "•", "•", "•"];
    private readonly secondHand: string[] = ["•", "•", "•", "•", "•"];

    private readonly siz: number = 45;
    private readonly eqf: number;
    private readonly eqd: number;
    private readonly han: number;
    private readonly ofy: number = 0;
    private readonly ofx: number = 0;
    private readonly sum: number;

    private readonly dy: number[] = [];
    private readonly dx: number[] = [];
    private readonly zy: number[] = [];
    private readonly zx: number[] = [];

    private readonly tmps: ClockParticle[] = [];
    private readonly tmpm: ClockParticle[] = [];
    private readonly tmph: ClockParticle[] = [];
    private readonly tmpf: ClockParticle[] = [];
    private readonly tmpd: ClockParticle[] = [];

    private readonly onReducedMotionChange: () => void = (): void => {
        if (this.prefersReducedMotion.matches) {
            this.destroy();
        } else {
            this.init();
        }
    };

    constructor() {
        const date: Date = new Date();
        const day: number = date.getDate();
        const year: number = date.getFullYear();

        this.dateInWords = (
            " " +
            this.theDays[date.getDay()] +
            " " +
            day +
            " " +
            this.theMonths[date.getMonth()] +
            " " +
            year
        ).split("");

        this.F = this.clockNumbers.length;
        this.eqf = 360 / this.F;
        this.eqd = 360 / this.dateInWords.length;
        this.han = this.siz / 6.5;
        this.sum =
            this.dateInWords.length +
            this.F +
            this.hourHand.length +
            this.minuteHand.length +
            this.secondHand.length +
            1;

        this.prefersReducedMotion.addEventListener("change", this.onReducedMotionChange);
        this.init();
    }

    init(): boolean {
        if (this.prefersReducedMotion.matches) {
            console.log(
                "This browser has prefers reduced motion turned on, so the cursor did not init"
            );
            return false;
        }

        const canvas: HTMLCanvasElement = document.createElement("canvas");
        const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
        if (!context) return false;

        this.canvas = canvas;
        this.context = context;

        canvas.id = "clock-cursor-root";
        canvas.style.top = "0px";
        canvas.style.left = "0px";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "99999";
        canvas.style.position = "fixed";
        canvas.width = this.width;
        canvas.height = this.height;

        root().appendChild(canvas);

        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";

        for (let i: number = 0; i < this.sum; i++) {
            this.dy[i] = 0;
            this.dx[i] = 0;
            this.zy[i] = 0;
            this.zx[i] = 0;
        }

        for (let i: number = 0; i < this.dateInWords.length; i++) {
            this.tmpd[i] = {
                color: this.dateColor,
                value: this.dateInWords[i] as string,
            };
        }

        for (let i: number = 0; i < this.clockNumbers.length; i++) {
            this.tmpf[i] = {
                color: this.faceColor,
                value: this.clockNumbers[i] as string,
            };
        }

        for (let i: number = 0; i < this.hourHand.length; i++) {
            this.tmph[i] = {
                color: this.hoursColor,
                value: this.hourHand[i] as string,
            };
        }

        for (let i: number = 0; i < this.minuteHand.length; i++) {
            this.tmpm[i] = {
                color: this.minutesColor,
                value: this.minuteHand[i] as string,
            };
        }

        for (let i: number = 0; i < this.secondHand.length; i++) {
            this.tmps[i] = {
                color: this.secondsColor,
                value: this.secondHand[i] as string,
            };
        }

        this.bindEvents();
        this.loop();
        return true;
    }

    destroy(): void {
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
            this.context = null;
        }
        cancelAnimationFrame(this.animationFrame);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("touchmove", this.onTouchMove);
        window.removeEventListener("touchstart", this.onTouchMove);
        window.removeEventListener("resize", this.onWindowResize);
    }

    private bindEvents(): void {
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("touchmove", this.onTouchMove, { passive: true });
        window.addEventListener("touchstart", this.onTouchMove, { passive: true });
        window.addEventListener("resize", this.onWindowResize);
    }

    private onWindowResize: () => void = (): void => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    };

    private onTouchMove: (e: TouchEvent) => void = (e: TouchEvent): void => {
        if (e.touches.length > 0) {
            const touch: Touch = e.touches[0] as Touch;
            this.cursor.x = touch.clientX;
            this.cursor.y = touch.clientY;
        }
    };

    private onMouseMove: (e: MouseEvent) => void = (e: MouseEvent): void => {
        this.cursor.x = e.clientX;
        this.cursor.y = e.clientY;
    };

    private updatePositions(): void {
        const widthBuffer: number = 80;

        this.dy[0] = (this.dy[0] as number) + (this.cursor.y - (this.dy[0] as number)) * this.del;
        this.dx[0] = (this.dx[0] as number) + (this.cursor.x - (this.dx[0] as number)) * this.del;
        this.zy[0] = Math.round(this.dy[0] as number);
        this.zx[0] = Math.round(this.dx[0] as number);
        for (let i: number = 1; i < this.sum; i++) {
            this.dy[i] = (this.dy[i] as number) + ((this.zy[i - 1] as number) - (this.dy[i] as number)) * this.del;
            this.dx[i] = (this.dx[i] as number) + ((this.zx[i - 1] as number) - (this.dx[i] as number)) * this.del;
            this.zy[i] = Math.round(this.dy[i] as number);
            this.zx[i] = Math.round(this.dx[i] as number);
            if ((this.dy[i - 1] as number) >= this.height - 80) this.dy[i - 1] = this.height - 80;
            if ((this.dx[i - 1] as number) >= this.width - widthBuffer) this.dx[i - 1] = this.width - widthBuffer;
        }
    }

    private updateParticles(): void {
        const context: CanvasRenderingContext2D | null = this.context;
        if (!context) return;

        context.clearRect(0, 0, this.width, this.height);

        const time: Date = new Date();
        const secs: number = time.getSeconds();
        const sec: number = (Math.PI * (secs - 15)) / 30;
        const mins: number = time.getMinutes();
        const min: number = (Math.PI * (mins - 15)) / 30;
        const hrs: number = time.getHours();
        const hr: number =
            (Math.PI * (hrs - 3)) / 6 + (Math.PI * time.getMinutes()) / 360;

        for (let i: number = 0; i < this.tmpd.length; i++) {
            const particle: ClockParticle = this.tmpd[i] as ClockParticle;
            particle.y =
                (this.dy[i] as number) + this.siz * 1.5 * Math.sin(-sec + (i * this.eqd * Math.PI) / 180);
            particle.x =
                (this.dx[i] as number) + this.siz * 1.5 * Math.cos(-sec + (i * this.eqd * Math.PI) / 180);

            context.fillStyle = particle.color;
            context.fillText(particle.value, particle.x, particle.y);
        }

        for (let i: number = 0; i < this.tmpf.length; i++) {
            const particle: ClockParticle = this.tmpf[i] as ClockParticle;
            particle.y =
                (this.dy[this.tmpd.length + i] as number) + this.siz * Math.sin((i * this.eqf * Math.PI) / 180);
            particle.x =
                (this.dx[this.tmpd.length + i] as number) + this.siz * Math.cos((i * this.eqf * Math.PI) / 180);

            context.fillStyle = particle.color;
            context.fillText(particle.value, particle.x, particle.y);
        }

        for (let i: number = 0; i < this.tmph.length; i++) {
            const particle: ClockParticle = this.tmph[i] as ClockParticle;
            particle.y = (this.dy[this.tmpd.length + this.F + i] as number) + this.ofy + i * this.han * Math.sin(hr);
            particle.x = (this.dx[this.tmpd.length + this.F + i] as number) + this.ofx + i * this.han * Math.cos(hr);

            context.fillStyle = particle.color;
            context.fillText(particle.value, particle.x, particle.y);
        }

        for (let i: number = 0; i < this.tmpm.length; i++) {
            const particle: ClockParticle = this.tmpm[i] as ClockParticle;
            particle.y =
                (this.dy[this.tmpd.length + this.F + this.tmph.length + i] as number) + this.ofy + i * this.han * Math.sin(min);
            particle.x =
                (this.dx[this.tmpd.length + this.F + this.tmph.length + i] as number) + this.ofx + i * this.han * Math.cos(min);

            context.fillStyle = particle.color;
            context.fillText(particle.value, particle.x, particle.y);
        }

        for (let i: number = 0; i < this.tmps.length; i++) {
            const particle: ClockParticle = this.tmps[i] as ClockParticle;
            particle.y =
                (this.dy[this.tmpd.length + this.F + this.tmph.length + this.tmpm.length + i] as number) +
                this.ofy +
                i * this.han * Math.sin(sec);
            particle.x =
                (this.dx[this.tmpd.length + this.F + this.tmph.length + this.tmpm.length + i] as number) +
                this.ofx +
                i * this.han * Math.cos(sec);

            context.fillStyle = particle.color;
            context.fillText(particle.value, particle.x, particle.y);
        }
    }

    private loop: () => void = (): void => {
        this.updatePositions();
        this.updateParticles();
        this.animationFrame = requestAnimationFrame(this.loop);
    };
}
