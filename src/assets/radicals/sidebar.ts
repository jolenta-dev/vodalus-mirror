import { sidebarButton } from "../primitives/sidebar-button.js";
import { sidebarInfo } from "../primitives/sidebar-info.js";
import { root } from "../primitives/root.js";

const PAGE_LIST: [string, string][] = [
  ["home", "/"],
  ["convene", "/chat"],
  ["guestbook", "/guestbook"],
  ["journey", "/journey"],
  ["the atrium of time", "/atrium"],
  ["tzadkiel's ship", "/tzadkiels"],
  ["botanic gardens", "/botanic-gardens"],
  ["about", "/about"],
];

export class sidebar {
  constructor(
    statusMessageText?: string,
    nowPlayingImage?: string,
    nowPlayingAttribution?: string,
    shadow: boolean = true,
  ) {
    this.createContainer();

    for (const [text, href] of PAGE_LIST) {
      new sidebarButton(text, href, shadow);
    }

    new sidebarInfo(statusMessageText, nowPlayingImage, nowPlayingAttribution, shadow);
  }

  private createContainer(): void {
    if (document.getElementById("sidebar-container")) {
      return;
    }

    const container: HTMLDivElement = document.createElement("div");
    container.id = "sidebar-container";
    container.className = "sidebar-container";
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "180px";
    container.style.zIndex = "10";

    const sidenav: HTMLDivElement = document.createElement("div");
    sidenav.id = "sidebar-sidenav";
    sidenav.className = "sidenav";
    sidenav.style.width = "180px";
    sidenav.style.height = "auto";
    sidenav.style.minHeight = "100dvh";
    sidenav.style.maxHeight = "100dvh";
    sidenav.style.position = "fixed";
    sidenav.style.top = "0";
    sidenav.style.left = "0";
    sidenav.style.backgroundColor = "transparent";
    sidenav.style.fontFamily = '"Meylda", ui-serif, Georgia, "Times New Roman", serif';
    sidenav.style.overflowY = "auto";
    sidenav.style.overflowX = "hidden";
    sidenav.style.paddingTop = "20px";
    sidenav.style.display = "flex";
    sidenav.style.flexDirection = "column";
    sidenav.style.boxSizing = "border-box";

    container.appendChild(sidenav);

    const main = root();
    if (main.id === "main") {
      main.style.marginLeft = "180px";
    }

    document.body.prepend(container);
  }
}
