/* eslint-env browser */

import * as monaco from 'monaco-editor';

import {
  getCompositeFunctionCategories,
  getCompositeFunction,
} from '../shared/composite-functions';
import { STATUS_MESSAGES } from '../shared/constants';

import { showDocumentationModal } from './components/modal';
import { MonacoEditorPanel } from './components/monaco-editor-panel';
import {
  StandaloneParameterControl,
  registerParameterControl,
  disposeActiveParameterControl,
  HOVER_DELAY_MS,
} from './components/parameter-control';
import { registerContextMenuActions } from './monaco-setup';
import { getSettings } from './settings-service';
import { requireElementById } from './utils/dom';
import * as EditorState from './utils/editor-state';
import { PatchController } from './utils/patch-controller';

import type { ExecutionResultsPayload, PreviewFrame, SlotExecutionResult } from '../shared/types';

const MARKER_OWNER = 'hydra-performer';
const MODAL_HOVER_DELAY_MS = 1000;

// Slot state interface
interface SlotState {
  editorPanel: MonacoEditorPanel;
  editor: monaco.editor.IStandaloneCodeEditor;
  fileController: PatchController;
  statusElement: HTMLElement;
  previewCanvas: HTMLCanvasElement;
  previewContext: CanvasRenderingContext2D | null;
  // Compatibility properties for code that hasn't been migrated yet
  loadedFile: string | null;
  isDirty: boolean;
  originalContent: string;
}

let performerState: {
  slotA: SlotState | null;
  slotB: SlotState | null;
  compositeMode: string;
  compositeParams: Record<string, number>; // All params including levelA, levelB, master
  isActive: boolean;
  previewFramesDisposable: (() => void) | null;
} = {
  slotA: null,
  slotB: null,
  compositeMode: 'add',
  compositeParams: {},
  isActive: false,
  previewFramesDisposable: null,
};

// Update slot status
function updateSlotStatus(slot: SlotState, status: string, isError = false, tooltip?: string) {
  const stateData = {
    statusElement: slot.statusElement,
    loadedFile: slot.fileController.getFilePath(),
    isDirty: slot.fileController.isDirty(),
    originalContent: '', // Not needed for updateStatus
  };
  EditorState.updateStatus(stateData, status, isError, tooltip);
}

// Update file title display
function updateFileTitle(slot: SlotState, slotId: 'A' | 'B') {
  const elementId = slotId === 'A' ? 'slot-a-file-name' : 'slot-b-file-name';
  const fileNameElement = document.getElementById(elementId);
  if (!fileNameElement) return;

  const fileName = slot.fileController.getFileName();
  const isDirty = slot.fileController.isDirty();
  const dirtyIndicator = isDirty ? ' •' : '';

  if (fileName) {
    fileNameElement.textContent = `${slotId}: ${fileName}${dirtyIndicator}`;
    fileNameElement.classList.remove('is-new-patch');
  } else {
    fileNameElement.textContent = `${slotId}: Untitled${dirtyIndicator}`;
    fileNameElement.classList.add('is-new-patch');
  }
}

// Swap the contents of performer slots A and B
function swapPerformerSlots(): void {
  if (!performerState.slotA || !performerState.slotB) return;

  // Capture current state of both slots
  const stateA = {
    content: performerState.slotA.editor.getValue(),
    filePath: performerState.slotA.fileController.getFilePath(),
    fileName: performerState.slotA.fileController.getFileName(),
    originalContent: performerState.slotA.fileController.getOriginalContent(),
  };

  const stateB = {
    content: performerState.slotB.editor.getValue(),
    filePath: performerState.slotB.fileController.getFilePath(),
    fileName: performerState.slotB.fileController.getFileName(),
    originalContent: performerState.slotB.fileController.getOriginalContent(),
  };

  // Swap using file controller methods (which will trigger onAfterLoad and run the patches)
  if (stateB.filePath && stateB.fileName) {
    void performerState.slotA.fileController.load({
      source: 'memory',
      filePath: stateB.filePath,
      fileName: stateB.fileName,
      content: stateB.content,
      originalContent: stateB.originalContent,
    });
  } else {
    // No file path - load as new patch with the content
    void performerState.slotA.fileController.load({
      source: 'new',
      content: stateB.content,
    });
  }

  if (stateA.filePath && stateA.fileName) {
    void performerState.slotB.fileController.load({
      source: 'memory',
      filePath: stateA.filePath,
      fileName: stateA.fileName,
      content: stateA.content,
      originalContent: stateA.originalContent,
    });
  } else {
    // No file path - load as new patch with the content
    void performerState.slotB.fileController.load({
      source: 'new',
      content: stateA.content,
    });
  }
}

