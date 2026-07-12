import { sidebarMount } from "./sidebar-mount.js";
import { Component } from "./component.js";
import { VODALUS_ALICEBLUE, VODALUS_GREEN, VODALUS_CURSOR_LINK, VODALUS_NAV_RADIUS, VODALUS_SHADOW_OFFSET, VODALUS_HOVER_SHIFT } from "../theme.js";

export class SidebarButton extends Component<HTMLDivElement> {
  constructor(textContent: string, href: string, shadow: boolean = true) {
    const wrapper: HTMLDivElement = document.createElement("div");
    wrapper.className = "nav-item";
    wrapper.style.position = "relative";
    wrapper.style.marginBottom = "10px";
    wrapper.style.marginLeft = "10px";
    wrapper.style.marginRight = "10px";
    wrapper.style.flexShrink = "0";

    const link: HTMLAnchorElement = document.createElement("a");
    link.textContent = textContent;
    link.href = href;

    link.style.cursor = VODALUS_CURSOR_LINK;
    link.style.fontSize = "25px";
    link.style.padding = "10px 8px 10px 16px";
    link.style.textDecoration = "none";
    link.style.fontFamily = "inherit";
    link.style.color = VODALUS_ALICEBLUE;
    link.style.backgroundColor = VODALUS_GREEN;
    link.style.display = "flex";
    link.style.lineHeight = "1.2";
    link.style.justifyContent = "left";
    link.style.position = "relative";
    link.style.zIndex = "1";
    link.style.transition = "transform 0.1s ease";
    link.style.borderRadius = VODALUS_NAV_RADIUS;
    link.style.height = "50px";
    link.style.alignItems = "center";
    link.style.paddingLeft = "0.2em";

    link.addEventListener("mouseenter", () => {
      link.style.color = "black";
      link.style.transform = VODALUS_HOVER_SHIFT;
    });
    link.addEventListener("mouseleave", () => {
      link.style.color = VODALUS_ALICEBLUE;
      link.style.transform = "";
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

    wrapper.appendChild(link);

    super(wrapper);
    this.mount(sidebarMount());
  }
}
