export function loadFonts(): void {
    if (document.getElementById("vodalus-fonts")) {
        return;
    }

    const style: HTMLStyleElement = document.createElement("style");
    style.id = "vodalus-fonts";
    style.textContent = `
    @font-face {
      font-family: "Meylda";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("/multimedia/fonts/meylda/Meylda-Regular.ttf") format("truetype");
      unicode-range: U+0000-002F, U+003A-10FFFF;
    }

    @font-face {
      font-family: "Nedar";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("/multimedia/fonts/Nedar/Nedar.ttf") format("truetype");
    }
  `;
    document.head.appendChild(style);
}
