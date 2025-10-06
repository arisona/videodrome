/* eslint-env browser */

import type { HydraSourceSlot } from 'hydra-synth';
import type Hydra from 'hydra-synth';

interface GifSourceState {
  decoder: ImageDecoder | null;
  playing: boolean;
  timeoutId: number | null;
  canvas: HTMLCanvasElement;
}

// Track active GIF sources for cleanup
const activeGifSources = new Map<string, GifSourceState>();

// Cleanup a GIF source
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
      console.error('[GIF] Error closing decoder:', error);
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
  // Clean up previous GIF for this slot
  cleanupGifSource(slot);

  // Use ImageDecoder API to decode animated GIF frames
  // This properly handles multi-frame GIFs with frame timing
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
      console.error('[GIF] ImageDecoder API not available');
      return;
    }

    // Fetch the GIF data
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
      console.error('[GIF] No track found in GIF');
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
        console.error('[GIF] Error decoding frame:', error);
        state.playing = false;
      }
    }

    // Start animation
    void renderFrame();
  } catch (error) {
    console.error('[GIF] Error initializing GIF:', error);
    // Clean up on error
    cleanupGifSource(slot);
  }
}
