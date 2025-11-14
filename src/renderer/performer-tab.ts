/* eslint-env browser */

import * as monaco from 'monaco-editor';

import {
  getCompositeFunctionCategories,
  getCompositeFunction,
} from '../shared/composite-functions';
import { STATUS_MESSAGES } from '../shared/constants';
import { debounce, type DebouncedFunction } from '../shared/debounce';

import { showDocumentationModal } from './components/modal';
import {
  StandaloneParameterControl,
  registerParameterControl,
  disposeActiveParameterControl,
  HOVER_DELAY_MS,
} from './components/parameter-control';
import { PatchPanel } from './components/patch-panel';
import { getSettings } from './settings-service';
import { requireElementById } from './utils/dom';

import type {
  ExecutionPayload,
  ResultsPayload,
  PreviewFrame,
  PatchExecutionResult,
} from '../shared/ipc-types';

const MARKER_OWNER = 'hydra-performer';
const MODAL_HOVER_DELAY_MS = 1000;

let performerState: {
  panelA: PatchPanel | null;
  panelB: PatchPanel | null;
  compositeMode: string;
  compositeParams: Record<string, number>;
  isActive: boolean;
  previewFramesDisposable: (() => void) | null;
  previewCanvasA: HTMLCanvasElement | null;
  previewCanvasB: HTMLCanvasElement | null;
  previewContextA: CanvasRenderingContext2D | null;
  previewContextB: CanvasRenderingContext2D | null;
} = {
  panelA: null,
  panelB: null,
  compositeMode: 'add',
  compositeParams: {},
  isActive: false,
  previewFramesDisposable: null,
  previewCanvasA: null,
  previewCanvasB: null,
  previewContextA: null,
  previewContextB: null,
};

function swapPerformerPatches(): void {
  if (!performerState.panelA || !performerState.panelB) return;

  // Capture current state of both panels
  const stateA = {
    content: performerState.panelA.getEditor().getValue(),
    filePath: performerState.panelA.getFilePath(),
    fileName: performerState.panelA.getFileName(),
    originalContent: performerState.panelA.getOriginalContent(),
  };

  const stateB = {
    content: performerState.panelB.getEditor().getValue(),
    filePath: performerState.panelB.getFilePath(),
    fileName: performerState.panelB.getFileName(),
    originalContent: performerState.panelB.getOriginalContent(),
  };

  // Swap using file controller methods (which will trigger onAfterLoad and run the patches)
  if (stateB.filePath && stateB.fileName) {
    void performerState.panelA.load({
      source: 'memory',
      filePath: stateB.filePath,
      fileName: stateB.fileName,
      content: stateB.content,
      originalContent: stateB.originalContent,
    });
  } else {
    // No file path - load as new patch with the content
    void performerState.panelA.load({
      source: 'new',
      content: stateB.content,
    });
  }

  if (stateA.filePath && stateA.fileName) {
    void performerState.panelB.load({
      source: 'memory',
      filePath: stateA.filePath,
      fileName: stateA.fileName,
      content: stateA.content,
      originalContent: stateA.originalContent,
    });
  } else {
    // No file path - load as new patch with the content
    void performerState.panelB.load({
      source: 'new',
      content: stateA.content,
    });
  }
}

function updateStatus(panelId: 'A' | 'B', status: string, isError = false, tooltip?: string) {
  const elementId = panelId === 'A' ? 'panel-a-status' : 'panel-b-status';
  const statusElement = document.getElementById(elementId);
  if (!statusElement) return;

  statusElement.textContent = status;
  statusElement.style.color = isError ? '#f48771' : '#858585';

  if (tooltip) {
    statusElement.setAttribute('title', tooltip);
  } else {
    statusElement.removeAttribute('title');
  }
}

function runPatch(panelId: 'A' | 'B') {
  const panel = panelId === 'A' ? performerState.panelA : performerState.panelB;
  if (!panel) return;

  const model = panel.getEditor().getModel();
  if (model) {
    monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
  }
  updateStatus(panelId, STATUS_MESSAGES.RUNNING);
  sendToOutputWindow();
}

