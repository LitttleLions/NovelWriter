import { parseScreenplay, ElementType } from "./screenplay-parser";

const TYPE_TO_FDX: Record<ElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
  shot: "Shot",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface BuildOptions {
  title: string;
  author?: string | null;
  scenes: { heading?: string; content: string }[];
  language?: string | null;
}

function writtenByLabelFdx(language?: string | null): string {
  const lang = (language || "Deutsch").toLowerCase().trim();
  if (lang.startsWith("deutsch") || lang === "de" || lang === "german") return "geschrieben von";
  if (lang.startsWith("español") || lang.startsWith("espanol") || lang.startsWith("spanish") || lang === "es") return "escrito por";
  if (lang.startsWith("français") || lang.startsWith("francais") || lang.startsWith("french") || lang === "fr") return "écrit par";
  if (lang.startsWith("italiano") || lang.startsWith("italian") || lang === "it") return "scritto da";
  if (lang.startsWith("português") || lang.startsWith("portugues") || lang.startsWith("portuguese") || lang === "pt") return "escrito por";
  return "written by";
}

export function buildScreenplayFdx(opts: BuildOptions): string {
  const paragraphs: string[] = [];

  for (const scene of opts.scenes) {
    const text = (scene.content || "").trim();
    if (!text) continue;
    const elements = parseScreenplay(text, opts.language);
    for (const el of elements) {
      const fdxType = TYPE_TO_FDX[el.type];
      let body = el.text;
      if (el.type === "parenthetical") {
        // FDX parentheticals include the parens
        if (!body.startsWith("(")) body = `(${body})`;
      }
      paragraphs.push(
        `    <Paragraph Type="${fdxType}">\n      <Text>${escapeXml(body)}</Text>\n    </Paragraph>`
      );
    }
  }

  const titleEsc = escapeXml(opts.title || "Untitled");
  const authorEsc = escapeXml(opts.author || "");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
${paragraphs.join("\n")}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Alignment="Center">
        <Text>${titleEsc}</Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text></Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text>${escapeXml(writtenByLabelFdx(opts.language))}</Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text>${authorEsc}</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>
`;
}
