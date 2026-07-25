import { PageTitle, Button, TextInput } from "../primitives.js";
import { PasswordInput } from "../radicals.js";
import { root } from "../assets/primitives/root.js";
import { Page } from "./Page.js";
import { ClockCursor } from "../effects.js";

export class Atrium extends Page {
    title: HTMLDivElement;
    enterBtn: HTMLButtonElement;

    constructor() {
        super({
            statusMessageText: "Pssst... got any fih?",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "White noise 50hr spiritual healing revival chakra balancing...",
        });
        const title: HTMLDivElement = new PageTitle(
            "Triskele has brought you to a strange place. The hall stretches out before you, at its end you hear the voice of a young woman..."
        ).el;
        this.title = title;

        title.style.textAlign = "center";
        title.style.display = "flex";
        title.style.paddingTop = "20vh";

        root().appendChild(title);

        const enterBtn = new Button("Proceed down the hall", "enter-btn", false, true).el;
        this.enterBtn = enterBtn;

        enterBtn.style.display = "flex";
        enterBtn.style.fontSize = "clamp(1.5rem, 6vw, 2rem)";
        enterBtn.style.lineHeight = "1.25";
        enterBtn.style.padding = "1em 2em";
        enterBtn.style.margin = "0.6rem auto 0";

        root().appendChild(enterBtn);

        enterBtn.addEventListener("click", (): void => {
            this.Enter()
        });
    }

    private Enter(): void {
        root().removeChild(this.title);
        this.title = document.createElement("div");

        this.title.appendChild(new PageTitle(
            "Valeria greets you at the doors of the Atrium of Time:"
        ).el);
        this.title.appendChild(new PageTitle(`
            "Lictor, have you brought the pharse of the Increate's creation? Speak your name with this phrase and enter the Corridors of Time."`
        ).el);

        this.title.style.textAlign = "center";
        this.title.style.display = "flex";
        this.title.style.paddingTop = "10vh";
        this.title.style.flexDirection = "column";

        root().removeChild(this.enterBtn);

        this.PointerOrbit.destroy();
        new ClockCursor();

        root().appendChild(this.title);

        const atriumInnerInputWrapper: HTMLDivElement = document.createElement("div");
        atriumInnerInputWrapper.id = "atrium-inner-input-wrapper";

        atriumInnerInputWrapper.style.display = "flex";
        atriumInnerInputWrapper.style.flexDirection = "column";
        atriumInnerInputWrapper.style.width = "40vw";
        atriumInnerInputWrapper.style.position = "absolute";
        atriumInnerInputWrapper.style.left = "25vw";

        const nameInput: HTMLInputElement = new TextInput("Your name").el;
        nameInput.style.margin = "1em";
        nameInput.style.height = "4vh";

        const phraseInput: HTMLInputElement = new TextInput("Phrase of the Increate's creation").el;
        phraseInput.style.margin = "1em";
        phraseInput.style.height = "4vh";

        const corridorsBtn: HTMLButtonElement = new Button("Enter the Corridors of Time", "corridors-btn", false, true).el;
        corridorsBtn.style.display = "flex";
        corridorsBtn.style.fontSize = "clamp(1rem, 5vw, 1.5rem)";
        corridorsBtn.style.lineHeight = "1.25";
        corridorsBtn.style.padding = "1em 2em";
        corridorsBtn.style.margin = "0.6rem auto 0";

        atriumInnerInputWrapper.appendChild(nameInput);
        atriumInnerInputWrapper.appendChild(phraseInput);
        atriumInnerInputWrapper.appendChild(corridorsBtn);

        root().appendChild(atriumInnerInputWrapper);

        const necropolisButton: HTMLButtonElement = new Button("Return to the Necropolis", "necropolis-btn", false, true).el;
        necropolisButton.style.position = "fixed";
        necropolisButton.style.left = "calc(160px + 2rem)"; // for sidebar offset
        necropolisButton.style.bottom = "max(1rem, env(safe-area-insert-bottom, 0px))";

        root().appendChild(necropolisButton);

        necropolisButton.addEventListener("click", (): void => {
            this.EnterCorridors();
        });

    }

    private EnterCorridors(): void {
        root().removeChild(this.title);
        root().removeChild(document.getElementById("atrium-inner-input-wrapper") as HTMLElement);
        root().removeChild(document.getElementById("necropolis-btn") as HTMLElement);

        this.title = document.createElement("div");

        this.title.appendChild(new PageTitle(
            "You enter the Corridors of Time."
        ).el);
        this.title.appendChild(new PageTitle(
            "The nature of our universe unfolds itself. Begin anew, Conciliator?"
        ).el);

        this.title.style.textAlign = "center";
        this.title.style.display = "flex";
        this.title.style.paddingTop = "10vh";
        this.title.style.flexDirection = "column";

        root().appendChild(this.title);

        const corridorsInputWrapper: HTMLDivElement = document.createElement("div");
        corridorsInputWrapper.id = "atrium-inner-input-wrapper";

        corridorsInputWrapper.style.display = "flex";
        corridorsInputWrapper.style.flexDirection = "column";
        corridorsInputWrapper.style.width = "40vw";
        corridorsInputWrapper.style.position = "absolute";
        corridorsInputWrapper.style.left = "25vw";

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

        const corridorsBtn: HTMLButtonElement = new Button("Enter the Corridors of Time", "corridors-btn", false, true).el;
        corridorsBtn.style.display = "flex";
        corridorsBtn.style.fontSize = "clamp(1rem, 5vw, 1.5rem)";
        corridorsBtn.style.lineHeight = "1.25";
        corridorsBtn.style.padding = "1em 2em";
        corridorsBtn.style.margin = "0.6rem auto 0";

        corridorsInputWrapper.appendChild(nameInput);
        corridorsInputWrapper.appendChild(passwordInput.el);
        corridorsInputWrapper.appendChild(corridorsBtn);

        root().appendChild(corridorsInputWrapper);

    }
}
