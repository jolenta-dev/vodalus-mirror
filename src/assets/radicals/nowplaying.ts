import { Component } from "../primitives/component.js";

const IDLE_AFTER_SCROBBLE_MS = 15 * 60 * 1000;
const POLL_MS = 15_000;
const IDLE_TITLE = "alone with my thoughts";

type LastFmImage = { size: string; "#text": string };
type LastFmTrack = {
    name: string;
    artist?: { "#text"?: string };
    album?: { "#text"?: string };
    image?: LastFmImage[];
    date?: { uts?: string };
    "@attr"?: { nowplaying?: string };
};

export class NowPlaying extends Component<HTMLDivElement> {
    private lastDisplayed = { name: "", artist: "" };
    private trackArt: HTMLImageElement;
    private trackTitle: HTMLSpanElement;
    private trackArtist: HTMLSpanElement;
    private trackArtistWrap: HTMLElement;
    private separator: HTMLSpanElement;

    constructor(parent: HTMLElement) {
        const nowPlaying: HTMLDivElement = document.createElement("div");
        nowPlaying.id = "nowplaying";
        nowPlaying.className = "nowplaying";
        nowPlaying.style.fontSize = "9px";
        nowPlaying.style.lineHeight = "1.3";
        nowPlaying.style.color = "black";

        const trackArt: HTMLImageElement = document.createElement("img");
        trackArt.id = "trackart";
        trackArt.className = "trackart";
        trackArt.alt = "";
        trackArt.style.width = "48px";
        trackArt.style.height = "48px";
        trackArt.style.objectFit = "cover";
        trackArt.style.marginBottom = "4px";
        trackArt.style.display = "none";
        trackArt.style.borderRadius = "4px";
        nowPlaying.append(trackArt);

        const trackInfo: HTMLDivElement = document.createElement("div");
        trackInfo.id = "track-info";
        trackInfo.className = "trackinfo";
        trackInfo.append("Currently listening to: ");
        trackInfo.append(document.createElement("br"));

        const trackTitleBold: HTMLElement = document.createElement("b");
        const trackTitle: HTMLSpanElement = document.createElement("span");
        trackTitle.id = "tracktitle";
        trackTitleBold.append(trackTitle);
        trackInfo.append(trackTitleBold);

        const separator: HTMLSpanElement = document.createElement("span");
        separator.textContent = " \u2014 ";
        trackInfo.append(separator);

        const trackArtistWrap: HTMLElement = document.createElement("b");
        const trackArtist: HTMLSpanElement = document.createElement("span");
        trackArtist.id = "trackartist";
        trackArtistWrap.append(trackArtist);
        trackInfo.append(trackArtistWrap);

        nowPlaying.append(trackInfo);

        super(nowPlaying);
        this.trackArt = trackArt;
        this.trackTitle = trackTitle;
        this.trackArtist = trackArtist;
        this.trackArtistWrap = trackArtistWrap;
        this.separator = separator;
        this.mount(parent);

        this.poll();
        setInterval(() => this.poll(), POLL_MS);
    }

    private setIdleDisplay(idle: boolean): void {
        this.separator.style.display = idle ? "none" : "";
        this.trackArtistWrap.style.display = idle ? "none" : "";
    }

    private poll(): void {
        fetch("/api/lastfm")
            .then((resp) => {
                if (!resp.ok) throw new Error("lastfm proxy not ok");
                return resp.json();
            })
            .then((resp: { recenttracks?: { track?: LastFmTrack | LastFmTrack[] } }) => {
                let tracks = resp.recenttracks?.track;
                if (!tracks) return;
                if (!Array.isArray(tracks)) tracks = [tracks];
                if (!tracks.length) return;

                const recentTrack =
                    tracks.find((t) => t["@attr"]?.nowplaying === "true") || tracks[0]!;
                const isNowPlaying = recentTrack["@attr"]?.nowplaying === "true";

                let name: string;
                let artist: string;
                if (isNowPlaying) {
                    name = recentTrack.name;
                    artist = recentTrack.artist?.["#text"] || "";
                } else {
                    const utsRaw = recentTrack.date?.uts;
                    const utsMs = utsRaw != null ? parseInt(String(utsRaw), 10) * 1000 : NaN;
                    const scrobbleStale =
                        !isNaN(utsMs) && Date.now() - utsMs > IDLE_AFTER_SCROBBLE_MS;
                    if (scrobbleStale) {
                        name = IDLE_TITLE;
                        artist = "";
                    } else {
                        name = recentTrack.name;
                        artist = recentTrack.artist?.["#text"] || "";
                    }
                }

                if (name === this.lastDisplayed.name && artist === this.lastDisplayed.artist) {
                    return;
                }
                this.lastDisplayed.name = name;
                this.lastDisplayed.artist = artist;

                const idle = name === IDLE_TITLE;
                this.trackTitle.textContent = name;
                this.trackTitle.setAttribute("title", artist ? `${name} by ${artist}` : name);
                this.trackArtist.textContent = artist;
                this.trackArtist.setAttribute("title", artist ? `Artist : ${artist}` : "");
                this.setIdleDisplay(idle);

                if (idle) {
                    this.trackArt.style.display = "none";
                } else if (recentTrack.image?.[2]?.["#text"]) {
                    this.trackArt.src = recentTrack.image[2]["#text"];
                    this.trackArt.alt = recentTrack.album?.["#text"] || name;
                    this.trackArt.style.display = "block";
                } else {
                    this.trackArt.style.display = "none";
                }
            })
            .catch(() => {
                if (this.lastDisplayed.name === "" && this.lastDisplayed.artist === "") return;
                this.lastDisplayed.name = "";
                this.lastDisplayed.artist = "";
                this.trackTitle.textContent = "404 Not Found";
                this.trackTitle.setAttribute("title", "404 Not Found");
                this.trackArtist.textContent = "";
                this.trackArtist.setAttribute("title", "");
                this.setIdleDisplay(true);
                this.trackArt.style.display = "none";
            });
    }
}
