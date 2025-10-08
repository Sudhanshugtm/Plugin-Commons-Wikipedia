figma.showUI(__html__, { width: 400, height: 600 });

type InsertImageMessage = {
  type: 'insert-image';
  url: string;
  fillSelected?: boolean;
};

type InsertTextMessage = {
  type: 'insert-text';
  text: string;
};

type InsertFormattedTextMessage = {
  type: 'insert-formatted-text';
  richText: RichTextSegment[];
};

type NotifyMessage = {
  type: 'notify';
  message: string;
};

type PluginMessage =
  | InsertImageMessage
  | InsertTextMessage
  | InsertFormattedTextMessage
  | NotifyMessage;

type RichTextFormat = {
  bold: boolean;
  italic: boolean;
  link: string | null;
  superscript?: boolean;
  subscript?: boolean;
  headingLevel?: number | null;
};

type RichTextSegment = {
  text: string;
  format: RichTextFormat;
};

type ProcessedSegment = {
  text: string;
  format: RichTextFormat;
  superscriptConverted: boolean;
  subscriptConverted: boolean;
};

type FillableNode =
  | RectangleNode
  | FrameNode
  | EllipseNode
  | PolygonNode
  | StarNode;

type FontAvailability = {
  bold: boolean;
  italic: boolean;
  boldItalic: boolean;
};

const DEFAULT_IMAGE_SIZE = 200;
const DEFAULT_TEXT_WIDTH = 400;
const DEFAULT_FONT_SIZE = 16;

const INTER_REGULAR: FontName = { family: 'Inter', style: 'Regular' };
const INTER_BOLD: FontName = { family: 'Inter', style: 'Bold' };
const INTER_ITALIC: FontName = { family: 'Inter', style: 'Italic' };
const INTER_BOLD_ITALIC: FontName = { family: 'Inter', style: 'Bold Italic' };

const LINK_PAINT: SolidPaint = {
  type: 'SOLID',
  color: { r: 0.024, g: 0.271, b: 0.678 },
};

const loadedFonts = new Set<string>();

function setLoading(show: boolean) {
  figma.ui.postMessage({ type: 'showLoading', show: show === true });
}

function notifyUser(message: string) {
  figma.notify(message);
}

async function runWithLoading(
  operation: () => Promise<void>,
  errorMessage: string
) {
  setLoading(true);
  try {
    await operation();
  } catch (error) {
    console.error(errorMessage, error);
    notifyUser(errorMessage);
  } finally {
    setLoading(false);
  }
}

figma.ui.onmessage = async (message: PluginMessage) => {
  switch (message.type) {
    case 'notify': {
      notifyUser(message.message);
      break;
    }
    case 'insert-image': {
      await runWithLoading(
        () => handleInsertImage(message),
        'Failed to insert image'
      );
      break;
    }
    case 'insert-text': {
      await runWithLoading(
        () => handleInsertText(message),
        'Failed to insert text'
      );
      break;
    }
    case 'insert-formatted-text': {
      await runWithLoading(
        () => handleInsertFormattedText(message),
        'Failed to insert formatted text'
      );
      break;
    }
    default: {
      const exhaustiveCheck: never = message;
      return exhaustiveCheck;
    }
  }
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'a': 'ᵃ',
  'b': 'ᵇ',
  'c': 'ᶜ',
  'd': 'ᵈ',
  'e': 'ᵉ',
  'f': 'ᶠ',
  'g': 'ᵍ',
  'h': 'ʰ',
  'i': 'ⁱ',
  'j': 'ʲ',
  'k': 'ᵏ',
  'l': 'ˡ',
  'm': 'ᵐ',
  'n': 'ⁿ',
  'o': 'ᵒ',
  'p': 'ᵖ',
  'r': 'ʳ',
  's': 'ˢ',
  't': 'ᵗ',
  'u': 'ᵘ',
  'v': 'ᵛ',
  'w': 'ʷ',
  'x': 'ˣ',
  'y': 'ʸ',
  'z': 'ᶻ',
  'A': 'ᴬ',
  'B': 'ᴮ',
  'D': 'ᴰ',
  'E': 'ᴱ',
  'G': 'ᴳ',
  'H': 'ᴴ',
  'I': 'ᴵ',
  'J': 'ᴶ',
  'K': 'ᴷ',
  'L': 'ᴸ',
  'M': 'ᴹ',
  'N': 'ᴺ',
  'O': 'ᴼ',
  'P': 'ᴾ',
  'R': 'ᴿ',
  'T': 'ᵀ',
  'U': 'ᵁ',
  'V': 'ⱽ',
  'W': 'ᵂ'
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'h': 'ₕ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ',
  'l': 'ₗ',
  'm': 'ₘ',
  'n': 'ₙ',
  'o': 'ₒ',
  'p': 'ₚ',
  'r': 'ᵣ',
  's': 'ₛ',
  't': 'ₜ',
  'u': 'ᵤ',
  'v': 'ᵥ',
  'x': 'ₓ'
};

