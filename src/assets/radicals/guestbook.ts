import { Table } from "../primitives/table.js";
import { Button } from "../primitives/button.js";
import { TextInput } from "../primitives/text-input.js";
import { Component } from "../primitives/component.js";

export class GuestbookTable extends Component<HTMLDivElement> {
    guestbookTable: Table;
    constructor(rows: number, content: string[][]) {
        const guestbookWrapper: HTMLDivElement = document.createElement("div");
        super(guestbookWrapper);
        this.mount();

        const inputWrapper: HTMLDivElement = document.createElement("div");
        inputWrapper.style.display = "flex";
        inputWrapper.style.alignItems = "stretch";
        inputWrapper.style.width = "100%";
        inputWrapper.style.margin = "10px 0";
        inputWrapper.style.boxSizing = "border-box";
        inputWrapper.style.gap = "0";
        inputWrapper.style.justifyContent = "center";
        guestbookWrapper.append(inputWrapper);
        const nicknameInput: TextInput = new TextInput("nickname");
        const websiteInput: TextInput = new TextInput("website");
        const noteInput: TextInput = new TextInput("note");
        const submitBtn: Button = new Button("add your name", "", true);
        nicknameInput.el.style.borderRadius = "5px 0px 0px 5px";
        websiteInput.el.style.borderRadius = "0px";
        noteInput.el.style.borderRadius = "0px";
        submitBtn.el.style.borderRadius = "0px 5px 5px 0px";
        inputWrapper.appendChild(nicknameInput.el);
        inputWrapper.appendChild(websiteInput.el);
        inputWrapper.appendChild(noteInput.el);
        inputWrapper.appendChild(submitBtn.el);

        const guestbookTable: Table = new Table(0, 4, ["date", "name", "website", "note"]);
        this.guestbookTable = guestbookTable;

        for (let i: number = 0; i < rows; i++) {
            guestbookTable.addRow(4, content[i] as string[]);
        }
    }

    public addEntry(content: string[]): void {
        this.guestbookTable.addRow(4, content);
    }
}
