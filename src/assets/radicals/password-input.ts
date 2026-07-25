import { TextInput } from "../primitives/text-input.js";
import { Button } from "../primitives/button.js";

export class PasswordInput {
    el: HTMLDivElement;
    pwInput: HTMLInputElement;
    revealBtn: HTMLButtonElement;

    constructor(text?: string) {
        const container: HTMLDivElement = document.createElement("div");
        this.el = container;
        let pwInput: HTMLInputElement;

        if (text) {
            pwInput = new TextInput(text).el;
        } else {
            pwInput = new TextInput("Your password").el;
        }

        pwInput.type = "password";

        this.pwInput = pwInput;

        const revealBtn: HTMLButtonElement = new Button("Show", "reveal-btn", true, true).el;
        this.revealBtn = revealBtn;

        container.appendChild(pwInput);
        container.appendChild(revealBtn);

        revealBtn.addEventListener("click", (): void => {
            this.RevealToggle();
        });
    }

    private RevealToggle(): void {
        if (this.pwInput.type === "text") {
            this.pwInput.type = "password";
        } else {
            this.pwInput.type = "text";
        }
    }
}
