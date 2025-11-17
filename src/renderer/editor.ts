/* eslint-env browser */

import { FILE_EXTENSIONS } from '../shared/constants';

import { initAudioDrawer } from './components/audio-drawer';
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
  getComposerState,
  setSource as setSourceInComposer,
  setSourcePlaybackSpeed as setSourcePlaybackSpeedInComposer,
} from './composer-tab';
import {
  configureMonacoEnvironment,
  defineVideodromeTheme,
  registerHydraTypeDefinitions,
} from './monaco-setup';
import { initPerformer, showPerformer, hidePerformer, getPerformerState } from './performer-tab';
import { initSettingsService, getSettings } from './settings-service';
import { initSettings, showSettings, hideSettings } from './settings-tab';
import {
  initSources,
  showSources,
  hideSources,
  setSource as setSourceInSources,
  setSourcePlaybackSpeed as setSourcePlaybackSpeedInSources,
} from './sources-tab';
import { filePathToUrl } from './utils/file-url';
import { getFilename } from './utils/path';
import { applyShortcutTooltips } from './utils/shortcuts';

import type { MediaType } from '../shared/ipc-types';

// Configure Monaco environment once
configureMonacoEnvironment();
defineVideodromeTheme();

// Register Hydra type definitions with TypeScript language service
// This provides IntelliSense for all Hydra functions and globals
registerHydraTypeDefinitions();

// Current main tab
type MainTab = 'compose' | 'perform' | 'sources' | 'settings';
let currentMainTab: MainTab = 'compose';

// Current explorer tab
type ExplorerTab = 'patches' | 'media';
let currentExplorerTab: ExplorerTab = 'patches';

// Global sources (persisted across tab switches and sent to all Hydra instances)
interface SourceMedia {
  mediaPath: string;
  mediaUrl: string;
  mediaType: MediaType;
}

const globalSources: {
  s0: { media: SourceMedia | null; playbackSpeed: number };
  s1: { media: SourceMedia | null; playbackSpeed: number };
  s2: { media: SourceMedia | null; playbackSpeed: number };
  s3: { media: SourceMedia | null; playbackSpeed: number };
} = {
  s0: { media: null, playbackSpeed: 1.0 },
  s1: { media: null, playbackSpeed: 1.0 },
  s2: { media: null, playbackSpeed: 1.0 },
  s3: { media: null, playbackSpeed: 1.0 },
};

// Get global sources (for sources-tab and composer-tab to use)
export function getGlobalSources() {
  return globalSources;
}

