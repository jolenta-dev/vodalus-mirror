import { Component } from "./component.js";
import { VODALUS_TABLE_TEXT, VODALUS_TABLE_BORDER } from "../theme.js";

export class Table extends Component<HTMLTableElement> {
    rows: number;
    tbody: HTMLTableSectionElement;

    constructor(rows: number, columns: number, headers: string[]) {
        const t: HTMLTableElement = document.createElement("table");
        t.style.tableLayout = "fixed";
        t.style.width = "90%";
        t.style.margin = "10px auto";
        t.style.borderCollapse = "collapse";

        super(t);
        this.rows = 0;
        this.tbody = document.createElement("tbody");
        this.mount();

        const thead: HTMLHeadElement = document.createElement("thead");
        const tr: HTMLTableRowElement = document.createElement("tr");
        if (headers) {
            if (headers.length != columns) return; // TODO: add some communication of the error here.
            for (let i: number = 0; i < headers.length; i++) {
                let th: HTMLTableCellElement = document.createElement("th");
                th.textContent = headers[i] as string;
                th.style.padding = "0.6em";
                th.style.verticalAlign = "top";
                th.style.border = `1px solid ${VODALUS_TABLE_BORDER}`;
                th.style.background = "rgba(255, 255, 255, 0.07)";
                th.style.color = VODALUS_TABLE_TEXT;
                th.style.fontWeight = "normal";
                th.style.textAlign = "right";
                th.style.width = "20%";
                th.style.textDecoration = "underline";
                tr.appendChild(th);
            }
        }

        thead.appendChild(tr);
        t.appendChild(thead);
        t.appendChild(this.tbody);

        for (let i: number = 0; i < rows; i++) {
            let arr: string[] = new Array(columns);
            for (let j: number = 0; j < columns; j++) {
                arr[j] = "filler content";
            }
            this.addRow(columns, arr);
        }
    }

    public addRow(cols: number, content: string[]): void {
        const tr: HTMLTableRowElement = document.createElement("tr");
        for (let i: number = 0; i < cols; i++) {
            let td: HTMLTableCellElement = document.createElement("td");
            td.textContent = content[i] as string;
            td.style.padding = "0.6em";
            td.style.verticalAlign = "top";
            td.style.border = `1px solid ${VODALUS_TABLE_BORDER}`;
            td.style.color = VODALUS_TABLE_TEXT;
            td.style.textAlign = "right";
            td.style.width = "20%";
            tr.appendChild(td);
        }
        tr.style.backgroundColor = (this.rows % 2) ? "rgba(255, 255, 255, 0.045)" : "rgba(0, 0, 0, 0.08)";
        this.tbody.appendChild(tr);
        this.rows++;
    }
}
