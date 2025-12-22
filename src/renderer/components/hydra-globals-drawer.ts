/* eslint-env browser */

import { getSettings, updateSettings } from '../settings-service';

import { SliderControl } from './slider-control';

import type Hydra from 'hydra-synth';

// Default values
const DEFAULTS = {
  speed: 1.0,
  audioSmooth: 0.4,
  audioScale: 0.5,
  audioCutoff: 0.5,
};

// Current state
interface HydraGlobalsState {
  speed: number;
  audioSmooth: number;
  audioScale: number;
  audioCutoff: number;
  drawerOpen: boolean;
}

const state: HydraGlobalsState = {
  speed: DEFAULTS.speed,
  audioSmooth: DEFAULTS.audioSmooth,
  audioScale: DEFAULTS.audioScale,
  audioCutoff: DEFAULTS.audioCutoff,
  drawerOpen: true,
};

// Slider control instances (prefixed with _ as they're never read after initialization)
let _speedControl: SliderControl | null = null;
let _audioSmoothControl: SliderControl | null = null;
let _audioScaleControl: SliderControl | null = null;
let _audioCutoffControl: SliderControl | null = null;

// DOM elements (initialized in init())
let drawerElement: HTMLElement | null = null;
let toggleButton: HTMLElement | null = null;
let contentElement: HTMLElement | null = null;

/**
 * Initialize the Hydra globals drawer
 */
export function initHydraGlobalsDrawer() {
  // Get DOM elements
  const drawer = document.getElementById('hydra-globals-drawer');
  const toggle = document.getElementById('hydra-globals-toggle');
  const content = document.getElementById('hydra-globals-content');

  const speedContainer = document.getElementById('hydra-speed-control');
  const audioSmoothContainer = document.getElementById('hydra-audio-smooth-control');
  const audioScaleContainer = document.getElementById('hydra-audio-scale-control');
  const audioCutoffContainer = document.getElementById('hydra-audio-cutoff-control');

  if (
    !drawer ||
    !toggle ||
    !content ||
    !speedContainer ||
    !audioSmoothContainer ||
    !audioScaleContainer ||
    !audioCutoffContainer
  ) {
    console.error('Hydra globals drawer: Required DOM elements not found');
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

  // Setup slider controls (40px widget gap)
  _speedControl = new SliderControl(speedContainer, {
    label: 'Speed',
    min: 0.1,
    max: 3.0,
    step: 0.01,
    defaultValue: DEFAULTS.speed,
    decimals: 1,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setSpeed,
  });

  _audioSmoothControl = new SliderControl(audioSmoothContainer, {
    label: 'Audio Smooth',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULTS.audioSmooth,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setAudioSmooth,
  });

  _audioScaleControl = new SliderControl(audioScaleContainer, {
    label: 'Audio Scale',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULTS.audioScale,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setAudioScale,
  });

  _audioCutoffControl = new SliderControl(audioCutoffContainer, {
    label: 'Audio Cutoff',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULTS.audioCutoff,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: setAudioCutoff,
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
    speed: state.speed, // Direct mapping [0.1..3.0] (default is 1.0)
    audioSmooth: state.audioSmooth, // Direct mapping [0..1] (default is 0.4)
    audioScale: (20 * 0.5) / state.audioScale, // Inverse transform to [10..infinity] (default is 20, Hydra scale is inverse)
    audioCutoff: 4 * state.audioCutoff, // Transform to [0..4] (default is 2)
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
 * Listener callback type for Hydra globals changes
 */
type HydraGlobalsListener = (params: {
  speed: number;
  audioSmooth: number;
  audioScale: number;
  audioCutoff: number;
}) => void;

// Registered listeners for settings changes
const listeners = new Set<HydraGlobalsListener>();

/**
 * Register a listener for Hydra globals changes
 */
export function addHydraGlobalsListener(listener: HydraGlobalsListener) {
  listeners.add(listener);
}

/**
 * Unregister a listener for Hydra globals changes
 */
export function removeHydraGlobalsListener(listener: HydraGlobalsListener) {
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
      console.error('Error in Hydra globals listener:', error);
    }
  });
}

/**
 * Set speed value
 */
export function setSpeed(value: number) {
  state.speed = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Set audio smooth value
 */
export function setAudioSmooth(value: number) {
  state.audioSmooth = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Set audio scale value
 */
export function setAudioScale(value: number) {
  state.audioScale = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Set audio cutoff value
 */
export function setAudioCutoff(value: number) {
  state.audioCutoff = value;

  // Notify listeners
  notifyListeners();

  // Send to output window
  sendParamsToOutput();
}

/**
 * Apply current Hydra globals to a Hydra instance
 */
export function applyHydraGlobals(hydra: Hydra) {
  const hydraValues = transformToHydra();
  // Set speed global variable (shared by all Hydra instances)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (window as any).speed = hydraValues.speed;
  hydra.synth.a.setSmooth(hydraValues.audioSmooth);
  hydra.synth.a.setScale(hydraValues.audioScale);
  hydra.synth.a.setCutoff(hydraValues.audioCutoff);
}

/**
 * Get current Hydra globals
 */
export function getHydraGlobals() {
  return {
    speed: state.speed,
    audioSmooth: state.audioSmooth,
    audioScale: state.audioScale,
    audioCutoff: state.audioCutoff,
  };
}
