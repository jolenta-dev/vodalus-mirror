import { table } from "../primitives/table.js";
import { button } from "../primitives/button.js";
import { textInput } from "../primitives/text-input.js";
import { root } from "../primitives/root.js";

export class guestbook {
  guestbookTable: table;
  constructor(rows: number, content: string[][]) {
    const guestbookWrapper: HTMLDivElement = document.createElement("div");
    root().appendChild(guestbookWrapper);

    const inputWrapper: HTMLDivElement = document.createElement("div");
    inputWrapper.style.display = "flex";
    inputWrapper.style.alignItems = "stretch";
    inputWrapper.style.width = "100%";
    inputWrapper.style.margin = "10px 0";
    inputWrapper.style.boxSizing = "border-box";
    inputWrapper.style.gap = "0";
    inputWrapper.style.justifyContent = "center";
    guestbookWrapper.append(inputWrapper);
    const nicknameInput: textInput = new textInput("nickname");
    const websiteInput: textInput = new textInput("website");
    const noteInput: textInput = new textInput("note");
    const submitBtn: button = new button("add your name", "", true);
    nicknameInput.input.style.borderRadius = "5px 0px 0px 5px";
    websiteInput.input.style.borderRadius = "0px";
    noteInput.input.style.borderRadius = "0px";
    submitBtn.btn.style.borderRadius = "0px 5px 5px 0px";
    inputWrapper.appendChild(nicknameInput.input);
    inputWrapper.appendChild(websiteInput.input);
    inputWrapper.appendChild(noteInput.input);
    inputWrapper.appendChild(submitBtn.btn);

    const guestbookTable: table = new table(0, 4, ["date", "name", "website", "note"]);
    this.guestbookTable = guestbookTable;

    for (let i: number = 0; i < rows; i++) {
      guestbookTable.addRow(4, content[i] as string[]);
    }
  }

  public addEntry(content: string[]): void {
    this.guestbookTable.addRow(4, content);
  }
}
