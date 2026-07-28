import { root } from "../assets/primitives/root.js";
import { PasswordInput } from "../radicals.js";
import { TextInput, Button, PageTitle } from "../primitives.js";
import { Page } from "./Page.js";

export class AdminDashboard extends Page {
    constructor() {
        super({
            statusMessageText: "why are you here? this is a nonsense page you don't need to know about...",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "Meow -- Haku (2022 Remaster)",
        });
        const title: HTMLDivElement = new PageTitle(
            "You sit before the Inire's mirrors and machines, each more wretched than the last. Only the chosen few may enter."
        ).el;
        title.style.textAlign = "center";
        title.style.display = "flex";
        title.style.paddingTop = "20vh";

        root().appendChild(title);

        const inputWrapper: HTMLDivElement = document.createElement("div");
        inputWrapper.id = "admin-input-wrapper";

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

        inputWrapper.appendChild(nameInput);
        inputWrapper.appendChild(passwordInput.el);
        inputWrapper.appendChild(enterBtn);

        root().appendChild(inputWrapper);
    }
}
