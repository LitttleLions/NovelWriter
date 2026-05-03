import { PDFDocument, StandardFonts, PDFFont, PDFPage, rgb } from "pdf-lib";
import { ScreenplayElement, parseScreenplay } from "./screenplay-parser";

// Standard US Letter screenplay layout in points (1 inch = 72pt).
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 108;   // 1.5"
const MARGIN_RIGHT = 72;   // 1.0"
const MARGIN_TOP = 72;     // 1.0"
const MARGIN_BOTTOM = 72;  // 1.0"
const FONT_SIZE = 12;
const LINE_HEIGHT = 14.4;  // 12pt Courier with single line spacing
const CHAR_WIDTH = 7.2;    // Courier 12pt monospace width

// Industry-standard column widths (in characters of Courier 12).
const ACTION_WIDTH_CHARS = 60;       // ~6"
const DIALOGUE_INDENT_CHARS = 10;    // ~2.5" left indent
const DIALOGUE_WIDTH_CHARS = 35;     // ~3.5" wide
const PARENTHETICAL_INDENT_CHARS = 16; // ~3.0"
const PARENTHETICAL_WIDTH_CHARS = 22;
const CHARACTER_INDENT_CHARS = 22;   // ~3.7"

interface BuildOptions {
  title: string;
  author?: string | null;
  scenes: { heading?: string; content: string }[];
  language?: string | null;
}

export function writtenByLabel(language?: string | null): string {
  const lang = (language || "Deutsch").toLowerCase().trim();
  if (lang.startsWith("deutsch") || lang === "de" || lang === "german") return "geschrieben von";
  if (lang.startsWith("español") || lang.startsWith("espanol") || lang.startsWith("spanish") || lang === "es") return "escrito por";
  if (lang.startsWith("français") || lang.startsWith("francais") || lang.startsWith("french") || lang === "fr") return "écrit par";
  if (lang.startsWith("italiano") || lang.startsWith("italian") || lang === "it") return "scritto da";
  if (lang.startsWith("português") || lang.startsWith("portugues") || lang.startsWith("portuguese") || lang === "pt") return "escrito por";
  return "written by";
}

interface RenderState {
  pdf: PDFDocument;
  font: PDFFont;
  page: PDFPage;
  cursorY: number;
  pageNumber: number;
  totalPages: number; // updated lazily; we draw page numbers as we go
}

function newPage(state: RenderState) {
  state.page = state.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  state.cursorY = PAGE_HEIGHT - MARGIN_TOP;
  state.pageNumber += 1;
  // Page number top-right (no number on first page is also acceptable; we
  // include it for simplicity, starting from 1)
  if (state.pageNumber > 1) {
    const label = `${state.pageNumber}.`;
    const x = PAGE_WIDTH - MARGIN_RIGHT - state.font.widthOfTextAtSize(label, FONT_SIZE);
    state.page.drawText(label, {
      x,
      y: PAGE_HEIGHT - MARGIN_TOP / 2,
      size: FONT_SIZE,
      font: state.font,
      color: rgb(0, 0, 0),
    });
  }
}

function ensureSpace(state: RenderState, neededLines: number) {
  const needed = neededLines * LINE_HEIGHT;
  if (state.cursorY - needed < MARGIN_BOTTOM) {
    newPage(state);
  }
}

function wrap(text: string, widthChars: number): string[] {
  if (!text) return [""];
  // Replace runs of whitespace with single spaces; preserve hard line breaks.
  const paragraphs = text.split(/\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let current = "";
    for (const w of words) {
      if (!current) {
        if (w.length > widthChars) {
          // Hard break long token
          for (let i = 0; i < w.length; i += widthChars) {
            out.push(w.slice(i, i + widthChars));
          }
          current = "";
        } else {
          current = w;
        }
        continue;
      }
      if (current.length + 1 + w.length <= widthChars) {
        current += " " + w;
      } else {
        out.push(current);
        if (w.length > widthChars) {
          for (let i = 0; i < w.length; i += widthChars) {
            out.push(w.slice(i, i + widthChars));
          }
          current = "";
        } else {
          current = w;
        }
      }
    }
    if (current) out.push(current);
  }
  return out;
}

function drawLine(state: RenderState, text: string, indentChars: number) {
  // pdf-lib's StandardFonts.Courier only supports WinAnsi; replace unsupported
  // chars with closest ASCII fallback to avoid encoding errors.
  const safe = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
  const x = MARGIN_LEFT + indentChars * CHAR_WIDTH;
  state.page.drawText(safe, {
    x,
    y: state.cursorY - FONT_SIZE,
    size: FONT_SIZE,
    font: state.font,
    color: rgb(0, 0, 0),
  });
  state.cursorY -= LINE_HEIGHT;
}

