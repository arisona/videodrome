// Minimal type declarations for 'hydra-synth'
// These cover only the APIs directly used in TypeScript code.
// User code passed as strings has access to the full Hydra API at runtime.

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
    setBins?: (bins: number) => void;
    setSmooth?: (value: number) => void;
    setCutoff?: (value: number) => void;
    setScale?: (value: number) => void;
    show?: () => void;
    hide?: () => void;
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
