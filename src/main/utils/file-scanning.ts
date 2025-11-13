/**
 * File scanning utilities for the main process
 * Provides recursive directory scanning functionality
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Configuration for file scanning behavior
 */
export interface ScanOptions {
  /** Whether to sort directories first, then alphabetically */
  sortDirectoriesFirst?: boolean;
  /** Function to filter which files to include */
  fileFilter?: (fileName: string) => boolean;
  /** Function to filter which directories to include/recurse into */
  directoryFilter?: (relativePath: string, fileName: string) => boolean;
  /** Whether to skip hidden files (starting with .) */
  skipHiddenFiles?: boolean;
}

/**
 * Represents a file or directory in the scan results
 */
export interface ScannedItem {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  depth: number;
}

/**
 * Recursively scans a directory and returns all files and subdirectories
 * @param rootPath - The root directory to scan
 * @param options - Configuration options for scanning behavior
 * @returns Array of scanned items (files and directories)
 */
export function scanDirectory(rootPath: string, options: ScanOptions = {}): Array<ScannedItem> {
  const {
    sortDirectoriesFirst = true,
    fileFilter = () => true,
    directoryFilter = () => true,
    skipHiddenFiles = false,
  } = options;

  const results: Array<ScannedItem> = [];

  function scan(dirPath: string, relativePath: string, depth: number): void {
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });

      const sortedFiles = sortDirectoriesFirst
        ? files.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          })
        : files;

      for (const file of sortedFiles) {
        if (skipHiddenFiles && file.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, file.name);
        const fileRelativePath = relativePath ? `${relativePath}/${file.name}` : file.name;

        if (file.isDirectory()) {
          if (!directoryFilter(relativePath, file.name)) {
            continue;
          }

          results.push({
            name: file.name,
            path: fullPath,
            relativePath: fileRelativePath,
            isDirectory: true,
            depth,
          });

          scan(fullPath, fileRelativePath, depth + 1);
        } else {
          if (fileFilter(file.name)) {
            results.push({
              name: file.name,
              path: fullPath,
              relativePath: fileRelativePath,
              isDirectory: false,
              depth,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  if (fs.existsSync(rootPath)) {
    scan(rootPath, '', 0);
  }

  return results;
}

/**
 * Creates a file filter that checks if a file has one of the specified extensions
 * @param extensions - Array of file extensions (e.g., ['.js', '.ts'])
 * @returns A filter function
 */
export function createExtensionFilter(
  extensions: ReadonlyArray<string>,
): (fileName: string) => boolean {
  return (fileName: string) => {
    const ext = path.extname(fileName).toLowerCase();
    return extensions.includes(ext);
  };
}

/**
 * Creates a directory filter that skips directories matching a pattern
 * @param patterns - Array of patterns to skip (e.g., ['.cache', 'node_modules'])
 * @returns A filter function
 */
export function createDirectorySkipFilter(
  patterns: ReadonlyArray<string>,
): (relativePath: string, fileName: string) => boolean {
  return (relativePath: string, fileName: string) => {
    if (patterns.some((pattern) => fileName === pattern)) {
      return false;
    }
    if (patterns.some((pattern) => relativePath.includes(pattern))) {
      return false;
    }
    return true;
  };
}
