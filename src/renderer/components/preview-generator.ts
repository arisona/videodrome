/* eslint-env browser */

import type { MediaFile, MediaType } from '../../shared/types';

const PREVIEW_HEIGHT = 48;
const PREVIEW_WIDTH = 80;
const FILMSTRIP_FRAME_COUNT = 5;
const FILMSTRIP_FRAME_GAP = 2;
const CACHE_LIMIT = 500;
const DATABASE_NAME = 'videodrome-previews';

interface PreviewCacheEntry {
  filePath: string;
  previewDataUrl: string;
  mtime: number;
}

// Limit in-memory cache to prevent unbounded growth (tunable)
const MAX_MEMORY_CACHE_ENTRIES = CACHE_LIMIT;

export class PreviewGenerator {
  private db: IDBDatabase | null = null;
  private dbName = DATABASE_NAME;
  private storeName = 'previews';
  private initPromise: Promise<void>;
  // Simple in-memory cache to avoid duplicate preview lookups within session
  private memoryCache = new Map<string, PreviewCacheEntry>();

  constructor() {
    this.initPromise = this.initDB();
  }

  async generateAllPreviews(
    mediaFiles: Array<MediaFile>,
    onProgress?: (current: number, total: number) => void,
  ): Promise<void> {
    await this.clearCache();

    const filesToProcess = mediaFiles.filter((m) => !m.isDirectory && m.type);
    for (let i = 0; i < filesToProcess.length; i++) {
      const media = filesToProcess[i];
      if (media.type) {
        // Use provided mtime for cache validity; fallback to current time if missing
        const effectiveMtime = typeof media.mtime === 'number' ? media.mtime : Date.now();
        await this.generatePreview(media.path, media.type, effectiveMtime);
      }

      if (onProgress) {
        onProgress(i + 1, filesToProcess.length);
      }
    }
  }

  async generatePreview(filePath: string, type: MediaType, mtime: number): Promise<string | null> {
    try {
      // Check if preview already exists and is up-to-date
      const cached = await this.getCachedPreview(filePath);
      if (cached?.mtime === mtime) {
        return cached.previewDataUrl;
      }

      // Generate new preview
      let previewDataUrl: string;

      if (type === 'image') {
        previewDataUrl = await this.generateImagePreview(filePath);
      } else if (type === 'video') {
        previewDataUrl = await this.generateVideoFilmstrip(filePath);
      } else {
        // gif
        previewDataUrl = await this.generateGifFilmstrip(filePath);
      }

      // Update cache
      await this.saveCachedPreview({
        filePath,
        previewDataUrl,
        mtime,
      });

      return previewDataUrl;
    } catch (error) {
      console.error(`Error generating preview for ${filePath}:`, error);
      return null;
    }
  }