function sendToOutputWindow() {
  if (!performerState.panelA || !performerState.panelB) return;

  const patchA = performerState.panelA.getEditor().getValue();
  const patchB = performerState.panelB.getEditor().getValue();
  const payload: ExecutionPayload = {
    patchA: patchA,
    patchB: patchB,
    compositeMode: performerState.compositeMode,
    compositeParams: performerState.compositeParams,
  };
  window.electronAPI.runCode(JSON.stringify(payload));
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

function handleExecutionResult(panelId: 'A' | 'B', result: PatchExecutionResult) {
  const panel = panelId === 'A' ? performerState.panelA : performerState.panelB;
  if (!panel) return;

  const model = panel.getEditor().getModel();
  if (!model) {
    return;
  }

  if (result.success) {
    monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    updateStatus(panelId, STATUS_MESSAGES.READY);
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
    updateStatus(panelId, STATUS_MESSAGES.ERROR, true, result.error.message);
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
  // Store current value for this parameter
  const getCurrentValue = () => {
    return performerState.compositeParams[param.key] ?? param.default;
  };

  const showWidget = () => {
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
  };

  const debouncedShowWidget: DebouncedFunction<() => void> = debounce(showWidget, HOVER_DELAY_MS);

  labelElement.addEventListener('mouseenter', () => {
    debouncedShowWidget();
  });

  labelElement.addEventListener('mouseleave', () => {
    debouncedShowWidget.cancel();
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

export function initPerformer() {
  const editorAContainer = requireElementById('editor-a');
  const editorBContainer = requireElementById('editor-b');

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

  // Create panel A
  const panelA = new PatchPanel({
    editorContainer: editorAContainer,
    statusElement: requireElementById('panel-a-status'),
    fileNameElement: requireElementById('panel-a-file-name'),
    buttons: {
      run: document.getElementById('run-a-btn'),
      new: document.getElementById('new-a-btn'),
      save: document.getElementById('save-a-btn'),
      saveAs: document.getElementById('save-as-a-btn'),
      revert: document.getElementById('revert-a-btn'),
    },
    initialValue: '// empty',
    readOnly: false,
    onRun: () => {
      runPatch('A');
    },
    contextMenuActions: [
      {
        id: 'performer-open-in-composer-a',
        label: 'Open in Composer',
        run: () => {
          if (!performerState.panelA) return;
          const content = performerState.panelA.getEditor().getValue();
          const filePath = performerState.panelA.getFilePath();
          const fileName = performerState.panelA.getFileName();
          const isDirty = performerState.panelA.isDirty();
          const originalContent = performerState.panelA.getOriginalContent();
          window.dispatchEvent(
            new CustomEvent('performer-open-in-composer', {
              detail: { content, source: 'A', filePath, fileName, isDirty, originalContent },
            }),
          );
        },
      },
      {
        id: 'performer-swap-patches-a',
        label: 'Swap Patches A and B',
        run: () => {
          swapPerformerPatches();
        },
      },
    ],
    saveAsEventName: 'performer-save-as',
    additionalSaveAsData: { panelId: 'A' },
    fileNamePrefix: 'A: ',
  });

  // Create panel B
  const panelB = new PatchPanel({
    editorContainer: editorBContainer,
    statusElement: requireElementById('panel-b-status'),
    fileNameElement: requireElementById('panel-b-file-name'),
    buttons: {
      run: document.getElementById('run-b-btn'),
      new: document.getElementById('new-b-btn'),
      save: document.getElementById('save-b-btn'),
      saveAs: document.getElementById('save-as-b-btn'),
      revert: document.getElementById('revert-b-btn'),
    },
    initialValue: '// empty',
    readOnly: false,
    onRun: () => {
      runPatch('B');
    },
    contextMenuActions: [
      {
        id: 'performer-open-in-composer-b',
        label: 'Open in Composer',
        run: () => {
          if (!performerState.panelB) return;
          const content = performerState.panelB.getEditor().getValue();
          const filePath = performerState.panelB.getFilePath();
          const fileName = performerState.panelB.getFileName();
          const isDirty = performerState.panelB.isDirty();
          const originalContent = performerState.panelB.getOriginalContent();
          window.dispatchEvent(
            new CustomEvent('performer-open-in-composer', {
              detail: { content, source: 'B', filePath, fileName, isDirty, originalContent },
            }),
          );
        },
      },
      {
        id: 'performer-swap-patches-b',
        label: 'Swap Patches A and B',
        run: () => {
          swapPerformerPatches();
        },
      },
    ],
    saveAsEventName: 'performer-save-as',
    additionalSaveAsData: { panelId: 'B' },
    fileNamePrefix: 'B: ',
  });

  performerState.panelA = panelA;
  performerState.panelB = panelB;
  performerState.previewCanvasA = previewCanvasA;
  performerState.previewCanvasB = previewCanvasB;
  performerState.previewContextA = previewContextA;
  performerState.previewContextB = previewContextB;

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

    const debouncedShowDocs: DebouncedFunction<() => void> = debounce(() => {
      if (compositeModeSelect) {
        showCompositeFunctionDocs(compositeModeSelect.value);
      }
    }, MODAL_HOVER_DELAY_MS);

    compositeLabel.addEventListener('mouseenter', () => {
      debouncedShowDocs();
    });

    compositeLabel.addEventListener('mouseleave', () => {
      debouncedShowDocs.cancel();
    });
  }

  // Listen for execution results
  window.electronAPI.onExecutionResults((results: ResultsPayload) => {
    handleExecutionResult('A', results.resultA);
    handleExecutionResult('B', results.resultB);
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
    if (!performerState.previewCanvasA || !performerState.previewCanvasB) return;
    drawPreview(performerState.previewContextA, performerState.previewCanvasA, frameA);
    drawPreview(performerState.previewContextB, performerState.previewCanvasB, frameB);
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

// Get performer state (for external access)
export function getPerformerState() {
  return performerState;
}
