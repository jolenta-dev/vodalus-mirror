import { root } from "./root.js";

export function sidebarMount(): HTMLElement {
  return (
    document.getElementById("sidebar-sidenav") ??
    document.getElementById("sidebar-container") ??
    ((): HTMLElement => {
      const container: HTMLDivElement = document.createElement("div");
      container.id = "sidebar-container";
      root().appendChild(container);
      return container;
    })()
  );
}
