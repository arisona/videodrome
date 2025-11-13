/// <reference lib="dom" />

import type { HydraSourceSlot } from 'hydra-synth';

export interface Settings {
  patchDirectory: string;
  mediaDirectory: string;
  audioDevice: string | null;
  parameterControl: {
    enabled: boolean;
    sensitivity: number;
    mouseDragLock: boolean;
  };
  intellisenseEnabled: boolean;
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

export interface PreviewFrame {
  width: number;
  height: number;
  data: ArrayBuffer;
}

export interface SlotExecutionResult {
  success: boolean;
  error?: {
    message: string;
    stack?: string;
    lineNumber?: number;
  };
}

export interface ExecutionResultsPayload {
  slotA: SlotExecutionResult;
  slotB: SlotExecutionResult;
}

export interface EditorPayload {
  slotA: string;
  slotB: string;
  compositeMode?: string;
  compositeParams?: Record<string, number>;
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
  runCode: (code: string) => void;
  onRunCode: (callback: (code: string) => void) => void;
  toggleOutputWindow: () => void;
  setOutputWindowFullscreen: () => void;
  getOutputWindowState: () => Promise<boolean>;
  onOutputWindowStateChanged: (callback: (isOpen: boolean) => void) => void;
  onOutputWindowReady: (callback: () => void) => void;
  // Settings API
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
  sendExecutionResults: (results: ExecutionResultsPayload) => void;
  onExecutionResults: (callback: (results: ExecutionResultsPayload) => void) => void;
  setHydraSource: (
    sourceSlot: HydraSourceSlot,
    mediaUrl: string,
    mediaType: HydraMediaType,
  ) => void;
  onSetHydraSource: (
    callback: (data: {
      sourceSlot: HydraSourceSlot;
      mediaUrl: string;
      mediaType: HydraMediaType;
    }) => void,
  ) => void;
  // Media explorer APIs
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
