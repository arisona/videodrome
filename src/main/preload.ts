import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import { IPC_CHANNELS } from '../shared/constants';

import type {
  MediaFile,
  MediaType,
  PatchFile,
  PreviewFrame,
  ResultsPayload,
  Settings,
} from '../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';

let previewPort: MessagePort | null = null;
const previewFrameListeners: Array<
  (bitmapA: PreviewFrame | null, bitmapB: PreviewFrame | null) => void
> = [];
const previewPortReadyListeners: Array<() => void> = [];

function isResultsPayload(value: unknown): value is ResultsPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return 'resultA' in candidate && 'resultB' in candidate;
}

function handlePreviewChannel(event: IpcRendererEvent) {
  if (event.ports.length === 0) {
    previewPort = null;
    return;
  }

  const port = event.ports[0];

  if (previewPort) {
    previewPort.onmessage = null;
    try {
      previewPort.close();
    } catch (error: unknown) {
      console.warn('Preview port close error:', error);
    }
  }

  previewPort = port;
  previewPort.onmessage = (messageEvent) => {
    const frames = messageEvent.data as [PreviewFrame | null, PreviewFrame | null];
    for (const callback of previewFrameListeners) {
      callback(frames[0], frames[1]);
    }
  };
  previewPort.start();
  for (const callback of previewPortReadyListeners) {
    callback();
  }
}

ipcRenderer.on(IPC_CHANNELS.EDITOR_PREVIEW_CHANNEL, handlePreviewChannel);

contextBridge.exposeInMainWorld('electronAPI', {
  runCode: (code: string) => {
    ipcRenderer.send(IPC_CHANNELS.EDITOR_CODE_RUN, code);
  },
  onRunCode: (callback: (code: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_CODE_RUN, (_event, code) => {
      if (typeof code === 'string') {
        callback(code);
      }
    });
  },
  toggleOutputWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.EDITOR_OUTPUT_TOGGLE);
  },
  setOutputWindowFullscreen: () => {
    ipcRenderer.send(IPC_CHANNELS.EDITOR_OUTPUT_SET_FULLSCREEN);
  },
  getOutputWindowState: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_OUTPUT_GET_STATE),
  onOutputWindowStateChanged: (callback: (isOpen: boolean) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED, (_event, isOpen) => {
      if (typeof isOpen === 'boolean') {
        callback(isOpen);
      }
    });
  },
  onOutputWindowReady: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_READY, () => {
      callback();
    });
  },
  getDocumentsPath: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_DOCUMENTS_PATH),
  loadSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LOAD),
  saveSettings: (settings: Settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),
  ensureDirectories: (patchDirectory: string, mediaDirectory: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_ENSURE_DIRECTORIES, patchDirectory, mediaDirectory),
  updateDirectories: (patchDirectory: string, mediaDirectory: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE_DIRECTORIES, patchDirectory, mediaDirectory),
  selectDirectory: (title: string, defaultPath?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EDITOR_DIRECTORY_SELECT, title, defaultPath),
  listPatches: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PATCHES_LIST),
  onPatchesChanged: (callback: (patches: Array<PatchFile>) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EDITOR_PATCHES_CHANGED, (_event, patches) => {
      if (Array.isArray(patches)) {
        callback(patches as Array<PatchFile>);
      }
    });
  },
  readPatch: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PATCH_READ, filePath),
  savePatch: (filePath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PATCH_SAVE, filePath, content),
  patchExists: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PATCH_EXISTS, filePath),
  renamePatch: (oldPath: string, newName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PATCH_RENAME, oldPath, newName),
  deletePatch: (filePath: string, isDirectory: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PATCH_DELETE, filePath, isDirectory),
  createFolder: (parentPath: string, folderName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EDITOR_FOLDER_CREATE, parentPath, folderName),
  sendPreviewFrames: (bitmapA: PreviewFrame | null, bitmapB: PreviewFrame | null) => {
    if (!previewPort) {
      return;
    }
    const frames: [PreviewFrame | null, PreviewFrame | null] = [bitmapA, bitmapB];
    const transferables: Array<ArrayBuffer> = frames
      .filter((frame): frame is PreviewFrame => frame !== null)
      .map((frame) => frame.data);

    try {
      previewPort.postMessage(frames, transferables);
    } catch (error: unknown) {
      console.warn('Preview port postMessage failed, dropping frame', error);
      previewPort = null;
    }
  },
  onPreviewFrames: (
    callback: (bitmapA: PreviewFrame | null, bitmapB: PreviewFrame | null) => void,
  ) => {
    previewFrameListeners.push(callback);
    return () => {
      const index = previewFrameListeners.indexOf(callback);
      if (index !== -1) {
        previewFrameListeners.splice(index, 1);
      }
    };
  },
  onPreviewPortReady: (callback: () => void) => {
    previewPortReadyListeners.push(callback);
    if (previewPort) {
      callback();
    }
  },
  isPreviewPortReady: () => previewPort !== null,
  sendExecutionResults: (results: ResultsPayload) => {
    ipcRenderer.send(IPC_CHANNELS.OUTPUT_EXECUTION_RESULT, results);
  },
  onExecutionResults: (callback: (results: ResultsPayload) => void) => {
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_EXECUTION_RESULT, (_event, results) => {
      if (isResultsPayload(results)) {
        callback(results);
      }
    });
  },
  setHydraSource: (sourceSlot: HydraSourceSlot, mediaUrl: string, mediaType: MediaType) => {
    ipcRenderer.send(IPC_CHANNELS.EDITOR_HYDRA_SET_SOURCE, { sourceSlot, mediaUrl, mediaType });
  },
  onSetHydraSource: (
    callback: (data: {
      sourceSlot: HydraSourceSlot;
      mediaUrl: string;
      mediaType: MediaType;
    }) => void,
  ) => {
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_HYDRA_SET_SOURCE, (_event, data) => {
      if (
        typeof data === 'object' &&
        data !== null &&
        'sourceSlot' in data &&
        'mediaUrl' in data &&
        'mediaType' in data
      ) {
        callback(data as { sourceSlot: HydraSourceSlot; mediaUrl: string; mediaType: MediaType });
      }
    });
  },
  listMedia: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_MEDIA_LIST),
  onMediaChanged: (callback: (media: Array<MediaFile>) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EDITOR_MEDIA_CHANGED, (_event, media) => {
      if (Array.isArray(media)) {
        callback(media as Array<MediaFile>);
      }
    });
  },
});

// Create mutable handlers for quit handling that can be set by the renderer
let checkUnsavedChangesHandler: (() => boolean) | null = null;
let saveAllBeforeQuitHandler: (() => Promise<void>) | null = null;

contextBridge.exposeInMainWorld('quitHandlers', {
  setCheckUnsavedChanges: (handler: () => boolean) => {
    checkUnsavedChangesHandler = handler;
  },
  setSaveAllBeforeQuit: (handler: () => Promise<void>) => {
    saveAllBeforeQuitHandler = handler;
  },
  checkUnsavedChanges: () => {
    if (checkUnsavedChangesHandler) {
      return checkUnsavedChangesHandler();
    }
    return false;
  },
  saveAllBeforeQuit: async () => {
    if (saveAllBeforeQuitHandler) {
      await saveAllBeforeQuitHandler();
    }
  },
});
