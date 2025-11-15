/* eslint-env browser */

import Hydra from 'hydra-synth';
import * as monaco from 'monaco-editor';

import { STATUS_MESSAGES } from '../shared/constants';

import {
  applyToHydraInstance,
  addAudioDrawerListener,
  removeAudioDrawerListener,
} from './components/audio-drawer';
import { PatchPanel } from './components/patch-panel';
import { getGlobalSources } from './editor';
import {
  executeInHydraContext,
  cleanupHydraInstance,
  assignHydraSource,
} from './hydra/hydra-execution';
import { requireElementById } from './utils/dom';

import type { MediaType } from '../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';

const MARKER_OWNER = 'hydra-composer';

// Composer tab state
interface ComposerState {
  panel: PatchPanel;
  hydra: Hydra | null;
  isActive: boolean;
}

let composerState: ComposerState | null = null;

// Listener for audio settings changes
let audioSettingsListener:
  | ((params: { smooth: number; scale: number; cutoff: number }) => void)
  | null = null;

// Initialize Hydra instance
function initHydra() {
  if (!composerState) return;
  if (composerState.hydra) return;

  const canvas = document.getElementById('editor-composer-preview-canvas') as HTMLCanvasElement;

  composerState.hydra = new Hydra({
    canvas: canvas,
    detectAudio: true,
    enableStreamCapture: false,
    makeGlobal: true,
  });

  resizeCanvas();

  // Apply global sources to this Hydra instance
  reapplyGlobalSources();

  // Apply current audio settings to this Hydra instance
  applyToHydraInstance(composerState.hydra);

  // Register listener for future audio drawer changes
  audioSettingsListener = (params) => {
    if (composerState?.hydra) {
      composerState.hydra.synth.a.setSmooth(params.smooth);
      composerState.hydra.synth.a.setScale(params.scale);
      composerState.hydra.synth.a.setCutoff(params.cutoff);
    }
  };
  addAudioDrawerListener(audioSettingsListener);
}

function resizeCanvas() {
  if (!composerState?.hydra) return;

  const canvas = document.getElementById('editor-composer-preview-canvas') as HTMLCanvasElement;
  const container = canvas.parentElement;
  if (!container) return;

  const containerWidth = container.clientWidth - 24; // padding
  const containerHeight = container.clientHeight - 24;

  // Always use square aspect ratio (1:1)
  const size = Math.min(containerWidth, containerHeight);

  canvas.width = Math.floor(size);
  canvas.height = Math.floor(size);

  composerState.hydra.setResolution(canvas.width, canvas.height);
}

// Re-apply all global sources to the Hydra instance
function reapplyGlobalSources() {
  if (!composerState?.hydra) return;

  const globalSources = getGlobalSources();
  const hydra = composerState.hydra;

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
        console.error(`Error re-applying ${slot} to Composer:`, error);
      }
    }
  });
}

// Export function to allow setting sources from editor.ts
export function setSource(sourceSlot: HydraSourceSlot, mediaUrl: string, mediaType: MediaType) {
  if (!composerState?.hydra) return;

  try {
    assignHydraSource(composerState.hydra, sourceSlot, mediaUrl, mediaType);
  } catch (error) {
    console.error(`Error applying ${sourceSlot} to Composer:`, error);
  }
}

function cleanupHydra() {
  if (!composerState?.hydra) return;
  const previewCanvas = document.getElementById(
    'editor-composer-preview-canvas',
  ) as HTMLCanvasElement;
  cleanupHydraInstance(composerState.hydra, previewCanvas);
  composerState.hydra = null;

  // Unregister audio drawer listener
  if (audioSettingsListener) {
    removeAudioDrawerListener(audioSettingsListener);
    audioSettingsListener = null;
  }
}

