import { root } from "../assets/primitives/root.js";
import { PasswordInput } from "../radicals.js";
import { TextInput, Button, PageTitle, JourneyTabs } from "../primitives.js";
import { Page } from "./Page.js";
import { VODALUS_ALICEBLUE, VODALUS_GREEN } from "../assets/theme.js";

export class AdminDashboard extends Page {
    private title: HTMLDivElement;
    private inputWrapper: HTMLDivElement;

    constructor() {
        super({
            statusMessageText: "why are you here? this is a nonsense page you don't need to know about...",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "Meow -- Haku (2022 Remaster)",
        });
        const title: HTMLDivElement = new PageTitle(
            "You sit before the Inire's mirrors and machines, each more wretched than the last. Only the chosen few may enter."
        ).el;
        this.title = title;
        title.style.textAlign = "center";
        title.style.display = "flex";
        title.style.paddingTop = "20vh";

        root().appendChild(title);

        const inputWrapper: HTMLDivElement = document.createElement("div");
        inputWrapper.id = "admin-input-wrapper";
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

        const enterBtn: HTMLButtonElement = new Button("Enter", "admin-enter-btn", false, true).el;
        enterBtn.style.display = "flex";
        enterBtn.style.fontSize = "clamp(1rem, 5vw, 0.75rem)";
        enterBtn.style.lineHeight = "1.25";
        enterBtn.style.padding = "1em 2em";
        enterBtn.style.margin = "0.6rem auto 0";

        enterBtn.addEventListener("click", (): void => {
            this.drawDashboard();
        });

        inputWrapper.appendChild(nameInput);
        inputWrapper.appendChild(passwordInput.el);
        inputWrapper.appendChild(enterBtn);

        root().appendChild(inputWrapper);
    }

    private drawDashboard(): void {
        root().removeChild(this.title);
        root().removeChild(this.inputWrapper);

        const title: HTMLDivElement = new PageTitle(
            "Admin Dashboard"
        ).el;
        this.title = title;

        const wrapper: HTMLDivElement = document.createElement("div");
        this.inputWrapper = wrapper;

        const tabs: JourneyTabs = new JourneyTabs(["Chat", "Status", "SQLite"],
            (active: HTMLButtonElement): void => {
                this.changeTab(active.textContent);
            });
        tabs.el.style.maxWidth = "90%";
        tabs.el.style.margin = "auto";
        wrapper.appendChild(tabs.el);

        const box: HTMLDivElement = document.createElement("div");
        box.style.width = "100%";
        box.style.height = "100%";
        box.style.padding = "10px";
        box.style.margin = "10px 0";
        box.style.boxSizing = "border-box";
        box.style.borderRadius = "15px";
        box.style.backgroundColor = VODALUS_GREEN;
        box.style.border = `1px solid ${VODALUS_ALICEBLUE}`;

        wrapper.appendChild(box);

        root().appendChild(wrapper);
    }

    private changeTab(tab: string): void {
        switch (tab) {
            case "Chat":
                this.drawChatTab();
                break;
            case "Status":
                this.drawStatusTab();
                break;
            case "SQLite":
                this.drawSQLTab();
                break;
            default:
                console.error("invalid tab selection");
        }
    }

    // TODO: these need to all be defined
    private drawChatTab(): void {
        console.log("chat");
    }

    private drawStatusTab(): void {
    }

    private drawSQLTab(): void {
    }
}
