import { sidebarMount } from "./sidebar-mount.js";
import { VODALUS_SANS, VODALUS_CURSOR_DEFAULT, VODALUS_SHADOW_OFFSET, VODALUS_HOVER_SHIFT } from "../theme.js";

export class sidebarInfo {
  constructor(
    statusMessageText?: string,
    nowPlayingImage?: string,
    nowPlayingAttribution?: string,
    shadow: boolean = true,
  ) {
    const wrapper: HTMLDivElement = document.createElement("div");
    wrapper.className = "stack-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.marginTop = "auto";
    wrapper.style.flexShrink = "0";
    wrapper.style.alignSelf = "stretch";
    wrapper.style.width = "100%";
    wrapper.style.marginBottom = "20px";
    wrapper.style.boxSizing = "border-box";

    const bottomStack: HTMLDivElement = document.createElement("div");
    bottomStack.id = "sidebar-info";
    bottomStack.className = "sidenav-bottom-stack";
    bottomStack.style.position = "relative";
    bottomStack.style.zIndex = "1";
    bottomStack.style.display = "flex";
    bottomStack.style.flexDirection = "column";
    bottomStack.style.gap = "0.35rem";
    bottomStack.style.marginLeft = "10px";
    bottomStack.style.padding = "8px 8px 8px 16px";
    bottomStack.style.boxSizing = "border-box";
    bottomStack.style.fontFamily = VODALUS_SANS;
    bottomStack.style.cursor = VODALUS_CURSOR_DEFAULT;
    bottomStack.style.transition = "transform 0.1s ease";

    const background: HTMLDivElement = document.createElement("div");
    background.style.content = "";
    background.style.position = "absolute";
    background.style.inset = "0";
    background.style.backgroundColor = "cornsilk";
    background.style.zIndex = "-1";
    bottomStack.appendChild(background);

    bottomStack.addEventListener("mouseenter", () => {
      bottomStack.style.transform = VODALUS_HOVER_SHIFT;
    });
    bottomStack.addEventListener("mouseleave", () => {
      bottomStack.style.transform = "";
    });

    const status: HTMLDivElement = document.createElement("div");
    status.id = "status";
    status.className = "status";
    bottomStack.append(status);

    const statusAnnouncement: HTMLSpanElement = document.createElement("span");
    statusAnnouncement.id = "statusAnnouncement";
    statusAnnouncement.className = "status-announcement";
    statusAnnouncement.textContent = "Jolenta's current status:"
    statusAnnouncement.style.fontSize = "16px";
    statusAnnouncement.style.lineHeight = "1.3";
    statusAnnouncement.style.fontWeight = "bold";
    statusAnnouncement.style.color = "pink";
    statusAnnouncement.style.display = "block";
    status.append(statusAnnouncement);

    const statusMessage: HTMLSpanElement = document.createElement("span");
    statusMessage.id = "status-message";
    statusMessage.className = "status-message";
    statusMessage.textContent = statusMessageText as string;
    statusMessage.style.fontSize = "16px";
    statusMessage.style.lineHeight = "1.3";
    statusMessage.style.color = "black";
    statusMessage.style.cursor = VODALUS_CURSOR_DEFAULT;
    statusMessage.style.fontStyle = "italic";
    statusMessage.style.display = "block";
    status.append(statusMessage);

    const nowPlaying: HTMLDivElement = document.createElement("div");
    nowPlaying.id = "nowplaying";
    nowPlaying.className = "nowplaying";
    nowPlaying.style.fontSize = "9px";
    nowPlaying.style.lineHeight = "1.3";
    nowPlaying.style.color = "black";
    bottomStack.append(nowPlaying);

    const trackArt: HTMLImageElement = document.createElement("img");
    trackArt.id = "track-art";
    trackArt.className = "trackart";
    trackArt.src = nowPlayingImage as string;
    trackArt.style.width = "48px";
    trackArt.style.height = "48px";
    trackArt.style.objectFit = "cover";
    trackArt.style.marginBottom = "4px";
    trackArt.style.display = "block";
    trackArt.style.borderRadius = "4px";
    nowPlaying.append(trackArt);

    const trackInfo: HTMLDivElement = document.createElement("div");
    trackInfo.id = "track-info";
    trackInfo.className = "trackinfo";
    trackInfo.textContent = "Currently listening to:";

    const trackTitle: HTMLSpanElement = document.createElement("span");
    trackTitle.id = "track-title";
    trackTitle.textContent = nowPlayingAttribution as string;
    trackTitle.style.fontWeight = "bold";
    trackTitle.style.display = "block";
    trackInfo.append(trackTitle);
    nowPlaying.append(trackInfo);

    if (shadow) {
      const shadowEl: HTMLDivElement = document.createElement("div");
      shadowEl.style.position = "absolute";
      shadowEl.style.inset = "0";
      shadowEl.style.backgroundColor = "black";
      shadowEl.style.transform = VODALUS_SHADOW_OFFSET;
      shadowEl.style.zIndex = "0";
      wrapper.appendChild(shadowEl);
    }

    wrapper.appendChild(bottomStack);
    sidebarMount().appendChild(wrapper);
  }
}
