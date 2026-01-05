import { PDFDocument, PDFPage, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { LAYOUT, fromTop } from './utils/layout';
import { COLORS } from './utils/colors';

export interface TextOptions {
  size?: number;
  color?: { r: number; g: number; b: number };
  font?: PDFFont;
  maxWidth?: number;
  lineHeight?: number;
  justify?: boolean;
}

export interface DrawContext {
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
}

export class PDFGenerator {
  private doc: PDFDocument | null = null;
  private backgroundImagePath: string;
  private backgroundImage: any = null;
  private font: PDFFont | null = null;           // Barlow-Regular (treści)
  private boldFont: PDFFont | null = null;       // Barlow-Bold (treści wyróżnione)
  private condensedFont: PDFFont | null = null;  // BarlowCondensed-Regular (wstępy, etykiety - wersaliki)
  private headingFont: PDFFont | null = null;    // BarlowSemiCondensed-Bold (nagłówki - wersaliki)

  constructor() {
    this.backgroundImagePath = path.join(process.cwd(), 'public/assets/szata-background.png');
  }

  async initialize(): Promise<void> {
    // Create a new PDF document
    this.doc = await PDFDocument.create();

    // Load and embed the PNG background image
    const backgroundBytes = fs.readFileSync(this.backgroundImagePath);
    this.backgroundImage = await this.doc.embedPng(backgroundBytes);

    // Register fontkit for custom fonts (required for TTF embedding)
    this.doc.registerFontkit(fontkit);

    // Embed Barlow font family (supports Polish characters via Unicode)
    // Brand guidelines:
    // - Barlow Condensed Regular: wstępy i etykiety (wersaliki, światło 50)
    // - Barlow Semi Condensed Bold: nagłówki i przyciski (wersaliki)
    // - Barlow Regular: treści
    // - Barlow Bold: treści wyróżnione
    const fontPath = path.join(process.cwd(), 'public/fonts/Barlow-Regular.ttf');
    const boldFontPath = path.join(process.cwd(), 'public/fonts/Barlow-Bold.ttf');
    const condensedFontPath = path.join(process.cwd(), 'public/fonts/BarlowCondensed-Regular.ttf');
    const headingFontPath = path.join(process.cwd(), 'public/fonts/BarlowSemiCondensed-Bold.ttf');

    const fontBytes = fs.readFileSync(fontPath);
    const boldFontBytes = fs.readFileSync(boldFontPath);
    const condensedFontBytes = fs.readFileSync(condensedFontPath);
    const headingFontBytes = fs.readFileSync(headingFontPath);

    this.font = await this.doc.embedFont(fontBytes);
    this.boldFont = await this.doc.embedFont(boldFontBytes);
    this.condensedFont = await this.doc.embedFont(condensedFontBytes);
    this.headingFont = await this.doc.embedFont(headingFontBytes);
  }

  getDocument(): PDFDocument {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }
    return this.doc;
  }

  getFont(): PDFFont {
    if (!this.font) {
      throw new Error('Font not initialized. Call initialize() first.');
    }
    return this.font;
  }

  getBoldFont(): PDFFont {
    if (!this.boldFont) {
      throw new Error('Bold font not initialized. Call initialize() first.');
    }
    return this.boldFont;
  }

  // BarlowCondensed-Regular for labels and intros (uppercase, letter-spacing 50)
  getCondensedFont(): PDFFont {
    if (!this.condensedFont) {
      throw new Error('Condensed font not initialized. Call initialize() first.');
    }
    return this.condensedFont;
  }

  // BarlowSemiCondensed-Bold for headings (uppercase)
  getHeadingFont(): PDFFont {
    if (!this.headingFont) {
      throw new Error('Heading font not initialized. Call initialize() first.');
    }
    return this.headingFont;
  }

  getFirstPage(): PDFPage {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }
    // If no pages exist, create the first page with background
    if (this.doc.getPageCount() === 0) {
      return this.createPageWithBackground();
    }
    return this.doc.getPages()[0];
  }

  // Helper method to create a new page with PNG background
  private createPageWithBackground(): PDFPage {
    if (!this.doc || !this.backgroundImage) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }

    // Create a new page with the layout dimensions
    const page = this.doc.addPage([LAYOUT.page.width, LAYOUT.page.height]);

    // Draw the background image to cover the entire page
    page.drawImage(this.backgroundImage, {
      x: 0,
      y: 0,
      width: LAYOUT.page.width,
      height: LAYOUT.page.height,
    });

    return page;
  }

  async addPage(): Promise<PDFPage> {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }

    // Create a new page with the PNG background
    return this.createPageWithBackground();
  }

  // Draw text at specific position
  drawText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    options: TextOptions = {}
  ): void {
    const {
      size = LAYOUT.fonts.body,
      color = COLORS.text.body,
      font = this.font!,
    } = options;

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  // Draw multiline text with word wrap (supports justification)
  drawMultilineText(
    page: PDFPage,
    text: string,
    x: number,
    startY: number,
    options: TextOptions = {}
  ): number {
    const {
      size = LAYOUT.fonts.body,
      color = COLORS.text.body,
      font = this.font!,
      maxWidth = LAYOUT.content.width,
      lineHeight = LAYOUT.lineHeight.normal,
      justify = false,
    } = options;

    const lines = this.wrapText(text, font, size, maxWidth);
    let y = startY;
    const lineSpacing = size * lineHeight;
    const rgbColor = rgb(color.r, color.g, color.b);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLastLine = i === lines.length - 1;

      // Apply justification only for non-last lines with multiple words
      if (justify && !isLastLine) {
        this.drawJustifiedLine(page, line, x, y, maxWidth, size, font, rgbColor);
      } else {
        // Normal left-aligned text
        page.drawText(line, {
          x,
          y,
          size,
          font,
          color: rgbColor,
        });
      }
      y -= lineSpacing;
    }

    return y;
  }

  // Parse text into segments with bold markers
  private parseTextSegments(text: string): Array<{ text: string; bold: boolean }> {
    const segments: Array<{ text: string; bold: boolean }> = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match (regular)
      if (match.index > lastIndex) {
        const regularText = text.slice(lastIndex, match.index);
        if (regularText) {
          segments.push({ text: regularText, bold: false });
        }
      }
      // Add the matched text (bold)
      segments.push({ text: match[1], bold: true });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), bold: false });
    }

    return segments;
  }

  // Wrap text with bold markers preserved
  private wrapTextWithBold(
    text: string,
    regularFont: PDFFont,
    boldFont: PDFFont,
    fontSize: number,
    maxWidth: number
  ): Array<Array<{ text: string; bold: boolean }>> {
    const segments = this.parseTextSegments(text);
    const lines: Array<Array<{ text: string; bold: boolean }>> = [];
    let currentLine: Array<{ text: string; bold: boolean }> = [];
    let currentLineWidth = 0;
    const spaceWidth = regularFont.widthOfTextAtSize(' ', fontSize);

    for (const segment of segments) {
      const font = segment.bold ? boldFont : regularFont;
      const words = segment.text.split(' ');

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;

        const wordWidth = font.widthOfTextAtSize(word, fontSize);
        const needsSpace = currentLine.length > 0 || (currentLine.length === 1 && currentLine[0].text.endsWith(' '));
        const totalWidth = currentLineWidth + (needsSpace ? spaceWidth : 0) + wordWidth;

        if (totalWidth <= maxWidth || currentLine.length === 0) {
          // Add word to current line
          if (needsSpace && currentLine.length > 0) {
            // Add space to previous segment or create new one
            const lastSeg = currentLine[currentLine.length - 1];
            if (lastSeg.bold === segment.bold) {
              lastSeg.text += ' ' + word;
            } else {
              currentLine.push({ text: ' ' + word, bold: segment.bold });
            }
            currentLineWidth += spaceWidth + wordWidth;
          } else {
            if (currentLine.length > 0 && currentLine[currentLine.length - 1].bold === segment.bold) {
              currentLine[currentLine.length - 1].text += word;
            } else {
              currentLine.push({ text: word, bold: segment.bold });
            }
            currentLineWidth += wordWidth;
          }
        } else {
          // Start new line
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [{ text: word, bold: segment.bold }];
          currentLineWidth = wordWidth;
        }
      }
    }

    // Push last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Draw multiline text with inline bold support
  drawMultilineTextWithBold(
    page: PDFPage,
    text: string,
    x: number,
    startY: number,
    options: TextOptions = {}
  ): number {
    const {
      size = LAYOUT.fonts.body,
      color = COLORS.text.body,
      maxWidth = LAYOUT.content.width,
      lineHeight = LAYOUT.lineHeight.normal,
      justify = false,
    } = options;

    // If no bold markers, use regular method
    if (!text.includes('**')) {
      return this.drawMultilineText(page, text, x, startY, options);
    }

    const regularFont = this.font!;
    const boldFont = this.boldFont!;
    const lines = this.wrapTextWithBold(text, regularFont, boldFont, size, maxWidth);
    let y = startY;
    const lineSpacing = size * lineHeight;
    const rgbColor = rgb(color.r, color.g, color.b);

    for (let i = 0; i < lines.length; i++) {
      const lineSegments = lines[i];
      const isLastLine = i === lines.length - 1;

      // Calculate total line width for justification
      let lineWidth = 0;
      for (const seg of lineSegments) {
        const font = seg.bold ? boldFont : regularFont;
        lineWidth += font.widthOfTextAtSize(seg.text, size);
      }

      // Draw segments
      let currentX = x;

      if (justify && !isLastLine && lineWidth < maxWidth * 0.9) {
        // For justified text, calculate extra space to distribute
        const lineText = lineSegments.map(s => s.text).join('');
        const words = lineText.split(' ').filter(w => w.length > 0);
        if (words.length > 1) {
          const extraSpace = (maxWidth - lineWidth) / (words.length - 1);

          for (const seg of lineSegments) {
            const font = seg.bold ? boldFont : regularFont;
            const segWords = seg.text.split(' ');

            for (let j = 0; j < segWords.length; j++) {
              const word = segWords[j];
              if (!word) {
                currentX += extraSpace;
                continue;
              }

              page.drawText(word, {
                x: currentX,
                y,
                size,
                font,
                color: rgbColor,
              });
              currentX += font.widthOfTextAtSize(word, size);

              // Add justified space after word (except for last word in line)
              if (j < segWords.length - 1 || lineSegments.indexOf(seg) < lineSegments.length - 1) {
                currentX += extraSpace;
              }
            }
          }
        } else {
          // Single word - just draw normally
          for (const seg of lineSegments) {
            const font = seg.bold ? boldFont : regularFont;
            page.drawText(seg.text, { x: currentX, y, size, font, color: rgbColor });
            currentX += font.widthOfTextAtSize(seg.text, size);
          }
        }
      } else {
        // Normal rendering
        for (const seg of lineSegments) {
          const font = seg.bold ? boldFont : regularFont;
          page.drawText(seg.text, {
            x: currentX,
            y,
            size,
            font,
            color: rgbColor,
          });
          currentX += font.widthOfTextAtSize(seg.text, size);
        }
      }

      y -= lineSpacing;
    }

    return y;
  }

  // Draw a single justified line (spreads words to fill maxWidth)
  private drawJustifiedLine(
    page: PDFPage,
    line: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    font: PDFFont,
    color: any
  ): void {
    const words = line.split(' ').filter(w => w.length > 0);

    // If only one word or empty line, just draw normally
    if (words.length <= 1) {
      page.drawText(line, { x, y, size, font, color });
      return;
    }

    // Calculate total width of all words
    const wordsWidth = words.reduce((sum, word) => sum + font.widthOfTextAtSize(word, size), 0);

    // Calculate extra space to distribute
    const totalSpace = maxWidth - wordsWidth;
    const spacePerGap = totalSpace / (words.length - 1);

    // Don't over-justify if there's too much space (line is too short)
    const normalSpaceWidth = font.widthOfTextAtSize(' ', size);
    if (spacePerGap > normalSpaceWidth * 4) {
      // Fall back to normal rendering if justification would look weird
      page.drawText(line, { x, y, size, font, color });
      return;
    }

    // Draw each word with calculated spacing
    let currentX = x;
    for (let i = 0; i < words.length; i++) {
      page.drawText(words[i], { x: currentX, y, size, font, color });
      currentX += font.widthOfTextAtSize(words[i], size) + spacePerGap;
    }
  }

  // Word wrap helper
  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Draw a bullet list
  drawBulletList(
    page: PDFPage,
    items: string[],
    x: number,
    startY: number,
    options: TextOptions = {}
  ): number {
    const {
      size = LAYOUT.fonts.body,
      color = COLORS.text.body,
      font = this.font!,
      maxWidth = LAYOUT.content.width - 8,
      lineHeight = LAYOUT.lineHeight.normal,
    } = options;

    let y = startY;
    const bulletIndent = 8; // Single space after dash
    const lineSpacing = size * lineHeight;

    for (const item of items) {
      // Draw dash
      page.drawText('-', {
        x,
        y,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });

      // Draw item text with word wrap
      const lines = this.wrapText(item, font, size, maxWidth - bulletIndent);

      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], {
          x: x + bulletIndent,
          y,
          size,
          font,
          color: rgb(color.r, color.g, color.b),
        });
        y -= lineSpacing;
      }

      y -= LAYOUT.spacing.item;
    }

    return y;
  }

  // Draw a section header using BarlowSemiCondensed-Bold (uppercase)
  drawSectionHeader(
    page: PDFPage,
    title: string,
    x: number,
    y: number
  ): number {
    // Use headingFont (BarlowSemiCondensed-Bold) and convert to uppercase per brand guidelines
    const uppercaseTitle = title.toUpperCase();
    page.drawText(uppercaseTitle, {
      x,
      y,
      size: LAYOUT.fonts.heading,
      font: this.headingFont!,
      color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
    });

    // Draw underline (scaled)
    const titleWidth = this.headingFont!.widthOfTextAtSize(uppercaseTitle, LAYOUT.fonts.heading);
    const underlineOffset = LAYOUT.spacing.line;
    page.drawLine({
      start: { x, y: y - underlineOffset },
      end: { x: x + Math.min(titleWidth + LAYOUT.spacing.paragraph, LAYOUT.content.width), y: y - underlineOffset },
      thickness: 3,
      color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
    });

    return y - LAYOUT.fonts.heading - LAYOUT.spacing.paragraph;
  }

  // Truncate text to fit within maxWidth
  private truncateText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
    if (!text) return '-';

    let displayText = text;
    let width = font.widthOfTextAtSize(displayText, fontSize);

    if (width <= maxWidth) {
      return displayText;
    }

    // Truncate with ellipsis
    while (width > maxWidth && displayText.length > 1) {
      displayText = displayText.slice(0, -1);
      width = font.widthOfTextAtSize(displayText + '...', fontSize);
    }

    return displayText + '...';
  }

  // Draw a simple table (for metrics)
  drawMetricsGrid(
    page: PDFPage,
    metrics: Array<{ label: string; value: string }>,
    x: number,
    startY: number,
    columns: number = 3
  ): number {
    const cellWidth = LAYOUT.content.width / columns;
    const cellHeight = LAYOUT.table.rowHeight * 2; // Scaled cell height
    const cellPadding = LAYOUT.table.cellPadding;
    const maxTextWidth = cellWidth - cellPadding * 2.5; // Leave some margin
    let y = startY;
    let col = 0;

    for (const metric of metrics) {
      const cellX = x + (col * cellWidth);

      // Draw cell background
      page.drawRectangle({
        x: cellX,
        y: y - cellHeight,
        width: cellWidth - cellPadding / 2,
        height: cellHeight,
        color: rgb(0.98, 0.98, 0.98),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      // Draw label (positioned at top of cell) - use BarlowCondensed-Regular, uppercase
      page.drawText(metric.label.toUpperCase(), {
        x: cellX + cellPadding,
        y: y - cellPadding - LAYOUT.fonts.small,
        size: LAYOUT.fonts.small,
        font: this.condensedFont!,
        color: rgb(COLORS.text.muted.r, COLORS.text.muted.g, COLORS.text.muted.b),
      });

      // Truncate value if too long
      const truncatedValue = this.truncateText(
        metric.value,
        this.boldFont!,
        LAYOUT.fonts.subheading,
        maxTextWidth
      );

      // Draw value (positioned below label)
      page.drawText(truncatedValue, {
        x: cellX + cellPadding,
        y: y - cellPadding - LAYOUT.fonts.small - LAYOUT.spacing.line - LAYOUT.fonts.subheading,
        size: LAYOUT.fonts.subheading,
        font: this.boldFont!,
        color: rgb(COLORS.text.heading.r, COLORS.text.heading.g, COLORS.text.heading.b),
      });

      col++;
      if (col >= columns) {
        col = 0;
        y -= cellHeight + LAYOUT.spacing.line;
      }
    }

    // Handle last row if not complete
    if (col > 0) {
      y -= cellHeight + LAYOUT.spacing.line;
    }

    return y - LAYOUT.spacing.paragraph;
  }

  // Draw horizontal line
  drawHorizontalLine(page: PDFPage, y: number): void {
    page.drawLine({
      start: { x: LAYOUT.margin.left, y },
      end: { x: LAYOUT.page.width - LAYOUT.margin.right, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  // Draw semi-transparent white background for content area (call BEFORE content)
  drawContentBackground(
    page: PDFPage,
    startY: number,
    height: number,
    opacity: number = 0.85
  ): void {
    const padding = LAYOUT.spacing.paragraph;
    page.drawRectangle({
      x: LAYOUT.margin.left - padding,
      y: startY - height,
      width: LAYOUT.content.width + padding * 2,
      height: height + padding,
      color: rgb(1, 1, 1),
      opacity: opacity,
      borderWidth: 0,
    });
  }

  // Calculate estimated height for multiline text (for pre-calculating background size)
  estimateTextHeight(text: string, fontSize: number, maxWidth: number, lineHeight: number = 1.5): number {
    if (!text || !this.font) return 0;
    const lines = this.wrapText(text, this.font, fontSize, maxWidth);
    return lines.length * fontSize * lineHeight;
  }

  // Calculate estimated height for bullet list
  estimateBulletListHeight(items: string[], fontSize: number, maxWidth: number, lineHeight: number = 1.5): number {
    if (!items || items.length === 0 || !this.font) return 0;
    let totalHeight = 0;
    const bulletIndent = 8; // Single space after dash

    for (const item of items) {
      const lines = this.wrapText(item, this.font, fontSize, maxWidth - bulletIndent);
      totalHeight += lines.length * fontSize * lineHeight;
      totalHeight += LAYOUT.spacing.item;
    }

    return totalHeight;
  }

  // Embed image from buffer or path
  async embedImage(imagePath: string): Promise<any> {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }

    const imageBytes = fs.readFileSync(imagePath);

    if (imagePath.toLowerCase().endsWith('.png')) {
      return await this.doc.embedPng(imageBytes);
    } else if (imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg')) {
      return await this.doc.embedJpg(imageBytes);
    }

    throw new Error('Unsupported image format. Use PNG or JPG.');
  }

  // Embed image from buffer
  async embedImageFromBuffer(buffer: Buffer, format: 'png' | 'jpg'): Promise<any> {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }

    if (format === 'png') {
      return await this.doc.embedPng(buffer);
    } else {
      return await this.doc.embedJpg(buffer);
    }
  }

  // Draw embedded image
  drawImage(
    page: PDFPage,
    image: any,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    page.drawImage(image, {
      x,
      y: y - height,
      width,
      height,
    });
  }

  // Generate final PDF as buffer
  async generate(): Promise<Buffer> {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }
    const pdfBytes = await this.doc.save();
    return Buffer.from(pdfBytes);
  }

  // Create a new DrawContext for current state
  createContext(page: PDFPage, y: number): DrawContext {
    return {
      page,
      font: this.font!,
      boldFont: this.boldFont!,
      y,
    };
  }
}