const HEADING_FONT_SIZES: Record<number, number> = {
  1: 32,
  2: 24,
  3: 20,
  4: 18,
  5: 16,
  6: 14
};

async function handleInsertImage(message: InsertImageMessage) {
  const response = await fetch(message.url);
  if (!response.ok) {
    throw new Error(`Image request failed with status ${response.status}`);
  }

  const imageBytes = await response.arrayBuffer();
  const imageHash = figma.createImage(new Uint8Array(imageBytes)).hash;
  const imagePaint: ImagePaint = { type: 'IMAGE', scaleMode: 'FILL', imageHash };

  const selection = figma.currentPage.selection.filter((node): node is FillableNode =>
    isFillableNode(node)
  );

  if (selection.length > 0) {
    for (const node of selection) {
      const fills = Array.isArray(node.fills) ? [...node.fills] : [];
      node.fills = message.fillSelected === false ? [...fills, imagePaint] : [imagePaint];
    }
    return;
  }

  const rectangle = figma.createRectangle();
  rectangle.resize(DEFAULT_IMAGE_SIZE, DEFAULT_IMAGE_SIZE);
  rectangle.fills = [imagePaint];
  figma.currentPage.appendChild(rectangle);
  figma.viewport.scrollAndZoomIntoView([rectangle]);
}

async function handleInsertText(message: InsertTextMessage) {
  const text = message.text;
  const textNodes = figma.currentPage.selection.filter(
    (node): node is TextNode => node.type === 'TEXT' && !node.locked
  );

  if (textNodes.length > 0) {
    for (const node of textNodes) {
      await prepareTextNode(node);
      node.characters = text;
    }
    figma.viewport.scrollAndZoomIntoView(textNodes);
    return;
  }

  const textNode = figma.createText();
  await prepareTextNode(textNode);
  textNode.characters = text;
  applyDefaultTextWidth(textNode);
  figma.currentPage.appendChild(textNode);
  figma.viewport.scrollAndZoomIntoView([textNode]);
}

async function handleInsertFormattedText(message: InsertFormattedTextMessage) {
  const { richText } = message;
  if (richText.length === 0) {
    notifyUser('No text available to insert.');
    return;
  }

  const textNodes = figma.currentPage.selection.filter(
    (node): node is TextNode => node.type === 'TEXT' && !node.locked
  );

  if (textNodes.length > 0) {
    for (const node of textNodes) {
      await insertFormattedTextIntoNode(node, richText, false);
    }
    figma.viewport.scrollAndZoomIntoView(textNodes);
    return;
  }

  const textNode = figma.createText();
  await insertFormattedTextIntoNode(textNode, richText, true);
  figma.currentPage.appendChild(textNode);
  figma.viewport.scrollAndZoomIntoView([textNode]);
}

async function prepareTextNode(textNode: TextNode) {
  await ensureFont(INTER_REGULAR, true);
  textNode.fontName = INTER_REGULAR;
  textNode.fontSize = DEFAULT_FONT_SIZE;
  textNode.textAutoResize = 'HEIGHT';
  textNode.hyperlink = null;
}

function applyDefaultTextWidth(textNode: TextNode) {
  textNode.resize(DEFAULT_TEXT_WIDTH, textNode.height);
}

function convertWithMap(text: string, map: Record<string, string>): { converted: string; changed: boolean } {
  let changed = false;
  const converted = Array.from(text)
    .map((char) => {
      const replacement = map[char];
      if (replacement !== undefined) {
        changed = true;
        return replacement;
      }
      return char;
    })
    .join('');

  return { converted, changed };
}