function prepareSlotExecution(slot: SlotState) {
  const model = slot.editor.getModel();
  if (model) {
    monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
  }
  updateSlotStatus(slot, STATUS_MESSAGES.RUNNING);
}

function runSlot(slot: SlotState) {
  prepareSlotExecution(slot);
  sendToOutputWindow();
}

// Run slot (exported for external use)
export function runPerformerSlot(slotId: 'A' | 'B') {
  const slot = slotId === 'A' ? performerState.slotA : performerState.slotB;
  if (slot) {
    runSlot(slot);
  }
}

function sendToOutputWindow() {
  if (!performerState.slotA || !performerState.slotB) return;

  const codeA = performerState.slotA.editor.getValue();
  const codeB = performerState.slotB.editor.getValue();

  window.electronAPI.runCode(
    JSON.stringify({
      slotA: codeA,
      slotB: codeB,
      compositeMode: performerState.compositeMode,
      compositeParams: performerState.compositeParams,
    }),
  );
}

function drawPreview(
  context: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement,
  frame: PreviewFrame | null,
) {
  if (!context) {
    return;
  }

  if (!frame) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  if (canvas.width !== frame.width || canvas.height !== frame.height) {
    canvas.width = frame.width;
    canvas.height = frame.height;
  }

  const pixelData = new Uint8ClampedArray(frame.data);
  const imageData = new ImageData(pixelData, frame.width, frame.height);
  context.putImageData(imageData, 0, 0);
}

function handleExecutionResult(slot: SlotState, result: SlotExecutionResult) {
  const model = slot.editor.getModel();
  if (!model) {
    return;
  }

  if (result.success) {
    monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    updateSlotStatus(slot, STATUS_MESSAGES.READY);
    return;
  }

  if (result.error) {
    const lineNumber = result.error.lineNumber ?? 1;
    monaco.editor.setModelMarkers(model, MARKER_OWNER, [
      {
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: Number.MAX_VALUE,
        message: result.error.message,
        severity: monaco.MarkerSeverity.Error,
      },
    ]);
    updateSlotStatus(slot, STATUS_MESSAGES.ERROR, true, result.error.message);
  }
}

// Show composite function documentation in a modal
function showCompositeFunctionDocs(compositeFuncId: string) {
  const compositeFunc = getCompositeFunction(compositeFuncId);
  if (!compositeFunc?.doc) {
    return;
  }

  let markdown = `# ${compositeFunc.name}\n${compositeFunc.description}\n`;
  markdown += `## Details\n${compositeFunc.doc}\n`;

  showDocumentationModal(markdown);
}

