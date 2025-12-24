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
  playbackSpeed: number; // 0 = paused, 1 = normal, 2 = 2x speed
  currentFrameIndex: number;
  frameCount: number;
  ctx: CanvasRenderingContext2D | null;
  renderFrame: (() => Promise<void>) | null;
}

// Track active gif sources for cleanup (per Hydra instance)
const activeGifSources = new WeakMap<Hydra, Map<HydraSourceSlot, GifSourceState>>();

// Get or create the source map for a Hydra instance
function getSourceMapForHydra(hydra: Hydra): Map<HydraSourceSlot, GifSourceState> {
  let sourceMap = activeGifSources.get(hydra);
  if (!sourceMap) {
    sourceMap = new Map();
    activeGifSources.set(hydra, sourceMap);
  }
  return sourceMap;
}

// Cleanup a gif source
function cleanupGifSource(hydra: Hydra, slot: HydraSourceSlot): void {
  const sourceMap = activeGifSources.get(hydra);
  if (!sourceMap) return;

  const state = sourceMap.get(slot);
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

  sourceMap.delete(slot);
}

export async function initGifSource(
  hydra: Hydra,
  slot: HydraSourceSlot,
  mediaUrl: string,
): Promise<void> {
  // Clean up previous gif for this slot
  cleanupGifSource(hydra, slot);

  // Use ImageDecoder API to decode animated gif frames
  // This properly handles multi-frame gifs with frame timing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let decoder: ImageDecoder | null = null;
  let timeoutId: number | null = null;

  // Create state for this source
  const state: GifSourceState = {
    decoder: null,
    playing: false,
    timeoutId: null,
    canvas,
    playbackSpeed: 1.0, // Default to normal speed
    currentFrameIndex: 0,
    frameCount: 1,
    ctx,
    renderFrame: null,
  };
  const sourceMap = getSourceMapForHydra(hydra);
  sourceMap.set(slot, state);

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
    state.frameCount = track.frameCount;

    // Animation loop
    async function renderFrame(): Promise<void> {
      if (!state.playing || !state.decoder) return;
      if (state.playbackSpeed === 0) {
        return;
      }

      try {
        // Decode current frame
        const result = await state.decoder.decode({ frameIndex: state.currentFrameIndex });

        // Draw to canvas
        if (state.ctx) {
          state.ctx.clearRect(0, 0, canvas.width, canvas.height);
          state.ctx.drawImage(result.image, 0, 0);
        }

        // Get frame duration (in microseconds, convert to ms)
        const frameDuration = result.image.duration ?? 100000; // default 100ms
        // Apply playback speed: higher speed = shorter duration
        const durationMs = frameDuration / 1000 / state.playbackSpeed;

        // Clean up the frame
        result.image.close();

        // Move to next frame
        state.currentFrameIndex = (state.currentFrameIndex + 1) % state.frameCount;

        // Schedule next frame based on GIF timing and playback speed
        timeoutId = window.setTimeout(() => void renderFrame(), durationMs);
        state.timeoutId = timeoutId;
      } catch (error) {
        console.error('Error decoding gif frame:', error);
        state.playing = false;
      }
    }

    // Store renderFrame in state so it can be called from setGifPlaybackSpeed
    state.renderFrame = renderFrame;

    // Start animation
    void renderFrame();
  } catch (error) {
    console.error('Error initializing gif:', error);
    // Clean up on error
    cleanupGifSource(hydra, slot);
  }
}

/**
 * Set playback speed for a GIF source
 * @param hydra Hydra instance
 * @param slot Source slot (s0-s3)
 * @param speed Playback speed (0 = paused, 1 = normal, 2 = 2x speed)
 */
export function setGifPlaybackSpeed(hydra: Hydra, slot: HydraSourceSlot, speed: number): void {
  const sourceMap = activeGifSources.get(hydra);
  if (!sourceMap) return;

  const state = sourceMap.get(slot);
  if (!state) return;

  const previousSpeed = state.playbackSpeed;
  state.playbackSpeed = speed;

  if (previousSpeed === 0 && speed > 0 && state.playing && state.renderFrame) {
    if (state.timeoutId !== null) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
    void state.renderFrame();
  }
}
