/* eslint-env browser */

/**
 * Editor state management utilities
 * Handles status updates and dirty state indicators
 */

/**
 * Interface for editor state that can be managed by these utilities
 */
export interface EditorStateData {
  statusElement: HTMLElement;
  loadedFile: string | null;
  isDirty: boolean;
  originalContent: string;
}

/**
 * Updates the status element with a message and optional error styling
 * @param state - The editor state containing the status element
 * @param status - The status message to display
 * @param isError - Whether to style the status as an error (default: false)
 * @param tooltip - Optional tooltip text to show on hover (typically for error details)
 */
export function updateStatus(
  state: EditorStateData,
  status: string,
  isError = false,
  tooltip?: string,
): void {
  state.statusElement.textContent = status;
  state.statusElement.style.color = isError ? '#f48771' : '#858585';

  // Set or clear tooltip using native title attribute
  if (tooltip) {
    state.statusElement.setAttribute('title', tooltip);
  } else {
    state.statusElement.removeAttribute('title');
  }
}

/**
 * Updates the dirty indicator (dot) in the slot/editor title
 * @param state - The editor state
 * @param titleSelector - CSS selector for the title element to update
 * @param titleBase - The base title text (e.g., "Compose", "Slot A")
 */
export function updateDirtyIndicator(
  state: EditorStateData,
  titleSelector: string,
  titleBase: string,
): void {
  const slotTitle = document.querySelector(titleSelector);
  if (slotTitle) {
    if (state.isDirty) {
      slotTitle.textContent = `${titleBase} •`;
    } else {
      slotTitle.textContent = titleBase;
    }
  }
}

/**
 * Checks if the current content differs from the original and updates dirty state
 * @param state - The editor state
 * @param currentContent - The current content to check
 * @param titleSelector - CSS selector for the title element
 * @param titleBase - The base title text
 * @returns Whether the dirty state changed
 */
export function checkDirty(
  state: EditorStateData,
  currentContent: string,
  titleSelector: string,
  titleBase: string,
): boolean {
  const wasDirty = state.isDirty;
  state.isDirty = currentContent !== state.originalContent;

  if (wasDirty !== state.isDirty) {
    updateDirtyIndicator(state, titleSelector, titleBase);
    return true;
  }
  return false;
}