// Setup hover on label to show parameter control widget
function setupLabelHover(
  labelElement: HTMLElement,
  param: { min: number; max: number; default: number; label: string; key: string; step?: number },
  updateValue: (value: number) => void,
) {
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;

  // Store current value for this parameter
  const getCurrentValue = () => {
    return performerState.compositeParams[param.key] ?? param.default;
  };

  labelElement.addEventListener('mouseenter', () => {
    // Clear any existing timer
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }

    // Set timer to show widget after delay
    hoverTimer = setTimeout(() => {
      if (!getSettings().parameterControl.enabled) {
        return;
      }

      const currentValue = getCurrentValue();

      // Create the parameter control widget
      const widget = new StandaloneParameterControl(currentValue, {
        min: param.min,
        max: param.max,
        default: param.default,
        onUpdate: (value: number) => {
          updateValue(value);
          sendToOutputWindow();
        },
        onCommit: (value: number) => {
          updateValue(value);
          sendToOutputWindow();
        },
        onCancel: () => {
          // Restore previous value
          updateValue(currentValue);
          sendToOutputWindow();
        },
      });

      // Position the widget near the label
      const rect = labelElement.getBoundingClientRect();
      const compositorBar = document.getElementById('editor-performer-compositor-bar');
      if (compositorBar && widget.getDomNode()) {
        widget.attachTo(compositorBar, rect.left, rect.top - 120); // Position above the label
      }

      // Register this widget in the central registry (will auto-dispose any previous widget)
      registerParameterControl(widget);
    }, HOVER_DELAY_MS);
  });

  labelElement.addEventListener('mouseleave', () => {
    // Clear the hover timer if we leave before it triggers
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  });
}

// Update parameter slots based on composite mode
function updateParamSlots(compositeModeId: string) {
  const compositeFunc = getCompositeFunction(compositeModeId);

  // Clear existing params
  performerState.compositeParams = {};

  // For each of the 6 param slots
  for (let i = 1; i <= 6; i++) {
    const slotElement = document.getElementById(`param-slot-${String(i)}`);
    const labelElement = document.getElementById(`param-${String(i)}-label`);
    const sliderElement = document.getElementById(
      `param-${String(i)}-slider`,
    ) as HTMLInputElement | null;

    if (!slotElement || !labelElement || !sliderElement) continue;

    // Check if composite function has a parameter at this index
    const param = compositeFunc?.params[i - 1];

    if (param) {
      // Activate and configure this param slot
      slotElement.classList.add('active');
      sliderElement.disabled = false;
      sliderElement.min = String(param.min);
      sliderElement.max = String(param.max);
      sliderElement.step = String(param.step ?? 0.01);
      sliderElement.value = String(param.default);

      // Update label with value
      const decimals = param.step && param.step < 0.01 ? 3 : param.step && param.step < 0.1 ? 2 : 1;

      // Function to update value and check range
      const updateValue = (value: number) => {
        performerState.compositeParams[param.key] = value;
        labelElement.textContent = `${param.label}: ${value.toFixed(decimals)}`;

        // Check if value is out of range
        if (value < param.min || value > param.max) {
          sliderElement.classList.add('out-of-range');
          // Clamp slider position to min or max
          if (value < param.min) {
            sliderElement.value = String(param.min);
          } else {
            sliderElement.value = String(param.max);
          }
        } else {
          sliderElement.classList.remove('out-of-range');
          sliderElement.value = String(value);
        }
      };

      // Initialize state
      updateValue(param.default);

      // Wire up slider event listener
      sliderElement.oninput = () => {
        const value = Number.parseFloat(sliderElement.value);
        updateValue(value);
        sendToOutputWindow();
      };

      // Close any active parameter control widget when user grabs the slider
      sliderElement.onmousedown = () => {
        disposeActiveParameterControl();
      };

      // Keyboard handler for slider
      sliderElement.onkeydown = (e) => {
        // Shift+Enter - Open parameter control
        if (e.shiftKey && e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();

          const currentValue = performerState.compositeParams[param.key] ?? param.default;

          // Create the parameter control widget
          const widget = new StandaloneParameterControl(currentValue, {
            min: param.min,
            max: param.max,
            default: param.default,
            onUpdate: (value: number) => {
              updateValue(value);
              sendToOutputWindow();
            },
            onCommit: (value: number) => {
              updateValue(value);
              sendToOutputWindow();
            },
            onCancel: () => {
              // Restore previous value
              updateValue(currentValue);
              sendToOutputWindow();
            },
          });

          // Position the widget near the slider
          const rect = sliderElement.getBoundingClientRect();
          const compositorBar = document.getElementById('editor-performer-compositor-bar');
          if (compositorBar && widget.getDomNode()) {
            widget.attachTo(compositorBar, rect.left, rect.top - 120); // Position above the slider
          }

          // Register this widget in the central registry
          registerParameterControl(widget);
        }

        // Backspace - Restore default value
        if (e.key === 'Backspace') {
          e.preventDefault();
          e.stopPropagation();
          updateValue(param.default);
          sendToOutputWindow();
        }
      };

      // Setup hover on label to show parameter control
      setupLabelHover(labelElement, param, updateValue);
    } else {
      // Deactivate this param slot
      slotElement.classList.remove('active');
      labelElement.textContent = `Param ${String(i)}`;
      sliderElement.disabled = true;
      sliderElement.value = '0';
      sliderElement.classList.remove('out-of-range');
      sliderElement.oninput = null;
      sliderElement.onmousedown = null;
      sliderElement.onkeydown = null;

      // Remove any existing hover listeners
      const oldElement = labelElement.cloneNode(true);
      labelElement.parentNode?.replaceChild(oldElement, labelElement);
    }
  }
}

