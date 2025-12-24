import { getSettings, updateSettings } from '../settings-service';

import { SliderControl } from './slider-control';

// Default values in UI scale (0-1 range for sliders)
const UI_DEFAULTS = {
  speed: 1.0,
  audioSmooth: 0.4,
  audioScale: 0.5,
  audioCutoff: 0.5,
};

/**
 * Transform UI slider value to Hydra scale for audioScale
 * UI: 0-1 → Hydra: 10-infinity (inverse relationship)
 */
function uiToHydraScale(uiValue: number): number {
  return (20 * 0.5) / uiValue;
}

/**
 * Transform UI slider value to Hydra scale for audioCutoff
 * UI: 0-1 → Hydra: 0-4
 */
function uiToHydraCutoff(uiValue: number): number {
  return 4 * uiValue;
}

// Callbacks for value changes
interface HydraGlobalsCallbacks {
  onSpeedChange: (value: number) => void;
  onAudioSmoothChange: (value: number) => void;
  onAudioScaleChange: (value: number) => void;
  onAudioCutoffChange: (value: number) => void;
}

// UI state (only drawer open/closed state)
interface DrawerUIState {
  drawerOpen: boolean;
}

const uiState: DrawerUIState = {
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
export function initHydraGlobalsDrawer(callbacks: HydraGlobalsCallbacks) {
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
    uiState.drawerOpen = settings.audioDrawerOpen;
    if (!uiState.drawerOpen) {
      drawerElement.classList.add('collapsed');
    }
  }

  // Setup toggle
  toggleButton.addEventListener('click', toggleDrawer);

  // Setup slider controls (40px widget gap)
  // Note: Sliders use UI scale, callbacks transform to Hydra scale
  _speedControl = new SliderControl(speedContainer, {
    label: 'Speed',
    min: 0.0,
    max: 10.0,
    step: 0.01,
    defaultValue: UI_DEFAULTS.speed,
    decimals: 1,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: callbacks.onSpeedChange, // Speed is 1:1, no transformation needed
  });

  _audioSmoothControl = new SliderControl(audioSmoothContainer, {
    label: 'Audio Smooth',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: UI_DEFAULTS.audioSmooth,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: callbacks.onAudioSmoothChange, // Audio smooth is 1:1, no transformation needed
  });

  _audioScaleControl = new SliderControl(audioScaleContainer, {
    label: 'Audio Scale',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: UI_DEFAULTS.audioScale,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: (uiValue: number) => {
      callbacks.onAudioScaleChange(uiToHydraScale(uiValue));
    },
  });

  _audioCutoffControl = new SliderControl(audioCutoffContainer, {
    label: 'Audio Cutoff',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: UI_DEFAULTS.audioCutoff,
    decimals: 2,
    attachmentContainer: contentElement,
    widgetGap: 40,
    onUpdate: (uiValue: number) => {
      callbacks.onAudioCutoffChange(uiToHydraCutoff(uiValue));
    },
  });
}

/**
 * Toggle drawer open/closed
 */
function toggleDrawer() {
  if (!drawerElement) return;

  uiState.drawerOpen = !uiState.drawerOpen;
  drawerElement.classList.toggle('collapsed');

  // Save state to settings
  const currentSettings = getSettings();
  void updateSettings({ ...currentSettings, audioDrawerOpen: uiState.drawerOpen });
}
