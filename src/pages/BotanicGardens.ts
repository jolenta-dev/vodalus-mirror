import { root } from "../assets/primitives/root.js";
import { PasswordInput, BotanicClickButton, BotanicUpgradeButton } from "../radicals.js";
import { TextInput, Button, PageTitle } from "../primitives.js";
import { Page } from "./Page.js";
import { VODALUS_ALICEBLUE, VODALUS_SERIF } from "../assets/theme.js";

const usNumberFormat = new Intl.NumberFormat("en-US");

function formatUsNumber(n: number): string {
    return usNumberFormat.format(Number(n) || 0);
}

function readDisplayNumber(el: HTMLElement | null): number {
    return Number(String(el?.textContent ?? "").replace(/,/g, "")) || 0;
}

export class BotanicGardens extends Page {
    private title: HTMLDivElement;
    private inputWrapper: HTMLDivElement;

    private count = 0;
    private increasePerClick = 1;
    private perTick = 0;
    private autoClickInterval = 1000;
    private explosionChance = 0;
    private explosionQuantity = 0;
    private holdToClick = false;
    private holdToClickInterval = 1000;
    private buttonHeld = false;
    private lastHoldClickAt = 0;
    private upgrade3Level = 0;
    private upgrade4Level = 0;
    private upgrade5Level = 0;
    private passiveTimer: ReturnType<typeof setInterval> | null = null;

    private totalTracker: HTMLSpanElement | null = null;
    private mainButton: BotanicClickButton | null = null;
    private upgrades: (BotanicUpgradeButton | null)[] = [];

    constructor() {
        super({
            statusMessageText: "status msg aha",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "Haku sounds",
        });

        const title: HTMLDivElement = new PageTitle(
            "Father Inire's Botanic Gardens await beyond the gate. Enter a nickname to pass through."
        ).el;
        this.title = title;
        title.style.textAlign = "center";
        title.style.display = "flex";
        title.style.paddingTop = "20vh";

        root().appendChild(title);

        const inputWrapper: HTMLDivElement = document.createElement("div");
        inputWrapper.id = "botanic-input-wrapper";
        this.inputWrapper = inputWrapper;

        inputWrapper.style.display = "flex";
        inputWrapper.style.flexDirection = "column";
        inputWrapper.style.width = "40vw";
        inputWrapper.style.position = "absolute";
        inputWrapper.style.left = "25vw";

        const nameInput: HTMLInputElement = new TextInput("Your name").el;
        nameInput.style.margin = "1em";
        nameInput.style.height = "4vh";

        const passwordInput: PasswordInput = new PasswordInput("Your password");
        passwordInput.el.style.display = "flex";
        passwordInput.revealBtn.style.height = "4vh";
        passwordInput.revealBtn.style.alignSelf = "center";
        passwordInput.pwInput.style.margin = "1em";
        passwordInput.pwInput.style.height = "4vh";
        passwordInput.pwInput.style.width = "95%";

        const enterBtn: HTMLButtonElement = new Button("join", "botanic-join-btn", false, true).el;
        enterBtn.style.display = "flex";
        enterBtn.style.fontSize = "clamp(1rem, 5vw, 0.75rem)";
        enterBtn.style.lineHeight = "1.25";
        enterBtn.style.padding = "1em 2em";
        enterBtn.style.margin = "0.6rem auto 0";

        enterBtn.addEventListener("click", (): void => {
            this.enterGardens();
        });
        nameInput.addEventListener("keydown", (e: KeyboardEvent): void => {
            if (e.key === "Enter") enterBtn.click();
        });
        passwordInput.pwInput.addEventListener("keydown", (e: KeyboardEvent): void => {
            if (e.key === "Enter") enterBtn.click();
        });

        inputWrapper.appendChild(nameInput);
        inputWrapper.appendChild(passwordInput.el);
        inputWrapper.appendChild(enterBtn);

        root().appendChild(inputWrapper);
    }