// Save functionality
async function saveSlot(slot: SlotState, _slotId: 'A' | 'B') {
  await slot.fileController.save();
}

function saveSlotAs(slot: SlotState, slotId: 'A' | 'B') {
  slot.fileController.triggerSaveAs('performer-save-as', { slotId });
}

// Revert functionality
async function revertSlot(slot: SlotState, _slotId: 'A' | 'B') {
  await slot.fileController.revert();
}

// Load patch into slot
export async function loadPatchIntoSlot(patchPath: string, patchName: string, slotId: 'A' | 'B') {
  const slot = slotId === 'A' ? performerState.slotA : performerState.slotB;
  if (!slot) return;

  await slot.fileController.load({ source: 'disk', filePath: patchPath, fileName: patchName });
}

// Create new patch in slot
export function newSlotPatch(slotId: 'A' | 'B') {
  const slot = slotId === 'A' ? performerState.slotA : performerState.slotB;
  if (!slot) return;

  void slot.fileController.clearFile();
}

// Setup drop zone for slot
function setupDropZone(slot: SlotState, slotId: 'A' | 'B') {
  const editorElement = slot.editor.getDomNode();
  if (!editorElement) return;

  editorElement.addEventListener('dragover', (event) => {
    if (!event.dataTransfer) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    editorElement.style.opacity = '0.7';
  });

  editorElement.addEventListener('dragleave', () => {
    editorElement.style.opacity = '1';
  });

  editorElement.addEventListener('drop', (event) => {
    if (!event.dataTransfer) return;

    event.preventDefault();
    editorElement.style.opacity = '1';

    const patchPath = event.dataTransfer.getData('patch-path');
    const patchName = event.dataTransfer.getData('patch-name');

    if (!patchPath) return;

    void loadPatchIntoSlot(patchPath, patchName, slotId);
  });
}

