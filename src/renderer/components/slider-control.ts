/* eslint-env browser */

import { debounce } from '../../shared/debounce';
import { getSettings } from '../settings-service';

import { StandaloneParameterControl, registerParameterControl } from './parameter-control';

/**
 * Options for configuring a slider control
 */
export interface SliderControlOptions {
  /** Display name for the slider */
  label: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Default value (used for initialization and parameter control reset) */
  defaultValue: number;
  /** Number of decimal places to show in label (auto-calculated if omitted) */
  decimals?: number;
  /** Container element for attaching parameter control widget (defaults to container element) */
  attachmentContainer?: HTMLElement;
  /** Gap above parameter control widget in pixels (default: 8) */
  widgetGap?: number;
  /** Called when slider value changes */
  onUpdate: (value: number) => void;
  /** Called when parameter control commits a value */
  onCommit?: (value: number) => void;
  /** Called when parameter control is cancelled */
  onCancel?: (value: number) => void;
}

/**
 * Parameter control hover delay
 */
const HOVER_DELAY_MS = 800;

/**
 * Reusable slider control component that combines:
 * - A label showing current value
 * - A range input slider
 * - Parameter control widget on hover
 */
export class SliderControl {
  private container: HTMLElement;
  private attachmentContainer: HTMLElement;
  private labelElement: HTMLElement;
  private sliderElement: HTMLInputElement;
  private options: SliderControlOptions;
  private currentValue: number;
  private decimals: number;
  private debouncedShowWidget: (() => void) & { cancel: () => void };
  private static instanceCounter = 0;

  constructor(container: HTMLElement, options: SliderControlOptions) {
    this.container = container;
    this.attachmentContainer = options.attachmentContainer ?? container;
    this.options = options;
    this.currentValue = options.defaultValue;

    // Calculate decimals if not provided
    this.decimals = options.decimals ?? this.calculateDecimals(options.step);

    // Create DOM elements
    const { labelElement, sliderElement } = this.createDomElements();
    this.labelElement = labelElement;
    this.sliderElement = sliderElement;

    // Initialize label
    this.updateLabel(options.defaultValue);

    // Setup slider input handler
    this.sliderElement.addEventListener('input', this.handleSliderInput);

    // Setup parameter control hover
    this.debouncedShowWidget = debounce(this.showWidget, HOVER_DELAY_MS);
    this.labelElement.addEventListener('mouseenter', this.handleMouseEnter);
    this.labelElement.addEventListener('mouseleave', this.handleMouseLeave);
  }

  /**
   * Create and append DOM elements to container
   */
  private createDomElements(): { labelElement: HTMLElement; sliderElement: HTMLInputElement } {
    // Generate unique IDs for accessibility
    const uniqueId = `slider-control-${String(SliderControl.instanceCounter++)}`;

    // Add container class
    this.container.classList.add('slider-control-container');

    // Create label
    const labelElement = document.createElement('label');
    labelElement.className = 'slider-control-label';
    labelElement.htmlFor = uniqueId;

    // Create slider
    const sliderElement = document.createElement('input');
    sliderElement.type = 'range';
    sliderElement.id = uniqueId;
    sliderElement.className = 'slider-control-slider';
    sliderElement.min = String(this.options.min);
    sliderElement.max = String(this.options.max);
    sliderElement.step = String(this.options.step);
    sliderElement.value = String(this.options.defaultValue);

    // Append to container
    this.container.appendChild(labelElement);
    this.container.appendChild(sliderElement);

    return { labelElement, sliderElement };
  }

  /**
   * Calculate appropriate number of decimals based on step size
   */
  private calculateDecimals(step: number): number {
    const stepStr = String(step);
    const decimalIndex = stepStr.indexOf('.');
    if (decimalIndex === -1) return 0;
    return stepStr.length - decimalIndex - 1;
  }

  /**
   * Update label with current value
   */
  private updateLabel(value: number): void {
    this.labelElement.textContent = `${this.options.label}: ${value.toFixed(this.decimals)}`;
  }

  /**
   * Check if value is out of range and update slider styling
   */
  private checkOutOfRange(value: number): void {
    if (value < this.options.min || value > this.options.max) {
      this.sliderElement.classList.add('out-of-range');
      // Clamp slider position
      if (value < this.options.min) {
        this.sliderElement.value = String(this.options.min);
      } else {
        this.sliderElement.value = String(this.options.max);
      }
    } else {
      this.sliderElement.classList.remove('out-of-range');
      this.sliderElement.value = String(value);
    }
  }

  /**
   * Handle slider input event
   */
  private handleSliderInput = (): void => {
    const value = parseFloat(this.sliderElement.value);
    this.currentValue = value;
    this.updateLabel(value);
    this.checkOutOfRange(value);
    this.options.onUpdate(value);
  };

  /**
   * Handle mouse enter on label
   */
  private handleMouseEnter = (): void => {
    this.debouncedShowWidget();
  };

  /**
   * Handle mouse leave on label
   */
  private handleMouseLeave = (): void => {
    this.debouncedShowWidget.cancel();
  };

  /**
   * Show parameter control widget
   */
  private showWidget = (): void => {
    const settings = getSettings();
    if (!settings.parameterControl.enabled) return;

    const widget = new StandaloneParameterControl(this.currentValue, {
      min: this.options.min,
      max: this.options.max,
      default: this.options.defaultValue,
      onUpdate: (value: number) => {
        // Real-time update while dragging
        this.setValue(value);
        this.options.onUpdate(value);
      },
      onCommit: (value: number) => {
        // Final value on commit
        this.setValue(value);
        this.options.onUpdate(value);
        this.options.onCommit?.(value);
      },
      onCancel: () => {
        // Restore previous value
        this.setValue(this.currentValue);
        this.options.onUpdate(this.currentValue);
        this.options.onCancel?.(this.currentValue);
      },
    });

    // Position widget just above the label
    const rect = this.labelElement.getBoundingClientRect();
    const tempY = rect.top - 100; // Temporary position
    widget.attachTo(this.attachmentContainer, rect.left, tempY);

    // Get actual widget height and reposition
    const widgetNode = widget.getDomNode();
    if (widgetNode) {
      const widgetHeight = widgetNode.offsetHeight;
      const gap = this.options.widgetGap ?? 8;
      const finalY = rect.top - widgetHeight - gap;
      widget.attachTo(this.attachmentContainer, rect.left, finalY);
    }

    // Register (auto-disposes previous widget)
    registerParameterControl(widget);
  };

  /**
   * Get current value
   */
  getValue(): number {
    return this.currentValue;
  }

  /**
   * Set value programmatically
   */
  setValue(value: number): void {
    this.currentValue = value;
    this.updateLabel(value);
    this.checkOutOfRange(value);
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this.sliderElement.removeEventListener('input', this.handleSliderInput);
    this.labelElement.removeEventListener('mouseenter', this.handleMouseEnter);
    this.labelElement.removeEventListener('mouseleave', this.handleMouseLeave);
    this.debouncedShowWidget.cancel();
  }
}
