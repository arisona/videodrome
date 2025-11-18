/* eslint-env browser */

import { setHydraSource, setHydraSourcePlaybackSpeed } from './hydra/hydra-execution';

import type { MediaType } from '../shared/ipc-types';
import type Hydra from 'hydra-synth';
import type { HydraSourceSlot } from 'hydra-synth';

// Global sources (persisted across tab switches and sent to all Hydra instances)
export interface SourceMedia {
  mediaPath: string;
  mediaUrl: string;
  mediaType: MediaType;
}

export interface SourceState {
  media: SourceMedia | null;
  playbackSpeed: number;
}

const globalSources: {
  s0: SourceState;
  s1: SourceState;
  s2: SourceState;
  s3: SourceState;
} = {
  s0: { media: null, playbackSpeed: 1.0 },
  s1: { media: null, playbackSpeed: 1.0 },
  s2: { media: null, playbackSpeed: 1.0 },
  s3: { media: null, playbackSpeed: 1.0 },
};

// Get global sources (for tabs to read)
export function getGlobalSources() {
  return globalSources;
}

// Apply all global sources to a Hydra instance
export function applyGlobalSourcesToHydra(hydra: Hydra): void {
  Object.entries(globalSources).forEach(([slot, source]) => {
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
    }
  });
}
