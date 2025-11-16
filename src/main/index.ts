import * as fs from 'node:fs';
import * as path from 'node:path';

import { app, BrowserWindow, dialog, ipcMain, MessageChannelMain, screen } from 'electron';

import { FILE_EXTENSIONS, IPC_CHANNELS, APP_CONFIG } from '../shared/constants';
import { debounce } from '../shared/debounce';

import { ensureDirectoriesExist, getDocumentsPath, loadSettings, saveSettings } from './settings';
import { scanDirectory } from './utils/file-scanning';
import { collectMediaFiles } from './utils/media';
import { isPathWithinRoot, isValidName, safeJoin } from './utils/path-security';

import type { ResultsPayload, Settings } from '../shared/ipc-types';

const EDITOR_WINDOW_WIDTH = 1200;
const EDITOR_WINDOW_HEIGHT = 800;
const OUTPUT_WINDOW_WIDTH = 640;
const OUTPUT_WINDOW_HEIGHT = 360;
const DEV_SERVER_PORT = '5173';

// Set app name; ensure macOS menu title updates
app.name = APP_CONFIG.APP_NAME;
if (process.platform === 'darwin') {
  app.setName(APP_CONFIG.APP_NAME);
}

// Forward renderer console output to stdio in development
if (!app.isPackaged) {
  app.commandLine.appendSwitch('enable-logging');
}

let editorWindow: BrowserWindow | null = null;
let outputWindow: BrowserWindow | null = null;
let patchDirectory = '';
let mediaDirectory = '';
let previewChannel: MessageChannelMain | null = null;
let appIsQuitting = false;
let patchWatcher: fs.FSWatcher | null = null;
let mediaWatcher: fs.FSWatcher | null = null;

const WATCHER_DEBOUNCE_MS = 300;

function startWatchers(): void {
  // Watches patch & media directories for any file changes.
  // Strategy: fs.watch (recursive) emits burst events; we debounce and perform a full rescan.
  // Rescan guarantees consistency (rename/delete chains) without tracking granular ops.
  // Restart invoked when settings change (directories may move). Cleaned up on quit.
  // Always tear down previous watchers first (directory may change)
  stopWatchers();

  if (!patchDirectory || !mediaDirectory) {
    console.warn('Cannot start watchers: directories not set');
    return;
  }

  const sendPatches = debounce(() => {
    if (!editorWindow) return;
    try {
      const patches = scanDirectory(patchDirectory, {
        sortDirectoriesFirst: true,
        fileFilter: (fileName) => fileName.endsWith(FILE_EXTENSIONS.PATCH),
      });
      editorWindow.webContents.send(IPC_CHANNELS.EDITOR_PATCHES_CHANGED, patches);
    } catch (error) {
      console.warn('Patch rescan failed:', error);
    }
  }, WATCHER_DEBOUNCE_MS);

  const sendMedia = debounce(() => {
    if (!editorWindow) return;
    try {
      const media = collectMediaFiles(mediaDirectory);
      editorWindow.webContents.send(IPC_CHANNELS.EDITOR_MEDIA_CHANGED, media);
    } catch (error) {
      console.warn('Media rescan failed:', error);
    }
  }, WATCHER_DEBOUNCE_MS);

  try {
    patchWatcher = fs.watch(patchDirectory, { recursive: true }, () => {
      sendPatches();
    });
  } catch (error) {
    console.warn('Failed to start patch watcher:', error);
  }
  try {
    mediaWatcher = fs.watch(mediaDirectory, { recursive: true }, () => {
      sendMedia();
    });
  } catch (error) {
    console.warn('Failed to start media watcher:', error);
  }
}

function stopWatchers(): void {
  patchWatcher?.close();
  mediaWatcher?.close();
  patchWatcher = null;
  mediaWatcher = null;
}

