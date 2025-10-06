// Cross-platform shortcut formatting utility
// Usage: formatShortcut('Cmd+Enter') -> 'Ctrl+Enter' on Windows/Linux, 'Cmd+Enter' on macOS

// Platform detection: prefer userAgentData if available; fallback to userAgent
interface UADataLike {
  platform?: string;
}
const isMac = ((): boolean => {
  const uaDataLike = (navigator as unknown as { userAgentData?: UADataLike }).userAgentData;
  let platform: string | undefined;
  if (typeof uaDataLike?.platform === 'string') {
    platform = uaDataLike.platform.toLowerCase();
  }
  if (platform?.includes('mac')) {
    return true;
  }
  return navigator.userAgent.toLowerCase().includes('mac');
})();

export function formatShortcut(raw: string): string {
  // Replace primary modifier tokens
  let s = raw.replace(/Cmd\+/gi, isMac ? 'Cmd+' : 'Ctrl+');
  // Optional: future replacements (Option -> Alt, etc.)
  s = s.replace(/Option\+/gi, isMac ? 'Option+' : 'Alt+');
  return s;
}

// Apply formatting to all elements with data-shortcut attribute (tooltip text)
export function applyShortcutTooltips(root: ParentNode = document): void {
  const elements = root.querySelectorAll('[data-shortcut]');
  elements.forEach((el) => {
    const raw = el.getAttribute('data-shortcut');
    if (!raw) return;
    const formatted = formatShortcut(raw);
    const prevTitle = el.getAttribute('title') ?? '';
    // If already appended, skip
    if (prevTitle.includes(formatted)) return;
    const separator = prevTitle.length > 0 ? ' ' : '';
    el.setAttribute('title', `${prevTitle}${separator}(${formatted})`);
  });
}
