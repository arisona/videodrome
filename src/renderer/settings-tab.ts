/* eslint-env browser */

import { DEFAULT_SETTINGS } from '../shared/constants';
import { debounce } from '../shared/debounce';

import { getSettings, getDefaultSettings, updateSettings } from './settings-service';

import type { Settings } from '../shared/ipc-types';

const AUTO_SAVE_DEBOUNCE_MS = 500;

// Callbacks for when directories change
let onPatchDirectoryChanged: (() => Promise<void>) | null = null;
let onMediaDirectoryChanged: (() => Promise<void>) | null = null;

// Settings tab state
interface SettingsState {
  isActive: boolean;
  currentSettings: Settings;
}

let settingsState: SettingsState | null = null;

// DOM elements (will be initialized in initSettings)
let patchDirectoryInput: HTMLInputElement;
let mediaDirectoryInput: HTMLInputElement;
// let audioDeviceSelect: HTMLSelectElement; // Commented out until Hydra supports deviceId
let parameterControlSensitivityInput: HTMLInputElement;
let parameterControlDragLockCheckbox: HTMLInputElement;
let parameterControlCheckbox: HTMLInputElement;
let intellisenseEnabledCheckbox: HTMLInputElement;
let browsePatchDirBtn: HTMLButtonElement;
let browseMediaDirBtn: HTMLButtonElement;
let restoreDefaultsBtn: HTMLButtonElement;

// Audio device refresh interval - commented out until Hydra supports deviceId
// let audioDeviceRefreshInterval: number | null = null;

/**
 * Enumerate and populate available audio input devices
 * COMMENTED OUT: Until Hydra supports deviceId
 */
/*
async function populateAudioDevices(): Promise<void> {
  try {
    // Request permission to access media devices to get device labels
    // This is needed otherwise device labels will be empty
    await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      // Ignore errors if permission is denied, we'll still show device IDs
    });

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === 'audioinput');

    // Store current selection
    const currentValue = audioDeviceSelect.value;

    // Clear existing options except the default
    audioDeviceSelect.innerHTML = '<option value="">Default audio input</option>';

    // Add each audio input device
    for (const device of audioInputs) {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Audio Input ${device.deviceId.slice(0, 8)}`;
      audioDeviceSelect.appendChild(option);
    }

    // Restore selection if it still exists
    if (currentValue) {
      const optionExists = Array.from(audioDeviceSelect.options).some(
        (opt) => opt.value === currentValue,
      );
      if (optionExists) {
        audioDeviceSelect.value = currentValue;
      }
    }
  } catch (error) {
    console.error('Failed to enumerate audio devices:', error);
  }
}

function startAudioDeviceRefresh(): void {
  // Initial population
  void populateAudioDevices();

  // Clear any existing interval
  if (audioDeviceRefreshInterval !== null) {
    clearInterval(audioDeviceRefreshInterval);
  }

  // Set up 5-second refresh interval
  audioDeviceRefreshInterval = window.setInterval(() => {
    void populateAudioDevices();
  }, 5000);
}

function stopAudioDeviceRefresh(): void {
  if (audioDeviceRefreshInterval !== null) {
    clearInterval(audioDeviceRefreshInterval);
    audioDeviceRefreshInterval = null;
  }
}
*/

/**
 * Initialize the settings tab with directory change callbacks
 */
