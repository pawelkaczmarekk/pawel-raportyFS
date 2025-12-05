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
}

export interface DrawContext {
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
}

export class PDFGenerator {
  private doc: PDFDocument | null = null;
  private templatePath: string;
  private font: PDFFont | null = null;           // Barlow-Regular (treści)
  private boldFont: PDFFont | null = null;       // Barlow-Bold (treści wyróżnione)
  private condensedFont: PDFFont | null = null;  // BarlowCondensed-Regular (wstępy, etykiety - wersaliki)
  private headingFont: PDFFont | null = null;    // BarlowSemiCondensed-Bold (nagłówki - wersaliki)

  constructor() {
    this.templatePath = path.join(process.cwd(), 'public/assets/szata-background.pdf');
  }

  async initialize(): Promise<void> {
    // Load the template PDF
    const templateBytes = fs.readFileSync(this.templatePath);
    this.doc = await PDFDocument.load(templateBytes);

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
    return this.doc.getPages()[0];
  }

  async addPage(): Promise<PDFPage> {
    if (!this.doc) {
      throw new Error('PDF not initialized. Call initialize() first.');
    }

    // Copy the first page (template) to create new page with same background
    const templateBytes = fs.readFileSync(this.templatePath);
    const templateDoc = await PDFDocument.load(templateBytes);
    const [copiedPage] = await this.doc.copyPages(templateDoc, [0]);
    this.doc.addPage(copiedPage);

    return copiedPage;
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

  // Draw multiline text with word wrap
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
    } = options;

    const lines = this.wrapText(text, font, size, maxWidth);
    let y = startY;
    const lineSpacing = size * lineHeight;

    for (const line of lines) {
      page.drawText(line, {
        x,
        y,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });
      y -= lineSpacing;
    }

    return y;
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
      maxWidth = LAYOUT.content.width - 20,
      lineHeight = LAYOUT.lineHeight.normal,
    } = options;

    let y = startY;
    const bulletIndent = 15;
    const lineSpacing = size * lineHeight;

    for (const item of items) {
      // Draw bullet
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
    const bulletIndent = 15;

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
