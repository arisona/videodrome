/// <reference lib="dom" />

import type { HydraSourceSlot } from 'hydra-synth';

export interface HydraGlobals {
  speed: number;
  audioSmooth: number;
  audioScale: number;
  audioCutoff: number;
}

export interface Settings {
  patchDirectory: string;
  mediaDirectory: string;
  audioDevice: string | null;
  parameterControl: {
    enabled: boolean;
    sensitivity: number;
    mouseDragLock: boolean;
  };
  audioDrawerOpen?: boolean;
}

export interface PatchFile {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  depth: number;
}

export type MediaType = 'image' | 'video' | 'gif';

export interface MediaFile {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  depth: number;
  type?: MediaType; // Only for files, not directories
  mtime?: number; // File modification time (for cache invalidation)
}

// Patches and composition sent from editor to output window
export interface ExecutionPayload {
  patchA: string;
  patchB: string;
  compositeMode?: string;
  compositeParams?: Record<string, number>;
}

// Preview frame sent from output window to editor for preview frames
export interface PreviewFrame {
  width: number;
  height: number;
  data: ArrayBuffer;
}

export interface PatchExecutionResult {
  success: boolean;
  error?: {
    message: string;
    stack?: string;
    lineNumber?: number;
  };
}

// Execution results sent from output window to editor
export interface ResultsPayload {
  resultA: PatchExecutionResult;
  resultB: PatchExecutionResult;
}

export type CompositeParameterType = 'range' | 'toggle';

export interface CompositeParameter {
  key: string;
  label: string;
  type: CompositeParameterType;
  min: number;
  max: number;
  default: number;
  step?: number;
}

export type CompositeCategory = 'blend' | 'modulation' | 'glitch' | 'color';

export interface CompositeFunction {
  id: string;
  name: string;
  description: string;
  doc?: string; // Detailed documentation (markdown supported)
  category: CompositeCategory;
  params: Array<CompositeParameter>;
  codeTemplate: string;
}

export interface ElectronAPI {
  toggleOutputWindow: () => void;
  setOutputWindowFullscreen: () => void;
  getOutputWindowState: () => Promise<boolean>;
  onOutputWindowStateChanged: (callback: (isOpen: boolean) => void) => void;
  onOutputWindowReady: (callback: () => void) => void;
  getDocumentsPath: () => Promise<string>;
  loadSettings: () => Promise<Settings | null>;
  saveSettings: (settings: Settings) => Promise<void>;
  ensureDirectories: (
    patchDirectory: string,
    mediaDirectory: string,
  ) => Promise<{ success: boolean; errors: Array<string> }>;
  updateDirectories: (patchDirectory: string, mediaDirectory: string) => Promise<void>;
  selectDirectory: (title: string, defaultPath?: string) => Promise<string | null>;
  listPatches: () => Promise<Array<PatchFile>>;
  onPatchesChanged: (callback: (patches: Array<PatchFile>) => void) => void;
  readPatch: (filePath: string) => Promise<string>;
  savePatch: (filePath: string, content: string) => Promise<boolean>;
  patchExists: (filePath: string) => Promise<boolean>;
  renamePatch: (oldPath: string, newName: string) => Promise<string>;
  deletePatch: (filePath: string, isDirectory: boolean) => Promise<boolean>;
  createFolder: (parentPath: string, folderName: string) => Promise<string>;
  sendPreviewFrames: (bitmapA: PreviewFrame | null, bitmapB: PreviewFrame | null) => void;
  onPreviewFrames: (
    callback: (bitmapA: PreviewFrame | null, bitmapB: PreviewFrame | null) => void,
  ) => () => void;
  onPreviewPortReady: (callback: () => void) => void;
  isPreviewPortReady: () => boolean;
  sendExecutionResults: (results: ResultsPayload) => void;
  onExecutionResults: (callback: (results: ResultsPayload) => void) => void;
  runHydraCode: (code: string) => void;
  onRunHydraCode: (callback: (code: string) => void) => void;
  setHydraSource: (
    sourceSlot: HydraSourceSlot,
    mediaUrl: string,
    mediaType: MediaType,
    playbackSpeed: number,
  ) => void;
  onSetHydraSource: (
    callback: (data: {
      sourceSlot: HydraSourceSlot;
      mediaUrl: string;
      mediaType: MediaType;
      playbackSpeed: number;
    }) => void,
  ) => void;
  setHydraSourceSpeed: (sourceSlot: HydraSourceSlot, speed: number) => void;
  onSetHydraSourceSpeed: (
    callback: (data: { sourceSlot: HydraSourceSlot; speed: number }) => void,
  ) => void;
  setHydraGlobals: (params: HydraGlobals) => void;
  onSetHydraGlobals: (callback: (params: HydraGlobals) => void) => void;
  listMedia: () => Promise<Array<MediaFile>>;
  onMediaChanged: (callback: (media: Array<MediaFile>) => void) => void;
}

export interface QuitHandlers {
  setCheckUnsavedChanges: (handler: () => boolean) => void;
  setSaveAllBeforeQuit: (handler: () => Promise<void>) => void;
  checkUnsavedChanges: () => boolean;
  saveAllBeforeQuit: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    quitHandlers: QuitHandlers;
  }
}