function createEditorWindowAndShow() {
  editorWindow = new BrowserWindow({
    width: EDITOR_WINDOW_WIDTH,
    height: EDITOR_WINDOW_HEIGHT,
    title: APP_CONFIG.APP_NAME + ' Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const editorUrl = isDev
    ? `http://localhost:${DEV_SERVER_PORT}/editor.html`
    : `file://${path.join(__dirname, '../renderer/editor.html')}`;

  void editorWindow.loadURL(editorUrl);

  editorWindow.webContents.on('did-finish-load', () => {
    setupPreviewChannel();
  });

  editorWindow.on('closed', () => {
    editorWindow = null;

    outputWindow?.hide();
  });
}

function createOutputWindowAndKeepHidden() {
  outputWindow = new BrowserWindow({
    width: OUTPUT_WINDOW_WIDTH,
    height: OUTPUT_WINDOW_HEIGHT,
    title: APP_CONFIG.APP_NAME + ' Output',
    show: false, // Don't show until loaded
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const outputUrl = isDev
    ? `http://localhost:${DEV_SERVER_PORT}/output.html`
    : `file://${path.join(__dirname, '../renderer/output.html')}`;

  void outputWindow.loadURL(outputUrl);

  outputWindow.on('close', (event) => {
    if (appIsQuitting) {
      return;
    }
    event.preventDefault();
    outputWindow?.hide();
    editorWindow?.webContents.send(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, false);
  });

  outputWindow.on('closed', () => {
    outputWindow = null;
    previewChannel?.port1.close();
    previewChannel?.port2.close();
    previewChannel = null;
  });

  outputWindow.webContents.on('did-finish-load', () => {
    editorWindow?.webContents.send(IPC_CHANNELS.OUTPUT_READY);
    editorWindow?.webContents.send(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, false);
    setupPreviewChannel();
  });
}

function setupPreviewChannel() {
  if (!editorWindow || !outputWindow) {
    return;
  }

  previewChannel?.port1.close();
  previewChannel?.port2.close();

  previewChannel = new MessageChannelMain();
  outputWindow.webContents.postMessage(IPC_CHANNELS.EDITOR_PREVIEW_CHANNEL, null, [
    previewChannel.port1,
  ]);
  editorWindow.webContents.postMessage(IPC_CHANNELS.EDITOR_PREVIEW_CHANNEL, null, [
    previewChannel.port2,
  ]);
}

void app
  .whenReady()
  .then(() => {
    app.setAboutPanelOptions({
      applicationName: APP_CONFIG.APP_NAME,
      applicationVersion: app.getVersion(),
      credits: 'Render Engine\n' + 'Hydra Synth • https://hydra.ojack.xyz',
      copyright: '© 2025 Corebounce\nhttps://github.com/arisona/videodrome',
    });

    createEditorWindowAndShow();
    createOutputWindowAndKeepHidden();

    // Note: Settings are initialized by renderer via settings service
    // Watchers will be started when renderer calls updateDirectories()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createEditorWindowAndShow();
        if (!outputWindow) {
          createOutputWindowAndKeepHidden();
        }
      }
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize Videodrome windows:', error);
  });

app.on('before-quit', (event) => {
  if (appIsQuitting) {
    stopWatchers();
    return;
  }

  event.preventDefault();

  void (async () => {
    if (!editorWindow || editorWindow.isDestroyed()) {
      appIsQuitting = true;
      app.quit();
      return;
    }

    try {
      // Ask editor window if there are unsaved changes
      const hasUnsavedChanges = (await editorWindow.webContents.executeJavaScript(
        'window.quitHandlers.checkUnsavedChanges()',
      )) as boolean;

      if (!hasUnsavedChanges) {
        // No unsaved changes, proceed with quit
        appIsQuitting = true;
        app.quit();
        return;
      }

      // Show confirm dialog for unsaved changes
      const confirmed = (await editorWindow.webContents.executeJavaScript(
        'window.confirm("You have unsaved changes.\\n\\nClick OK to quit without saving.")',
      )) as boolean;

      if (!confirmed) {
        // Cancel - do nothing, stay open
        return;
      }

      // OK - proceed with quit without saving
      appIsQuitting = true;
      app.quit();
    } catch (error) {
      console.error('Error checking unsaved changes:', error);
      // On error, ask user if they want to quit anyway
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Error',
        message: 'Unable to check for unsaved changes. Quit anyway?',
        buttons: ['Quit', 'Cancel'],
        defaultId: 1,
      });

      if (result.response === 0) {
        appIsQuitting = true;
        app.quit();
      }
    }
  })();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.on(IPC_CHANNELS.EDITOR_CODE_RUN, (_event, code: string) => {
  outputWindow?.webContents.send(IPC_CHANNELS.OUTPUT_CODE_RUN, code);
});

ipcMain.on(IPC_CHANNELS.OUTPUT_EXECUTION_RESULT, (_event, results: ResultsPayload) => {
  editorWindow?.webContents.send(IPC_CHANNELS.OUTPUT_EXECUTION_RESULT, results);
});

ipcMain.on(
  IPC_CHANNELS.EDITOR_HYDRA_SET_SOURCE,
  (_event, data: { sourceSlot: string; mediaUrl: string; mediaType: string }) => {
    outputWindow?.webContents.send(IPC_CHANNELS.OUTPUT_HYDRA_SET_SOURCE, data);
  },
);

ipcMain.on(
  IPC_CHANNELS.EDITOR_AUDIO_ANALYZER_PARAMS,
  (_event, params: { smooth: number; scale: number; cutoff: number }) => {
    outputWindow?.webContents.send(IPC_CHANNELS.OUTPUT_AUDIO_ANALYZER_PARAMS, params);
  },
);

ipcMain.on(IPC_CHANNELS.EDITOR_OUTPUT_TOGGLE, () => {
  if (!outputWindow) {
    throw new Error('Output window does not exist');
  }

  if (outputWindow.isVisible()) {
    if (outputWindow.isFullScreen()) {
      outputWindow.setFullScreen(false);
      outputWindow.once('leave-full-screen', () => {
        outputWindow?.hide();
        editorWindow?.webContents.send(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, false);
      });
    } else {
      outputWindow.hide();
      editorWindow?.webContents.send(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, false);
    }
  } else {
    outputWindow.show();
    editorWindow?.webContents.send(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, true);
  }
});

ipcMain.on(IPC_CHANNELS.EDITOR_OUTPUT_SET_FULLSCREEN, () => {
  if (!outputWindow) {
    throw new Error('Output window does not exist');
  }

  if (!outputWindow.isVisible()) {
    outputWindow.show();
  }

  // If more than one display, move output window to a different display and fullscreen it
  const displays = screen.getAllDisplays();
  if (displays.length === 1) {
    return;
  }
  let targetDisplay = displays[0];
  if (editorWindow) {
    const editorBounds = editorWindow.getBounds();
    const editorDisplay = screen.getDisplayMatching(editorBounds);
    targetDisplay = displays.find((display) => display.id !== editorDisplay.id) ?? displays[0];
  }

  outputWindow.setBounds({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: OUTPUT_WINDOW_WIDTH,
    height: OUTPUT_WINDOW_HEIGHT,
  });
  outputWindow.setFullScreen(true);
  if (editorWindow) {
    editorWindow.webContents.send(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, true);
  }
});

ipcMain.handle(IPC_CHANNELS.EDITOR_OUTPUT_GET_STATE, () => {
  return outputWindow?.isVisible() ?? false;
});

// New simplified settings API
ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DOCUMENTS_PATH, () => {
  return getDocumentsPath();
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_LOAD, () => {
  return loadSettings();
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, (_event, settings: Settings) => {
  saveSettings(settings);
});

ipcMain.handle(
  IPC_CHANNELS.SETTINGS_ENSURE_DIRECTORIES,
  (_event, patchDir: string, mediaDir: string) => {
    return ensureDirectoriesExist(patchDir, mediaDir);
  },
);

ipcMain.handle(
  IPC_CHANNELS.SETTINGS_UPDATE_DIRECTORIES,
  (_event, patchDir: string, mediaDir: string) => {
    patchDirectory = patchDir;
    mediaDirectory = mediaDir;
    // Restart watchers with new directories
    startWatchers();
  },
);

ipcMain.handle(
  IPC_CHANNELS.EDITOR_DIRECTORY_SELECT,
  async (_event, title: string, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: title,
      defaultPath: defaultPath,
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  },
);

ipcMain.handle(IPC_CHANNELS.EDITOR_PATCHES_LIST, () => {
  try {
    const patchDir = patchDirectory;

    const patches = scanDirectory(patchDir, {
      sortDirectoriesFirst: true,
      fileFilter: (fileName) => fileName.endsWith(FILE_EXTENSIONS.PATCH),
    });

    return patches;
  } catch (error: unknown) {
    console.error('Error listing patches:', error);
    return [];
  }
});

ipcMain.handle(IPC_CHANNELS.EDITOR_PATCH_READ, (_event, filePath: string) => {
  try {
    const patchDir = path.resolve(patchDirectory);

    // Validate filePath is within patch directory
    if (!isPathWithinRoot(filePath, patchDir)) {
      throw new Error('Access denied: Invalid file path');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error: unknown) {
    console.error('Error reading patch:', error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.EDITOR_PATCH_SAVE, (_event, filePath: string, content: string) => {
  try {
    const patchDir = path.resolve(patchDirectory);

    // Validate filePath is within patch directory
    if (!isPathWithinRoot(filePath, patchDir)) {
      throw new Error('Access denied: Invalid file path');
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error: unknown) {
    console.error('Error saving patch:', error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.EDITOR_PATCH_EXISTS, (_event, filePath: string) => {
  try {
    const patchDir = path.resolve(patchDirectory);

    // Validate filePath is within patch directory
    if (!isPathWithinRoot(filePath, patchDir)) {
      throw new Error('Access denied: Invalid file path');
    }

    return fs.existsSync(filePath);
  } catch (error: unknown) {
    console.error('Error checking patch existence:', error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.EDITOR_PATCH_RENAME, (_event, oldPath: string, newName: string) => {
  try {
    const patchDir = path.resolve(patchDirectory);

    // Validate newName doesn't contain path traversal sequences
    if (!isValidName(newName)) {
      throw new Error('Invalid filename: must not contain path separators or traversal sequences');
    }

    // Validate oldPath is within patch directory
    if (!isPathWithinRoot(oldPath, patchDir)) {
      throw new Error('Access denied: Invalid source path');
    }

    const dir = path.dirname(oldPath);
    const newPath = safeJoin(dir, newName);

    // Additional validation that newPath is within patch directory
    if (!isPathWithinRoot(newPath, patchDir)) {
      throw new Error('Access denied: Invalid destination path');
    }

    if (fs.existsSync(newPath)) {
      throw new Error('A file or folder with that name already exists');
    }

    fs.renameSync(oldPath, newPath);
    return newPath;
  } catch (error: unknown) {
    console.error('Error renaming:', error);
    throw error;
  }
});

ipcMain.handle(
  IPC_CHANNELS.EDITOR_PATCH_DELETE,
  (_event, filePath: string, isDirectory: boolean) => {
    try {
      const patchDir = path.resolve(patchDirectory);

      // Validate filePath is within patch directory
      if (!isPathWithinRoot(filePath, patchDir)) {
        throw new Error('Access denied: Invalid file path');
      }

      if (isDirectory) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error: unknown) {
      console.error('Error deleting:', error);
      throw error;
    }
  },
);

ipcMain.handle(
  IPC_CHANNELS.EDITOR_FOLDER_CREATE,
  (_event, parentPath: string, folderName: string) => {
    try {
      const patchDir = path.resolve(patchDirectory);

      // Validate folderName doesn't contain path traversal sequences
      if (!isValidName(folderName)) {
        throw new Error(
          'Invalid folder name: must not contain path separators or traversal sequences',
        );
      }

      // Validate parentPath is within patch directory
      if (!isPathWithinRoot(parentPath, patchDir)) {
        throw new Error('Access denied: Invalid parent path');
      }

      const newFolderPath = safeJoin(parentPath, folderName);

      // Additional validation that newFolderPath is within patch directory
      if (!isPathWithinRoot(newFolderPath, patchDir)) {
        throw new Error('Access denied: Invalid folder path');
      }

      if (fs.existsSync(newFolderPath)) {
        throw new Error('A folder with that name already exists');
      }

      fs.mkdirSync(newFolderPath, { recursive: true });
      return newFolderPath;
    } catch (error: unknown) {
      console.error('Error creating folder:', error);
      throw error;
    }
  },
);

ipcMain.handle(IPC_CHANNELS.EDITOR_MEDIA_LIST, () => {
  try {
    return collectMediaFiles(mediaDirectory);
  } catch (error: unknown) {
    console.error('Error listing media:', error);
    return [];
  }
});
