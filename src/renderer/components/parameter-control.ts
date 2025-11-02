/* eslint-env browser */

import { getSettings } from '../settings-service';
import { querySelector } from '../utils/dom';

// Central registry for all active parameter control widgets
let activeWidget: StandaloneParameterControl | null = null;

// Global settings for all parameter controls
let globalSensitivity: number;
let globalPointerLockEnabled: boolean;

/**
 * Dispose any currently active parameter control widget
 */
export function disposeActiveParameterControl(): void {
  if (activeWidget) {
    activeWidget.dispose();
    activeWidget = null;
  }
}

/**
 * Register a parameter control widget as the active one
 * This will automatically dispose any previously active widget
 */
export function registerParameterControl(widget: StandaloneParameterControl): void {
  disposeActiveParameterControl();
  activeWidget = widget;
}

export interface StandaloneParameterControlConfig {
  min?: number; // minimum allowed value (optional)
  max?: number; // maximum allowed value (optional)
  default?: number; // default value to restore with backspace (optional)
  onUpdate: (value: number) => void;
  onCommit: (value: number) => void;
  onCancel: () => void;
}

// Widget-specific constants (same for all widgets)
const STEP_FRACTION = 0.1;
const FINE_ADJUSTMENT_MULTIPLIER = 0.1;

// Hover delay before showing (matches Monaco's default)
export const HOVER_DELAY_MS = 300;
// Auto-hide delay after mouse leaves the widget
const HIDING_DELAY_MS = 1000;

const INSTRUCTIONS = 'Drag/Wheel/Arrow | Click/Type=edit | ⇧=fine | ⏎=accept | ⎋=cancel';
const INSTRUCTIONS_BS =
  'Drag/Wheel/Arrow | Click/Type=edit | ⇧=fine | ⌫=default | ⏎=accept | ⎋=cancel';

const DEFAULT_CONFIG: StandaloneParameterControlConfig = {
  onUpdate: () => {
    /* empty */
  },
  onCommit: () => {
    /* empty */
  },
  onCancel: () => {
    /* empty */
  },
};

/**
 * Standalone parameter control widget that can be attached to any DOM element
 */
export class StandaloneParameterControl {
  private readonly config: StandaloneParameterControlConfig;

  private domNode: HTMLElement | null = null;
  private currentValue: number;
  private isDragging = false;
  private justFinishedDragging = false;
  private startX = 0;
  private startY = 0;
  private startValue = 0;
  private currentStep: number | undefined; // Track the current step size for formatting
  private wasShiftPressed = false; // Track Shift state during drag to prevent jumping
  private clickedOnDisplay = false; // Track if mousedown was on display
  private hasMovedMouse = false; // Track if mouse has moved since mousedown
  private isInInputMode = false; // Track if we're in input mode

  private isPointerLocked = false;
  private accumulatedDeltaX = 0;
  private accumulatedDeltaY = 0;
  private rebaseOnNextMouseMove = false;

  // Auto-hide timer and mouse tracking
  private hidingTimer: ReturnType<typeof setTimeout> | null = null;
  private isMouseOver = false; // Track if mouse is currently over the widget
  private hasMouseMovedSinceShown = false; // Track if mouse has moved since widget was shown

  // Store event handlers so we can remove them
  private handleKeyDown!: (e: KeyboardEvent) => void;
  private handleClickOutside!: (e: MouseEvent) => void;
  private handlePointerLockChange!: () => void;
  private handlePointerLockError!: () => void;
  private handleFirstMouseMove!: (e: MouseEvent) => void;

  constructor(initialValue: number, config: Partial<StandaloneParameterControlConfig> = {}) {
    // Update current settings from the settings service
    const settings = getSettings();
    globalSensitivity = settings.parameterControl.sensitivity;
    globalPointerLockEnabled = settings.parameterControl.mouseDragLock;

    // Safety check - don't allow NaN or Infinite as initial value
    this.currentValue = isFinite(initialValue) ? initialValue : 0;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.createDomNode();
    this.attachEventListeners();
    this.startInitialAutoHideCheck();
  }

