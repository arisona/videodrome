/* eslint-env browser */

import Hydra from 'hydra-synth';

import { getCompositeFunction } from '../shared/composite-functions';

import {
  executeInHydraContext,
  setHydraSource,
  setHydraSourcePlaybackSpeed,
} from './hydra/hydra-execution';

import type {
  HydraGlobals,
  ExecutionPayload,
  ResultsPayload,
  MediaType,
  PreviewFrame,
} from '../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';

// Define frame size and fps of stream sent to editor for preview (fixed 16:9)
const OUTPUT_PREVIEW = {
  PREVIEW_WIDTH: 640,
  PREVIEW_HEIGHT: 360,
  PREVIEW_FPS: 30,
} as const;

// Get DOM elements
const outputCanvas = document.getElementById('output-canvas') as HTMLCanvasElement;

// Create hidden canvases for patch a and b
const canvasA = document.createElement('canvas');
const previewCanvasA = document.createElement('canvas');
previewCanvasA.width = OUTPUT_PREVIEW.PREVIEW_WIDTH;
previewCanvasA.height = OUTPUT_PREVIEW.PREVIEW_HEIGHT;
const previewCtxA = previewCanvasA.getContext('2d', { willReadFrequently: true });

const canvasB = document.createElement('canvas');
const previewCanvasB = document.createElement('canvas');
previewCanvasB.width = OUTPUT_PREVIEW.PREVIEW_WIDTH;
previewCanvasB.height = OUTPUT_PREVIEW.PREVIEW_HEIGHT;
const previewCtxB = previewCanvasB.getContext('2d', { willReadFrequently: true });

let previewStreamActive = false;
let lastPreviewTime = 0;
let previewCaptureInFlight = false;

// Hydra running code from patch a
const hydraA = new Hydra({
  canvas: canvasA,
  detectAudio: false,
  enableStreamCapture: false,
  makeGlobal: true,
});

// Hydra running code from patch b
const hydraB = new Hydra({
  canvas: canvasB,
  detectAudio: false,
  enableStreamCapture: false,
  makeGlobal: true,
});

// Hydra for compositing the outputs of a and b
const hydraC = new Hydra({
  canvas: outputCanvas,
  detectAudio: true,
  enableStreamCapture: false,
  makeGlobal: true,
});

// Share the audio analyser from hydraC with hydraA and hydraB
const sharedAudioAnalyser = hydraC.synth.a;
hydraA.synth.a = sharedAudioAnalyser;
hydraB.synth.a = sharedAudioAnalyser;

function resizeCanvas() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Always use square aspect ratio (1:1) - use the larger dimension
  const size = Math.max(windowWidth, windowHeight);

  // Set canvas dimensions to square
  outputCanvas.width = size;
  outputCanvas.height = size;
  canvasA.width = size;
  canvasA.height = size;
  canvasB.width = size;
  canvasB.height = size;

  // Update Hydra instances
  hydraA.setResolution(size, size);
  hydraB.setResolution(size, size);
  hydraC.setResolution(size, size);

  // Center the canvas (square on widescreen will be cropped by body overflow:hidden)
  const canvasStyle = outputCanvas.style;
  canvasStyle.position = 'absolute';
  canvasStyle.left = String((windowWidth - size) / 2) + 'px';
  canvasStyle.top = String((windowHeight - size) / 2) + 'px';
}

// Initialize canvas sizes (doesn't depend on settings anymore)
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function isExecutionPayload(value: unknown): value is ExecutionPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.patchA === 'string' && typeof candidate.patchB === 'string';
}

function extractLineNumber(error: unknown): number | undefined {
  if (error instanceof Error) {
    const stackMatch = error.stack?.match(/(?:<anonymous>|eval):(\d+):(\d+)/);
    if (stackMatch) {
      return parseInt(stackMatch[1], 10);
    }

    const messageMatch = /line (\d+)/i.exec(error.message);
    if (messageMatch) {
      return parseInt(messageMatch[1], 10);
    }
  }
  return undefined;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      lineNumber: extractLineNumber(error),
    };
  }

  return {
    message: String(error),
  };
}

// Track if sources have been initialized
let sourcesInitialized = false;

// Track if composite patch has been injected for current composite mode
let compositeInitialized = false;

let currentCompositeMode: string | null = null;

// Scoped state holder for dynamic parameters
type ScopedState = Record<string, number>;

