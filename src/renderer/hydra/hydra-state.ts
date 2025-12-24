/* eslint-env browser */

import { setHydraSource, setHydraSourcePlaybackSpeed, clearHydraSource } from './hydra-execution';

import type { MediaType } from '../../shared/ipc-types';
import type Hydra from 'hydra-synth';
import type { HydraSourceSlot } from 'hydra-synth';

export interface SourceMedia {
  mediaPath: string;
  mediaUrl: string;
  mediaType: MediaType;
}

export interface SourceState {
  media: SourceMedia | null;
  playbackSpeed: number;
}

export interface HydraGlobals {
  speed: number;
  audioSmooth: number;
  audioScale: number;
  audioCutoff: number;
}

export interface HydraState {
  sources: {
    s0: SourceState;
    s1: SourceState;
    s2: SourceState;
    s3: SourceState;
  };
  globals: HydraGlobals;
}

const DEFAULT_GLOBALS: HydraGlobals = {
  speed: 1.0,
  audioSmooth: 0.4,
  audioScale: 20.0,
  audioCutoff: 2.0,
};

const DEFAULT_SOURCE_STATE: SourceState = {
  media: null,
  playbackSpeed: 1.0,
};

const state: HydraState = {
  sources: {
    s0: { ...DEFAULT_SOURCE_STATE },
    s1: { ...DEFAULT_SOURCE_STATE },
    s2: { ...DEFAULT_SOURCE_STATE },
    s3: { ...DEFAULT_SOURCE_STATE },
  },
  globals: { ...DEFAULT_GLOBALS },
};

/**
 * Get the entire Hydra state (read-only)
 */
export function getHydraState(): Readonly<HydraState> {
  return state;
}

/**
 * Get sources state (read-only)
 */
export function getSources(): Readonly<HydraState['sources']> {
  return state.sources;
}

/**
 * Get globals state (read-only)
 */
export function getGlobals(): Readonly<HydraGlobals> {
  return state.globals;
}

/**
 * Update a source state
 */
export function updateSource(
  slot: HydraSourceSlot,
  media: SourceMedia | null,
  playbackSpeed: number,
): void {
  state.sources[slot] = {
    media,
    playbackSpeed,
  };
}

/**
 * Update playback speed for a source
 */
export function updateSourcePlaybackSpeed(slot: HydraSourceSlot, playbackSpeed: number): void {
  state.sources[slot].playbackSpeed = playbackSpeed;
}

/**
 * Update all globals at once
 */
export function updateGlobals(globals: Partial<HydraGlobals>): void {
  state.globals = {
    ...state.globals,
    ...globals,
  };
}

/*
 * Update individual global values
 */
export function setSpeed(value: number): void {
  state.globals.speed = value;
}

export function setAudioSmooth(value: number): void {
  state.globals.audioSmooth = value;
}

export function setAudioScale(value: number): void {
  state.globals.audioScale = value;
}

export function setAudioCutoff(value: number): void {
  state.globals.audioCutoff = value;
}

/**
 * Apply all sources to a Hydra instance
 * Sets media sources or clears them if null
 */
export function applySourcesToHydra(hydra: Hydra): void {
  Object.entries(state.sources).forEach(([slot, source]) => {
    if (source.media) {
      try {
        setHydraSource(
          hydra,
          slot as HydraSourceSlot,
          source.media.mediaUrl,
          source.media.mediaType,
        );
        setHydraSourcePlaybackSpeed(
          hydra,
          slot as HydraSourceSlot,
          source.media.mediaType,
          source.playbackSpeed,
        );
      } catch (error) {
        console.error(`Error applying ${slot} to Hydra:`, error);
      }
    } else {
      // Clear the source if no media is assigned
      try {
        clearHydraSource(hydra, slot as HydraSourceSlot);
      } catch (error) {
        console.error(`Error clearing ${slot} in Hydra:`, error);
      }
    }
  });
}

/**
 * Apply globals to a Hydra instance
 */
export function applyGlobalsToHydra(hydra: Hydra): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (window as any).speed = state.globals.speed;

  hydra.synth.a.setSmooth(state.globals.audioSmooth);
  hydra.synth.a.setScale(state.globals.audioScale);
  hydra.synth.a.setCutoff(state.globals.audioCutoff);
}
