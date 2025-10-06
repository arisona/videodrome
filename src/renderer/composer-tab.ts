/* eslint-env browser */

import Hydra from 'hydra-synth';
import * as monaco from 'monaco-editor';

import { STATUS_MESSAGES } from '../shared/constants';

import { MonacoEditorPanel } from './components/monaco-editor-panel';
import { getGlobalSources } from './editor';
import {
  executeInHydraContext,
  cleanupHydraInstance,
  assignHydraSource,
} from './hydra/hydra-execution';
import { registerContextMenuActions } from './monaco-setup';
import { requireElementById } from './utils/dom';
import { EditorFileController } from './utils/editor-file-controller';
import * as EditorState from './utils/editor-state';

import type { MediaType } from '../shared/types';
import type { HydraSourceSlot } from 'hydra-synth';

const MARKER_OWNER = 'hydra-composer';

// Composer tab state
interface ComposerState {
  editorPanel: MonacoEditorPanel;
  editor: monaco.editor.IStandaloneCodeEditor;
  fileController: EditorFileController;
  statusElement: HTMLElement;
  hydra: Hydra | null;
  isActive: boolean;
  // Compatibility properties for code that hasn't been migrated yet
  loadedFile: string | null;
  isDirty: boolean;
  originalContent: string;
}

let composerState: ComposerState | null = null;

function updateStatus(status: string, isError = false, tooltip?: string) {
  if (!composerState) return;
  const stateData = {
    statusElement: composerState.statusElement,
    loadedFile: composerState.fileController.getFilePath(),
    isDirty: composerState.fileController.isDirty(),
    originalContent: '', // Not needed for updateStatus
  };
  EditorState.updateStatus(stateData, status, isError, tooltip);
}

// Update file title display
function updateFileTitle() {
  const fileNameElement = document.getElementById('composer-file-name');
  if (!fileNameElement || !composerState) return;

  const fileName = composerState.fileController.getFileName();
  const isDirty = composerState.fileController.isDirty();
  const dirtyIndicator = isDirty ? ' •' : '';

  if (fileName) {
    fileNameElement.textContent = `${fileName}${dirtyIndicator}`;
    fileNameElement.classList.remove('is-new-patch');
  } else {
    fileNameElement.textContent = `New Patch${dirtyIndicator}`;
    fileNameElement.classList.add('is-new-patch');
  }
}

// Initialize Hydra instance
function initHydra() {
  if (!composerState) return;
  if (composerState.hydra) return;

  const canvas = document.getElementById('editor-composer-preview-canvas') as HTMLCanvasElement;

  composerState.hydra = new Hydra({
    canvas: canvas,
    detectAudio: true,
    enableStreamCapture: false,
    makeGlobal: false,
  });

  resizeCanvas();

  // Apply global sources to this Hydra instance
  reapplyGlobalSources();
}

function resizeCanvas() {
  if (!composerState?.hydra) return;

  const canvas = document.getElementById('editor-composer-preview-canvas') as HTMLCanvasElement;
  const container = canvas.parentElement;
  if (!container) return;

  const containerWidth = container.clientWidth - 24; // padding
  const containerHeight = container.clientHeight - 24;

  // Maintain aspect ratio
  const aspectRatio = 4 / 3;
  let width = containerWidth;
  let height = width / aspectRatio;

  if (height > containerHeight) {
    height = containerHeight;
    width = height * aspectRatio;
  }

  canvas.width = Math.floor(width);
  canvas.height = Math.floor(height);

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
}

function executeHydraCode(code: string) {
  if (!composerState) return;

  let hydraInstance = composerState.hydra;
  if (!hydraInstance) {
    initHydra();
    hydraInstance = composerState.hydra;
    if (!hydraInstance) return;
  }

  try {
    executeInHydraContext(hydraInstance, code, true);

    // Clear Monaco markers on success
    const model = composerState.editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    }

    updateStatus(STATUS_MESSAGES.READY);
  } catch (error) {
    console.error('Error executing Hydra code:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Set Monaco markers for error
    const model = composerState.editor.getModel();
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
    updateStatus(STATUS_MESSAGES.ERROR, true, errorMessage);
  }
}

// Run patch
function runPatch() {
  if (!composerState) return;
  const code = composerState.editor.getValue();
  updateStatus(STATUS_MESSAGES.RUNNING);
  executeHydraCode(code);
}

// Save functionality
export async function saveComposer() {
  await composerState?.fileController.save();
}

export function saveComposerAs() {
  composerState?.fileController.triggerSaveAs('composer-save-as');
}

