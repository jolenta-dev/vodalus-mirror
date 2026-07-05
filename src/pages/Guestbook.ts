import { background, pageTitle } from "../primitives.js";
import { sidebar, guestbook } from "../radicals.js";

interface entry {
  date: string,
  name: string,
  website: string | null,
  note: string
}

const jolentaRow: string[] = [
  `[${new Date(0).toLocaleString() as string}]`,
  "(OWNER) jolenta",
  "https://staging.vodalus.org",
  `"i was here first"`,
];

export class Guestbook {
  constructor() {
    new background(true, true);
    new sidebar("status msg aha", "https://vodalus.org/assets/images/haku.png", "Haku sounds");
    new pageTitle("Urth's many cacogens");
    fetch("/api/names")
      .then(r => r.json())
      .then((names: entry[]): void => {
        const content: string[][] = [
          jolentaRow,
          ...names.map((entry: entry): string[] => [
            `[${new Date(entry.date).toLocaleString()}]`,
            entry.name,
            entry.website ?? "",
            entry.note,
          ]),
        ];
        new guestbook(content.length, content);
      });
  }
}