export function initSettings(
  patchDirectoryChangedCallback?: () => Promise<void>,
  mediaDirectoryChangedCallback?: () => Promise<void>,
): void {
  onPatchDirectoryChanged = patchDirectoryChangedCallback ?? null;
  onMediaDirectoryChanged = mediaDirectoryChangedCallback ?? null;
  // Initialize DOM element references
  patchDirectoryInput = document.getElementById('settings-patch-directory') as HTMLInputElement;
  mediaDirectoryInput = document.getElementById('settings-media-directory') as HTMLInputElement;
  // audioDeviceSelect = document.getElementById('settings-audio-device') as HTMLSelectElement; // Commented out
  parameterControlSensitivityInput = document.getElementById(
    'settings-parameter-control-sensitivity',
  ) as HTMLInputElement;
  parameterControlDragLockCheckbox = document.getElementById(
    'settings-parameter-control-drag-lock',
  ) as HTMLInputElement;
  parameterControlCheckbox = document.getElementById(
    'settings-parameter-control-enabled',
  ) as HTMLInputElement;
  intellisenseEnabledCheckbox = document.getElementById(
    'settings-intellisense-enabled',
  ) as HTMLInputElement;

  browsePatchDirBtn = document.getElementById('settings-browse-patch-dir') as HTMLButtonElement;
  browseMediaDirBtn = document.getElementById('settings-browse-media-dir') as HTMLButtonElement;
  restoreDefaultsBtn = document.getElementById(
    'settings-restore-defaults-btn',
  ) as HTMLButtonElement;

  // Load initial settings from the settings service
  const currentSettings = getSettings();

  // Initialize state
  settingsState = {
    isActive: false,
    currentSettings,
  };

  // Populate form with current settings
  populateForm();

  // Set up event listeners
  setupEventListeners();
}

/**
 * Show the settings tab
 */
export function showSettings(): void {
  if (!settingsState) return;
  settingsState.isActive = true;

  // Reload settings from the settings service
  settingsState.currentSettings = getSettings();
  populateForm();

  // Start refreshing audio devices - commented out
  // startAudioDeviceRefresh();
}

/**
 * Hide the settings tab
 */
export function hideSettings(): void {
  if (!settingsState) return;

  // Stop refreshing audio devices - commented out
  // stopAudioDeviceRefresh();
  settingsState.isActive = false;
}

/**
 * Populate form with current settings
 */
function populateForm() {
  if (!settingsState) return;

  const settings = settingsState.currentSettings;
  patchDirectoryInput.value = settings.patchDirectory;
  mediaDirectoryInput.value = settings.mediaDirectory;
  // audioDeviceSelect.value = settings.audioDevice ?? ''; // Commented out
  parameterControlSensitivityInput.value = settings.parameterControl.sensitivity.toString();
  parameterControlDragLockCheckbox.checked = settings.parameterControl.mouseDragLock;
  parameterControlCheckbox.checked = settings.parameterControl.enabled;
  intellisenseEnabledCheckbox.checked = settings.intellisenseEnabled;
}

/**
 * Get settings from form
 */
function getFormSettings(): Settings {
  return {
    patchDirectory: patchDirectoryInput.value,
    mediaDirectory: mediaDirectoryInput.value,
    audioDevice: null, // audioDeviceSelect.value || null, // Commented out
    parameterControl: {
      sensitivity:
        parseInt(parameterControlSensitivityInput.value) ||
        DEFAULT_SETTINGS.PARAMETER_CONTROL_SENSITIVITY,
      mouseDragLock: parameterControlDragLockCheckbox.checked,
      enabled: parameterControlCheckbox.checked,
    },
    intellisenseEnabled: intellisenseEnabledCheckbox.checked,
  };
}

async function performSettingsSave() {
  if (!settingsState) return;
  const newSettings = getFormSettings();
  settingsState.currentSettings = await updateSettings(newSettings);
}
const debouncedSettingsSave = debounce(performSettingsSave, AUTO_SAVE_DEBOUNCE_MS);

/**
 * Auto-save settings with debouncing
 */
