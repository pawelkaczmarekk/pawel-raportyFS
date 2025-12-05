// Brand colors for PDF reports - based on vSprint orange theme
export const COLORS = {
  // Primary brand color (official vSprint orange)
  // HEX: #ff5c0a | RGB: 255 / 92 / 10 | CMYK: 0 / 75 / 100 / 0
  primary: { r: 1, g: 0.361, b: 0.039 }, // #ff5c0a - Official vSprint orange
  primaryHex: '#ff5c0a',

  // Secondary colors (same as primary for consistency)
  secondary: { r: 1, g: 0.361, b: 0.039 }, // #ff5c0a - Same orange for h2
  secondaryHex: '#ff5c0a',

  // Text colors
  text: {
    heading: { r: 0.1, g: 0.1, b: 0.1 },     // #1A1A1A
    body: { r: 0.2, g: 0.2, b: 0.2 },         // #333333
    muted: { r: 0.4, g: 0.4, b: 0.4 },        // #666666
    light: { r: 0.6, g: 0.6, b: 0.6 },        // #999999
    white: { r: 1, g: 1, b: 1 },              // #FFFFFF
  },

  // Status colors
  positive: { r: 0.157, g: 0.655, b: 0.271 }, // #28A745 - Green
  positiveHex: '#28A745',

  negative: { r: 0.863, g: 0.208, b: 0.271 }, // #DC3545 - Red
  negativeHex: '#DC3545',

  neutral: { r: 0.424, g: 0.459, b: 0.494 },  // #6C757D - Gray
  neutralHex: '#6C757D',

  // Background colors
  background: {
    white: { r: 1, g: 1, b: 1 },
    light: { r: 0.973, g: 0.976, b: 0.98 },   // #F8F9FA
    section: { r: 0.95, g: 0.95, b: 0.95 },   // Light gray
  },

  // Table colors
  table: {
    header: { r: 1, g: 0.361, b: 0.039 },     // #ff5c0a - Official vSprint orange header
    headerText: { r: 1, g: 1, b: 1 },         // White text
    rowEven: { r: 1, g: 1, b: 1 },            // White
    rowOdd: { r: 0.98, g: 0.98, b: 0.98 },    // Very light gray
    border: { r: 0.8, g: 0.8, b: 0.8 },       // Light gray border
  },
};

// Helper to convert RGB object to pdf-lib format
export function rgbColor(color: { r: number; g: number; b: number }) {
  return color;
}
