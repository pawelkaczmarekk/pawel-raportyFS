// PDF Layout constants - Using actual template size (szata-background.pdf)
// Template is 2684.25 x 3506.25 points (about 4.5x larger than A4)
const SCALE = 4.5; // Scale factor compared to A4

export const LAYOUT = {
  // Actual template page dimensions in points
  page: {
    width: 2684.25,
    height: 3506.25,
  },

  // Margins (scaled up from A4)
  margin: {
    top: 100 * SCALE,
    bottom: 100 * SCALE,
    left: 100 * SCALE,
    right: 100 * SCALE,
  },

  // Content area
  content: {
    width: 2684.25 - (100 * SCALE * 2),  // page.width - left - right margins
    startX: 100 * SCALE,
    startY: 3506.25 - (100 * SCALE), // page.height - top margin
  },

  // Font sizes (scaled up for larger page)
  fonts: {
    title: 24 * SCALE,
    heading: 18 * SCALE,
    subheading: 14 * SCALE,
    body: 11 * SCALE,
    small: 9 * SCALE,
    tiny: 8 * SCALE,
  },

  // Line heights (multiplier of font size)
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },

  // Spacing (scaled up) - reduced for better fit
  spacing: {
    section: 20 * SCALE,
    paragraph: 10 * SCALE,
    line: 4 * SCALE,
    item: 6 * SCALE,
  },

  // Table settings (scaled up) - compact for better fit
  table: {
    cellPadding: 6 * SCALE,
    headerHeight: 25 * SCALE,
    rowHeight: 20 * SCALE,
  },

  // Chart settings (scaled up) - larger for better readability on page 3
  chart: {
    width: 500 * SCALE,
    height: 300 * SCALE,
  },
};

// Helper function to calculate Y position from top (PDF uses bottom-left origin)
export function fromTop(y: number): number {
  return LAYOUT.page.height - y;
}

// Helper to calculate content width
export function getContentWidth(): number {
  return LAYOUT.page.width - LAYOUT.margin.left - LAYOUT.margin.right;
}