  private createDomNode(): void {
    const node = document.createElement('div');
    node.className = 'parameter-control-widget';

    // Display area
    const display = document.createElement('div');
    display.className = 'parameter-control-display';
    display.textContent = this.formatValue(this.currentValue);

    // Hidden input field for direct value entry
    const input = document.createElement('input');
    input.className = 'parameter-control-input';
    input.type = 'text';
    input.style.display = 'none';
    input.value = this.formatValue(this.currentValue);

    // Instructions
    const hint = document.createElement('div');
    hint.className = 'parameter-control-hint';
    const hasDefault =
      this.config.min !== undefined &&
      this.config.max !== undefined &&
      this.config.default !== undefined;
    hint.textContent = hasDefault ? INSTRUCTIONS_BS : INSTRUCTIONS;

    node.appendChild(display);
    node.appendChild(input);
    node.appendChild(hint);

    this.domNode = node;
  }

  private switchToInputMode(): void {
    if (!this.domNode) return;

    const display = querySelector<HTMLElement>(this.domNode, '.parameter-control-display');
    const input = querySelector<HTMLInputElement>(this.domNode, '.parameter-control-input');

    if (!display || !input) return;

    // Clear auto-hide timer when entering input mode
    this.clearHidingTimer();

    this.isInInputMode = true;
    display.style.display = 'none';
    input.style.display = 'block';
    input.value = this.formatValue(this.currentValue);
    input.select();
    input.focus();
  }

  private switchToDisplayMode(): void {
    if (!this.domNode) return;

    const display = querySelector<HTMLElement>(this.domNode, '.parameter-control-display');
    const input = querySelector<HTMLInputElement>(this.domNode, '.parameter-control-input');

    if (!display || !input) return;

    this.isInInputMode = false;
    display.style.display = 'block';
    input.style.display = 'none';

    // Start auto-hide timer if mouse is outside the widget
    if (!this.isMouseOver) {
      this.startHidingTimer();
    }
  }

  /**
   * Start the auto-hide timer
   */
  private startHidingTimer(): void {
    this.clearHidingTimer();
    this.hidingTimer = setTimeout(() => {
      // Auto-hide by committing the current value and disposing
      this.config.onCommit(this.currentValue);
      this.dispose();
    }, HIDING_DELAY_MS);
  }

  /**
   * Clear the auto-hide timer
   */
  private clearHidingTimer(): void {
    if (this.hidingTimer !== null) {
      clearTimeout(this.hidingTimer);
      this.hidingTimer = null;
    }
  }

  /**
   * Check if the widget has been attached to the DOM and start auto-hide timer if needed
   * This is called from the constructor to handle cases where the widget appears
   * but the mouse never enters it (e.g., Monaco content widgets and standalone widgets)
   *
   * Note: We don't start the auto-hide timer immediately. Instead, we wait for the mouse
   * to move first. This prevents the widget from auto-hiding while the user is just
   * looking at it with a stationary cursor.
   */
  private startInitialAutoHideCheck(): void {
    const checkIfAttached = () => {
      if (!this.domNode) return;

      // Check if the DOM node has been attached to the document
      if (this.domNode.isConnected) {
        // Wait a bit for mouseenter event to fire if the mouse is over the widget
        setTimeout(() => {
          // Set up a one-time mouse move handler to detect when the user moves the mouse
          this.handleFirstMouseMove = () => {
            this.hasMouseMovedSinceShown = true;
            // Remove this one-time handler
            document.removeEventListener('mousemove', this.handleFirstMouseMove);

            // If mouse is not over the widget and we're not in an interactive state, start hiding timer
            if (!this.isMouseOver && !this.isDragging && !this.isInInputMode) {
              this.startHidingTimer();
            }
          };

          document.addEventListener('mousemove', this.handleFirstMouseMove);
        }, 100);
      } else {
        // Not attached yet, check again soon
        setTimeout(checkIfAttached, 10);
      }
    };

    // Start the check after a small delay to allow initial setup
    setTimeout(checkIfAttached, 10);
  }