  getPreviewDataUrl(filePath: string): string | null {
    return this.memoryCache.get(filePath)?.previewDataUrl ?? null;
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error(String(request.error)));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Create object store with filePath as key
          db.createObjectStore(this.storeName, { keyPath: 'filePath' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    await this.initPromise;
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  private async clearCache(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        // Reset in-memory cache too
        this.memoryCache.clear();
        resolve();
      };
      request.onerror = () => {
        reject(new Error(String(request.error)));
      };
    });
  }

  private async getCachedPreview(filePath: string): Promise<PreviewCacheEntry | null> {
    // Fast path: memory cache
    const mem = this.memoryCache.get(filePath);
    if (mem) return mem;

    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(filePath);

      request.onsuccess = () => {
        const entry = request.result as PreviewCacheEntry | null;
        if (entry) {
          this.memoryCache.set(filePath, entry);
        }
        resolve(entry);
      };
      request.onerror = () => {
        reject(new Error(String(request.error)));
      };
    });
  }

  private async saveCachedPreview(entry: PreviewCacheEntry): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        // Populate memory cache with eviction (simple FIFO based on insertion order)
        if (
          !this.memoryCache.has(entry.filePath) &&
          this.memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES
        ) {
          // Remove oldest entry (first iterated key)
          const oldestKey = this.memoryCache.keys().next().value;
          if (oldestKey) {
            this.memoryCache.delete(oldestKey);
          }
        }
        this.memoryCache.set(entry.filePath, entry);
        resolve();
      };
      request.onerror = () => {
        reject(new Error(String(request.error)));
      };
    });
  }

  private async generateImagePreview(filePath: string): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const img = await this.loadImage(filePath);

    // Resize to thumbnail size
    canvas.width = PREVIEW_WIDTH;
    canvas.height = PREVIEW_HEIGHT;

    // Calculate dimensions to cover the preview area
    const scale = Math.max(PREVIEW_WIDTH / img.width, PREVIEW_HEIGHT / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (PREVIEW_WIDTH - scaledWidth) / 2;
    const offsetY = (PREVIEW_HEIGHT - scaledHeight) / 2;

    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private async generateGifFilmstrip(filePath: string): Promise<string> {
    // Check if ImageDecoder is available
    if (!('ImageDecoder' in globalThis)) {
      throw new Error('ImageDecoder API not available');
    }

    // Fetch the GIF data
    const response = await fetch(`file://${filePath}`);
    const arrayBuffer = await response.arrayBuffer();

    // Create ImageDecoder
    const decoder = new ImageDecoder({
      data: arrayBuffer,
      type: 'image/gif',
    });

    try {
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;

      if (!track) {
        throw new Error('No track found in GIF');
      }

      const frameCount = Math.min(track.frameCount, FILMSTRIP_FRAME_COUNT);
      const frames: Array<ImageBitmap> = [];

      // Extract evenly distributed frames
      for (let i = 0; i < frameCount; i++) {
        const frameIndex = Math.floor((i * track.frameCount) / frameCount);
        const { image } = await decoder.decode({ frameIndex });
        // Some TS lib versions may type as VideoFrame; normalize
        if (typeof VideoFrame !== 'undefined' && image instanceof VideoFrame) {
          const bitmap = await createImageBitmap(image);
          image.close();
          frames.push(bitmap);
        } else {
          frames.push(image as unknown as ImageBitmap);
        }
      }

      // Create filmstrip
      const filmstrip = this.createFilmstrip(frames);

      // Clean up frames
      frames.forEach((frame) => {
        frame.close();
      });

      return filmstrip;
    } finally {
      decoder.close();
    }
  }

  private async generateVideoFilmstrip(filePath: string): Promise<string> {
    if (!('VideoDecoder' in globalThis)) {
      throw new Error('VideoDecoder API not available');
    }

    // Use a video element to get duration and frames
    // VideoDecoder requires encoded chunks, so we'll use a simpler approach
    // with a video element for now

    const video = document.createElement('video');
    video.src = `file://${filePath}`;
    video.preload = 'metadata';

    // Wait for metadata to load
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        resolve();
      };
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };
    });

    const duration = video.duration;
    if (!duration || !isFinite(duration)) {
      throw new Error('Invalid video duration');
    }

    const frames: Array<ImageBitmap> = [];

    // Extract frames at evenly distributed timestamps
    for (let i = 0; i < FILMSTRIP_FRAME_COUNT; i++) {
      const progress = i / Math.max(FILMSTRIP_FRAME_COUNT - 1, 1);
      const timestamp = progress < 1 ? duration * progress : duration * 0.95;

      try {
        const frame = await this.extractVideoFrame(video, timestamp);
        frames.push(frame);
      } catch (error) {
        console.warn(`Failed to extract frame ${String(i)} at ${String(timestamp)}s:`, error);
      }
    }

    if (frames.length === 0) {
      throw new Error('Failed to extract any frames from video');
    }

    // Create filmstrip
    const filmstrip = this.createFilmstrip(frames);

    // Clean up frames
    frames.forEach((frame) => {
      frame.close();
    });

    return filmstrip;
  }

  private async extractVideoFrame(
    video: HTMLVideoElement,
    timestamp: number,
  ): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      const seeked = () => {
        video.removeEventListener('seeked', seeked);
        video.removeEventListener('error', errored);

        createImageBitmap(video).then(resolve).catch(reject);
      };

      const errored = () => {
        video.removeEventListener('seeked', seeked);
        video.removeEventListener('error', errored);
        reject(new Error('Video seek error'));
      };

      video.addEventListener('seeked', seeked);
      video.addEventListener('error', errored);
      video.currentTime = timestamp;
    });
  }

  private createFilmstrip(frames: Array<ImageBitmap>): string {
    const actualFrameCount = frames.length;
    const totalGaps = Math.max(actualFrameCount - 1, 0) * FILMSTRIP_FRAME_GAP;
    const filmstripWidth = PREVIEW_WIDTH * actualFrameCount + totalGaps;

    const canvas = document.createElement('canvas');
    canvas.width = filmstripWidth;
    canvas.height = PREVIEW_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Fill background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, filmstripWidth, PREVIEW_HEIGHT);

    // Draw frames
    frames.forEach((frame, i) => {
      const x = i * (PREVIEW_WIDTH + FILMSTRIP_FRAME_GAP);

      // Calculate dimensions to cover the frame area
      const scale = Math.max(PREVIEW_WIDTH / frame.width, PREVIEW_HEIGHT / frame.height);
      const scaledWidth = frame.width * scale;
      const scaledHeight = frame.height * scale;
      const offsetX = x + (PREVIEW_WIDTH - scaledWidth) / 2;
      const offsetY = (PREVIEW_HEIGHT - scaledHeight) / 2;

      // Clip to fixed cell to ensure constant visual gap irrespective of aspect ratio.
      // Without clipping, oversized dimension spills into gap making it appear variable.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      ctx.clip();
      ctx.drawImage(frame, offsetX, offsetY, scaledWidth, scaledHeight);
      ctx.restore();
    });

    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = `file://${src}`;
    });
  }
}
