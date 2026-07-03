export function getOrCreateStarfield(main: HTMLElement): HTMLElement {
  let field = main.querySelector("#starfield") as HTMLElement | null;
  if (!field) {
    field = document.createElement("div");
    field.id = "starfield";
    field.setAttribute("aria-hidden", "true");
    main.insertBefore(field, main.firstChild);
  }
  return field;
}