// Attach (or reuse if already attached) a namespaced object on hydraC
const hydraState: ScopedState = (hydraC as unknown as { vd?: ScopedState }).vd ?? {
  levelA: 1,
  levelB: 1,
  master: 1,
};
(hydraC as unknown as { vd: ScopedState }).vd = hydraState;

function capturePreviewFrame(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  targetContext: CanvasRenderingContext2D | null,
): PreviewFrame | null {
  if (!targetContext) {
    return null;
  }

  targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  // Preview frames are fixed at 16:9 aspect ratio
  const PREVIEW_ASPECT = 16 / 9;
  const sourceAspect = sourceCanvas.width / sourceCanvas.height;

  // Calculate crop region for center cropping to 16:9
  let sx = 0;
  let sy = 0;
  let sw = sourceCanvas.width;
  let sh = sourceCanvas.height;

  // Only crop if aspects don't match (tolerance of 0.01)
  if (Math.abs(sourceAspect - PREVIEW_ASPECT) > 0.01) {
    if (sourceAspect > PREVIEW_ASPECT) {
      // Source is wider than 16:9, crop width (left/right)
      sw = sh * PREVIEW_ASPECT;
      sx = (sourceCanvas.width - sw) / 2;
    } else {
      // Source is taller than 16:9, crop height (top/bottom)
      sh = sw / PREVIEW_ASPECT;
      sy = (sourceCanvas.height - sh) / 2;
    }
  }

  // Draw cropped region to target canvas
  targetContext.drawImage(
    sourceCanvas,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    targetCanvas.width,
    targetCanvas.height,
  );

  try {
    const imageData = targetContext.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const buffer = imageData.data.buffer.slice(0);
    return {
      width: targetCanvas.width,
      height: targetCanvas.height,
      data: buffer,
    };
  } catch (error) {
    console.error('Output: Failed to capture preview frame', error);
    return null;
  }
}

function startPreviewStreaming() {
  if (previewStreamActive) {
    return;
  }
  if (!window.electronAPI.isPreviewPortReady()) {
    return;
  }
  previewStreamActive = true;
  requestAnimationFrame(previewLoop);
}

function previewLoop(timestamp: number) {
  if (!previewStreamActive) {
    return;
  }

  requestAnimationFrame(previewLoop);

  if (!window.electronAPI.isPreviewPortReady()) {
    previewStreamActive = false;
    previewCaptureInFlight = false;
    return;
  }

  if (!sourcesInitialized || previewCaptureInFlight) {
    return;
  }

  const frameInterval = 1000 / OUTPUT_PREVIEW.PREVIEW_FPS;
  if (timestamp - lastPreviewTime < frameInterval) {
    return;
  }
  lastPreviewTime = timestamp;
  previewCaptureInFlight = true;

  try {
    const frameA = capturePreviewFrame(canvasA, previewCanvasA, previewCtxA);
    const frameB = capturePreviewFrame(canvasB, previewCanvasB, previewCtxB);

    if (frameA || frameB) {
      window.electronAPI.sendPreviewFrames(frameA, frameB);
    }
  } catch (error) {
    console.error('Output: Failed to capture preview frames', error);
  } finally {
    previewCaptureInFlight = false;
  }
}

