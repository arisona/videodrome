/* eslint-env browser */

import { FILE_EXTENSIONS } from '../shared/constants';

import { initMediaExplorer, loadMedia } from './components/media-explorer';
import {
  initPatchExplorer,
  loadPatches,
  createInlinePatchEditor,
  getTargetSaveDirectory,
} from './components/patch-explorer';
import { initTooltips } from './components/tooltip';
import {
  initComposer,
  showComposer,
  hideComposer,
  loadPatchIntoComposer,
  getComposerState,
  setSource as setSourceInComposer,
  saveComposer,
  newComposerPatch,
} from './composer-tab';
import {
  registerHydraCompletionProvider,
  registerHydraSignatureHelpProvider,
  registerHydraHoverProvider,
  registerHydraDetailedDocsCommand,
} from './hydra/hydra-intellisense';
import {
  configureMonacoEnvironment,
  registerHydraLanguage,
  defineVideodromeTheme,
} from './monaco-setup';
import {
  initPerformer,
  showPerformer,
  hidePerformer,
  loadPatchIntoSlot,
  getPerformerState,
  triggerSlotSave,
  saveSlotA,
  saveSlotB,
  newSlotPatch,
} from './performer-tab';
import { initSettingsService, getSettings } from './settings-service';
import { initSettings, showSettings, hideSettings } from './settings-tab';
import {
  initSources,
  showSources,
  hideSources,
  setSource as setSourceInSources,
} from './sources-tab';
import { getFilename } from './utils/path';
import { applyShortcutTooltips } from './utils/shortcuts';

import type { MediaType } from '../shared/types';

// Configure Monaco environment once
configureMonacoEnvironment();
registerHydraLanguage();
defineVideodromeTheme();

// Register global Hydra language providers once
// NOTE: These are global providers for the 'hydra' language and apply to all editors
// They should only be registered once to avoid duplicate completions
registerHydraCompletionProvider();
registerHydraSignatureHelpProvider();
registerHydraHoverProvider();
registerHydraDetailedDocsCommand();

// Current main tab
type MainTab = 'compose' | 'perform' | 'sources' | 'settings';
let currentMainTab: MainTab = 'compose';

// Current explorer tab
type ExplorerTab = 'patches' | 'media';
let currentTab: ExplorerTab = 'patches';

// Global source assignments (persisted across tab switches and sent to all Hydra instances)
interface SourceAssignment {
  mediaPath: string;
  mediaUrl: string;
  mediaType: MediaType;
}

const globalSources: {
  s0: SourceAssignment | null;
  s1: SourceAssignment | null;
  s2: SourceAssignment | null;
  s3: SourceAssignment | null;
} = {
  s0: null,
  s1: null,
  s2: null,
  s3: null,
};

// Get global sources (for sources-tab and composer-tab to use)
export function getGlobalSources() {
  return globalSources;
}

// Update output window button state
function updateOutputWindowButton(isOpen: boolean) {
  const button = document.getElementById('toggle-output-btn');
  if (button) {
    const tooltipText = isOpen
      ? 'Close output window'
      : 'Show output window (Alt+click for fullscreen)';
    button.setAttribute('data-tooltip', tooltipText);
  }
}

// Update main tab button states
function updateMainTabButtons() {
  const composerTab = document.getElementById('composer-tab-btn');
  const performerTab = document.getElementById('performer-tab-btn');
  const sourcesTab = document.getElementById('sources-tab-btn');

  if (composerTab && performerTab && sourcesTab) {
    composerTab.classList.remove('active');
    performerTab.classList.remove('active');
    sourcesTab.classList.remove('active');

    if (currentMainTab === 'compose') {
      composerTab.classList.add('active');
    } else if (currentMainTab === 'perform') {
      performerTab.classList.add('active');
    } else if (currentMainTab === 'sources') {
      sourcesTab.classList.add('active');
    }
    // settings tab is not highlighted
  }
}

