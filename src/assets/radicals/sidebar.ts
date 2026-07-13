import { SidebarButton } from "../primitives/sidebar-button.js";
import { SidebarInfo } from "../primitives/sidebar-info.js";
import { Component } from "../primitives/component.js";
import { root } from "../primitives/root.js";
import { VODALUS_SERIF, VODALUS_GREEN, VODALUS_CURSOR_LINK } from "../theme.js";

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

export class Sidebar extends Component<HTMLDivElement> {
  constructor(
    statusMessageText?: string,
    nowPlayingImage?: string,
    nowPlayingAttribution?: string,
    shadow: boolean = true,
  ) {
    super(Sidebar.resolveContainer());
    this.setupMobileSidebarToggle();

    for (const [text, href] of PAGE_LIST) {
      new SidebarButton(text, href, shadow);
    }

    new SidebarInfo(statusMessageText, nowPlayingImage, nowPlayingAttribution, shadow);
  }

  private static resolveContainer(): HTMLDivElement {
    const existing = document.getElementById("sidebar-container");
    if (existing) {
      return existing as HTMLDivElement;
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
    sidenav.style.fontFamily = VODALUS_SERIF;
    sidenav.style.overflowY = "auto";
    sidenav.style.overflowX = "hidden";
    sidenav.style.paddingTop = "20px";
    sidenav.style.display = "flex";
    sidenav.style.flexDirection = "column";
    sidenav.style.boxSizing = "border-box";
    sidenav.style.scrollbarWidth = "none";

    container.appendChild(sidenav);

    const toggle: HTMLButtonElement = document.createElement("button");
    toggle.id = "sidebar-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Toggle navigation");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "☰";
    toggle.style.display = "none";
    toggle.style.position = "absolute";
    toggle.style.bottom = "20px";
    toggle.style.right = "0";
    toggle.style.marginLeft = "20px";
    toggle.style.transform = "translateX(130%)";
    toggle.style.zIndex = "1";
    toggle.style.width = "28px";
    toggle.style.height = "48px";
    toggle.style.padding = "0";
    toggle.style.background = VODALUS_GREEN;
    toggle.style.border = "none";
    toggle.style.borderRadius = "6px";
    toggle.style.color = "black";
    toggle.style.fontSize = "16px";
    toggle.style.lineHeight = "48px";
    toggle.style.textAlign = "center";
    toggle.style.cursor = VODALUS_CURSOR_LINK;
    container.appendChild(toggle);

    const main = root();
    if (main.id === "main") {
      main.style.marginLeft = "180px";
    }

    document.body.prepend(container);

    return container;
  }

  private setupMobileSidebarToggle(): void {
    const sidebarContainer = document.getElementById("sidebar-container") as HTMLElement;
    const sidebarToggle = document.getElementById("sidebar-toggle") as HTMLElement;
    const sidenav = document.getElementById("sidebar-sidenav");
    if (!sidebarContainer || !sidebarToggle || sidebarContainer.dataset.toggleReady === "true") return;
    sidebarContainer.dataset.toggleReady = "true";

    const mobileQuery: MediaQueryList = window.matchMedia("(max-width: 600px)");

    const backdrop: HTMLDivElement = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.style.display = "none";
    backdrop.style.position = "fixed";
    backdrop.style.inset = "0";
    backdrop.style.zIndex = "1100";
    backdrop.style.background = "rgba(0, 0, 0, 0.35)";
    document.body.appendChild(backdrop);

    function applyLayout(): void {
      if (mobileQuery.matches) {
        sidebarContainer.style.width = "min(50vw, 280px)";
        sidebarContainer.style.height = "100svh";
        sidebarContainer.style.zIndex = "1200";
        sidebarContainer.style.transition = "transform 0.3s ease";
        sidebarContainer.style.transform = sidebarContainer.classList.contains("is-open")
          ? "translateX(0)"
          : "translateX(calc(-100% + 8vw))";
        sidebarToggle.style.display = "block";

        if (sidenav) {
          sidenav.style.position = "absolute";
          sidenav.style.inset = "0";
          sidenav.style.width = "100%";
          sidenav.style.height = "100%";
          sidenav.style.minHeight = "0";
          sidenav.style.maxHeight = "100%";
        }
      } else {
        sidebarContainer.style.width = "180px";
        sidebarContainer.style.height = "";
        sidebarContainer.style.zIndex = "10";
        sidebarContainer.style.transition = "";
        sidebarContainer.style.transform = "";
        sidebarToggle.style.display = "none";

        if (sidenav) {
          sidenav.style.position = "fixed";
          sidenav.style.inset = "";
          sidenav.style.top = "0";
          sidenav.style.left = "0";
          sidenav.style.width = "180px";
          sidenav.style.height = "auto";
          sidenav.style.minHeight = "100dvh";
          sidenav.style.maxHeight = "100dvh";
        }
      }
    }

    function closeSidebar(): void {
      sidebarContainer.classList.remove("is-open");
      document.body.classList.remove("sidebar-open");
      sidebarToggle.setAttribute("aria-expanded", "false");
      backdrop.style.display = "none";
      applyLayout();
    }

    function syncState(): void {
      if (!mobileQuery.matches) {
        closeSidebar();
      }
      applyLayout();
      backdrop.style.display =
        mobileQuery.matches && document.body.classList.contains("sidebar-open") ? "block" : "none";
      sidebarToggle.setAttribute(
        "aria-expanded",
        sidebarContainer.classList.contains("is-open") ? "true" : "false",
      );
    }

    sidebarToggle.addEventListener("click", function (): void {
      if (!mobileQuery.matches) return;
      const open: boolean = sidebarContainer.classList.toggle("is-open");
      document.body.classList.toggle("sidebar-open", open);
      sidebarToggle.setAttribute("aria-expanded", open ? "true" : "false");
      applyLayout();
      backdrop.style.display = open ? "block" : "none";
    });

    backdrop.addEventListener("click", closeSidebar);

    if (sidenav) {
      sidenav.addEventListener("click", function (e): void {
        const target = e.target instanceof Element ? e.target : null;
        const link = target?.closest("a[href]") ?? null;
        if (!link || !mobileQuery.matches) return;
        closeSidebar();
      });
    }

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener("change", syncState);
    }

    syncState();
  }
}