    private enterGardens(): void {
        root().removeChild(this.title);
        root().removeChild(this.inputWrapper);

        const title: HTMLDivElement = new PageTitle(
            "Father Inire's Botanic Gardens lie before you."
        ).el;
        this.title = title;
        title.style.textAlign = "center";
        title.style.display = "flex";
        title.style.fontFamily = VODALUS_SERIF;

        const container: HTMLDivElement = document.createElement("div");
        container.id = "botanic-gardens-container";
        container.style.display = "flex";
        container.style.flexWrap = "wrap";
        container.style.width = "100%";
        container.style.boxSizing = "border-box";

        const clickArea: HTMLDivElement = document.createElement("div");
        clickArea.id = "click-area-wrapper";
        clickArea.style.flex = "1 1 50%";
        clickArea.style.minWidth = "280px";
        clickArea.style.boxSizing = "border-box";

        const totalWrapper: HTMLDivElement = document.createElement("div");
        totalWrapper.style.display = "flex";
        totalWrapper.style.justifyContent = "center";

        const totalDisplay: HTMLHeadingElement = document.createElement("h1");
        totalDisplay.style.margin = "0";
        totalDisplay.style.fontFamily = VODALUS_SERIF;
        totalDisplay.style.color = VODALUS_ALICEBLUE;
        const countSpan: HTMLSpanElement = document.createElement("span");
        countSpan.id = "count";
        countSpan.textContent = "0";
        this.totalTracker = countSpan;
        totalDisplay.append("Total: ", countSpan);
        totalWrapper.appendChild(totalDisplay);

        const buttonWrapper: HTMLDivElement = document.createElement("div");
        buttonWrapper.style.display = "flex";
        buttonWrapper.style.justifyContent = "center";

        const mainButton = new BotanicClickButton();
        this.mainButton = mainButton;
        if (window.matchMedia("(max-width: 1024px)").matches) {
            mainButton.el.style.margin = "0";
        }
        buttonWrapper.appendChild(mainButton.el);

        clickArea.appendChild(totalWrapper);
        clickArea.appendChild(buttonWrapper);

        const menuArea: HTMLDivElement = document.createElement("div");
        menuArea.id = "menu-area-wrapper";
        menuArea.style.flex = "1 1 50%";
        menuArea.style.minWidth = "280px";
        menuArea.style.boxSizing = "border-box";

        const upgradeDefs: [string, string][] = [
            ["upgrade1", "increase click (+ 1 per click)"],
            ["upgrade2", "passive income (+ 1 click per interval)"],
            ["upgrade3", "auto click faster (halve the time between clicks)"],
            ["upgrade4", "hold to click (unlock -> -100ms between clicks)"],
            ["upgrade5", "explosions (unlock -> +10% chance & x1.5 explosion quantity)"],
        ];

        this.upgrades = [];
        for (const [id, desc] of upgradeDefs) {
            const btn = new BotanicUpgradeButton(id, desc);
            this.upgrades.push(btn);
            menuArea.appendChild(btn.el);
        }

        container.appendChild(clickArea);
        container.appendChild(menuArea);

        root().appendChild(title);
        root().appendChild(container);

        this.bindClicker();
        this.initUpgradeState();
        this.restartPassiveTimer();
        setInterval((): void => this.unaffordableButtons(), 100);
    }

    private bindClicker(): void {
        const mainButton = this.mainButton as BotanicClickButton;

        mainButton.el.addEventListener("click", (e: MouseEvent): void => {
            this.count += this.increasePerClick;
            let added = this.increasePerClick;
            if (this.explosionChance > 0 && Math.random() < this.explosionChance) {
                this.count += this.explosionQuantity;
                added += this.explosionQuantity;
            }
            this.renderCount();
            mainButton.playClickAnim();
            this.showClickAddition("mouse", e, added);
        });

        mainButton.el.addEventListener("mousedown", (): void => {
            this.buttonHeld = true;
            this.lastHoldClickAt = 0;
        });
        mainButton.el.addEventListener("mouseup", (): void => {
            this.buttonHeld = false;
        });
        mainButton.el.addEventListener("mouseleave", (): void => {
            this.buttonHeld = false;
        });

        setInterval((): void => {
            if (!this.holdToClick || !this.buttonHeld) return;
            const now = Date.now();
            const gap = Math.max(50, this.holdToClickInterval);
            if (now - this.lastHoldClickAt < gap) return;
            this.lastHoldClickAt = now;
            this.holdAndClick();
        }, 50);
    }