async function insertFormattedTextIntoNode(
  textNode: TextNode,
  richText: ReadonlyArray<RichTextSegment>,
  applyDefaultWidth: boolean
) {
  const regularLoaded = await ensureFont(INTER_REGULAR, true);
  const boldAvailable = regularLoaded && (await ensureFont(INTER_BOLD));
  const italicAvailable = regularLoaded && (await ensureFont(INTER_ITALIC));
  const boldItalicAvailable =
    regularLoaded && (await ensureFont(INTER_BOLD_ITALIC));

  const fontAvailability: FontAvailability = {
    bold: Boolean(boldAvailable),
    italic: Boolean(italicAvailable),
    boldItalic: Boolean(boldItalicAvailable),
  };

  textNode.fontName = INTER_REGULAR;
  textNode.fontSize = DEFAULT_FONT_SIZE;
  textNode.textAutoResize = 'HEIGHT';

  const processedSegments: ProcessedSegment[] = richText.map((segment) => {
    let updatedText = segment.text;
    let superscriptConverted = false;
    let subscriptConverted = false;

    if (segment.format.superscript) {
      const { converted, changed } = convertWithMap(updatedText, SUPERSCRIPT_MAP);
      updatedText = converted;
      superscriptConverted = changed;
    } else if (segment.format.subscript) {
      const { converted, changed } = convertWithMap(updatedText, SUBSCRIPT_MAP);
      updatedText = converted;
      subscriptConverted = changed;
    }

    return {
      text: updatedText,
      format: segment.format,
      superscriptConverted,
      subscriptConverted,
    };
  });

  const fullText = processedSegments.map((segment) => segment.text).join('');
  textNode.characters = fullText;

  if (applyDefaultWidth) {
    applyDefaultTextWidth(textNode);
  }
  textNode.setRangeHyperlink(0, textNode.characters.length, null);

  let currentIndex = 0;
  for (const segment of processedSegments) {
    const segmentLength = segment.text.length;
    const endIndex = currentIndex + segmentLength;

    if (segmentLength === 0) {
      currentIndex = endIndex;
      continue;
    }

    const headingLevel = segment.format.headingLevel ?? null;
    const fontName = resolveFontForSegment(segment.format, fontAvailability);

    await ensureFont(fontName, fontName.style === INTER_REGULAR.style);
    textNode.setRangeFontName(currentIndex, endIndex, fontName);

    if (
      headingLevel !== null &&
      !segment.format.superscript &&
      !segment.format.subscript
    ) {
      const headingSize = HEADING_FONT_SIZES[headingLevel];
      if (headingSize) {
        textNode.setRangeFontSize(currentIndex, endIndex, headingSize);
      }
    }

    if (segment.format.link) {
      textNode.setRangeFills(currentIndex, endIndex, [LINK_PAINT]);
    }
    textNode.setRangeHyperlink(currentIndex, endIndex, null);

    if (segment.format.superscript && !segment.superscriptConverted) {
      const baseFontSize = getRangeBaseFontSize(textNode, currentIndex, endIndex);
      const smallerSize = Math.max(baseFontSize * 0.58, 8);
      textNode.setRangeFontSize(currentIndex, endIndex, smallerSize);
      textNode.setRangeLineHeight(currentIndex, endIndex, {
        value: 100,
        unit: 'PERCENT',
      });
    } else if (segment.format.subscript && !segment.subscriptConverted) {
      const baseFontSize = getRangeBaseFontSize(textNode, currentIndex, endIndex);
      const smallerSize = Math.max(baseFontSize * 0.58, 8);
      textNode.setRangeFontSize(currentIndex, endIndex, smallerSize);
      textNode.setRangeLineHeight(currentIndex, endIndex, {
        value: 100,
        unit: 'PERCENT',
      });
    }

    currentIndex = endIndex;
  }
}

function getRangeBaseFontSize(
  textNode: TextNode,
  start: number,
  end: number
): number {
  const fontSize = textNode.getRangeFontSize(start, end);
  if (fontSize === figma.mixed) {
    return DEFAULT_FONT_SIZE;
  }
  return fontSize;
}

function resolveFontForSegment(
  format: RichTextFormat,
  availability: FontAvailability
): FontName {
  if (format.bold && format.italic && availability.boldItalic) {
    return INTER_BOLD_ITALIC;
  }
  if (format.bold && availability.bold) {
    return INTER_BOLD;
  }
  if (format.italic && availability.italic) {
    return INTER_ITALIC;
  }
  return INTER_REGULAR;
}

async function ensureFont(font: FontName, required = false): Promise<boolean> {
  const key = `${font.family}-${font.style}`;
  if (loadedFonts.has(key)) {
    return true;
  }

  try {
    await figma.loadFontAsync(font);
    loadedFonts.add(key);
    return true;
  } catch (error) {
    if (required) {
      throw error;
    }
    console.warn(`Unable to load font ${key}`, error);
    return false;
  }
}

function isFillableNode(node: SceneNode): node is FillableNode {
  switch (node.type) {
    case 'RECTANGLE':
    case 'FRAME':
    case 'ELLIPSE':
    case 'POLYGON':
    case 'STAR':
      return true;
    default:
      return false;
  }
}
