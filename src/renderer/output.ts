/* eslint-env browser */

import Hydra from 'hydra-synth';

import { getCompositeFunction } from '../shared/composite-functions';

import { executeInHydraContext, assignHydraSource } from './hydra/hydra-execution';

import type {
  EditorPayload,
  ExecutionResultsPayload,
  MediaType,
  PreviewFrame,
} from '../shared/types';
import type { HydraSourceSlot } from 'hydra-synth';

// Define frame size and fps of stream sent to editor for preview
const OUTPUT_PREVIEW = {
  PREVIEW_WIDTH: 640,
  PREVIEW_HEIGHT: 480,
  PREVIEW_FPS: 30,
} as const;

// Get DOM elements
const outputCanvas = document.getElementById('output-canvas') as HTMLCanvasElement;

// Create hidden canvases for slot A and B
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

// Hydra running code from slot a
const hydraA = new Hydra({
  canvas: canvasA,
  detectAudio: false,
  enableStreamCapture: false,
  makeGlobal: false,
});

// Hydra running code from slot b
const hydraB = new Hydra({
  canvas: canvasB,
  detectAudio: false,
  enableStreamCapture: false,
  makeGlobal: false,
});

// Hydra for compositing the outputs of a and b
const hydraC = new Hydra({
  canvas: outputCanvas,
  detectAudio: true,
  enableStreamCapture: false,
  makeGlobal: true,
});

// Share the audio analyser from hydraC with the non-global instances
const sharedAudioAnalyser = hydraC.synth.a;
hydraA.synth.a = sharedAudioAnalyser;
hydraB.synth.a = sharedAudioAnalyser;

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  outputCanvas.width = width;
  outputCanvas.height = height;
  canvasA.width = width;
  canvasA.height = height;
  canvasB.width = width;
  canvasB.height = height;

  hydraA.setResolution(width, height);
  hydraB.setResolution(width, height);
  hydraC.setResolution(width, height);
}

// Initialize canvas sizes
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function isEditorPayload(value: unknown): value is EditorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.slotA === 'string' && typeof candidate.slotB === 'string';
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
  targetContext.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

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

// Execute dual-slot composition with 3 Hydra instances
function executeHydraCode(
  slotA: string,
  slotB: string,
  compositeMode: string,
  compositeParams: Record<string, number>,
) {
  const results: ExecutionResultsPayload = {
    slotA: { success: true },
    slotB: { success: true },
  };

  try {
    executeInHydraContext(hydraA, slotA, true);
  } catch (error) {
    console.error('Error executing slot A:', error);
    results.slotA = { success: false, error: serializeError(error) };
  }

  try {
    executeInHydraContext(hydraB, slotB, true);
  } catch (error) {
    console.error('Error executing slot B:', error);
    results.slotB = { success: false, error: serializeError(error) };
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
          console.error(`Unknown composite function: ${compositeMode}`);
          // Fallback to 'add' mode
          const fallbackFunc = getCompositeFunction('add');
          if (fallbackFunc) {
            // Initialize parameters with defaults
            for (const param of fallbackFunc.parameters) {
              if (!(param.key in hydraState)) {
                hydraState[param.key] = param.default;
              }
            }
            executeInHydraContext(hydraC, fallbackFunc.codeTemplate);
          }
        } else {
          // Initialize parameters with defaults if not provided
          for (const param of compositeFunc.parameters) {
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
      if (results.slotA.success) {
        results.slotA = { success: false, error: serializedError };
      }
      if (results.slotB.success) {
        results.slotB = { success: false, error: serializedError };
      }
    } finally {
      window.electronAPI.sendExecutionResults(results);
    }
  });
}

window.electronAPI.onSetHydraSource(
  (data: { sourceSlot: HydraSourceSlot; mediaUrl: string; mediaType: MediaType }) => {
    try {
      const { sourceSlot: slot, mediaUrl: url, mediaType: type } = data;
      assignHydraSource(hydraA, slot, url, type);
      assignHydraSource(hydraB, slot, url, type);
    } catch (error) {
      console.error('Output: Error applying Hydra source:', error);
    }
  },
);

// Listen for code execution from editor
window.electronAPI.onPreviewPortReady(() => {
  previewStreamActive = false;
  previewCaptureInFlight = false;
  startPreviewStreaming();
});

if (window.electronAPI.isPreviewPortReady()) {
  startPreviewStreaming();
}

window.electronAPI.onRunCode((data: string) => {
  try {
    const parsed: unknown = JSON.parse(data);

    if (isEditorPayload(parsed)) {
      const payload: EditorPayload = parsed;
      executeHydraCode(
        payload.slotA,
        payload.slotB,
        payload.compositeMode ?? 'add',
        payload.compositeParams ?? {},
      );
    } else {
      console.error('Invalid payload format received');
    }
  } catch (error) {
    console.error('Error parsing code payload:', error);
  }
});