function executeHydraCode(code: string) {
  if (!composerState) return;

  let hydraInstance = composerState.hydra;
  if (!hydraInstance) {
    initHydra();
    hydraInstance = composerState.hydra;
    if (!hydraInstance) return;
  }

  const monacoEditor = composerState.panel.getEditor();
  const statusElement = requireElementById('composer-status') as HTMLSpanElement;

  try {
    executeInHydraContext(hydraInstance, code, true);

    // Clear Monaco markers on success
    const model = monacoEditor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    }

    statusElement.textContent = STATUS_MESSAGES.READY;
    statusElement.style.color = '#858585';
    statusElement.removeAttribute('title');
  } catch (error) {
    console.error('Error executing Hydra code:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Set Monaco markers for error
    const model = monacoEditor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, [
        {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: Number.MAX_VALUE,
          message: errorMessage,
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
    }

    // Update status with error and tooltip
    statusElement.textContent = STATUS_MESSAGES.ERROR;
    statusElement.style.color = '#f48771';
    statusElement.setAttribute('title', errorMessage);
  }
}

function runPatch() {
  if (!composerState) return;
  const code = composerState.panel.getEditor().getValue();
  executeHydraCode(code);
}

// Initialize composer tab
export function initComposer() {
  const initialValue = `// I'm sorry Dave, I'm afraid I can't do that.
solid(0, 0, 0)
  .add(
    shape(100, 0.5, 0.02)
      .color(0.3, 0.3, 0.35)
      .luma(0.8)
  )
  .add(
    shape(100, 0.42, 0.08)
      .color(0.6, 0, 0)
  )
  .add(
    shape(100, 0.35, 0.05)
      .color(1.2, 0.05, 0)
      .modulateScale(osc(1, 1), 0.1)
  )
  .add(
    shape(100, 0.25, 0.04)
      .color(1.8, 0.2, 0.05)
  )
  .add(
    shape(100, 0.15, 0.03)
      .color(2.5, 0.5, 0.1)
      .modulateScale(osc(1, 0.1), 1)
  )
  .add(
    shape(100, 0.06, 0.01)
      .color(3.5, 1.2, 0.4)
  )
  .scale(0.9)
  .out()
`;

  const panel = new PatchPanel({
    editorContainer: requireElementById('editor-composer-monaco'),
    statusElement: requireElementById('composer-status'),
    fileNameElement: requireElementById('composer-file-name'),
    buttons: {
      run: document.getElementById('composer-run-btn'),
      new: document.getElementById('composer-new-btn'),
      save: document.getElementById('composer-save-btn'),
      saveAs: document.getElementById('composer-save-as-btn'),
      revert: document.getElementById('composer-revert-btn'),
    },
    initialValue,
    readOnly: false,
    onRun: runPatch,
    contextMenuActions: [
      {
        id: 'composer-open-in-performer-a',
        label: 'Open in Performer Editor A',
        run: () => {
          if (!composerState) return;
          const content = composerState.panel.getEditor().getValue();
          const filePath = composerState.panel.getFilePath();
          const fileName = composerState.panel.getFileName();
          const isDirty = composerState.panel.isDirty();
          const originalContent = composerState.panel.getOriginalContent();
          window.dispatchEvent(
            new CustomEvent('composer-open-in-performer', {
              detail: { content, target: 'A', filePath, fileName, isDirty, originalContent },
            }),
          );
        },
      },
      {
        id: 'composer-open-in-performer-b',
        label: 'Open in Performer Editor B',
        run: () => {
          if (!composerState) return;
          const content = composerState.panel.getEditor().getValue();
          const filePath = composerState.panel.getFilePath();
          const fileName = composerState.panel.getFileName();
          const isDirty = composerState.panel.isDirty();
          const originalContent = composerState.panel.getOriginalContent();
          window.dispatchEvent(
            new CustomEvent('composer-open-in-performer', {
              detail: { content, target: 'B', filePath, fileName, isDirty, originalContent },
            }),
          );
        },
      },
    ],
    saveAsEventName: 'composer-save-as',
  });

  const state: ComposerState = {
    panel,
    hydra: null,
    isActive: false,
  };

  composerState = state;

  // Handle window resize
  window.addEventListener('resize', () => {
    if (composerState?.isActive) {
      resizeCanvas();
    }
  });
}

// Show composer tab
export function showComposer() {
  if (!composerState) return;
  composerState.isActive = true;
  initHydra();
  runPatch();
}

// Hide composer tab
export function hideComposer() {
  if (!composerState) return;
  composerState.isActive = false;
  cleanupHydra();
}

// Get composer state (for saving from main editor)
export function getComposerState() {
  return composerState;
}
