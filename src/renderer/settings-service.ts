/* eslint-env browser */

import * as path from 'path-browserify';

import { APP_CONFIG, DEFAULT_SETTINGS } from '../shared/constants';

import type { Settings } from '../shared/types';

/**
 * Settings Service
 * Centralized settings management for the renderer process.
 * This module owns the settings state and provides the single source of truth.
 */

let currentSettings: Settings | null = null;
let isInitialized = false;

/**
 * Construct default settings using documents path from main process
 */
async function constructDefaultSettings(): Promise<Settings> {
  const documentsPath = await window.electronAPI.getDocumentsPath();

  return {
    patchDirectory: path.join(
      documentsPath,
      APP_CONFIG.DEFAULT_FOLDER_NAME,
      APP_CONFIG.PATCHES_SUBFOLDER,
    ),
    mediaDirectory: path.join(
      documentsPath,
      APP_CONFIG.DEFAULT_FOLDER_NAME,
      APP_CONFIG.MEDIA_SUBFOLDER,
    ),
    audioDevice: null,
    parameterControl: {
      sensitivity: DEFAULT_SETTINGS.PARAMETER_CONTROL_SENSITIVITY,
      mouseDragLock: DEFAULT_SETTINGS.PARAMETER_CONTROL_DRAG_LOCK,
      enabled: DEFAULT_SETTINGS.PARAMETER_CONTROL_ENABLED,
    },
    intellisenseEnabled: DEFAULT_SETTINGS.INTELLISENSE_ENABLED,
  };
}

/**
 * Deep merge loaded settings with defaults to handle missing nested keys
 */
function mergeWithDefaults(loaded: Partial<Settings>, defaults: Settings): Settings {
  return {
    ...defaults,
    ...loaded,
    parameterControl: {
      ...defaults.parameterControl,
      ...(loaded.parameterControl ?? {}),
    },
  };
}

/**
 * Initialize the settings service
 * Must be called before using getCurrentSettings() or updateSettings()
 */
export async function initSettingsService(): Promise<void> {
  if (isInitialized) return;

  const defaults = await constructDefaultSettings();
  const loaded = await window.electronAPI.loadSettings();

  if (loaded) {
    // Merge loaded settings with defaults to handle missing keys
    currentSettings = mergeWithDefaults(loaded, defaults);
  } else {
    // No settings file exists, use defaults
    currentSettings = defaults;
    // Save defaults to disk
    await window.electronAPI.saveSettings(defaults);
    // Ensure directories exist
    await window.electronAPI.ensureDirectories(defaults.patchDirectory, defaults.mediaDirectory);
  }

  // Update main process with directory paths (for watchers and security)
  await window.electronAPI.updateDirectories(
    currentSettings.patchDirectory,
    currentSettings.mediaDirectory,
  );

  isInitialized = true;
}

/**
 * Get settings
 * Throws if service not initialized
 */
export function getSettings(): Settings {
  if (!isInitialized || !currentSettings) {
    throw new Error('Settings service not initialized. Call initSettingsService() first.');
  }
  return currentSettings;
}

/**
 * Get default settings
 */
export async function getDefaultSettings(): Promise<Settings> {
  return await constructDefaultSettings();
}

/**
 * Update settings and persist to disk
 */
export async function updateSettings(
  newSettings: Settings,
  options?: {
    patchDirectoryChanged?: boolean;
    mediaDirectoryChanged?: boolean;
  },
): Promise<Settings> {
  const oldSettings = getSettings();
  currentSettings = newSettings;

  // Save to disk
  await window.electronAPI.saveSettings(newSettings);

  // Check if directories changed
  const patchDirChanged =
    options?.patchDirectoryChanged ?? oldSettings.patchDirectory !== newSettings.patchDirectory;
  const mediaDirChanged =
    options?.mediaDirectoryChanged ?? oldSettings.mediaDirectory !== newSettings.mediaDirectory;

  // Ensure directories exist if they changed
  if (patchDirChanged || mediaDirChanged) {
    await window.electronAPI.ensureDirectories(
      newSettings.patchDirectory,
      newSettings.mediaDirectory,
    );
  }

  // Update main process with new directory paths (restarts watchers if needed)
  await window.electronAPI.updateDirectories(
    newSettings.patchDirectory,
    newSettings.mediaDirectory,
  );

  return currentSettings;
}
