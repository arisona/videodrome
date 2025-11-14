/* eslint-env browser */

import Hydra from 'hydra-synth';

import { getGlobalSources } from './editor';
import {
  cleanupHydraInstance,
  executeInHydraContext,
  assignHydraSource,
} from './hydra/hydra-execution';

import type { MediaType } from '../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';

// Sources tab state
interface SourcesState {
  hydra: Hydra | null;
  isActive: boolean;
}

let sourcesState: SourcesState | null = null;

// Initialize Hydra instance for sources view
function initHydra() {
  if (!sourcesState) return;
  if (sourcesState.hydra) return;

  const canvas = document.getElementById('editor-sources-canvas') as HTMLCanvasElement;

  sourcesState.hydra = new Hydra({
    canvas: canvas,
    detectAudio: false,
    enableStreamCapture: false,
    makeGlobal: true,
  });

  resizeCanvas();

  // Apply global sources to this Hydra instance
  reapplyGlobalSources();
}

function resizeCanvas() {
  if (!sourcesState?.hydra) return;

  const canvas = document.getElementById('editor-sources-canvas') as HTMLCanvasElement;
  const container = canvas.parentElement;
  if (!container) return;

  const containerWidth = container.clientWidth - 24; // padding
  const containerHeight = container.clientHeight - 24;

  // Always use 4:3 aspect ratio (compromise for Hydra source limitations)
  const aspectRatio = 4 / 3;
  let width = containerWidth;
  let height = width / aspectRatio;

  if (height > containerHeight) {
    height = containerHeight;
    width = height * aspectRatio;
  }

  canvas.width = Math.floor(width);
  canvas.height = Math.floor(height);

  sourcesState.hydra.setResolution(canvas.width, canvas.height);
}

// Re-apply all global sources to the Hydra instance
function reapplyGlobalSources() {
  if (!sourcesState?.hydra) return;

  const globalSources = getGlobalSources();
  const hydra = sourcesState.hydra;

  // Set each source that exists in global state
  Object.entries(globalSources).forEach(([slot, assignment]) => {
    if (assignment) {
      try {
        assignHydraSource(
          hydra,
          slot as HydraSourceSlot,
          assignment.mediaUrl,
          assignment.mediaType,
        );
      } catch (error) {
        console.error(`Error re-applying ${slot} to Sources:`, error);
      }
    }
  });
}

// Export function to allow setting sources from editor.ts
export function setSource(
  sourceSlot: HydraSourceSlot,
  mediaUrl: string,
  mediaType: MediaType,
): void {
  if (!sourcesState?.hydra) return;

  try {
    assignHydraSource(sourcesState.hydra, sourceSlot, mediaUrl, mediaType);
    runPatch();
  } catch (error) {
    console.error(`Error applying ${sourceSlot} to Sources:`, error);
  }
}

// Render all four sources in a 2x2 grid
function runPatch() {
  if (!sourcesState?.hydra) return;

  const hydra = sourcesState.hydra;
  const globalSources = getGlobalSources();

  try {
    // Display each source that has been initialized, otherwise show a placeholder
    const code = `
      ${globalSources.s0 ? 'src(s0)' : 'solid(0.1, 0.1, 0.1)'}.out(o0);
      ${globalSources.s1 ? 'src(s1)' : 'solid(0.1, 0.1, 0.1)'}.out(o1);
      ${globalSources.s2 ? 'src(s2)' : 'solid(0.1, 0.1, 0.1)'}.out(o2);
      ${globalSources.s3 ? 'src(s3)' : 'solid(0.1, 0.1, 0.1)'}.out(o3);
      render();
    `;

    executeInHydraContext(hydra, code);
  } catch (error) {
    console.error('Error rendering sources:', error);
  }
}

function cleanupHydra() {
  if (!sourcesState?.hydra) return;
  const canvas = document.getElementById('editor-sources-canvas') as HTMLCanvasElement;
  cleanupHydraInstance(sourcesState.hydra, canvas);
  sourcesState.hydra = null;
}

// Initialize sources tab
export function initSources() {
  sourcesState = {
    hydra: null,
    isActive: false,
  };

  // Handle window resize
  window.addEventListener('resize', () => {
    if (sourcesState?.isActive) {
      resizeCanvas();
    }
  });
}

// Show sources tab
export function showSources() {
  if (!sourcesState) return;
  sourcesState.isActive = true;
  initHydra();
  runPatch();
}

// Hide sources tab
export function hideSources() {
  if (!sourcesState) return;
  sourcesState.isActive = false;
  cleanupHydra();
}
