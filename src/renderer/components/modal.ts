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
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal-content';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    overlay.remove();
  };

  modal.innerHTML = convertMarkdownToHtml(markdown);
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  document.body.appendChild(overlay);
}
