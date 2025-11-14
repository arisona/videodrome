/* eslint-env browser */

/**
 * Hydra GIF Animation Support
 *
 * PURPOSE:
 * Provides specialized handling for animated GIF files in Hydra source slots.
 * Hydra's native `initImage()` and `initVideo()` don't handle GIF animations properly,
 * so this module uses the ImageDecoder API to decode and animate GIFs frame-by-frame.
 *
 * KEY FEATURES:
 * - Decodes GIF frames using the browser's ImageDecoder API
 * - Respects frame timing and durations for proper playback
 * - Manages animation loops and cleanup
 * - Uses hidden canvas elements for frame rendering
 *
 * USAGE:
 * This module is used internally by hydra-execution.ts when assigning GIF media to sources.
 * It's not directly imported by application code outside the hydra/ directory.
 *
 * RELATIONSHIP TO OTHER FILES:
 * - This file: Specialized GIF handling implementation
 * - hydra-execution.ts: Calls initGifSource() when media type is 'gif'
 * - shared/hydra-synth.d.ts: Provides HydraSourceSlot and Hydra types
 *
 * TECHNICAL NOTES:
 * - Uses ImageDecoder (modern browser API) for GIF frame extraction
 * - Creates a hidden canvas to render each frame
 * - Initializes Hydra source with canvas using .init({ src: canvas, dynamic: true })
 * - Tracks active GIF sources for proper cleanup and memory management
 */

import type { HydraSourceSlot } from 'hydra-synth';
import type Hydra from 'hydra-synth';

interface GifSourceState {
  decoder: ImageDecoder | null;
  playing: boolean;
  timeoutId: number | null;
  canvas: HTMLCanvasElement;
}

// Track active gif sources for cleanup
const activeGifSources = new Map<string, GifSourceState>();

// Cleanup a gid source
function cleanupGifSource(slot: string): void {
  const state = activeGifSources.get(slot);
  if (!state) return;

  // Stop animation loop
  state.playing = false;
  if (state.timeoutId !== null) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }

  // Close decoder
  if (state.decoder) {
    try {
      state.decoder.close();
    } catch (error) {
      console.error('Error closing gif decoder:', error);
    }
    state.decoder = null;
  }

  activeGifSources.delete(slot);
}

export async function initGifSource(
  hydra: Hydra,
  slot: HydraSourceSlot,
  mediaUrl: string,
): Promise<void> {
  // Clean up previous gif for this slot
  cleanupGifSource(slot);

  // Use ImageDecoder API to decode animated gif frames
  // This properly handles multi-frame gifs with frame timing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let decoder: ImageDecoder | null = null;
  let currentFrameIndex = 0;
  let timeoutId: number | null = null;

  // Create state for this source
  const state: GifSourceState = {
    decoder: null,
    playing: false,
    timeoutId: null,
    canvas,
  };
  activeGifSources.set(slot, state);

  try {
    // Check if ImageDecoder is available
    if (!('ImageDecoder' in globalThis)) {
      console.error('ImageDecoder API not available');
      return;
    }

    // Fetch the gif data
    const response = await fetch(mediaUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Create ImageDecoder
    decoder = new ImageDecoder({
      data: arrayBuffer,
      type: 'image/gif',
    });

    // Wait for decoder to be configured
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;

    if (!track) {
      console.error('No track found in gif');
      return;
    }

    // Set canvas dimensions from first frame
    const firstFrame = await decoder.decode({ frameIndex: 0 });
    canvas.width = firstFrame.image.displayWidth;
    canvas.height = firstFrame.image.displayHeight;
    firstFrame.image.close();

    // Initialize Hydra source
    hydra.synth[slot].init({ src: canvas, dynamic: true }, { mag: 'linear' });

    // Update state
    state.decoder = decoder;
    state.playing = true;

    // Animation loop
    async function renderFrame(): Promise<void> {
      if (!state.playing || !decoder) return;

      try {
        // Decode current frame
        const result = await decoder.decode({ frameIndex: currentFrameIndex });

        // Draw to canvas
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(result.image, 0, 0);
        }

        // Get frame duration (in microseconds, convert to ms)
        const frameDuration = result.image.duration ?? 100000; // default 100ms
        const durationMs = frameDuration / 1000;

        // Clean up the frame
        result.image.close();

        // Move to next frame
        currentFrameIndex = (currentFrameIndex + 1) % (track?.frameCount ?? 1);

        // Schedule next frame based on GIF timing
        timeoutId = window.setTimeout(() => void renderFrame(), durationMs);
        state.timeoutId = timeoutId;
      } catch (error) {
        console.error('Error decoding gif frame:', error);
        state.playing = false;
      }
    }

    // Start animation
    void renderFrame();
  } catch (error) {
    console.error('Error initializing gif:', error);
    // Clean up on error
    cleanupGifSource(slot);
  }
}
