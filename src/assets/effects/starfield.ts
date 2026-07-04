export function getOrCreateStarfield(main: HTMLElement): HTMLElement {
  let field = main.querySelector("#starfield") as HTMLElement | null;
  if (!field) {
    field = document.createElement("div");
    field.id = "starfield";
    field.setAttribute("aria-hidden", "true");
    field.style.position = "absolute";
    field.style.inset = "0";
    field.style.overflow = "hidden";
    field.style.pointerEvents = "none";
    field.style.zIndex = "-1";
    main.insertBefore(field, main.firstChild);
  }
  return field;
}