function drawBlock(
  state: RenderState,
  text: string,
  indentChars: number,
  widthChars: number,
  spaceBefore = 0,
  spaceAfter = 0
) {
  const lines = wrap(text, widthChars);
  ensureSpace(state, lines.length + spaceBefore + spaceAfter);
  for (let i = 0; i < spaceBefore; i++) state.cursorY -= LINE_HEIGHT;
  for (const ln of lines) drawLine(state, ln, indentChars);
  for (let i = 0; i < spaceAfter; i++) state.cursorY -= LINE_HEIGHT;
}

function drawTransitionRight(state: RenderState, text: string) {
  ensureSpace(state, 2);
  state.cursorY -= LINE_HEIGHT;
  const safe = text.toUpperCase();
  const widthPt = state.font.widthOfTextAtSize(safe, FONT_SIZE);
  const x = PAGE_WIDTH - MARGIN_RIGHT - widthPt;
  state.page.drawText(safe, {
    x,
    y: state.cursorY - FONT_SIZE,
    size: FONT_SIZE,
    font: state.font,
    color: rgb(0, 0, 0),
  });
  state.cursorY -= LINE_HEIGHT;
}

function renderElements(state: RenderState, elements: ScreenplayElement[]) {
  let prevType: string | null = null;
  for (const el of elements) {
    switch (el.type) {
      case "scene_heading": {
        const spaceBefore = prevType ? 1 : 0;
        drawBlock(state, el.text, 0, ACTION_WIDTH_CHARS, spaceBefore, 1);
        break;
      }
      case "action": {
        drawBlock(state, el.text, 0, ACTION_WIDTH_CHARS, 0, 1);
        break;
      }
      case "character": {
        // Keep the character cue together with at least its first dialogue line.
        ensureSpace(state, 2);
        drawBlock(state, el.text.toUpperCase(), CHARACTER_INDENT_CHARS, 30, 0, 0);
        break;
      }
      case "parenthetical": {
        const t = el.text.replace(/^\(|\)$/g, "");
        drawBlock(
          state,
          `(${t})`,
          PARENTHETICAL_INDENT_CHARS,
          PARENTHETICAL_WIDTH_CHARS,
          0,
          0
        );
        break;
      }
      case "dialogue": {
        drawBlock(
          state,
          el.text,
          DIALOGUE_INDENT_CHARS,
          DIALOGUE_WIDTH_CHARS,
          0,
          1
        );
        break;
      }
      case "transition": {
        drawTransitionRight(state, el.text);
        state.cursorY -= LINE_HEIGHT;
        break;
      }
      case "shot": {
        drawBlock(state, el.text.toUpperCase(), 0, ACTION_WIDTH_CHARS, 1, 1);
        break;
      }
    }
    prevType = el.type;
  }
}

export async function buildScreenplayPdf(opts: BuildOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Courier);
  const fontBold = await pdf.embedFont(StandardFonts.CourierBold);

  // Title page
  const titlePage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleSize = 18;
  const safeTitle = (opts.title || "Untitled")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
  const titleWidth = fontBold.widthOfTextAtSize(safeTitle.toUpperCase(), titleSize);
  titlePage.drawText(safeTitle.toUpperCase(), {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: PAGE_HEIGHT / 2 + 60,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  const byLabel = writtenByLabel(opts.language);
  const byWidth = font.widthOfTextAtSize(byLabel, FONT_SIZE);
  titlePage.drawText(byLabel, {
    x: (PAGE_WIDTH - byWidth) / 2,
    y: PAGE_HEIGHT / 2,
    size: FONT_SIZE,
    font,
    color: rgb(0, 0, 0),
  });

  const author = (opts.author || "").trim() || "—";
  const authorWidth = font.widthOfTextAtSize(author, FONT_SIZE);
  titlePage.drawText(author, {
    x: (PAGE_WIDTH - authorWidth) / 2,
    y: PAGE_HEIGHT / 2 - 20,
    size: FONT_SIZE,
    font,
    color: rgb(0, 0, 0),
  });

  // Body
  const state: RenderState = {
    pdf,
    font,
    page: titlePage, // will be replaced
    cursorY: 0,
    pageNumber: 0,
    totalPages: 0,
  };
  newPage(state);

  for (let i = 0; i < opts.scenes.length; i++) {
    const scene = opts.scenes[i];
    const text = (scene.content || "").trim();
    if (!text) continue;
    const elements = parseScreenplay(text, opts.language);
    renderElements(state, elements);
  }

  return await pdf.save();
}
