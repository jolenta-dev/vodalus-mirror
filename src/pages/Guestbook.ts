import { PageTitle } from "../primitives.js";
import { GuestbookTable } from "../radicals.js";
import { Page } from "./Page.js";

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

export class Guestbook extends Page {
  constructor() {
    super({
      statusMessageText: "status msg aha",
      nowPlayingImage: "https://vodalus.org/assets/images/haku.png",
      nowPlayingAttribution: "Haku sounds",
    });
    new PageTitle("Urth's many cacogens");
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
        new GuestbookTable(content.length, content);
      });
  }
}