// Switch explorer tabs
function switchExplorerTab(newTab: ExplorerTab) {
  if (newTab === currentTab) return;

  currentTab = newTab;

  const patchesTab = document.getElementById('patches-tab');
  const mediaTab = document.getElementById('media-tab');
  const patchesView = document.getElementById('patches-view');
  const mediaView = document.getElementById('media-view');

  if (newTab === 'patches') {
    patchesTab?.classList.add('active');
    mediaTab?.classList.remove('active');
    patchesView?.classList.add('active');
    mediaView?.classList.remove('active');
  } else {
    patchesTab?.classList.remove('active');
    mediaTab?.classList.add('active');
    patchesView?.classList.remove('active');
    mediaView?.classList.add('active');
  }
}

// Switch between main tabs
function switchMainTabs(newTab: MainTab) {
  if (newTab === currentMainTab) return;

  currentMainTab = newTab;

  const composerTab = document.getElementById('composer-tab');
  const performerTab = document.getElementById('performer-tab');
  const sourcesTab = document.getElementById('sources-tab');
  const settingsTab = document.getElementById('settings-tab');

  // Hide all tabs first
  if (composerTab) composerTab.classList.remove('active');
  if (performerTab) performerTab.classList.remove('active');
  if (sourcesTab) sourcesTab.classList.remove('active');
  if (settingsTab) settingsTab.classList.remove('active');

  // Hide all tab contents
  hideComposer();
  hidePerformer();
  hideSources();
  hideSettings();

  // Show the selected tab
  if (newTab === 'compose') {
    if (composerTab) composerTab.classList.add('active');
    showComposer();
  } else if (newTab === 'perform') {
    if (performerTab) performerTab.classList.add('active');
    showPerformer();
  } else if (newTab === 'sources') {
    if (sourcesTab) sourcesTab.classList.add('active');
    showSources();
  } else {
    // settings
    if (settingsTab) settingsTab.classList.add('active');
    showSettings();
  }

  updateMainTabButtons();
}

// Main tab handlers
document.getElementById('composer-tab-btn')?.addEventListener('click', () => {
  switchMainTabs('compose');
});

document.getElementById('performer-tab-btn')?.addEventListener('click', () => {
  switchMainTabs('perform');
});

document.getElementById('sources-tab-btn')?.addEventListener('click', () => {
  switchMainTabs('sources');
});

// Explorer tab handlers
document.getElementById('patches-tab')?.addEventListener('click', () => {
  switchExplorerTab('patches');
});

document.getElementById('media-tab')?.addEventListener('click', () => {
  switchExplorerTab('media');
});

// Listen for custom event to switch to patches tab (e.g., when revealing a file)
window.addEventListener('switch-to-patches-tab', () => {
  switchExplorerTab('patches');
});

document.getElementById('toggle-output-btn')?.addEventListener('click', (event) => {
  if (event.altKey) {
    window.electronAPI.setOutputWindowFullscreen();
  } else {
    window.electronAPI.toggleOutputWindow();
  }
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  switchMainTabs('settings');
});

// Listen for output window state changes
window.electronAPI.onOutputWindowStateChanged((isOpen: boolean) => {
  updateOutputWindowButton(isOpen);
});

// Initialize output window button text
void window.electronAPI.getOutputWindowState().then((isOpen: boolean) => {
  updateOutputWindowButton(isOpen);
});

// Setup drop zone for composer editor
function setupComposerDropZone() {
  const editorElement = document.getElementById('editor-composer-monaco');
  if (!editorElement) return;

  editorElement.addEventListener('dragover', (event) => {
    if (!event.dataTransfer || currentMainTab !== 'compose') return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    editorElement.style.opacity = '0.7';
  });

  editorElement.addEventListener('dragleave', () => {
    editorElement.style.opacity = '1';
  });

  editorElement.addEventListener('drop', (event) => {
    if (!event.dataTransfer || currentMainTab !== 'compose') return;

    event.preventDefault();
    editorElement.style.opacity = '1';

    const patchPath = event.dataTransfer.getData('patch-path');
    const patchName = event.dataTransfer.getData('patch-name');

    if (!patchPath) return;

    void loadPatchIntoComposer(patchPath, patchName);
  });
}

