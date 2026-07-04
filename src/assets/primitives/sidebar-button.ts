import { sidebarMount } from "./sidebar-mount.js";

export class sidebarButton {
  constructor(textContent: string, href: string, shadow: boolean = true) {
    const wrapper: HTMLDivElement = document.createElement("div");
    wrapper.className = "nav-item";
    wrapper.style.position = "relative";
    wrapper.style.marginBottom = "10px";
    wrapper.style.marginLeft = "10px";
    wrapper.style.marginRight = "10px";
    wrapper.style.flexShrink = "0";

    const el: HTMLAnchorElement = document.createElement("a");
    el.textContent = textContent;
    el.href = href;

    el.style.cursor = "url('/multimedia/cursors/pink/link.cur'), pointer";
    el.style.fontSize = "25px";
    el.style.padding = "10px 8px 10px 16px";
    el.style.textDecoration = "none";
    el.style.fontFamily = "inherit";
    el.style.color = "aliceblue";
    el.style.backgroundColor = "#334232";
    el.style.display = "flex";
    el.style.lineHeight = "1.2";
    el.style.justifyContent = "left";
    el.style.position = "relative";
    el.style.zIndex = "1";
    el.style.transition = "transform 0.1s ease";
    el.style.borderRadius = "0px 4px 20% / 90% 1px";
    el.style.height = "50px";
    el.style.alignItems = "center";
    el.style.paddingLeft = "0.2em";

    el.addEventListener("mouseenter", () => {
      el.style.color = "black";
      el.style.transform = "translate(-6px, 6px)";
    });
    el.addEventListener("mouseleave", () => {
      el.style.color = "aliceblue";
      el.style.transform = "";
    });

    if (shadow) {
      const shadowEl: HTMLDivElement = document.createElement("div");
      shadowEl.style.position = "absolute";
      shadowEl.style.inset = "0";
      shadowEl.style.backgroundColor = "black";
      shadowEl.style.transform = "translate(-8px, 8px)";
      shadowEl.style.borderRadius = "0px 4px 20% / 90% 1px";
      wrapper.appendChild(shadowEl);
    }

    wrapper.appendChild(el);
    sidebarMount().appendChild(wrapper);
  }
}