// Execute two patches and composition with 3 Hydra instances
function executeHydraCode(
  patchA: string,
  patchB: string,
  compositeMode: string,
  compositeParams: Record<string, number>,
) {
  const results: ResultsPayload = {
    resultA: { success: true },
    resultB: { success: true },
  };

  try {
    executeInHydraContext(hydraA, patchA, true);
  } catch (error) {
    console.error('Output: Error executing patch A:', error);
    results.resultA = { success: false, error: serializeError(error) };
  }

  try {
    executeInHydraContext(hydraB, patchB, true);
  } catch (error) {
    console.error('Output: Error executing patch B:', error);
    results.resultB = { success: false, error: serializeError(error) };
  }

  requestAnimationFrame(() => {
    try {
      if (!sourcesInitialized) {
        hydraC.synth.s0.init({ src: canvasA });
        hydraC.synth.s1.init({ src: canvasB });
        sourcesInitialized = true;
      }

      // Update scoped state with all composite parameters
      for (const [key, value] of Object.entries(compositeParams)) {
        hydraState[key] = value;
      }

      // Rebuild/eval composite patch only if first time or composite mode changed
      if (!compositeInitialized || currentCompositeMode !== compositeMode) {
        const compositeFunc = getCompositeFunction(compositeMode);
        if (!compositeFunc) {
          console.error(`Output: Unknown composite function: ${compositeMode}`);
          // Fallback to 'add' mode
          const fallbackFunc = getCompositeFunction('add');
          if (fallbackFunc) {
            // Initialize parameters with defaults
            for (const param of fallbackFunc.params) {
              if (!(param.key in hydraState)) {
                hydraState[param.key] = param.default;
              }
            }
            executeInHydraContext(hydraC, fallbackFunc.codeTemplate);
          }
        } else {
          // Initialize parameters with defaults if not provided
          for (const param of compositeFunc.params) {
            if (!(param.key in hydraState)) {
              hydraState[param.key] = param.default;
            }
          }

          // Use the template from the composite function
          executeInHydraContext(hydraC, compositeFunc.codeTemplate);
        }
        compositeInitialized = true;
        currentCompositeMode = compositeMode;
      }
    } catch (error) {
      console.error('Error executing code:', error);
      const serializedError = serializeError(error);
      if (results.resultA.success) {
        results.resultA = { success: false, error: serializedError };
      }
      if (results.resultB.success) {
        results.resultB = { success: false, error: serializedError };
      }
    } finally {
      window.electronAPI.sendExecutionResults(results);
    }
  });
}

// Listen for source assignments from editor (includes initial playback speed)
window.electronAPI.onSetHydraSource(
  (data: {
    sourceSlot: HydraSourceSlot;
    mediaUrl: string;
    mediaType: MediaType;
    playbackSpeed: number;
  }) => {
    try {
      const { sourceSlot: slot, mediaUrl: url, mediaType: type, playbackSpeed: speed } = data;
      setHydraSource(hydraA, slot, url, type);
      setHydraSource(hydraB, slot, url, type);
      // Apply initial playback speed to both instances
      setHydraSourcePlaybackSpeed(hydraA, slot, type, speed);
      setHydraSourcePlaybackSpeed(hydraB, slot, type, speed);
    } catch (error) {
      console.error('Output: Error applying Hydra source:', error);
    }
  },
);

// Listen for playback speed changes from editor (speed-only, doesn't re-assign source)
window.electronAPI.onSetHydraSourceSpeed((data: { sourceSlot: HydraSourceSlot; speed: number }) => {
  try {
    const { sourceSlot: slot, speed } = data;
    // We need to know the media type to apply speed correctly
    // For now, try to apply to both video and gif (one will succeed based on what's actually loaded)
    // This is safe because applyPlaybackSpeed checks if the source exists
    setHydraSourcePlaybackSpeed(hydraA, slot, 'video', speed);
    setHydraSourcePlaybackSpeed(hydraA, slot, 'gif', speed);
    setHydraSourcePlaybackSpeed(hydraB, slot, 'video', speed);
    setHydraSourcePlaybackSpeed(hydraB, slot, 'gif', speed);
  } catch (error) {
    console.error('Output: Error applying playback speed:', error);
  }
});

// Listen for Hydra globals changes from editor
window.electronAPI.onSetHydraGlobals((params: HydraGlobals) => {
  try {
    // Set speed global variable (shared by all Hydra instances due to makeGlobal: true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).speed = params.speed;

    // Set audio analyzer params
    hydraC.synth.a.setSmooth(params.audioSmooth);
    hydraC.synth.a.setScale(params.audioScale);
    hydraC.synth.a.setCutoff(params.audioCutoff);
  } catch (error) {
    console.error('Output: Error setting Hydra globals:', error);
  }
});

// Listen for code execution from editor
window.electronAPI.onPreviewPortReady(() => {
  previewStreamActive = false;
  previewCaptureInFlight = false;
  startPreviewStreaming();
});

if (window.electronAPI.isPreviewPortReady()) {
  startPreviewStreaming();
}

window.electronAPI.onRunHydraCode((data: string) => {
  try {
    const parsed: unknown = JSON.parse(data);

    if (isExecutionPayload(parsed)) {
      const payload: ExecutionPayload = parsed;
      executeHydraCode(
        payload.patchA,
        payload.patchB,
        payload.compositeMode ?? 'add',
        payload.compositeParams ?? {},
      );
    } else {
      console.error('Output: Invalid payload format received');
    }
  } catch (error) {
    console.error('Output: Error parsing code payload:', error);
  }
});