// Revert functionality
export async function revertComposer() {
  await composerState?.fileController.revert();
}

// Load patch into composer
export async function loadPatchIntoComposer(patchPath: string, patchName: string) {
  await composerState?.fileController.load(patchPath, patchName);
}

// Create new patch in composer
export function newComposerPatch() {
  composerState?.fileController.clearFile();
}

// Initialize composer tab
export function initComposer() {
  const editorContainer = requireElementById('editor-composer-monaco');
  const statusElement = requireElementById('composer-status') as HTMLSpanElement;

  const initialValue = `// I'm sorry Dave, I'm afraid I can't do that.
solid(0, 0, 0)
  .add(
    shape(100, 0.5, 0.02)
      .scale(1, height/width)
      .color(0.3, 0.3, 0.35)
      .luma(0.8)
  )
  .add(
    shape(100, 0.42, 0.08)
      .scale(1, height/width)
      .color(0.6, 0, 0)
  )
  .add(
    shape(100, 0.35, 0.05)
      .scale(1, height/width)
      .color(1.2, 0.05, 0)
      .modulateScale(osc(1, 1), 0.1)
  )
  .add(
    shape(100, 0.25, 0.04)
      .scale(1, height/width)
      .color(1.8, 0.2, 0.05)
  )
  .add(
    shape(100, 0.15, 0.03)
      .scale(1, height/width)
      .color(2.5, 0.5, 0.1)
      .modulateScale(osc(1, 0.1), 1)
  )
  .add(
    shape(100, 0.06, 0.01)
      .scale(1, height/width)
      .color(3.5, 1.2, 0.4)
  )
  .scale(2)
  .out()
`;

  const editorPanel = new MonacoEditorPanel({
    container: editorContainer,
    value: initialValue,
    readOnly: false,
    onRun: runPatch,
    onSave: () => {
      void saveComposer();
    },
    onSaveAs: () => {
      saveComposerAs();
    },
    onRevert: () => {
      void revertComposer();
    },
  });

  const editor = editorPanel.getEditor();

  // Initialize file controller first
  const fileController = new EditorFileController(editor, {
    onStatusUpdate: (msg, isError) => {
      updateStatus(msg, isError);
    },
    onDirtyChange: () => {
      updateFileTitle();
    },
    onFileChange: () => {
      updateFileTitle();
    },
    onAfterLoad: () => {
      runPatch();
    },
    onAfterRevert: () => {
      runPatch();
    },
  });

  // Create state with getter properties for compatibility
  const state: ComposerState = {
    editorPanel,
    editor,
    fileController,
    statusElement,
    hydra: null,
    isActive: false,
    get loadedFile() {
      return fileController.getFilePath();
    },
    get isDirty() {
      return fileController.isDirty();
    },
    get originalContent() {
      // This is only used in a few places - return empty string for compatibility
      return '';
    },
  };

  composerState = state;

  // Register context menu actions
  registerContextMenuActions(editor, [
    {
      id: 'composer-send-to-performer-a',
      label: 'Send to Performer Slot A',
      run: () => {
        const content = composerState?.editor.getValue() ?? '';
        window.dispatchEvent(
          new CustomEvent('composer-send-to-performer', {
            detail: { content, target: 'A' },
          }),
        );
      },
    },
    {
      id: 'composer-send-to-performer-b',
      label: 'Send to Performer Slot B',
      run: () => {
        const content = composerState?.editor.getValue() ?? '';
        window.dispatchEvent(
          new CustomEvent('composer-send-to-performer', {
            detail: { content, target: 'B' },
          }),
        );
      },
    },
  ]);

  // Button handlers
  document.getElementById('composer-run-btn')?.addEventListener('click', runPatch);
  document.getElementById('composer-new-btn')?.addEventListener('click', () => {
    newComposerPatch();
  });
  document.getElementById('composer-save-btn')?.addEventListener('click', () => {
    void saveComposer();
  });
  document.getElementById('composer-save-as-btn')?.addEventListener('click', () => {
    saveComposerAs();
  });
  document.getElementById('composer-revert-btn')?.addEventListener('click', () => {
    void revertComposer();
  });

  // File name click handler - reveal file in explorer
  document.getElementById('composer-file-name')?.addEventListener('click', () => {
    const filePath = composerState?.fileController.getFilePath();
    if (filePath) {
      window.dispatchEvent(
        new CustomEvent('reveal-file-in-explorer', {
          detail: { filePath },
        }),
      );
    }
  });

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