    private initUpgradeState(): void {
        const u1 = this.upgrades[0] as BotanicUpgradeButton;
        const u2 = this.upgrades[1] as BotanicUpgradeButton;
        const u3 = this.upgrades[2] as BotanicUpgradeButton;
        const u4 = this.upgrades[3] as BotanicUpgradeButton;
        const u5 = this.upgrades[4] as BotanicUpgradeButton;

        u1.costSpan.textContent = formatUsNumber(20);
        u2.costSpan.textContent = formatUsNumber(50);
        u3.costSpan.textContent = formatUsNumber(10000);
        u4.costSpan.textContent = formatUsNumber(50000);
        u5.costSpan.textContent = formatUsNumber(100000);

        this.renderUpgrade1Current();
        this.renderUpgrade2Current();
        this.renderUpgrade3Current();
        this.renderUpgrade4Current();
        this.renderUpgrade5Current();

        const baseCost1 = 20;
        u1.el.addEventListener("click", (): void => {
            const currentCost = readDisplayNumber(u1.costSpan);
            if (this.count >= currentCost && currentCost >= baseCost1) {
                this.increasePerClick++;
                this.setUpgradeLevelDisplay(u1, this.increasePerClick - 1);
                this.renderUpgrade1Current();
                this.count -= currentCost;
                this.renderCount();
                u1.costSpan.textContent = formatUsNumber(Math.round(currentCost * 2.5));
            }
        });

        const baseCost2 = 50;
        u2.el.addEventListener("click", (): void => {
            const currentCost = readDisplayNumber(u2.costSpan);
            if (this.count >= currentCost && currentCost >= baseCost2) {
                this.perTick++;
                this.setUpgradeLevelDisplay(u2, this.perTick);
                this.renderUpgrade2Current();
                this.count -= currentCost;
                this.renderCount();
                u2.costSpan.textContent = formatUsNumber(Math.round(currentCost * 5));
            }
        });

        const baseCost3 = 10000;
        u3.el.addEventListener("click", (): void => {
            const currentCost = readDisplayNumber(u3.costSpan);
            if (this.count >= currentCost && currentCost >= baseCost3) {
                this.autoClickInterval /= 2;
                this.restartPassiveTimer();
                this.upgrade3Level++;
                this.setUpgradeLevelDisplay(u3, this.upgrade3Level);
                this.renderUpgrade3Current();
                this.count -= currentCost;
                this.renderCount();
                u3.costSpan.textContent = formatUsNumber(Math.round(currentCost * 10));
            }
        });

        const baseCost4 = 50000;
        u4.el.addEventListener("click", (): void => {
            const currentCost = readDisplayNumber(u4.costSpan);
            if (this.count >= currentCost && currentCost >= baseCost4 && !this.holdToClick) {
                this.holdToClick = true;
                this.holdToClickInterval = 1000;
                this.upgrade4Level++;
                this.setUpgradeLevelDisplay(u4, this.upgrade4Level);
                this.count -= currentCost;
                this.renderCount();
                u4.costSpan.textContent = formatUsNumber(Math.round(currentCost * 5));
            } else if (this.count >= currentCost && currentCost >= baseCost4 && this.holdToClick && this.holdToClickInterval > 100) {
                this.holdToClickInterval -= 100;
                this.upgrade4Level++;
                this.setUpgradeLevelDisplay(u4, this.upgrade4Level);
                this.count -= currentCost;
                this.renderCount();
                u4.costSpan.textContent = formatUsNumber(Math.round(currentCost * 10));
            } else if (this.count >= currentCost && currentCost >= baseCost4 && this.holdToClick && this.holdToClickInterval <= 100) {
                this.holdToClickInterval = Math.max(1, this.holdToClickInterval - 1);
                this.upgrade4Level++;
                this.setUpgradeLevelDisplay(u4, this.upgrade4Level);
                this.count -= currentCost;
                this.renderCount();
                u4.costSpan.textContent = formatUsNumber(Math.round(currentCost * 10));
            } else {
                return;
            }
            this.renderUpgrade4Current();
        });

        const baseCost5 = 100000;
        u5.el.addEventListener("click", (): void => {
            const currentCost = readDisplayNumber(u5.costSpan);
            if (this.count >= currentCost && currentCost >= baseCost5) {
                this.applyExplosionPurchase();
                this.upgrade5Level++;
                this.setUpgradeLevelDisplay(u5, this.upgrade5Level);
                this.renderUpgrade5Current();
                this.count -= currentCost;
                this.renderCount();
                u5.costSpan.textContent = formatUsNumber(Math.round(currentCost * 10));
            }
        });
    }

    private setUpgradeLevelDisplay(btn: BotanicUpgradeButton, purchases: number): void {
        btn.levelSpan.textContent = String(purchases + 1);
    }

    private renderCount(): void {
        if (this.totalTracker) this.totalTracker.textContent = formatUsNumber(this.count);
    }

