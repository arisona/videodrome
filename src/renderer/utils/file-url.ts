/**
 * Convert file paths to URLs that work in both dev and production modes
 * @param filePath Absolute file path
 * @returns URL string
 */
export function filePathToUrl(filePath: string): string {
  // In dev mode (loaded from http://localhost), proxy through Vite dev server
  if (window.location.protocol === 'http:') {
    return `/@local-file/${encodeURIComponent(filePath)}`;
  }
  // In production (loaded from file://), use file:// protocol
  return `file://${filePath}`;
}
