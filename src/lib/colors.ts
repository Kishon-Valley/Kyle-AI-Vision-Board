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
