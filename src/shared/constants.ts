/**
 * Shared constants used across main and renderer processes
 * This file ensures consistency and prevents typos in critical values like IPC channel names
 */

// ============================================================================
// IPC Channel Names
// ============================================================================
// CRITICAL: These must match exactly between main and renderer processes

export const IPC_CHANNELS = {
  // Editor window → Main process (requests/commands)
  // Settings API
  SETTINGS_GET_DOCUMENTS_PATH: 'settings:get-documents-path',
  SETTINGS_LOAD: 'settings:load',
  SETTINGS_SAVE: 'settings:save',
  SETTINGS_ENSURE_DIRECTORIES: 'settings:ensure-directories',
  SETTINGS_UPDATE_DIRECTORIES: 'settings:update-directories',
  EDITOR_DIRECTORY_SELECT: 'editor:directory-select',
  EDITOR_PATCHES_LIST: 'editor:patches-list',
  EDITOR_PATCH_READ: 'editor:patch-read',
  EDITOR_PATCH_SAVE: 'editor:patch-save',
  EDITOR_PATCH_EXISTS: 'editor:patch-exists',
  EDITOR_PATCH_RENAME: 'editor:patch-rename',
  EDITOR_PATCH_DELETE: 'editor:patch-delete',
  EDITOR_FOLDER_CREATE: 'editor:folder-create',
  EDITOR_MEDIA_LIST: 'editor:media-list',
  EDITOR_CODE_RUN: 'editor:code-run',
  EDITOR_OUTPUT_TOGGLE: 'editor:output-toggle',
  EDITOR_OUTPUT_SET_FULLSCREEN: 'editor:output-set-fullscreen',
  EDITOR_OUTPUT_GET_STATE: 'editor:output-get-state',
  EDITOR_HYDRA_SET_SOURCE: 'editor:hydra-set-source',
  EDITOR_AUDIO_ANALYZER_PARAMS: 'editor:audio-analyzer-params',
  EDITOR_PREVIEW_CHANNEL: 'editor:preview-channel',
  EDITOR_CHECK_UNSAVED_CHANGES: 'editor:check-unsaved-changes',
  EDITOR_SAVE_ALL_BEFORE_QUIT: 'editor:save-all-before-quit',

  // Main process → Output window (commands)
  OUTPUT_CODE_RUN: 'output:code-run',
  OUTPUT_HYDRA_SET_SOURCE: 'output:hydra-set-source',
  OUTPUT_AUDIO_ANALYZER_PARAMS: 'output:audio-analyzer-params',

  // Output window → Main process (events)
  OUTPUT_READY: 'output:ready',
  OUTPUT_EXECUTION_RESULT: 'output:execution-result',

  // Main process → Editor window (events)
  EDITOR_OUTPUT_STATE_CHANGED: 'editor:output-state-changed',
  EDITOR_PATCHES_CHANGED: 'editor:patches-changed',
  EDITOR_MEDIA_CHANGED: 'editor:media-changed',
} as const;

// ============================================================================
// File Extensions
// ============================================================================

export const FILE_EXTENSIONS = {
  PATCH: '.js',
  IMAGE: ['.jpg', '.jpeg', '.png'],
  VIDEO: ['.mp4', '.webm', '.mov'],
  GIF: ['.gif'],
} as const;

// Flattened arrays for convenience
export const SUPPORTED_IMAGE_EXTS = FILE_EXTENSIONS.IMAGE;
export const SUPPORTED_VIDEO_EXTS = FILE_EXTENSIONS.VIDEO;
export const SUPPORTED_GIF_EXTS = FILE_EXTENSIONS.GIF;

// ============================================================================
// Default Settings Values
// ============================================================================

export const DEFAULT_SETTINGS = {
  PARAMETER_CONTROL_ENABLED: true,
  PARAMETER_CONTROL_SENSITIVITY: 10,
  PARAMETER_CONTROL_DRAG_LOCK: true,
} as const;

// ============================================================================
// Application Configuration
// ============================================================================

export const APP_CONFIG = {
  APP_NAME: 'Videodrome',
  SETTINGS_FILENAME: 'settings.json',
  DEFAULT_FOLDER_NAME: 'Videodrome',
  PATCHES_SUBFOLDER: 'patches',
  MEDIA_SUBFOLDER: 'media',
} as const;

// ============================================================================
// Status Messages
// ============================================================================

export const STATUS_MESSAGES = {
  READY: '☑',
  RUNNING: '↻',
  ERROR: '☒ Error',
} as const;
