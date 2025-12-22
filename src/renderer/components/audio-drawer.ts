/* eslint-env browser */

import { getSettings, updateSettings } from '../settings-service';

import { SliderControl } from './slider-control';

import type Hydra from 'hydra-synth';

// Default values (for sliders in 0-1 range)
const DEFAULTS = {
  smooth: 0.4,
  scale: 0.5,
  cutoff: 0.5,
};

// Current state (stores slider values 0-1)
interface AudioSettingsState {
  smooth: number;
  scale: number;
  cutoff: number;
  drawerOpen: boolean;
}

const state: AudioSettingsState = {
  smooth: DEFAULTS.smooth,
  scale: DEFAULTS.scale,
  cutoff: DEFAULTS.cutoff,
  drawerOpen: true,
};

// Slider control instances (prefixed with _ as they're never read after initialization)
let _smoothControl: SliderControl | null = null;
let _scaleControl: SliderControl | null = null;
let _cutoffControl: SliderControl | null = null;

// DOM elements (initialized in init())
let drawerElement: HTMLElement | null = null;
let toggleButton: HTMLElement | null = null;
let contentElement: HTMLElement | null = null;

/**
 * Initialize the audio drawer
 */
export function initAudioDrawer() {
  // Get DOM elements
  const drawer = document.getElementById('audio-settings-drawer');
  const toggle = document.getElementById('audio-settings-toggle');
  const content = document.getElementById('audio-settings-content');

  const smoothContainer = document.getElementById('audio-smooth-control');
  const scaleContainer = document.getElementById('audio-scale-control');
  const cutoffContainer = document.getElementById('audio-cutoff-control');

  if (!drawer || !toggle || !content || !smoothContainer || !scaleContainer || !cutoffContainer) {
    console.error('Audio settings drawer: Required DOM elements not found');
    return;
  }

  drawerElement = drawer;
  toggleButton = toggle;
  contentElement = content;

  // Load drawer state from settings
  const settings = getSettings();
  if (settings.audioDrawerOpen !== undefined) {
    state.drawerOpen = settings.audioDrawerOpen;
    if (!state.drawerOpen) {
      drawerElement.classList.add('collapsed');
    }
  }

  // Setup toggle
  toggleButton.addEventListener('click', toggleDrawer);

  // Setup slider controls (all 0-1 range, 40px widget gap)
  _smoothControl = new SliderControl(smoothContainer, {
    label: 'Smooth',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULTS.smooth,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setSmooth,
  });

  _scaleControl = new SliderControl(scaleContainer, {
    label: 'Scale',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULTS.scale,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setScale,
  });

  _cutoffControl = new SliderControl(cutoffContainer, {
    label: 'Cutoff',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULTS.cutoff,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setCutoff,
  });
}

/**
 * Toggle drawer open/closed
 */
function toggleDrawer() {
  if (!drawerElement) return;

  state.drawerOpen = !state.drawerOpen;
  drawerElement.classList.toggle('collapsed');

  // Save state to settings
  const currentSettings = getSettings();
  void updateSettings({ ...currentSettings, audioDrawerOpen: state.drawerOpen });
}

/**
 * Transform slider values to Hydra values
 */
function transformToHydra() {
  return {
    smooth: state.smooth, // Direct mapping [0..1] (default is 0.4)
    scale: (20 * 0.5) / state.scale, // Inverse transform to [10..infinity] (default is 20, Hydra scale is inverse)
    cutoff: 4 * state.cutoff, // Transform to [0..4] (default is 2)
  };
}

/**
 * Send current parameters to output window
 */
function sendParamsToOutput() {
  const hydraValues = transformToHydra();
  window.electronAPI.setHydraGlobals(hydraValues);
}

/**
 * Listener callback type for audio drawer changes
 */
type AudioDrawerListener = (params: { smooth: number; scale: number; cutoff: number }) => void;

// Registered listeners for settings changes
const listeners = new Set<AudioDrawerListener>();

/**
 * Register a listener for audio drawer changes
 */
export function addAudioDrawerListener(listener: AudioDrawerListener) {
  listeners.add(listener);
}

/**
 * Unregister a listener for audio drawer changes
 */
export function removeAudioDrawerListener(listener: AudioDrawerListener) {
  listeners.delete(listener);
}

/**
 * Notify all registered listeners of settings changes
 */
function notifyListeners() {
  const hydraValues = transformToHydra();
  listeners.forEach((listener) => {
    try {
      listener(hydraValues);
    } catch (error) {
      console.error('Error in audio settings listener:', error);
    }
  });
}

/**
 * Set smooth value
 */
export function setSmooth(value: number) {
  state.smooth = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Set scale value
 */
export function setScale(value: number) {
  state.scale = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Set cutoff value
 */
export function setCutoff(value: number) {
  state.cutoff = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Apply current settings to a Hydra instance (called when composer initializes)
 */
export function applyToHydraInstance(hydra: Hydra) {
  const hydraValues = transformToHydra();
  hydra.synth.a.setSmooth(hydraValues.smooth);
  hydra.synth.a.setScale(hydraValues.scale);
  hydra.synth.a.setCutoff(hydraValues.cutoff);
}

/**
 * Get current audio settings
 */
export function getAudioSettings() {
  return {
    smooth: state.smooth,
    scale: state.scale,
    cutoff: state.cutoff,
  };
}