// Handle patch explorer events
window.addEventListener('patch-explorer-open-patch', ((event: CustomEvent) => {
  const { patchPath, patchName, target } = event.detail as {
    patchPath: string;
    patchName: string;
    target: 'composer' | 'performer-a' | 'performer-b';
  };

  if (target === 'composer') {
    if (currentMainTab !== 'compose') {
      switchMainTabs('compose');
    }
    void loadPatchIntoComposer(patchPath, patchName);
  } else if (target === 'performer-a') {
    if (currentMainTab !== 'perform') {
      switchMainTabs('perform');
    }
    void loadPatchIntoSlot(patchPath, patchName, 'A');
  } else {
    // if (target === 'performer-b')
    if (currentMainTab !== 'perform') {
      switchMainTabs('perform');
    }
    void loadPatchIntoSlot(patchPath, patchName, 'B');
  }
}) as EventListener);

// Handle new patch request from patch explorer
window.addEventListener('patch-explorer-new-patch', () => {
  createNewPatch();
});

// Handle composer context menu - send content to performer
window.addEventListener('composer-send-to-performer', ((event: CustomEvent) => {
  const { content, target } = event.detail as {
    content: string;
    target: 'A' | 'B';
  };

  if (currentMainTab !== 'perform') {
    switchMainTabs('perform');
  }

  const slot = target === 'A' ? getPerformerState().slotA : getPerformerState().slotB;

  if (slot) {
    slot.editor.setValue(content);
    // Keep the file reference - don't clear it, user can continue editing and save
    slot.isDirty = true;
    // Mark original content to force dirty state display
    slot.originalContent = content;
  }
}) as EventListener);

// Handle performer context menu - send content to composer
window.addEventListener('performer-send-to-composer', ((event: CustomEvent) => {
  const { content } = event.detail as {
    content: string;
    source: 'A' | 'B';
  };

  if (currentMainTab !== 'compose') {
    switchMainTabs('compose');
  }

  const composerState = getComposerState();
  if (composerState) {
    composerState.editor.setValue(content);
    // Keep the file reference - don't clear it, user can continue editing and save
    composerState.isDirty = true;
    // Mark original content to force dirty state display
    composerState.originalContent = content;
  }
}) as EventListener);

function createNewPatch(): void {
  let content = '';
  let loadedFile: string | null = null;

  // Get content from current main tab
  if (currentMainTab === 'compose') {
    const state = getComposerState();
    if (state) {
      content = state.editor.getValue();
      loadedFile = state.loadedFile;
    }
  } else {
    // In perform tab, try to get content from focused slot or default to slot A
    const performerState = getPerformerState();
    if (performerState.slotA) {
      content = performerState.slotA.editor.getValue();
      loadedFile = performerState.slotA.loadedFile;
    }
  }

  const settings = getSettings();
  const patchDir = settings.patchDirectory;

  const initialValue = loadedFile ? getFilename(loadedFile).replace(FILE_EXTENSIONS.PATCH, '') : '';

  createInlinePatchEditor(initialValue, async (filename) => {
    const finalFilename = filename.endsWith(FILE_EXTENSIONS.PATCH)
      ? filename
      : `${filename}${FILE_EXTENSIONS.PATCH}`;
    const filePath = `${patchDir}/${finalFilename}`;

    try {
      await window.electronAPI.savePatch(filePath, content);

      // Update the current editor's state
      if (currentMainTab === 'compose') {
        const state = getComposerState();
        if (state) {
          state.loadedFile = filePath;
          state.originalContent = content;
          state.isDirty = false;
        }
      } else {
        const performerState = getPerformerState();
        if (performerState.slotA) {
          triggerSlotSave('A', filePath, content);
        }
      }

      await loadPatches();
    } catch (error) {
      console.error('Error saving new patch:', error);
    }
  });
}

