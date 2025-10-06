/* eslint-env browser */

/**
 * Hydra execution utilities
 * Provides functions for executing code in Hydra contexts
 */

import { initGifSource } from './hydra-gif';

import type { MediaType } from '../../shared/types';
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
  // Sources: osc, noise, voronoi, shape, gradient, src, solid, prev
  // External sources: s0-s3
  // Outputs: o0-o3, out, render
  // Utilities: a (audio), width, height
  // Hydra instance: hydra
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
    's0',
    's1',
    's2',
    's3',
    'o0',
    'o1',
    'o2',
    'o3',
    'time',
    'mouse',
    'speed',
    'bpm',
    'width',
    'height',
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
    h.s0,
    h.s1,
    h.s2,
    h.s3,
    h.o0,
    h.o1,
    h.o2,
    h.o3,
    h.time,
    h.mouse,
    h.speed,
    h.bpm,
    h.width,
    h.height,
    h.a,
    hydra,
  );
}

/**
 * Cleans up a Hydra instance to release resources
 * Hydra doesn't expose a proper dispose() method, so this does the best cleanup possible:
 * - Calls hush() to stop rendering and clear outputs
 * - Clears all sources to release media streams (cameras, videos, etc.)
 * - Clears the canvas
 *
 * Note: Some resources (WebGL context, animation loop) will be garbage collected
 * when the Hydra instance is no longer referenced.
 *
 * @param hydraInstance - The Hydra instance to clean up
 * @param canvas - The canvas element used by Hydra
 */
export function cleanupHydraInstance(hydraInstance: Hydra, canvas: HTMLCanvasElement): void {
  try {
    console.info(`Cleaning up Hydra instance on canvas '${canvas.id}'`);

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
 * Assigns a media source (image, video, gif) to a Hydra external source slot (s0-s3).
 * Handles GIF initialization via ImageDecoder, video/image via Hydra's built-ins.
 * @param hydra Hydra instance
 * @param sourceSlot External source slot (s0-s3)
 * @param mediaUrl Absolute file URL (file://... or local path already converted)
 * @param mediaType Media type
 */
export function assignHydraSource(
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
      // gif
      void initGifSource(hydra, sourceSlot, mediaUrl);
      return;
    }
  } catch (error) {
    console.error('assignHydraSource: failed to assign source', {
      slot: sourceSlot,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      error,
    });
  }
}