async function autoSaveSettings(directoryChanged?: 'patch' | 'media') {
  if (!settingsState) return;

  // For directory changes, save immediately and refresh
  if (directoryChanged) {
    const oldSettings = settingsState.currentSettings;
    const newSettings = getFormSettings();
    settingsState.currentSettings = await updateSettings(newSettings, {
      patchDirectoryChanged: directoryChanged === 'patch',
      mediaDirectoryChanged: directoryChanged === 'media',
    });

    // Refresh the appropriate explorer if directory changed
    if (directoryChanged === 'patch' && oldSettings.patchDirectory !== newSettings.patchDirectory) {
      if (onPatchDirectoryChanged) {
        await onPatchDirectoryChanged();
      }
    } else if (
      directoryChanged === 'media' &&
      oldSettings.mediaDirectory !== newSettings.mediaDirectory
    ) {
      if (onMediaDirectoryChanged) {
        await onMediaDirectoryChanged();
      }
    }
    return;
  }

  debouncedSettingsSave();
}

/**
 * Restore default settings
 */
function restoreDefaults() {
  const confirmed = confirm(
    'Are you sure you want to restore all settings to their default values?',
  );
  if (!confirmed) {
    return;
  }

  void (async () => {
    if (!settingsState) return;

    const oldSettings = settingsState.currentSettings;
    const defaults = await getDefaultSettings();

    // Restore all settings to defaults
    patchDirectoryInput.value = defaults.patchDirectory;
    mediaDirectoryInput.value = defaults.mediaDirectory;
    // audioDeviceSelect.value = defaults.audioDevice ?? ''; // Commented out
    parameterControlSensitivityInput.value = defaults.parameterControl.sensitivity.toString();
    parameterControlDragLockCheckbox.checked = defaults.parameterControl.mouseDragLock;
    parameterControlCheckbox.checked = defaults.parameterControl.enabled;
    intellisenseEnabledCheckbox.checked = defaults.intellisenseEnabled;

    // Save the restored settings
    settingsState.currentSettings = await updateSettings(defaults);

    // Refresh explorers if directories changed
    if (oldSettings.patchDirectory !== defaults.patchDirectory && onPatchDirectoryChanged) {
      await onPatchDirectoryChanged();
    }
    if (oldSettings.mediaDirectory !== defaults.mediaDirectory && onMediaDirectoryChanged) {
      await onMediaDirectoryChanged();
    }
  })();
}

/**
 * Set up event listeners for settings controls
 */
function setupEventListeners() {
  // Directory selection with current path as default
  browsePatchDirBtn.addEventListener('click', () => {
    void (async () => {
      if (!settingsState) return;
      const currentPath = patchDirectoryInput.value;
      // Only pass defaultPath if it's a non-empty string
      const selectedPath = await window.electronAPI.selectDirectory(
        'Select Patch Directory',
        currentPath && currentPath.trim() !== '' ? currentPath : undefined,
      );
      if (selectedPath) {
        patchDirectoryInput.value = selectedPath;
        await autoSaveSettings('patch');
      }
    })();
  });

  browseMediaDirBtn.addEventListener('click', () => {
    void (async () => {
      if (!settingsState) return;
      const currentPath = mediaDirectoryInput.value;
      // Only pass defaultPath if it's a non-empty string
      const selectedPath = await window.electronAPI.selectDirectory(
        'Select Media Directory',
        currentPath && currentPath.trim() !== '' ? currentPath : undefined,
      );
      if (selectedPath) {
        mediaDirectoryInput.value = selectedPath;
        await autoSaveSettings('media');
      }
    })();
  });

  // Auto-save on all input/change events
  // audioDeviceSelect.addEventListener('change', () => {
  //   void autoSaveSettings();
  // });

  parameterControlSensitivityInput.addEventListener('input', () => {
    void autoSaveSettings();
  });

  parameterControlDragLockCheckbox.addEventListener('change', () => {
    void autoSaveSettings();
  });

  parameterControlCheckbox.addEventListener('change', () => {
    void autoSaveSettings();
  });

  intellisenseEnabledCheckbox.addEventListener('change', () => {
    void autoSaveSettings();
  });

  restoreDefaultsBtn.addEventListener('click', () => {
    restoreDefaults();
    void autoSaveSettings();
  });
}
