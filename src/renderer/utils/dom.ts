/* eslint-env browser */

/**
 * DOM utilities
 */

export function requireElementById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id "${id}" not found`);
  }
  return element;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function querySelector<T extends Element>(parent: Element, selector: string): T | null {
  return parent.querySelector(selector);
}
