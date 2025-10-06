import * as path from 'node:path';

/**
 * Security utilities for validating file paths and preventing path traversal attacks
 */

/**
 * Validates that a resolved path is within the allowed root directory
 * @param targetPath - The path to validate (will be resolved)
 * @param allowedRoot - The root directory that paths must be within
 * @returns true if path is safe, false otherwise
 */
export function isPathWithinRoot(targetPath: string, allowedRoot: string): boolean {
  const normalizedPath = path.resolve(targetPath);
  const normalizedRoot = path.resolve(allowedRoot);

  // Path must start with root + separator, or be exactly the root
  return normalizedPath.startsWith(normalizedRoot + path.sep) || normalizedPath === normalizedRoot;
}

/**
 * Safely joins path segments and validates the result is within root directory
 * @param root - The root directory to constrain paths within
 * @param segments - Path segments to join
 * @returns The joined path if safe
 * @throws Error if resulting path would escape root directory
 */
export function safeJoin(root: string, ...segments: Array<string>): string {
  // First normalize each segment to remove any path traversal sequences
  const normalizedSegments = segments.map((seg) =>
    // Remove leading ../ or ..\ sequences
    path.normalize(seg).replace(/^(\.\.(\/|\\|$))+/, ''),
  );

  // Join the paths
  const result = path.join(root, ...normalizedSegments);
  const resolvedResult = path.resolve(result);
  const resolvedRoot = path.resolve(root);

  // Verify the result is within the root
  if (!isPathWithinRoot(resolvedResult, resolvedRoot)) {
    throw new Error('Path traversal attempt detected');
  }

  return result;
}

/**
 * Validates a filename or folder name for security
 * Rejects names containing path traversal sequences or invalid characters
 * @param name - The filename or folder name to validate
 * @returns true if valid, false otherwise
 */
export function isValidName(name: string): boolean {
  if (!name || name.trim() === '') {
    return false;
  }

  // Reject names containing path separators
  if (name.includes('/') || name.includes('\\')) {
    return false;
  }

  // Reject path traversal attempts
  if (name === '..' || name === '.') {
    return false;
  }

  // Reject null bytes (security risk)
  if (name.includes('\0')) {
    return false;
  }

  // Reject names starting with ./ or .\
  if (name.startsWith('./') || name.startsWith('.\\')) {
    return false;
  }

  return true;
}

/**
 * Sanitizes a filename by removing dangerous characters
 * @param name - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}