export function initPerformer() {
  const editorAContainer = requireElementById('editor-a');
  const editorBContainer = requireElementById('editor-b');

  const slotAStatusElement = requireElementById('slot-a-status') as HTMLSpanElement;
  const slotBStatusElement = requireElementById('slot-b-status') as HTMLSpanElement;

  const previewCanvasA = document.getElementById('preview-canvas-a') as HTMLCanvasElement;
  const previewCanvasB = document.getElementById('preview-canvas-b') as HTMLCanvasElement;

  const previewContextA = previewCanvasA.getContext('2d');
  const previewContextB = previewCanvasB.getContext('2d');

  if (previewContextA) {
    previewContextA.imageSmoothingEnabled = true;
  }

  if (previewContextB) {
    previewContextB.imageSmoothingEnabled = true;
  }

  const initialValueA = '// empty';
  const initialValueB = '// empty';

  // Create editor panels
  const editorPanelA = new MonacoEditorPanel({
    container: editorAContainer,
    value: initialValueA,
    readOnly: false,
    onRun: () => {
      if (performerState.slotA) runSlot(performerState.slotA);
    },
    onSave: () => {
      if (performerState.slotA) void saveSlot(performerState.slotA, 'A');
    },
    onSaveAs: () => {
      if (performerState.slotA) saveSlotAs(performerState.slotA, 'A');
    },
    onRevert: () => {
      if (performerState.slotA) void revertSlot(performerState.slotA, 'A');
    },
  });

  const editorPanelB = new MonacoEditorPanel({
    container: editorBContainer,
    value: initialValueB,
    readOnly: false,
    onRun: () => {
      if (performerState.slotB) runSlot(performerState.slotB);
    },
    onSave: () => {
      if (performerState.slotB) void saveSlot(performerState.slotB, 'B');
    },
    onSaveAs: () => {
      if (performerState.slotB) saveSlotAs(performerState.slotB, 'B');
    },
    onRevert: () => {
      if (performerState.slotB) void revertSlot(performerState.slotB, 'B');
    },
  });

  const editorA = editorPanelA.getEditor();
  const editorB = editorPanelB.getEditor();

  // Initialize file controllers
  const fileControllerA = new PatchController(editorA, {
    onStatusUpdate: (msg, isError) => {
      if (performerState.slotA) updateSlotStatus(performerState.slotA, msg, isError);
    },
    onDirtyChange: () => {
      if (performerState.slotA) updateFileTitle(performerState.slotA, 'A');
    },
    onFileChange: () => {
      if (performerState.slotA) updateFileTitle(performerState.slotA, 'A');
    },
    onBeforeLoad: (_currentState) => {
      const confirmed = window.confirm('Performer slot A is modified.\n\nClick OK to overwrite.');
      return confirmed ? 'discard' : 'cancel';
    },
    onAfterLoad: () => {
      if (performerState.slotA) runSlot(performerState.slotA);
    },
    onAfterRevert: () => {
      if (performerState.slotA) runSlot(performerState.slotA);
    },
  });

  const fileControllerB = new PatchController(editorB, {
    onStatusUpdate: (msg, isError) => {
      if (performerState.slotB) updateSlotStatus(performerState.slotB, msg, isError);
    },
    onDirtyChange: () => {
      if (performerState.slotB) updateFileTitle(performerState.slotB, 'B');
    },
    onFileChange: () => {
      if (performerState.slotB) updateFileTitle(performerState.slotB, 'B');
    },
    onBeforeLoad: (_currentState) => {
      const confirmed = window.confirm('Performer slot B is modified.\n\nClick OK to overwrite.');
      return confirmed ? 'discard' : 'cancel';
    },
    onAfterLoad: () => {
      if (performerState.slotB) runSlot(performerState.slotB);
    },
    onAfterRevert: () => {
      if (performerState.slotB) runSlot(performerState.slotB);
    },
  });

  // Initialize slot states with getter properties for compatibility
  performerState.slotA = {
    editorPanel: editorPanelA,
    editor: editorA,
    fileController: fileControllerA,
    statusElement: slotAStatusElement,
    previewCanvas: previewCanvasA,
    previewContext: previewContextA,
    get loadedFile() {
      return fileControllerA.getFilePath();
    },
    get isDirty() {
      return fileControllerA.isDirty();
    },
    get originalContent() {
      return '';
    },
  };

  performerState.slotB = {
    editorPanel: editorPanelB,
    editor: editorB,
    fileController: fileControllerB,
    statusElement: slotBStatusElement,
    previewCanvas: previewCanvasB,
    previewContext: previewContextB,
    get loadedFile() {
      return fileControllerB.getFilePath();
    },
    get isDirty() {
      return fileControllerB.isDirty();
    },
    get originalContent() {
      return '';
    },
  };

  // Register context menu actions for slot A
  registerContextMenuActions(editorA, [
    {
      id: 'performer-open-in-composer-a',
      label: 'Open in Composer',
      run: () => {
        if (!performerState.slotA) return;
        const content = performerState.slotA.editor.getValue();
        const filePath = performerState.slotA.fileController.getFilePath();
        const fileName = performerState.slotA.fileController.getFileName();
        const isDirty = performerState.slotA.fileController.isDirty();
        const originalContent = performerState.slotA.fileController.getOriginalContent();
        window.dispatchEvent(
          new CustomEvent('performer-open-in-composer', {
            detail: { content, source: 'A', filePath, fileName, isDirty, originalContent },
          }),
        );
      },
    },
    {
      id: 'performer-swap-slots-a',
      label: 'Swap Slots',
      run: () => {
        swapPerformerSlots();
      },
    },
  ]);

  // Register context menu actions for slot B
  registerContextMenuActions(editorB, [
    {
      id: 'performer-open-in-composer-b',
      label: 'Open in Composer',
      run: () => {
        if (!performerState.slotB) return;
        const content = performerState.slotB.editor.getValue();
        const filePath = performerState.slotB.fileController.getFilePath();
        const fileName = performerState.slotB.fileController.getFileName();
        const isDirty = performerState.slotB.fileController.isDirty();
        const originalContent = performerState.slotB.fileController.getOriginalContent();
        window.dispatchEvent(
          new CustomEvent('performer-open-in-composer', {
            detail: { content, source: 'B', filePath, fileName, isDirty, originalContent },
          }),
        );
      },
    },
    {
      id: 'performer-swap-slots-b',
      label: 'Swap Slots',
      run: () => {
        swapPerformerSlots();
      },
    },
  ]);

  // Setup drop zones
  setupDropZone(performerState.slotA, 'A');
  setupDropZone(performerState.slotB, 'B');

  // Note: Global keyboard shortcuts (Cmd+0, Cmd+1, Cmd+2) are handled in editor.ts

  // Button handlers
  document.getElementById('run-a-btn')?.addEventListener('click', () => {
    if (performerState.slotA) runSlot(performerState.slotA);
  });

  document.getElementById('new-a-btn')?.addEventListener('click', () => {
    newSlotPatch('A');
  });

  document.getElementById('run-b-btn')?.addEventListener('click', () => {
    if (performerState.slotB) runSlot(performerState.slotB);
  });

  document.getElementById('new-b-btn')?.addEventListener('click', () => {
    newSlotPatch('B');
  });

  document.getElementById('save-a-btn')?.addEventListener('click', () => {
    if (performerState.slotA) void saveSlot(performerState.slotA, 'A');
  });

  document.getElementById('save-as-a-btn')?.addEventListener('click', () => {
    if (performerState.slotA) saveSlotAs(performerState.slotA, 'A');
  });

  document.getElementById('save-b-btn')?.addEventListener('click', () => {
    if (performerState.slotB) void saveSlot(performerState.slotB, 'B');
  });

  document.getElementById('save-as-b-btn')?.addEventListener('click', () => {
    if (performerState.slotB) saveSlotAs(performerState.slotB, 'B');
  });

  document.getElementById('revert-a-btn')?.addEventListener('click', () => {
    if (performerState.slotA) void revertSlot(performerState.slotA, 'A');
  });

  document.getElementById('revert-b-btn')?.addEventListener('click', () => {
    if (performerState.slotB) void revertSlot(performerState.slotB, 'B');
  });

  // File name click handlers - reveal file in explorer
  document.getElementById('slot-a-file-name')?.addEventListener('click', () => {
    const filePath = performerState.slotA?.fileController.getFilePath();
    if (filePath) {
      window.dispatchEvent(
        new CustomEvent('reveal-file-in-explorer', {
          detail: { filePath },
        }),
      );
    }
  });

  document.getElementById('slot-b-file-name')?.addEventListener('click', () => {
    const filePath = performerState.slotB?.fileController.getFilePath();
    if (filePath) {
      window.dispatchEvent(
        new CustomEvent('reveal-file-in-explorer', {
          detail: { filePath },
        }),
      );
    }
  });

  // Composite controls
  const compositeModeSelect = document.getElementById(
    'editor-performer-compositor-panel',
  ) as HTMLSelectElement | null;

  // Populate composite mode dropdown from composite functions library
  if (compositeModeSelect) {
    compositeModeSelect.innerHTML = '';
    const categories = getCompositeFunctionCategories();

    // Add options grouped by category
    for (const [category, functions] of Object.entries(categories)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category.charAt(0).toUpperCase() + category.slice(1);

      for (const func of functions) {
        const option = document.createElement('option');
        option.value = func.id;
        option.textContent = func.name;
        optgroup.appendChild(option);
      }

      compositeModeSelect.appendChild(optgroup);
    }

    // Set initial value
    compositeModeSelect.value = performerState.compositeMode;

    // Initialize parameter slots for initial mode
    updateParamSlots(performerState.compositeMode);

    compositeModeSelect.addEventListener('change', () => {
      performerState.compositeMode = compositeModeSelect.value;
      updateParamSlots(compositeModeSelect.value);
      sendToOutputWindow();
    });
  }

  // Setup hover on "Composite" label to show composite function documentation
  const compositeLabelElements = document.querySelectorAll(
    '.editor-performer-compositor-main-selector .editor-performer-compositor-label',
  );
  if (compositeLabelElements.length > 0) {
    const compositeLabel = compositeLabelElements[0] as HTMLElement;
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;

    compositeLabel.addEventListener('mouseenter', () => {
      // Clear any existing timer
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }

      // Set timer to show documentation after delay
      hoverTimer = setTimeout(() => {
        if (compositeModeSelect) {
          showCompositeFunctionDocs(compositeModeSelect.value);
        }
      }, MODAL_HOVER_DELAY_MS);
    });

    compositeLabel.addEventListener('mouseleave', () => {
      // Clear the hover timer if we leave before it triggers
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
    });
  }

  // Listen for execution results
  window.electronAPI.onExecutionResults((results: ExecutionResultsPayload) => {
    if (performerState.slotA) handleExecutionResult(performerState.slotA, results.slotA);
    if (performerState.slotB) handleExecutionResult(performerState.slotB, results.slotB);
  });

  // When output window is ready, send current code
  window.electronAPI.onOutputWindowReady(() => {
    sendToOutputWindow();
  });

  // If output window opens later (or is already open), ensure it receives current code
  window.electronAPI.onOutputWindowStateChanged((isOpen: boolean) => {
    if (isOpen) {
      sendToOutputWindow();
    }
  });

  void window.electronAPI.getOutputWindowState().then((isOpen: boolean) => {
    if (isOpen) {
      sendToOutputWindow();
    }
  });
}