  private attachEventListeners(): void {
    if (!this.domNode) return;

    const display = querySelector<HTMLElement>(this.domNode, '.parameter-control-display');
    const input = querySelector<HTMLInputElement>(this.domNode, '.parameter-control-input');

    if (!display || !input) return;

    // Handle input field events
    const handleInputKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        const inputValue = input.value.trim();
        const parsedValue = parseFloat(inputValue);

        if (!isNaN(parsedValue)) {
          this.updateValue(parsedValue);
          this.config.onCommit(parsedValue);
        }

        this.switchToDisplayMode();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.switchToDisplayMode();
      }
    };

    const handleInputBlur = () => {
      this.switchToDisplayMode();
    };

    input.addEventListener('keydown', handleInputKeyDown);
    input.addEventListener('blur', handleInputBlur);

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Track if we clicked on the display
      this.clickedOnDisplay = e.target === display;
      this.hasMovedMouse = false;

      // Safety check - if currentValue is corrupted, reset to 0
      if (!isFinite(this.currentValue)) {
        this.currentValue = 0;
      }

      // Clear auto-hide timer when starting to drag
      this.clearHidingTimer();

      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startValue = this.currentValue;
      this.accumulatedDeltaX = 0;
      this.accumulatedDeltaY = 0;
      this.rebaseOnNextMouseMove = false;
      this.wasShiftPressed = e.shiftKey; // Track initial Shift state

      // Change cursor to move (direction-agnostic)
      document.body.style.cursor = 'move';

      // Attempt pointer lock for infinite drag
      if (
        globalPointerLockEnabled &&
        this.domNode &&
        typeof this.domNode.requestPointerLock === 'function'
      ) {
        try {
          void this.domNode.requestPointerLock();
        } catch {
          // Ignore - pointer lock might be blocked by the browser
        }
      }

      // Attach global listeners for dragging
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;

      // Mark that the mouse has moved
      this.hasMovedMouse = true;

      // Detect Shift state change during drag to prevent jumping
      if (e.shiftKey !== this.wasShiftPressed) {
        if (this.isPointerLocked) {
          this.accumulatedDeltaX = 0;
          this.accumulatedDeltaY = 0;
        } else {
          this.startX = e.clientX;
          this.startY = e.clientY;
        }
        // Shift state changed - recalibrate the drag baseline
        this.startValue = this.currentValue;
        this.wasShiftPressed = e.shiftKey;
      }

      if (!this.isPointerLocked && this.rebaseOnNextMouseMove) {
        // Pointer lock was released (ESC or focus change). Reset baseline smoothly.
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startValue = this.currentValue;
        this.rebaseOnNextMouseMove = false;
      }

      let deltaX: number;
      let deltaY: number;
      if (this.isPointerLocked) {
        this.accumulatedDeltaX += e.movementX;
        this.accumulatedDeltaY += e.movementY;
        deltaX = this.accumulatedDeltaX;
        deltaY = this.accumulatedDeltaY;
      } else {
        deltaX = e.clientX - this.startX;
        deltaY = e.clientY - this.startY;
      }

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Determine direction: positive if moving right/down, negative if left/up
      const direction = (Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY) >= 0 ? 1 : -1;
      const signedDistance = distance * direction;

      // Calculate step based on power-of-10 range of the START value
      const step = this.calculatePowerOf10Step(this.startValue);

      // Apply modifier keys (only shift for fine adjustment)
      let effectiveStep = step;
      if (e.shiftKey) {
        effectiveStep *= FINE_ADJUSTMENT_MULTIPLIER;
      }

      // Sensitivity controls how many pixels = one step
      // Calculate raw change based on pixel distance and sensitivity
      const pixelSteps = signedDistance / globalSensitivity;
      const rawValue = this.startValue + pixelSteps * effectiveStep;

      // Round to the step size - this snaps to discrete values
      this.updateValue(rawValue, effectiveStep);
    };

    const handleMouseUp = (_e: MouseEvent) => {
      if (!this.isDragging) return;

      // If we clicked on the display without moving, enter edit mode
      if (this.clickedOnDisplay && !this.hasMovedMouse) {
        this.isDragging = false;
        this.clickedOnDisplay = false;
        this.hasMovedMouse = false;
        document.body.style.cursor = '';

        if (document.pointerLockElement === this.domNode) {
          document.exitPointerLock();
        }

        // Cleanup drag-specific listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // Switch to input mode instead of committing
        this.switchToInputMode();
        return;
      }

      this.isDragging = false;
      this.clickedOnDisplay = false;
      this.hasMovedMouse = false;
      this.accumulatedDeltaX = 0;
      this.accumulatedDeltaY = 0;
      this.justFinishedDragging = true;
      document.body.style.cursor = '';

      if (document.pointerLockElement === this.domNode) {
        document.exitPointerLock();
      }

      // Cleanup drag-specific listeners but keep widget active
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Trigger compilation after drag
      this.config.onCommit(this.currentValue);

      // Reset the flag after a short delay to prevent click-outside from closing
      setTimeout(() => {
        this.justFinishedDragging = false;
      }, 100);

      // Start auto-hide timer if mouse is outside the widget
      if (!this.isMouseOver) {
        this.startHidingTimer();
      }

      // Widget stays open - user can use arrow keys or wheel
      // Will close on ESC or click outside
    };

    const cleanup = () => {
      this.clearHidingTimer();
      this.isDragging = false;
      this.justFinishedDragging = false;
      document.body.style.cursor = '';
      if (document.pointerLockElement === this.domNode) {
        document.exitPointerLock();
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', this.handleKeyDown, true);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('click', this.handleClickOutside, true);
      document.removeEventListener('mousemove', this.handleFirstMouseMove);
    };

    this.handlePointerLockChange = () => {
      this.isPointerLocked = false;
    };

    this.handlePointerLockError = () => {
      this.isPointerLocked = false;
    };

    if (globalPointerLockEnabled) {
      this.handlePointerLockChange = () => {
        const lockedElement = document.pointerLockElement;
        const wasLocked = this.isPointerLocked;
        this.isPointerLocked = lockedElement === this.domNode;

        if (!this.isPointerLocked && wasLocked) {
          // Pointer lock was released (e.g., ESC). Reset accumulated deltas.
          this.accumulatedDeltaX = 0;
          this.accumulatedDeltaY = 0;
          this.rebaseOnNextMouseMove = true;
        }
      };

      this.handlePointerLockError = () => {
        this.isPointerLocked = false;
        this.accumulatedDeltaX = 0;
        this.accumulatedDeltaY = 0;
        this.rebaseOnNextMouseMove = false;
      };

      document.addEventListener('pointerlockchange', this.handlePointerLockChange, false);
      document.addEventListener('pointerlockerror', this.handlePointerLockError, false);
    }

    this.handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys when in input mode - let the input field handle them
      if (this.isInInputMode) {
        return;
      }

      // ESC to cancel and restore original value
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        cleanup();
        this.config.onCancel();
        this.dispose();
        return;
      }

      // Enter to accept and close
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        cleanup();
        this.config.onCommit(this.currentValue);
        this.dispose();
        return;
      }

      // Backspace to restore default (only if min/max/default are provided)
      if (e.key === 'Backspace') {
        if (
          this.config.min !== undefined &&
          this.config.max !== undefined &&
          this.config.default !== undefined
        ) {
          e.preventDefault();
          e.stopPropagation();

          this.updateValue(this.config.default);
          this.config.onUpdate(this.config.default);
        }
        return;
      }

      // Number keys or minus sign - switch to input mode and start typing
      if (/^[0-9\-.]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        this.switchToInputMode();

        // Clear the input and set it to just the typed character
        if (this.domNode) {
          const inputElement = querySelector<HTMLInputElement>(
            this.domNode,
            '.parameter-control-input',
          );
          if (inputElement) {
            inputElement.value = e.key;
            // Move cursor to end
            inputElement.setSelectionRange(1, 1);
          }
        }
        return;
      }

      // Arrow keys to adjust value
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Reset auto-hide timer on keyboard interaction
        if (!this.isMouseOver) {
          this.startHidingTimer();
        }

        // Safety check - if currentValue is corrupted, reset to 0
        if (!isFinite(this.currentValue)) {
          this.currentValue = 0;
        }

        const step = this.calculatePowerOf10Step(this.currentValue);

        // Apply shift modifier for fine adjustment
        const effectiveStep = e.shiftKey ? step * FINE_ADJUSTMENT_MULTIPLIER : step;

        // Up/Right = increase, Down/Left = decrease
        const direction = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1;

        const newValue = this.currentValue + direction * effectiveStep;
        this.updateValue(newValue, effectiveStep);
      }
    };

    this.handleClickOutside = (e: MouseEvent) => {
      // Don't close if we just finished dragging (mouse was released outside)
      if (this.justFinishedDragging) {
        return;
      }

      if (this.domNode && !this.domNode.contains(e.target as Node)) {
        cleanup();
        this.config.onCommit(this.currentValue);
        this.dispose();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Reset auto-hide timer on wheel interaction
      if (!this.isMouseOver) {
        this.startHidingTimer();
      }

      // Safety check - if currentValue is corrupted, reset to 0
      if (!isFinite(this.currentValue)) {
        this.currentValue = 0;
      }

      const step = this.calculatePowerOf10Step(this.currentValue);

      // Apply shift modifier for fine adjustment
      const effectiveStep = e.shiftKey ? step * FINE_ADJUSTMENT_MULTIPLIER : step;

      // Handle different scroll types
      let direction = 0;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.shiftKey) {
        // deltaX dominant + Shift = Shift+wheel converted to horizontal
        direction = e.deltaX > 0 ? 1 : -1;
      } else if (e.deltaX === 0) {
        direction = e.deltaY > 0 ? 1 : -1;
      }

      const newValue = this.currentValue + direction * effectiveStep;
      this.updateValue(newValue, effectiveStep);
    };

    this.domNode.addEventListener('mousedown', handleMouseDown);
    this.domNode.addEventListener('wheel', handleWheel, { passive: false });

    // Mouse enter/leave for auto-hide behavior
    this.domNode.addEventListener('mouseenter', () => {
      this.isMouseOver = true;
      this.clearHidingTimer();
    });

    this.domNode.addEventListener('mouseleave', () => {
      this.isMouseOver = false;
      // Don't auto-hide if we're dragging or in input mode
      if (!this.isDragging && !this.isInInputMode) {
        this.startHidingTimer();
      }
    });

    // Attach keyboard handler globally so arrow keys work even when Monaco has focus
    document.addEventListener('keydown', this.handleKeyDown, true);

    // Add click-outside listener with delay to avoid catching the click that created the widget
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutside, true);
    }, 100);
  }

  /**
   * Calculate step size based on power-of-10 range
   * E.g., for value 1.5 in range [1, 10), step = 0.01 (with stepFraction = 1/100)
   */
  private calculatePowerOf10Step(value: number): number {
    // Safety check - if value is invalid, return a sensible default
    if (!isFinite(value)) {
      return STEP_FRACTION;
    }

    const absValue = Math.abs(value);

    // Handle zero specially
    if (absValue === 0) {
      return STEP_FRACTION; // Use fraction directly for zero
    }

    // Find the power of 10 range: 10^n <= absValue < 10^(n+1)
    const powerOf10 = Math.floor(Math.log10(absValue));
    const rangeSize = Math.pow(10, powerOf10);

    // Step is a fraction of the range size
    const step = rangeSize * STEP_FRACTION;

    // Safety check on the result
    return isFinite(step) && step > 0 ? step : STEP_FRACTION;
  }

  /**
   * Round value to a clean step increment within its power-of-10 range
   * Uses proper decimal precision to avoid floating point errors
   */
  private roundToStep(value: number, step?: number): number {
    const actualStep = step ?? this.calculatePowerOf10Step(value);

    // Safety check for invalid step values
    if (!isFinite(actualStep) || actualStep <= 0) {
      return value;
    }

    // Calculate decimal places based on step size
    const decimalPlaces = Math.max(0, Math.min(10, -Math.floor(Math.log10(actualStep))));

    // Round to step, then round to decimal places to eliminate floating point errors
    const rounded = Math.round(value / actualStep) * actualStep;
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(rounded * multiplier) / multiplier;
  }

  private updateValue(value: number, step?: number): void {
    // Safety check - don't update if value is NaN or infinite
    if (!isFinite(value)) {
      return;
    }

    // Round to clean step increments (but skip rounding if step is not provided - for manual input)
    const newValue = step !== undefined ? this.roundToStep(value, step) : value;

    // Double-check the rounded value is valid
    if (!isFinite(newValue)) {
      return;
    }

    this.currentValue = newValue;
    this.currentStep = step; // Track the step for formatting

    if (this.domNode) {
      const display = querySelector<HTMLElement>(this.domNode, '.parameter-control-display');
      if (display) {
        display.textContent = this.formatValue(this.currentValue);
      }

      // Also update input if it exists
      const input = querySelector<HTMLInputElement>(this.domNode, '.parameter-control-input');
      if (input) {
        input.value = this.formatValue(this.currentValue);
      }
    }

    this.config.onUpdate(this.currentValue);
  }

  private formatValue(value: number): string {
    // If we have a currentStep (from an active adjustment), format to that precision
    if (this.currentStep !== undefined) {
      // Safety check for invalid step values
      if (!isFinite(this.currentStep) || this.currentStep <= 0) {
        return value.toString();
      }

      const decimalPlaces = Math.max(0, Math.min(10, -Math.floor(Math.log10(this.currentStep))));
      return value.toFixed(decimalPlaces);
    }

    // For initial/unadjusted values, preserve the original precision
    // by using toString() which doesn't round
    return value.toString();
  }

  /**
   * Get the DOM node for this widget
   */
  getDomNode(): HTMLElement | null {
    return this.domNode;
  }

  /**
   * Get the current value
   */
  getValue(): number {
    return this.currentValue;
  }

  /**
   * Attach the widget to a parent element at a specific position
   */
  attachTo(parent: HTMLElement, x: number, y: number): void {
    if (!this.domNode) return;

    this.domNode.style.position = 'absolute';
    this.domNode.style.left = `${String(x)}px`;
    this.domNode.style.top = `${String(y)}px`;
    this.domNode.style.zIndex = '1000';

    parent.appendChild(this.domNode);

    // Auto-hide timer will be started by startInitialAutoHideCheck()
    // which is called from the constructor
  }

  /**
   * Clean up and remove the widget
   */
  dispose(): void {
    // Clear auto-hide timer
    this.clearHidingTimer();

    // Clean up all event listeners first
    this.isDragging = false;
    this.justFinishedDragging = false;
    document.body.style.cursor = '';

    // Remove global event listeners
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('click', this.handleClickOutside, true);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange, false);
    document.removeEventListener('pointerlockerror', this.handlePointerLockError, false);
    document.removeEventListener('mousemove', this.handleFirstMouseMove);

    if (document.pointerLockElement === this.domNode) {
      document.exitPointerLock();
    }

    if (this.domNode) {
      this.domNode.remove();
    }

    // Clear from central registry if this is the active widget
    if (activeWidget === this) {
      activeWidget = null;
    }
  }
}
