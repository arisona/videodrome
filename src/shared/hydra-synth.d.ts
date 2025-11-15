/**
 * Type definitions for the 'hydra-synth' npm package
 *
 * PURPOSE:
 * Provides TypeScript types for programmatic usage of Hydra instances in application code.
 * This includes creating Hydra instances, accessing instance properties, and managing sources.
 *
 * SCOPE:
 * - Covers ONLY the APIs used directly in TypeScript code (Hydra class, synth object, sources)
 * - Does NOT provide types for user-facing Hydra functions (osc, noise, shape, etc.)
 * - User code is executed as strings and has access to the full Hydra runtime API
 *
 * RELATIONSHIP TO OTHER FILES:
 * - This file: Runtime instance types for programmatic Hydra usage
 * - renderer/hydra/hydra-globals.d.ts: Ambient types for Monaco editor IntelliSense
 * - renderer/hydra/hydra-execution.ts: Runtime utilities for executing user code
 *
 * WHEN TO IMPORT:
 * Import from this file when you need:
 * - The Hydra class constructor (default import)
 * - HydraSourceSlot type for s0-s3 references
 * - Types for Hydra instance properties (synth, setResolution, etc.)
 * - Interfaces for Hydra's internal objects (HydraSource, HydraAudioAnalyser, etc.)
 */

declare module 'hydra-synth' {
  export interface HydraOptions {
    canvas?: HTMLCanvasElement;
    detectAudio?: boolean;
    enableStreamCapture?: boolean;
    makeGlobal?: boolean;
    width?: number;
    height?: number;
  }

  export interface HydraAudioAnalyser {
    fft: Float32Array;
    setBins: (bins: number) => void;
    setSmooth: (value: number) => void;
    setCutoff: (value: number) => void;
    setScale: (value: number) => void;
    show: () => void;
    hide: () => void;
  }

  export interface HydraSource {
    // Initialize source with a canvas or video element
    init: (
      opts: { src: HTMLCanvasElement | HTMLVideoElement; dynamic?: boolean },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params?: any,
    ) => void;

    // Initialize source with an image URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initImage: (url: string, params?: any) => void;

    // Initialize source with a video URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initVideo: (url: string, params?: any) => void;
  }

  export interface HydraSynth {
    // Audio analyzer object (needed to assign between multiple instances)
    a: HydraAudioAnalyser;

    // Stop all running visuals (needed to dispose instance)
    hush: () => void;

    // Texture sources (s0-s3)
    s0: HydraSource;
    s1: HydraSource;
    s2: HydraSource;
    s3: HydraSource;

    // Allow accessing any other Hydra properties (osc, noise, o0-o3, etc.)
    // These are passed through to user code but not directly used in TypeScript
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  export default class Hydra {
    constructor(options?: HydraOptions);
    // The internal synth object with generator / transform functions
    synth: HydraSynth;
    // Adjust rendering resolution
    setResolution: (width: number, height: number) => void;
  }

  export type HydraSourceSlot = 's0' | 's1' | 's2' | 's3';
}
