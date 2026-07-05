import { root } from "./root.js";

export class pageTitle {
  constructor(content: string) {
    const titleWrapper: HTMLDivElement = document.createElement("div");
    const title: HTMLHeadingElement = document.createElement("h1");
    titleWrapper.appendChild(title);
    title.innerHTML = "<h2><b>" + content + "</b></h2>";
    titleWrapper.style.display = "flex";
    titleWrapper.style.justifyContent = "center";
    titleWrapper.style.fontFamily = `"Meylda", ui-serif, Georgia, "Times New Roman", serif`;

    root().appendChild(titleWrapper);
  }
}