// Set playback speed for a specific source
export function setPlaybackSpeed(sourceSlot: 's0' | 's1' | 's2' | 's3', speed: number): void {
  globalSources[sourceSlot].playbackSpeed = speed;
  if (globalSources[sourceSlot].media) {
    const mediaType = globalSources[sourceSlot].media.mediaType;
    setSourcePlaybackSpeedInSources(sourceSlot, mediaType, speed);
    setSourcePlaybackSpeedInComposer(sourceSlot, mediaType, speed);
    window.electronAPI.setHydraSourcePlaybackSpeed(sourceSlot, speed);
  }
}
// Update output window button state
function updateOutputWindowButton(isOpen: boolean) {
  const button = document.getElementById('toggle-output-btn');
  if (button) {
    const tooltipText = isOpen
      ? 'Hide output window'
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
function showExplorerTab(newTab: ExplorerTab, force = false) {
  if (newTab === currentExplorerTab && !force) return;

  currentExplorerTab = newTab;

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
function showMainTab(newTab: MainTab, force = false) {
  if (newTab === currentMainTab && !force) return;

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
  showMainTab('compose');
});

document.getElementById('performer-tab-btn')?.addEventListener('click', () => {
  showMainTab('perform');
});

document.getElementById('sources-tab-btn')?.addEventListener('click', () => {
  showMainTab('sources');
});

// Explorer tab handlers
document.getElementById('patches-tab')?.addEventListener('click', () => {
  showExplorerTab('patches');
});

document.getElementById('media-tab')?.addEventListener('click', () => {
  showExplorerTab('media');
});

// Listen for custom event to switch to patches tab (e.g., when revealing a file)
window.addEventListener('switch-to-patches-tab', () => {
  showExplorerTab('patches');
});

document.getElementById('toggle-output-btn')?.addEventListener('click', (event) => {
  if (event.altKey) {
    window.electronAPI.setOutputWindowFullscreen();
  } else {
    window.electronAPI.toggleOutputWindow();
  }
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  showMainTab('settings');
});

// Listen for output window state changes
window.electronAPI.onOutputWindowStateChanged((isOpen: boolean) => {
  updateOutputWindowButton(isOpen);
});

// Initialize output window button text
void window.electronAPI.getOutputWindowState().then((isOpen: boolean) => {
  updateOutputWindowButton(isOpen);
});

// Handle patch explorer events
window.addEventListener('patch-explorer-open-patch', ((event: CustomEvent) => {
  const { patchPath, patchName, target } = event.detail as {
    patchPath: string;
    patchName: string;
    target: 'composer' | 'performer-a' | 'performer-b';
  };

  if (target === 'composer') {
    showMainTab('compose');
    void getComposerState()?.panel.load({
      source: 'disk',
      filePath: patchPath,
      fileName: patchName,
    });
  } else if (target === 'performer-a') {
    showMainTab('perform');
    void getPerformerState().panelA?.load({
      source: 'disk',
      filePath: patchPath,
      fileName: patchName,
    });
  } else {
    // if (target === 'performer-b')
    showMainTab('perform');
    void getPerformerState().panelB?.load({
      source: 'disk',
      filePath: patchPath,
      fileName: patchName,
    });
  }
}) as EventListener);

// Handle new patch request from patch explorer
window.addEventListener('patch-explorer-new-patch', () => {
  createNewPatch();
});

// Handle composer context menu - send content to performer
window.addEventListener('composer-open-in-performer', ((event: CustomEvent) => {
  const {
    content,
    target,
    filePath,
    fileName: _fileName,
    isDirty: _isDirty,
    originalContent,
  } = event.detail as {
    content: string;
    target: 'A' | 'B';
    filePath: string | null;
    fileName: string | null;
    isDirty: boolean;
    originalContent: string;
  };

  if (currentMainTab !== 'perform') {
    showMainTab('perform');
  }

  const panel = target === 'A' ? getPerformerState().panelA : getPerformerState().panelB;

  if (panel) {
    // Load content using unified load method
    if (filePath && _fileName) {
      // Load with file relationship
      void panel.load({
        source: 'memory',
        filePath,
        fileName: _fileName,
        content,
        originalContent,
      });
    } else {
      // Load as new patch without file relationship
      void panel.load({
        source: 'new',
        content,
      });
    }
  }
}) as EventListener);

// Handle performer context menu - send content to composer
window.addEventListener('performer-open-in-composer', ((event: CustomEvent) => {
  const {
    content,
    filePath,
    fileName: _fileName,
    isDirty: _isDirty,
    originalContent,
  } = event.detail as {
    content: string;
    source: 'A' | 'B';
    filePath: string | null;
    fileName: string | null;
    isDirty: boolean;
    originalContent: string;
  };

  if (currentMainTab !== 'compose') {
    showMainTab('compose');
  }

  const composerState = getComposerState();
  if (composerState) {
    // Load content using unified load method
    if (filePath && _fileName) {
      // Load with file relationship
      void composerState.panel.load({
        source: 'memory',
        filePath,
        fileName: _fileName,
        content,
        originalContent,
      });
    } else {
      // Load as new patch without file relationship
      void composerState.panel.load({
        source: 'new',
        content,
      });
    }
  }
}) as EventListener);

function createNewPatch(): void {
  let content = '';
  let loadedFile: string | null = null;

  // Get content from current main tab
  if (currentMainTab === 'compose') {
    const state = getComposerState();
    if (state) {
      content = state.panel.getEditor().getValue();
      loadedFile = state.panel.getFilePath();
    }
  } else {
    // In perform tab, try to get content from focused panel or default to panel A
    const performerState = getPerformerState();
    if (performerState.panelA) {
      content = performerState.panelA.getEditor().getValue();
      loadedFile = performerState.panelA.getFilePath();
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
      // Check if file already exists
      const exists = await window.electronAPI.patchExists(filePath);
      if (exists) {
        const confirmed = window.confirm('Patch exists.\n\nClick OK to overwrite.');
        if (!confirmed) {
          return;
        }
      }

      await window.electronAPI.savePatch(filePath, content);

      const state = getComposerState();
      state?.panel.onSaveAsComplete(filePath, content);
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
  const { panelId, initialValue, content, currentFilePath, rootPatchDir } = event.detail as {
    panelId: 'A' | 'B';
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
      // Check if file already exists
      const exists = await window.electronAPI.patchExists(filePath);
      if (exists) {
        const confirmed = window.confirm('Patch is modified.\n\nClick OK to overwrite.');
        if (!confirmed) {
          return;
        }
      }

      await window.electronAPI.savePatch(filePath, content);
      const panel = panelId === 'A' ? getPerformerState().panelA : getPerformerState().panelB;
      panel?.onSaveAsComplete(filePath, content);
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

// Check if there are unsaved changes in any panel
function checkUnsavedChanges(): boolean {
  const composer = getComposerState();
  const performer = getPerformerState();

  if (composer?.panel.isDirty()) {
    return true;
  }

  if (performer.panelA?.isDirty()) {
    return true;
  }

  if (performer.panelB?.isDirty()) {
    return true;
  }

  return false;
}

// Save all unsaved changes before quitting
async function saveAllBeforeQuit(): Promise<void> {
  const composer = getComposerState();
  const performer = getPerformerState();

  // Save composer if dirty and has a file loaded
  if (composer && composer.panel.isDirty() && composer.panel.getFilePath()) {
    await composer.panel.save();
  }

  // Save performer panel A if dirty and has a file loaded
  if (performer.panelA && performer.panelA.isDirty() && performer.panelA.getFilePath()) {
    await performer.panelA.save();
  }

  // Save performer panel B if dirty and has a file loaded
  if (performer.panelB && performer.panelB.isDirty() && performer.panelB.getFilePath()) {
    await performer.panelB.save();
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
        void getComposerState()?.panel.newPatch();
      } else if (currentMainTab === 'perform') {
        // Determine which panel has focus
        const performerState = getPerformerState();
        const activeElement = document.activeElement;

        if (activeElement && performerState.panelB?.getEditor().hasTextFocus()) {
          void performerState.panelB.newPatch();
        } else if (performerState.panelA) {
          // Default to panel A if neither has focus or panel A has focus
          void performerState.panelA.newPatch();
        }
      }
      return;
    }

    // Cmd+1 - Switch to Composer tab and focus panel
    if (event.key === '1') {
      event.preventDefault();
      showMainTab('compose');
      const state = getComposerState();
      if (state) {
        state.panel.getEditor().focus();
      }
      return;
    }

    // Cmd+2 - Switch to Performer tab and focus panel A
    if (event.key === '2') {
      event.preventDefault();
      showMainTab('perform');
      const performerState = getPerformerState();
      if (performerState.panelA) {
        performerState.panelA.getEditor().focus();
      }
      return;
    }

    // Cmd+3 - Switch to Performer tab and focus panel B
    if (event.key === '3') {
      event.preventDefault();
      showMainTab('perform');
      const performerState = getPerformerState();
      if (performerState.panelB) {
        performerState.panelB.getEditor().focus();
      }
      return;
    }

    // Cmd+4 - Switch to Sources tab
    if (event.key === '4') {
      event.preventDefault();
      showMainTab('sources');
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

  // Initialize audio drawer
  initAudioDrawer();

  // Initialize patch explorer with callbacks
  initPatchExplorer({
    onPatchDoubleClick: (_patchPath, _patchName) => {
      // Double click callback (currently unused, but available for future use)
    },
    onPatchDragStart: (_patchPath, _patchName) => {
      // Drag start callback (currently unused, but available for future use)
    },
  });

  // Initialize media explorer with callbacks
  initMediaExplorer({
    onMediaSelect: (mediaPath, _mediaName, sourceSlot, mediaType) => {
      // Store in global sources, but don't change playback speed
      const mediaUrl = filePathToUrl(mediaPath);
      globalSources[sourceSlot].media = {
        mediaPath: mediaPath,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
      };

      setSourceInSources(sourceSlot, mediaUrl, mediaType, globalSources[sourceSlot].playbackSpeed);
      setSourceInComposer(sourceSlot, mediaUrl, mediaType, globalSources[sourceSlot].playbackSpeed);
      window.electronAPI.setHydraSource(
        sourceSlot,
        mediaUrl,
        mediaType,
        globalSources[sourceSlot].playbackSpeed,
      );
    },
  });

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

  // Start in file explorer and composeer tab
  showExplorerTab('patches', true);
  showMainTab('compose', true);
})();
