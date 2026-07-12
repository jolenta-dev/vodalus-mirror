export class JourneyList {
  list: HTMLUListElement;
  constructor() {
    const list: HTMLUListElement = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0 0.25rem 0.25rem";
    list.style.width = "90%";
    list.style.maxWidth = "36rem";
    list.style.textAlign = "center";
    list.style.flex = "1 1 0";
    list.style.minHeight = "0";
    list.style.overflowX = "hidden";
    list.style.overflowY = "auto";
    list.style.overscrollBehavior = "contain";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.justifyContent = "flex-end";

    this.list = list;
  }

  public append(str: string): void {
    const li: HTMLLIElement = document.createElement("li");
    li.textContent = str;
    li.style.margin = "0.35em 0";
    li.style.flexShrink = "0";
    li.style.overflowWrap = "break-word";
    li.style.wordBreak = "break-word";

    this.list.appendChild(li);
  }
}