// Handle save-as events from composer and performer
window.addEventListener('composer-save-as', ((event: CustomEvent) => {
  const { initialValue, content, currentFilePath, rootPatchDir } = event.detail as {
    initialValue: string;
    content: string;
    currentFilePath: string | null;
    rootPatchDir: string;
  };

  // Get the target directory (from selection, current file, or root)
  const targetDir = getTargetSaveDirectory(currentFilePath, rootPatchDir);

  createInlinePatchEditor(initialValue, async (filename) => {
    const finalFilename = filename.endsWith(FILE_EXTENSIONS.PATCH)
      ? filename
      : `${filename}${FILE_EXTENSIONS.PATCH}`;
    const filePath = `${targetDir}/${finalFilename}`;

    try {
      await window.electronAPI.savePatch(filePath, content);

      const state = getComposerState();
      if (state) {
        state.fileController.onSaveAsComplete(filePath, content);
      }

      await loadPatches();
      // Reveal the saved file in the patch explorer
      window.dispatchEvent(
        new CustomEvent('reveal-file-in-explorer', {
          detail: { filePath },
        }),
      );
    } catch (error) {
      console.error('Error saving patch:', error);
    }
  });
}) as EventListener);

window.addEventListener('performer-save-as', ((event: CustomEvent) => {
  const { slotId, initialValue, content, currentFilePath, rootPatchDir } = event.detail as {
    slotId: 'A' | 'B';
    initialValue: string;
    content: string;
    currentFilePath: string | null;
    rootPatchDir: string;
  };

  // Get the target directory (from selection, current file, or root)
  const targetDir = getTargetSaveDirectory(currentFilePath, rootPatchDir);

  createInlinePatchEditor(initialValue, async (filename) => {
    const finalFilename = filename.endsWith(FILE_EXTENSIONS.PATCH)
      ? filename
      : `${filename}${FILE_EXTENSIONS.PATCH}`;
    const filePath = `${targetDir}/${finalFilename}`;

    try {
      await window.electronAPI.savePatch(filePath, content);
      triggerSlotSave(slotId, filePath, content);
      await loadPatches();
      // Reveal the saved file in the patch explorer
      window.dispatchEvent(
        new CustomEvent('reveal-file-in-explorer', {
          detail: { filePath },
        }),
      );
    } catch (error) {
      console.error('Error saving patch:', error);
    }
  });
}) as EventListener);

