/* eslint-env browser */

import { debounce } from '../../shared/debounce';

/**
 * Custom tooltip system for reliable tooltip display in Electron
 *
 * Native browser tooltips (title attribute) can be unreliable in Electron,
 * especially when elements have event handlers or are frequently updated.
 * This custom implementation ensures tooltips always appear consistently.
 */

const TOOLTIP_DELAY_MS = 500; // Delay before showing tooltip
const TOOLTIP_OFFSET_X = 10; // Offset from cursor
const TOOLTIP_OFFSET_Y = 10;

let tooltipElement: HTMLDivElement | null = null;
let currentTarget: HTMLElement | null = null;

const debouncedShowTooltip = debounce((text: string, x: number, y: number) => {
  showTooltip(text, x, y);
}, TOOLTIP_DELAY_MS);

/**
 * Initialize the tooltip system
 * Call this once when the page loads
 */
export function initTooltips(root: Document | HTMLElement = document): void {
  // Create the tooltip element if it doesn't exist
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'custom-tooltip';
    document.body.appendChild(tooltipElement);
  }

  // Set up event listeners for all elements with title or data-tooltip
  root.addEventListener('mouseover', handleMouseOver as EventListener, true);
  root.addEventListener('mouseout', handleMouseOut as EventListener, true);
}

/**
 * Clean up tooltip system
 */
export function cleanupTooltips(): void {
  if (tooltipElement) {
    hideTooltip();
    tooltipElement.remove();
    tooltipElement = null;
  }

  document.removeEventListener('mouseover', handleMouseOver as EventListener, true);
  document.removeEventListener('mouseout', handleMouseOut as EventListener, true);
}

function handleMouseOver(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  // Find closest element with title or data-tooltip
  const element = event.target.closest('[title], [data-tooltip]');

  if (!element || !(element instanceof HTMLElement)) return;

  const tooltipTarget = element;

  // Don't show tooltip if element is disabled
  if (tooltipTarget.hasAttribute('disabled')) return;

  currentTarget = tooltipTarget;

  // Get tooltip text from title or data-tooltip attribute
  const tooltipText =
    tooltipTarget.getAttribute('data-tooltip') ?? tooltipTarget.getAttribute('title');

  if (!tooltipText) return;

  // If using title attribute, move it to data-tooltip to prevent browser tooltip
  if (tooltipTarget.hasAttribute('title')) {
    tooltipTarget.setAttribute('data-tooltip', tooltipText);
    tooltipTarget.removeAttribute('title');
  }

  // Show tooltip after delay (debounced)
  debouncedShowTooltip(tooltipText, event.clientX, event.clientY);
}

function handleMouseOut(event: MouseEvent): void {
  const relatedTarget = event.relatedTarget as HTMLElement | null;

  // Check if we're leaving the current tooltip target
  if (currentTarget && !currentTarget.contains(relatedTarget)) {
    hideTooltip();
    currentTarget = null;
  }
}

function showTooltip(text: string, x: number, y: number): void {
  if (!tooltipElement) return;

  tooltipElement.textContent = text;
  updateTooltipPosition(x, y);

  // Force reflow before adding show class for transition
  void tooltipElement.offsetHeight;
  tooltipElement.classList.add('show');
}

function hideTooltip(): void {
  // Cancel any pending tooltip show
  debouncedShowTooltip.cancel();

  if (tooltipElement) {
    tooltipElement.classList.remove('show');
  }
}

function updateTooltipPosition(x: number, y: number): void {
  if (!tooltipElement) return;

  // Calculate position with offset
  let left = x + TOOLTIP_OFFSET_X;
  let top = y + TOOLTIP_OFFSET_Y;

  // Get tooltip dimensions
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Adjust horizontal position if tooltip would go off screen
  if (left + tooltipRect.width > viewportWidth) {
    left = x - tooltipRect.width - TOOLTIP_OFFSET_X;
  }

  // Adjust vertical position if tooltip would go off screen
  if (top + tooltipRect.height > viewportHeight) {
    top = y - tooltipRect.height - TOOLTIP_OFFSET_Y;
  }

  // Ensure tooltip doesn't go off the left or top edges
  left = Math.max(4, left);
  top = Math.max(4, top);

  tooltipElement.style.left = `${String(left)}px`;
  tooltipElement.style.top = `${String(top)}px`;
}

/**
 * Manually trigger tooltip update for dynamically added elements
 * Call this after adding new elements with tooltips to the DOM
 */
export function refreshTooltips(): void {
  // Convert all remaining title attributes to data-tooltip
  const elementsWithTitle = document.querySelectorAll('[title]');
  elementsWithTitle.forEach((el) => {
    const title = el.getAttribute('title');
    if (title) {
      el.setAttribute('data-tooltip', title);
      el.removeAttribute('title');
    }
  });
}
