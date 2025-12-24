import Hydra from 'hydra-synth';

import { SliderControl } from './components/slider-control';
import {
  disposeHydraInstance,
  executeInHydraContext,
  setHydraSource,
  setHydraSourcePlaybackSpeed,
} from './hydra/hydra-execution';
import { applyGlobalsToHydra, applySourcesToHydra, getSources } from './hydra/hydra-state';

import type { MediaType } from '../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';

// Callbacks for source playback speed changes
interface SourcesCallbacks {
  onSourceSpeedChange: (slot: HydraSourceSlot, speed: number) => void;
}

// Sources tab state
interface SourcesState {
  hydra: Hydra | null;
  isActive: boolean;
  callbacks: SourcesCallbacks | null;
  sliders: {
    s0: SliderControl | null;
    s1: SliderControl | null;
    s2: SliderControl | null;
    s3: SliderControl | null;
  };
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

  // Apply all Hydra state (sources + globals) to this Hydra instance
  applySourcesToHydra(sourcesState.hydra);
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

// Export function to allow setting sources from editor.ts
export function setSource(
  sourceSlot: HydraSourceSlot,
  mediaUrl: string,
  mediaType: MediaType,
  playbackSpeed: number,
): void {
  if (!sourcesState?.hydra) return;
  try {
    setHydraSource(sourcesState.hydra, sourceSlot, mediaUrl, mediaType);
    setHydraSourcePlaybackSpeed(sourcesState.hydra, sourceSlot, mediaType, playbackSpeed);
    runPatch();
  } catch (error) {
    console.error(`Error applying ${sourceSlot} to Sources:`, error);
  }
}

// Export function to allow applying globals from editor.ts
export function applyGlobals() {
  if (!sourcesState?.hydra) return;
  applyGlobalsToHydra(sourcesState.hydra);
}

// Export function to allow setting playback speed from editor.ts
export function setSourcePlaybackSpeed(
  sourceSlot: HydraSourceSlot,
  mediaType: MediaType,
  playbackSpeed: number,
): void {
  if (!sourcesState?.hydra) return;
  try {
    setHydraSourcePlaybackSpeed(sourcesState.hydra, sourceSlot, mediaType, playbackSpeed);
    runPatch();
  } catch (error) {
    console.error(`Error applying playback speed for ${sourceSlot} to Sources:`, error);
  }
}

// Render all four sources in a 2x2 grid
function runPatch() {
  if (!sourcesState?.hydra) return;

  const hydra = sourcesState.hydra;
  const sources = getSources();

  try {
    const code = `
      ${sources.s0.media ? 'src(s0)' : 'solid(0.1, 0.1, 0.1)'}.out(o0);
      ${sources.s1.media ? 'src(s1)' : 'solid(0.1, 0.1, 0.1)'}.out(o1);
      ${sources.s2.media ? 'src(s2)' : 'solid(0.1, 0.1, 0.1)'}.out(o2);
      ${sources.s3.media ? 'src(s3)' : 'solid(0.1, 0.1, 0.1)'}.out(o3);
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
  disposeHydraInstance(sourcesState.hydra, canvas);
  sourcesState.hydra = null;
}

// Initialize sources tab
export function initSources(callbacks: SourcesCallbacks) {
  sourcesState = {
    hydra: null,
    isActive: false,
    callbacks: callbacks,
    sliders: {
      s0: null,
      s1: null,
      s2: null,
      s3: null,
    },
  };

  // Create slider controls for each source
  createSliderControls();

  // Handle window resize
  window.addEventListener('resize', () => {
    if (sourcesState?.isActive) {
      resizeCanvas();
      positionSliders();
    }
  });
}

// Create DOM elements for slider controls
function createSliderControls() {
  if (!sourcesState) return;

  const container = document.getElementById('editor-sources-container');
  if (!container) return;

  // Create wrapper for sliders
  const slidersWrapper = document.createElement('div');
  slidersWrapper.id = 'sources-sliders-wrapper';
  slidersWrapper.style.position = 'absolute';
  slidersWrapper.style.pointerEvents = 'none';
  slidersWrapper.style.width = '100%';
  slidersWrapper.style.height = '100%';
  slidersWrapper.style.top = '0';
  slidersWrapper.style.left = '0';
  container.style.position = 'relative';
  container.appendChild(slidersWrapper);

  // Create slider for each source (s0, s1, s2, s3)
  const sourceSlots: Array<HydraSourceSlot> = ['s0', 's1', 's2', 's3'];
  sourceSlots.forEach((slot) => {
    const sliderContainer = document.createElement('div');
    sliderContainer.id = `slider-${slot}`;
    sliderContainer.className = 'source-slider-container';
    sliderContainer.style.position = 'absolute';
    sliderContainer.style.pointerEvents = 'auto';
    sliderContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
    sliderContainer.style.padding = '8px 8px';
    sliderContainer.style.borderRadius = '4px';
    slidersWrapper.appendChild(sliderContainer);

    const slider = new SliderControl(sliderContainer, {
      label: `Source ${slot} speed`,
      min: 0,
      max: 2,
      step: 0.01,
      defaultValue: 1.0,
      decimals: 1,
      attachmentContainer: document.body, // Attach popups to body for proper positioning
      onUpdate: (value: number) => {
        sourcesState?.callbacks?.onSourceSpeedChange(slot, value);
      },
    });

    if (sourcesState) {
      sourcesState.sliders[slot] = slider;
    }
  });

  // Don't position sliders here - wait until tab is shown and canvas is properly sized
}

// Position sliders at bottom-left of each quadrant
function positionSliders() {
  if (!sourcesState) return;

  const canvas = document.getElementById('editor-sources-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const container = canvas.parentElement;
  if (!container) return;

  // Get actual rendered dimensions
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Calculate canvas position relative to container
  const canvasLeft = canvasRect.left - containerRect.left;
  const canvasTop = canvasRect.top - containerRect.top;

  // Use actual rendered canvas dimensions (not CSS dimensions)
  const renderedWidth = canvasRect.width;
  const renderedHeight = canvasRect.height;
  const quadrantWidth = renderedWidth / 2;
  const quadrantHeight = renderedHeight / 2;

  // Position each slider at bottom-left of its quadrant
  // Hydra layout: s0=top-left, s1=bottom-left, s2=top-right, s3=bottom-right
  const positions = [
    { slot: 's0', x: canvasLeft + 8, y: canvasTop + quadrantHeight - 54 }, // s0: Top-left
    { slot: 's1', x: canvasLeft + 8, y: canvasTop + renderedHeight - 54 }, // s1: Bottom-left
    { slot: 's2', x: canvasLeft + quadrantWidth + 8, y: canvasTop + quadrantHeight - 54 }, // s2: Top-right
    { slot: 's3', x: canvasLeft + quadrantWidth + 8, y: canvasTop + renderedHeight - 54 }, // s3: Bottom-right
  ];

  positions.forEach(({ slot, x, y }) => {
    const sliderContainer = document.getElementById(`slider-${slot}`);
    if (sliderContainer) {
      sliderContainer.style.left = String(x) + 'px';
      sliderContainer.style.top = String(y) + 'px';
    }
  });
}

// Show sources tab
export function showSources() {
  if (!sourcesState) return;
  sourcesState.isActive = true;
  initHydra();
  runPatch();

  // Reposition sliders after canvas is properly laid out
  setTimeout(() => {
    positionSliders();
  }, 0);
}

// Hide sources tab
export function hideSources() {
  if (!sourcesState) return;
  sourcesState.isActive = false;
  cleanupHydra();
}