// Setup sidebar resizing
function setupSidebarResizing() {
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  const explorerTabs = document.getElementById('explorer-tabs');

  if (!sidebar || !resizer || !explorerTabs) return;

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    const minWidth = 150;
    const maxWidth = 600;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      sidebar.style.width = `${String(newWidth)}px`;
      explorerTabs.style.width = `${String(newWidth)}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
  });
}

// Check if there are unsaved changes in any editor
function checkUnsavedChanges(): boolean {
  const composer = getComposerState();
  const performer = getPerformerState();

  if (composer?.isDirty) {
    return true;
  }

  if (performer.slotA?.isDirty) {
    return true;
  }

  if (performer.slotB?.isDirty) {
    return true;
  }

  return false;
}

// Save all unsaved changes before quitting
async function saveAllBeforeQuit(): Promise<void> {
  const composer = getComposerState();
  const performer = getPerformerState();

  // Save composer if dirty and has a file loaded
  if (composer && composer.isDirty && composer.loadedFile) {
    await saveComposer();
  }

  // Save performer slot A if dirty and has a file loaded
  if (performer.slotA && performer.slotA.isDirty && performer.slotA.loadedFile) {
    await saveSlotA();
  }

  // Save performer slot B if dirty and has a file loaded
  if (performer.slotB && performer.slotB.isDirty && performer.slotB.loadedFile) {
    await saveSlotB();
  }
}

// Setup global keyboard shortcuts
function setupGlobalKeyboardShortcuts() {
  // Global keyboard shortcuts that work regardless of focus
  window.addEventListener('keydown', (event) => {
    // Only handle Cmd/Ctrl + number keys
    if (!(event.metaKey || event.ctrlKey)) return;

    // Don't handle if we're in an input field (e.g., the inline patch name editor)
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      return;
    }

    // Don't handle if we're on settings page
    if (window.location.href.includes('settings.html')) return;

    // Cmd+N - New patch
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      if (currentMainTab === 'compose') {
        newComposerPatch();
      } else if (currentMainTab === 'perform') {
        // Determine which slot has focus
        const performerState = getPerformerState();
        const activeElement = document.activeElement;

        if (activeElement && performerState.slotB?.editor.hasTextFocus()) {
          newSlotPatch('B');
        } else if (performerState.slotA) {
          // Default to slot A if neither has focus or slot A has focus
          newSlotPatch('A');
        }
      }
      return;
    }

    // Cmd+1 - Switch to Composer tab and focus editor
    if (event.key === '1') {
      event.preventDefault();
      switchMainTabs('compose');
      const state = getComposerState();
      if (state) {
        state.editor.focus();
      }
      return;
    }

    // Cmd+2 - Switch to Performer tab and focus slot A editor
    if (event.key === '2') {
      event.preventDefault();
      switchMainTabs('perform');
      const performerState = getPerformerState();
      if (performerState.slotA) {
        performerState.slotA.editor.focus();
      }
      return;
    }

    // Cmd+3 - Switch to Performer tab and focus slot B editor
    if (event.key === '3') {
      event.preventDefault();
      switchMainTabs('perform');
      const performerState = getPerformerState();
      if (performerState.slotB) {
        performerState.slotB.editor.focus();
      }
      return;
    }

    // Cmd+4 - Switch to Sources tab
    if (event.key === '4') {
      event.preventDefault();
      switchMainTabs('sources');
      return;
    }
  });
}

// Set our functions as the quit handlers
window.quitHandlers.setCheckUnsavedChanges(checkUnsavedChanges);
window.quitHandlers.setSaveAllBeforeQuit(saveAllBeforeQuit);

// Initialize
void (async () => {
  // Initialize settings service first (loads settings from disk)
  await initSettingsService();

  // Initialize all tab components
  initComposer();
  initPerformer();
  initSources();
  initSettings(loadPatches, loadMedia);

  // Initialize patch explorer with callbacks
  initPatchExplorer({
    onPatchDoubleClick: (patchPath, patchName) => {
      if (currentMainTab === 'compose') {
        void loadPatchIntoComposer(patchPath, patchName);
      } else {
        void loadPatchIntoSlot(patchPath, patchName, 'A');
      }
    },
    onPatchDragStart: (_patchPath, _patchName) => {
      // Drag start callback (currently unused, but available for future use)
    },
  });

  // Initialize media explorer with callbacks
  initMediaExplorer({
    onMediaSelect: (mediaPath, _mediaName, sourceSlot, mediaType) => {
      // Store in global sources
      const mediaUrl = `file://${mediaPath}`;
      globalSources[sourceSlot] = {
        mediaPath: mediaPath,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
      };

      setSourceInSources(sourceSlot, mediaUrl, mediaType);
      setSourceInComposer(sourceSlot, mediaUrl, mediaType);
      window.electronAPI.setHydraSource(sourceSlot, mediaUrl, mediaType);
    },
  });

  // Setup drop zones
  setupComposerDropZone();

  // Setup sidebar resizing
  setupSidebarResizing();

  // Setup global keyboard shortcuts
  setupGlobalKeyboardShortcuts();

  // Apply platform-aware shortcut tooltips
  applyShortcutTooltips();

  // Initialize custom tooltip system for reliable tooltip display
  initTooltips();

  // Load patches and media
  await loadPatches();
  await loadMedia();

  // Start in compose tab - force show since currentMainTab is already 'compose'
  currentMainTab = 'perform'; // Temporarily set to different tab
  switchMainTabs('compose'); // Now switchMainTabs will actually execute showComposer()
})();