export function showPerformer() {
  performerState.isActive = true;

  if (performerState.previewFramesDisposable) {
    performerState.previewFramesDisposable();
  }

  // Subscribe to preview frames from output window
  performerState.previewFramesDisposable = window.electronAPI.onPreviewFrames((frameA, frameB) => {
    if (!performerState.slotA || !performerState.slotB) return;
    drawPreview(performerState.slotA.previewContext, performerState.slotA.previewCanvas, frameA);
    drawPreview(performerState.slotB.previewContext, performerState.slotB.previewCanvas, frameB);
  });

  // Auto-run on first show
  setTimeout(() => {
    sendToOutputWindow();
  }, 100);
}

export function hidePerformer() {
  performerState.isActive = false;

  // Stop receiving preview frames to save IPC overhead
  if (performerState.previewFramesDisposable) {
    performerState.previewFramesDisposable();
    performerState.previewFramesDisposable = null;
  }
}

// Trigger save for slot (called from main editor)
export function triggerSlotSave(slotId: 'A' | 'B', filePath: string, content: string) {
  const slot = slotId === 'A' ? performerState.slotA : performerState.slotB;
  if (!slot) return;

  slot.fileController.onSaveAsComplete(filePath, content);
  updateFileTitle(slot, slotId);
}

// Get performer state (for external access)
export function getPerformerState() {
  return performerState;
}

// Save slots (for external access, e.g., quit handler)
export async function saveSlotA() {
  if (performerState.slotA) {
    await saveSlot(performerState.slotA, 'A');
  }
}

export async function saveSlotB() {
  if (performerState.slotB) {
    await saveSlot(performerState.slotB, 'B');
  }
}