    private renderUpgrade1Current(): void {
        const u = this.upgrades[0];
        if (u) u.currentSpan.textContent = `${formatUsNumber(this.increasePerClick)} / click`;
    }

    private renderUpgrade2Current(): void {
        const u = this.upgrades[1];
        if (u) u.currentSpan.textContent = `${formatUsNumber(this.perTick)} clicks / ${this.autoClickInterval}ms`;
    }

    private renderUpgrade3Current(): void {
        const u = this.upgrades[2];
        if (u) u.currentSpan.textContent = `${formatUsNumber(this.autoClickInterval)}ms per click`;
    }

    private renderUpgrade4Current(): void {
        const u = this.upgrades[3];
        if (!u) return;
        if (this.holdToClick) {
            u.currentSpan.textContent = `click every ${formatUsNumber(this.holdToClickInterval)}ms`;
        } else {
            u.currentSpan.textContent = "not unlocked";
        }
    }

    private renderUpgrade5Current(): void {
        const u = this.upgrades[4];
        if (u) {
            u.currentSpan.textContent =
                `${this.explosionChance * 100}% chance to explode for ${formatUsNumber(this.explosionQuantity)} clicks`;
        }
    }

    private applyExplosionPurchase(): void {
        if (this.explosionChance <= 0.7) this.explosionChance += 0.1;
        else this.explosionChance += 0.01;
        if (this.explosionQuantity === 0) this.explosionQuantity = 1000;
        else this.explosionQuantity *= 1.5;
    }

    private addPassive(): void {
        if (this.perTick <= 0) return;
        let added = 0;
        for (let i = 0; i < this.perTick; i++) {
            added += this.increasePerClick;
            this.count += this.increasePerClick;
            if (this.explosionChance > 0 && Math.random() < this.explosionChance) {
                this.count += this.explosionQuantity;
                added += this.explosionQuantity;
            }
        }
        this.renderCount();
        this.mainButton?.playClickAnim();
        this.showClickAddition("button", null, added);
    }

    private restartPassiveTimer(): void {
        if (this.passiveTimer != null) clearInterval(this.passiveTimer);
        this.passiveTimer = setInterval((): void => this.addPassive(), this.autoClickInterval);
    }

    private holdAndClick(): void {
        if (!this.holdToClick) return;
        let added = this.increasePerClick;
        this.count += this.increasePerClick;
        if (this.explosionChance > 0 && Math.random() < this.explosionChance) {
            this.count += this.explosionQuantity;
            added += this.explosionQuantity;
        }
        this.renderCount();
        this.mainButton?.playClickAnim();
        this.showClickAddition("hold", null, added);
    }

    private unaffordableButtons(): void {
        for (const btn of this.upgrades) {
            if (!btn) continue;
            btn.setAffordable(readDisplayNumber(btn.costSpan) <= this.count);
        }
    }

    private showClickAddition(
        locationOfAddition: "mouse" | "button" | "hold",
        ev: MouseEvent | null,
        addedAmount: number,
    ): void {
        const mainButton = this.mainButton?.el;
        if (!mainButton) return;

        const clickAddition = document.createElement("div");
        clickAddition.classList.add("click-addition");
        clickAddition.textContent = `+${formatUsNumber(addedAmount)}`;

        if (locationOfAddition === "mouse" && ev) {
            clickAddition.style.left = ev.clientX + "px";
            clickAddition.style.top = ev.clientY + "px";
        } else if (locationOfAddition === "button") {
            const r = mainButton.getBoundingClientRect();
            clickAddition.style.left = r.left + r.width / 2 + "px";
            clickAddition.style.top = r.top + "px";
        } else if (locationOfAddition === "hold") {
            const r = mainButton.getBoundingClientRect();
            clickAddition.style.left = r.left + r.width * 0.75 + "px";
            clickAddition.style.top = r.top + r.height * 0.35 + "px";
        }

        clickAddition.style.zIndex = "1000";
        clickAddition.style.color = VODALUS_ALICEBLUE;
        clickAddition.style.fontSize = "2em";
        clickAddition.style.position = "absolute";
        clickAddition.style.animation = "botanicClickAdditionAnim 5s forwards";
        clickAddition.style.cursor = "default";
        clickAddition.style.userSelect = "none";
        clickAddition.style.pointerEvents = "none";

        document.body.appendChild(clickAddition);
        setTimeout((): void => {
            clickAddition.remove();
        }, 5000);
    }
}
