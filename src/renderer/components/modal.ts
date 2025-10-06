/* eslint-env browser */

import { convertMarkdownToHtml } from '../utils/markdown';

/**
 * Show a documentation modal with markdown content
 *
 * Creates a modal overlay with:
 * - Markdown content converted to HTML
 * - Close button (×)
 * - Click-outside-to-close behavior
 * - Styled with modal.css classes
 *
 * @param markdown - Markdown content to display
 */
export function showDocumentationModal(markdown: string): void {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'modal-content';

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    overlay.remove();
  };

  // Convert markdown to HTML and set content
  modal.innerHTML = convertMarkdownToHtml(markdown);
  modal.appendChild(closeBtn);

  // Add modal to overlay
  overlay.appendChild(modal);

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  // Add to page
  document.body.appendChild(overlay);
}
