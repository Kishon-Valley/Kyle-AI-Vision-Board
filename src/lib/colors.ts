/**
 * Converts a color name or hex value to a standardized format
 * @param color - The color value to process (can be name, hex, etc.)
 * @returns A formatted color value (hex code by default)
 */
export function getColorValue(color: string): string {
  // Map of common color names to hex values
  const colorMap: Record<string, string> = {
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'white': '#ffffff',
    'black': '#000000',
    // Add more color mappings as needed
  };

  // If it's already a hex value, return it
  if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    return color.toLowerCase();
  }

  // If it's a named color, return the hex value
  const lowerColor = color.toLowerCase();
  return colorMap[lowerColor] || '#cccccc'; // Default to gray if not found
}

/**
 * Determines whether black or white text would have better contrast on a given background color
 * @param bgColor - The background color (hex, rgb, or color name)
 * @returns '#000000' (black) for light backgrounds, '#ffffff' (white) for dark backgrounds
 */
export function getTextColor(bgColor: string): string {
  const hex = getColorValue(bgColor);
  
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Calculate relative luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
