import { root } from "./root.js";

export class table {
  rows: number;
  tbody: HTMLTableSectionElement;

  constructor(rows: number, columns: number, headers: string[]) {
    this.rows = 0;
    this.tbody = document.createElement("tbody");
    const t: HTMLTableElement = document.createElement("table");
    t.style.tableLayout = "fixed";
    t.style.width = "90%";
    t.style.margin = "10px auto";
    t.style.borderCollapse = "collapse";
    root().appendChild(t);

    const thead: HTMLHeadElement = document.createElement("thead");
    const tr: HTMLTableRowElement = document.createElement("tr");
    if (headers) {
      if (headers.length != columns) return; // TODO: add some communication of the error here.
      for (let i: number = 0; i < headers.length; i++) {
        let th: HTMLTableCellElement = document.createElement("th");
        th.textContent = headers[i] as string;
        th.style.padding = "0.6em";
        th.style.verticalAlign = "top";
        th.style.border = "1px solid #5c5c5c";
        th.style.background = "rgba(255, 255, 255, 0.07)";
        th.style.color = "#f4f4f4";
        th.style.fontWeight = "normal";
        th.style.textAlign = "right";
        th.style.width = "20%";
        tr.appendChild(th);
      }
    }

    if (!rows) return;
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
      td.style.border = "1px solid #5c5c5c";
      td.style.color = "#f4f4f4";
      td.style.textAlign = "right";
      td.style.width = "20%";
      tr.appendChild(td);
    }
    tr.style.backgroundColor = (this.rows % 2) ? "rgba(255, 255, 255, 0.045" : "rgba(0, 0, 0, 0.08)";
    this.tbody.appendChild(tr);
    this.rows++;
  }
}
