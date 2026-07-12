import { sidebarMount } from "./sidebar-mount.js";
import { VODALUS_ALICEBLUE, VODALUS_GREEN, VODALUS_CURSOR_LINK, VODALUS_NAV_RADIUS, VODALUS_SHADOW_OFFSET, VODALUS_HOVER_SHIFT } from "../theme.js";

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

    el.style.cursor = VODALUS_CURSOR_LINK;
    el.style.fontSize = "25px";
    el.style.padding = "10px 8px 10px 16px";
    el.style.textDecoration = "none";
    el.style.fontFamily = "inherit";
    el.style.color = VODALUS_ALICEBLUE;
    el.style.backgroundColor = VODALUS_GREEN;
    el.style.display = "flex";
    el.style.lineHeight = "1.2";
    el.style.justifyContent = "left";
    el.style.position = "relative";
    el.style.zIndex = "1";
    el.style.transition = "transform 0.1s ease";
    el.style.borderRadius = VODALUS_NAV_RADIUS;
    el.style.height = "50px";
    el.style.alignItems = "center";
    el.style.paddingLeft = "0.2em";

    el.addEventListener("mouseenter", () => {
      el.style.color = "black";
      el.style.transform = VODALUS_HOVER_SHIFT;
    });
    el.addEventListener("mouseleave", () => {
      el.style.color = VODALUS_ALICEBLUE;
      el.style.transform = "";
    });

    if (shadow) {
      const shadowEl: HTMLDivElement = document.createElement("div");
      shadowEl.style.position = "absolute";
      shadowEl.style.inset = "0";
      shadowEl.style.backgroundColor = "black";
      shadowEl.style.transform = VODALUS_SHADOW_OFFSET;
      shadowEl.style.borderRadius = VODALUS_NAV_RADIUS;
      wrapper.appendChild(shadowEl);
    }

    wrapper.appendChild(el);
    sidebarMount().appendChild(wrapper);
  }
}
