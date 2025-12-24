/**
 * Hydra Runtime Execution Utilities
 *
 * PURPOSE:
 * Provides runtime utilities for executing user-written Hydra patches and managing Hydra instances.
 * This module bridges between the TypeScript application and Hydra's dynamic runtime environment.
 *
 * KEY FUNCTIONS:
 * - executeInHydraContext: Executes code strings with access to Hydra's global API
 * - assignHydraSource: Assigns media (images, videos, GIFs) to source slots (s0-s3)
 * - cleanupHydraInstance: Safely disposes Hydra instances and cleans up resources
 *
 * HOW IT WORKS:
 * - Uses `new Function()` to create executable code with Hydra globals in scope
 * - Manually injects 26+ Hydra symbols (osc, noise, s0-s3, o0-o3, mouse, etc.) as parameters
 * - Enables user code written as strings to access the full Hydra API at runtime
 *
 * RELATIONSHIP TO OTHER FILES:
 * - This file: Runtime execution utilities (implementation)
 * - shared/hydra-synth.d.ts: Types for Hydra instances and sources
 * - hydra-globals.d.ts: Types for Monaco IntelliSense (describes the API this file provides)
 * - hydra-gif.ts: Specialized GIF handling (used internally by assignHydraSource)
 */

import { initGifSource, setGifPlaybackSpeed } from './hydra-gif';

import type { MediaType } from '../../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';
import type Hydra from 'hydra-synth';

/**
 * Executes code in a Hydra instance's context
 * This creates a function with access to all Hydra sources, outputs, and utilities
 * @param hydra - The Hydra instance to execute code in
 * @param code - The code string to execute
 * @param clear - If true, clears all output buffers (o0-o3) and resets update callbacks before executing code. Unlike hush(), this preserves sources (s0-s3).
 */
export function executeInHydraContext(hydra: Hydra, code: string, clear = false): void {
  const h = hydra.synth;

  // Clear state if requested (preserves sources unlike hush())
  if (clear) {
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    h.solid(0, 0, 0, 0).out(h.o0);
    h.solid(0, 0, 0, 0).out(h.o1);
    h.solid(0, 0, 0, 0).out(h.o2);
    h.solid(0, 0, 0, 0).out(h.o3);
    h.render(h.o0);
    h.update = () => {
      // Intentionally empty
    };
    h.afterUpdate = () => {
      // Intentionally empty
    };
  }

  // Create a function with access to all Hydra source functions, outputs, and utilities
  // Also add hydra instance itself as 'hydra'
  // Note: time, width, height, speed, bpm are set as globals, not parameters
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const func = new Function(
    'osc',
    'noise',
    'voronoi',
    'shape',
    'gradient',
    'src',
    'solid',
    'prev',
    'out',
    'render',
    'update',
    'setResolution',
    'setFunction',
    'mouse',
    's0',
    's1',
    's2',
    's3',
    'o0',
    'o1',
    'o2',
    'o3',
    'a',
    'hydra',
    code,
  ) as (...args: Array<unknown>) => unknown;

  // Call it with the Hydra instance's functions and shared audio object
  func(
    h.osc,
    h.noise,
    h.voronoi,
    h.shape,
    h.gradient,
    h.src,
    h.solid,
    h.prev,
    h.out,
    h.render,
    h.update,
    h.setResolution,
    h.setFunction,
    h.mouse,
    h.s0,
    h.s1,
    h.s2,
    h.s3,
    h.o0,
    h.o1,
    h.o2,
    h.o3,
    h.a,
    hydra,
  );
}

/**
 * Disposes a Hydra instance to release resources
 * Hydra doesn't expose a proper dispose() method, so this does the best cleanup possible:
 * - Calls hush() to stop rendering and clear outputs
 * - Clears all sources to release media streams (cameras, videos, etc.)
 * - Clears the canvas
 *
 * Note: Some resources (WebGL context, animation loop) will be garbage collected
 * when the Hydra instance is no longer referenced.
 *
 * @param hydraInstance - The Hydra instance to dispose
 * @param canvas - The canvas element used by Hydra
 */
export function disposeHydraInstance(hydraInstance: Hydra, canvas: HTMLCanvasElement): void {
  try {
    console.info(`Disposing Hydra instance on canvas '${canvas.id}'`);

    // Call hush() to clear all sources and outputs
    // This stops rendering, clears visual output, and releases media streams
    hydraInstance.synth.hush();

    // Clear canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  } catch (error) {
    console.warn('Error during Hydra cleanup:', error);
  }
}

/**
 * Sets a media source (image, video, gif) to a Hydra external source slot (s0-s3).
 * Handles GIF initialization via ImageDecoder, video/image via Hydra's built-ins.
 * @param hydra Hydra instance
 * @param sourceSlot External source slot (s0-s3)
 * @param mediaUrl Absolute file URL (file://... or local path already converted)
 * @param mediaType Media type
 */
export function setHydraSource(
  hydra: Hydra,
  sourceSlot: HydraSourceSlot,
  mediaUrl: string,
  mediaType: MediaType,
): void {
  try {
    if (mediaType === 'image') {
      hydra.synth[sourceSlot].initImage(mediaUrl, { mag: 'linear' });
      return;
    } else if (mediaType === 'video') {
      hydra.synth[sourceSlot].initVideo(mediaUrl, { mag: 'linear' });
      return;
    } else {
      // mediaType === 'gif'
      void initGifSource(hydra, sourceSlot, mediaUrl);
      return;
    }
  } catch (error) {
    console.error('Failed to set Hydra source', {
      slot: sourceSlot,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      error,
    });
  }
}

/**
 * Clears a Hydra external source slot (s0-s3)
 * Releases any media (video/image) and sets the source to black
 * @param hydra Hydra instance
 * @param sourceSlot External source slot (s0-s3)
 */
export function clearHydraSource(hydra: Hydra, sourceSlot: HydraSourceSlot): void {
  try {
    hydra.synth[sourceSlot].clear();
  } catch (error) {
    console.error('Failed to clear Hydra source', {
      slot: sourceSlot,
      error,
    });
  }
}

/**
 * Sets playback speed for a source (video or GIF)
 * @param hydra Hydra instance
 * @param sourceSlot External source slot (s0-s3)
 * @param mediaType Media type
 * @param speed Playback speed (0 = paused, 1 = normal, 2 = 2x speed)
 */
export function setHydraSourcePlaybackSpeed(
  hydra: Hydra,
  sourceSlot: HydraSourceSlot,
  mediaType: MediaType,
  speed: number,
): void {
  try {
    if (mediaType === 'video') {
      const source = hydra.synth[sourceSlot];
      const videoElement = source.src as HTMLVideoElement | undefined;
      if (videoElement && videoElement instanceof HTMLVideoElement) {
        if (speed === 0) {
          videoElement.pause();
        } else {
          videoElement.playbackRate = speed;
          // Resume playback if paused
          void videoElement.play().catch((error: unknown) => {
            console.warn('Could not resume video playback:', error);
          });
        }
      }
    } else if (mediaType === 'gif') {
      setGifPlaybackSpeed(hydra, sourceSlot, speed);
    }
  } catch {
    // Ignore errors applying playback speed (very common)
  }
}
