import * as fs from 'fs';
import * as path from 'path';

import {
  SUPPORTED_IMAGE_EXTS,
  SUPPORTED_VIDEO_EXTS,
  SUPPORTED_GIF_EXTS,
} from '../../shared/constants';

import { createDirectorySkipFilter, createExtensionFilter, scanDirectory } from './file-scanning';

import type { MediaFile, MediaType } from '../../shared/ipc-types';

export function getMediaType(fileName: string): MediaType | null {
  const ext = path.extname(fileName).toLowerCase();
  if ((SUPPORTED_IMAGE_EXTS as ReadonlyArray<string>).includes(ext)) return 'image';
  if ((SUPPORTED_VIDEO_EXTS as ReadonlyArray<string>).includes(ext)) return 'video';
  if ((SUPPORTED_GIF_EXTS as ReadonlyArray<string>).includes(ext)) return 'gif';
  return null;
}

// Collect media files with mtime for cache invalidation
export function collectMediaFiles(directory: string): Array<MediaFile> {
  const supportedExts = [...SUPPORTED_IMAGE_EXTS, ...SUPPORTED_GIF_EXTS, ...SUPPORTED_VIDEO_EXTS];

  const scannedItems = scanDirectory(directory, {
    sortDirectoriesFirst: true,
    fileFilter: createExtensionFilter(supportedExts),
    directoryFilter: createDirectorySkipFilter(['.cache']),
    skipHiddenFiles: true,
  });

  return scannedItems
    .map((item): MediaFile | null => {
      if (item.isDirectory) {
        return {
          name: item.name,
          path: item.path,
          relativePath: item.relativePath,
          isDirectory: true,
          depth: item.depth,
        };
      }

      const mediaType = getMediaType(item.name);
      if (!mediaType) return null; // Safety (should be filtered out already)

      let mtime: number | undefined;
      try {
        const stats = fs.statSync(item.path);
        mtime = stats.mtimeMs;
      } catch {
        // If we can't stat, skip mtime
        mtime = undefined;
      }

      return {
        name: item.name,
        path: item.path,
        relativePath: item.relativePath,
        isDirectory: false,
        depth: item.depth,
        type: mediaType,
        mtime,
      };
    })
    .filter((item): item is MediaFile => item !== null);
}
