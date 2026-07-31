// most of this page is pretty bespoke and ends up living in just this one file
import { root } from "../assets/primitives/root.js";
import { PasswordInput } from "../radicals.js";
import { TextInput, Button, PageTitle, JourneyTabs, Select } from "../primitives.js";
import { Page } from "./Page.js";
import { VODALUS_ALICEBLUE, VODALUS_GREEN } from "../assets/theme.js";

export class AdminDashboard extends Page {
    private title: HTMLDivElement;
    private inputWrapper: HTMLDivElement;
    private box: HTMLDivElement | null;
    private chatAdminContent: HTMLDivElement | null;

    constructor() {
        super({
            statusMessageText: "why are you here? this is a nonsense page you don't need to know about...",
            nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
            nowPlayingAttribution: "Meow -- Haku (2022 Remaster)",
        });
        this.box = null;
        this.chatAdminContent = null;

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
                this.changeTab(active.textContent); // this isn't an awesome solution since clicking the same tab still redraws the whole thing, but only one person will ever see/use this page, so it's fine for now tbh
            });
        tabs.el.style.maxWidth = "90%";
        tabs.el.style.margin = "auto";
        wrapper.appendChild(tabs.el);

        const box: HTMLDivElement = document.createElement("div");
        this.box = box;
        box.style.width = "100%";
        box.style.height = "100%";
        box.style.padding = "10px";
        box.style.margin = "10px 0";
        box.style.boxSizing = "border-box";
        box.style.borderRadius = "15px";
        box.style.backgroundColor = VODALUS_GREEN;
        box.style.border = `1px solid ${VODALUS_ALICEBLUE}`;

        wrapper.appendChild(box);
        // init the dashboard on the chat panel
        this.changeTab("Chat");
        this.changeChatAdminTab("new chat");

        root().appendChild(wrapper);
    }

    private changeTab(tab: string): void {
        const box = this.box as HTMLDivElement;
        switch (tab) {
            case "Chat":
                box.innerHTML = "";
                this.drawChatTab();
                break;
            case "Status":
                box.innerHTML = "";
                this.drawStatusTab();
                break;
            case "SQLite":
                box.innerHTML = "";
                this.drawSQLTab();
                break;
            default:
                console.error("invalid tab selection");
        }
    }

    private drawChatTab(): void {
        const controlsWrapper: HTMLDivElement = document.createElement("div");
        const box = this.box as HTMLDivElement;

        const chatSettingsTitle: HTMLDivElement = new PageTitle("Katharine Controls").el; // as the name implies, this may be shortlived depending on how k2 goes
        chatSettingsTitle.style.fontSize = "0.75rem";

        // announcements ---------------------------------------
        const announcementSubtitle: HTMLHeadingElement = document.createElement("h2");
        announcementSubtitle.textContent = "Announcement Controls";

        const announcementText: HTMLDivElement = document.createElement("div");
        announcementText.textContent = "create a new announcement";
        announcementText.style.padding = "15px";

        const announcementInputWrapper: HTMLDivElement = document.createElement("div");
        const announcementInput: TextInput = new TextInput("new announcement");
        const announcementScopeInput: Select = new Select();
        const announcementCreateBtn: HTMLButtonElement = new Button("create announcement", "announcement-create-btn", true, true).el;

        announcementScopeInput.addOption("global");
        announcementScopeInput.addOption("public");

        announcementInputWrapper.appendChild(announcementInput.el);
        announcementInputWrapper.appendChild(announcementScopeInput.el);
        announcementInputWrapper.appendChild(announcementCreateBtn);

        controlsWrapper.appendChild(chatSettingsTitle);
        controlsWrapper.appendChild(announcementSubtitle);
        controlsWrapper.appendChild(announcementText);
        controlsWrapper.appendChild(announcementInputWrapper);

        // chat admin ------------------------------------------
        const chatAdminSubtitle: HTMLHeadingElement = document.createElement("h2");
        chatAdminSubtitle.textContent = "Chat Admin";

        const chatAdminContent: HTMLDivElement = document.createElement("div");
        this.chatAdminContent = chatAdminContent;
        const chatAdminTabs: HTMLDivElement = new JourneyTabs(["new chat", "members"],
            (active: HTMLButtonElement): void => {
                this.changeChatAdminTab(active.textContent);
            }).el;
        this.changeChatAdminTab("new chat");
        chatAdminTabs.style.width = "100%";
        chatAdminTabs.style.maxWidth = "";
        chatAdminTabs.style.padding = "15px";
        chatAdminTabs.style.backgroundColor = VODALUS_GREEN;

        controlsWrapper.appendChild(chatAdminSubtitle);
        controlsWrapper.appendChild(chatAdminTabs);
        controlsWrapper.appendChild(chatAdminContent);

        // pw reset --------------------------------------------
        const pwResetSubtitle: HTMLHeadingElement = document.createElement("h2");
        pwResetSubtitle.textContent = "Reset Password Controls";

        const pwResetText: HTMLDivElement = document.createElement("div");
        pwResetText.textContent = "reset a user's password";
        pwResetText.style.padding = "15px";

        const pwResetUsernameInput: HTMLInputElement = new TextInput("username").el;
        const pwResetNewPwInput: HTMLInputElement = new TextInput("new password").el;

        const pwResetBtn: HTMLButtonElement = new Button("reset password", "pw-reset-btn", true, true).el;

        controlsWrapper.appendChild(pwResetSubtitle);
        controlsWrapper.appendChild(pwResetText);
        controlsWrapper.appendChild(pwResetUsernameInput);
        controlsWrapper.appendChild(pwResetNewPwInput);
        controlsWrapper.appendChild(pwResetBtn);


        box.appendChild(controlsWrapper);
    }

    private changeChatAdminTab(changeTo: string): void {
        if (changeTo === "new chat") {
            const chatAdminContent: HTMLDivElement = this.chatAdminContent as HTMLDivElement;
            chatAdminContent.innerHTML = "";
            const chatAdminNewChatNameInput: HTMLInputElement = new TextInput("new chat name (not needed for a 2-person DM)").el;
            chatAdminNewChatNameInput.style.width = "100%";
            chatAdminNewChatNameInput.style.padding = "15px";
            const chatAdminMemberInput: HTMLInputElement = new TextInput("other members (comma separated; registered only)").el;
            chatAdminMemberInput.style.width = "100%";
            chatAdminMemberInput.style.padding = "15px";

            const chatAdminPublicToggleLabel: HTMLDivElement = document.createElement("div");
            const chatAdminPublicToggle: HTMLInputElement = document.createElement("input");
            chatAdminPublicToggleLabel.textContent = "public";
            chatAdminPublicToggleLabel.appendChild(chatAdminPublicToggle);
            chatAdminPublicToggle.type = "checkbox";
            chatAdminPublicToggleLabel.style.padding = "15px";

            const chatAdminCreateBtn: HTMLButtonElement = new Button("create", "chat-admin-create-btn", true, true).el;
            chatAdminCreateBtn.style.padding = "15px";

            chatAdminContent.appendChild(chatAdminNewChatNameInput);
            chatAdminContent.appendChild(chatAdminMemberInput);
            chatAdminContent.appendChild(chatAdminPublicToggleLabel);
            chatAdminContent.appendChild(chatAdminCreateBtn);

        } else if (changeTo === "members") {
            const chatAdminContent: HTMLDivElement = this.chatAdminContent as HTMLDivElement;
            chatAdminContent.innerHTML = ""; // jank but it works ig
            const chatAdminSelectText: HTMLDivElement = document.createElement("div");
            chatAdminSelectText.textContent = "select a chat to manage";
            chatAdminSelectText.style.padding = "15px";

            const chatAdminSelector: Select = new Select();
            chatAdminSelector.addOption("very real chat"); // TODO: make these work
            chatAdminSelector.el.style.padding = "15px";

            const chatAdminCurrentMembersSubtitle: HTMLDivElement = document.createElement("div");
            chatAdminCurrentMembersSubtitle.textContent = "current members";
            chatAdminCurrentMembersSubtitle.style.padding = "15px";
            const chatAdminCurrentMembers: HTMLDivElement = document.createElement("div");
            chatAdminCurrentMembers.style.minHeight = "50px";
            chatAdminCurrentMembers.style.padding = "15px";

            const chatAdminAddSubtitle: HTMLDivElement = document.createElement("div");
            chatAdminAddSubtitle.textContent = "add";
            chatAdminAddSubtitle.style.padding = "15px";

            const chatAdminAddInput: HTMLInputElement = new TextInput("registered users (comma separated)").el;
            chatAdminAddInput.style.padding = "15px";
            const chatAdminAddBtn: HTMLButtonElement = new Button("add members", "chat-admin-add-btn", true, true).el;
            chatAdminAddBtn.style.padding = "15px";

            const chatAdminRemoveSubtitle: HTMLDivElement = document.createElement("div");
            chatAdminRemoveSubtitle.textContent = "remove";
            chatAdminRemoveSubtitle.style.padding = "15px";

            const chatAdminRemoveInput: HTMLInputElement = new TextInput("names to remove (comma separated)").el;
            chatAdminRemoveInput.style.padding = "15px";
            const chatAdminRemoveBtn: HTMLButtonElement = new Button("remove members", "chat-admin-remove-btn", true, true).el;
            chatAdminRemoveBtn.style.padding = "15px";

            chatAdminContent.appendChild(chatAdminSelectText);
            chatAdminContent.appendChild(chatAdminSelector.el);
            chatAdminContent.appendChild(chatAdminCurrentMembersSubtitle);
            chatAdminContent.appendChild(chatAdminCurrentMembers);
            chatAdminContent.appendChild(chatAdminAddSubtitle);
            chatAdminContent.appendChild(chatAdminAddInput);
            chatAdminContent.appendChild(chatAdminAddBtn);
            chatAdminContent.appendChild(chatAdminRemoveSubtitle);
            chatAdminContent.appendChild(chatAdminRemoveInput);
            chatAdminContent.appendChild(chatAdminRemoveBtn);
        }
    }

    private drawStatusTab(): void {
        const box = this.box as HTMLDivElement;
        box.innerHTML = "";

        const statusSettingsTitle: HTMLDivElement = new PageTitle("Status Controls").el;
        statusSettingsTitle.style.fontSize = "0.75rem";

        const statusSettingsSubtitle: HTMLDivElement = document.createElement("div");
        statusSettingsSubtitle.textContent = "edit the status";

        const statusInput: HTMLInputElement = new TextInput("new status").el;
        const statusSetBtn: HTMLButtonElement = new Button("set status", "status-set-btn", true, true).el;

        box.appendChild(statusSettingsTitle);
        box.appendChild(statusInput);
        box.appendChild(statusSetBtn);
    }

    private drawSQLTab(): void { // helper methods will be needed en masse here when k2 api gets implemented
        const box = this.box as HTMLDivElement;
        box.innerHTML = "";

        const SQLTitle: HTMLDivElement = new PageTitle("SQL DBs").el;
        SQLTitle.style.fontSize = "0.75rem";

        box.appendChild(SQLTitle);
    }
}
