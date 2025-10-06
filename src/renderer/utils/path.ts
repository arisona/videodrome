/* eslint-env browser */

/**
 * Path utility functions for the renderer process
 */

/**
 * Extracts the filename from a file path
 * @param filePath - The full file path
 * @returns The filename (last component of the path)
 */
export function getFilename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] ?? filePath;
}

/**
 * Gets the directory path from a file path
 * @param filePath - The full file path
 * @returns The directory path (all components except the last)
 */
export function getDirectoryFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts.slice(0, -1).join('/');
}
