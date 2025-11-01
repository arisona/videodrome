/* eslint-env browser */

/**
 * Convert simple markdown to HTML for documentation display
 *
 * Supports:
 * - Headings (# and ##)
 * - Bold text (**text**)
 * - Inline code (`code`)
 * - Code blocks (```)
 * - Bulleted lists (-)
 * - Custom example blocks
 *
 * @param markdown - The markdown string to convert
 * @returns HTML string ready for innerHTML
 */
export function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
    // Process list items BEFORE heading replacements consume newlines
    // eslint-disable-next-line security/detect-unsafe-regex
    .replace(/((?:^- .+$\n?)+)/gm, (match: string) => {
      const items = match.split('\n').filter((line) => line.trim().startsWith('- '));
      const listItems = items
        .map((item) => {
          const content = item.trim().substring(2); // Remove "- " prefix
          return `<li style="margin-bottom: 4px;">${content}</li>`;
        })
        .join('');
      return `<ul style="margin: 4px 0; padding-left: 20px;">${listItems}</ul>\n`;
    })
    // Convert headings
    .replace(
      /^# (.+)\n/gm,
      '<h1 style="font-size: 16px; font-weight: 600; margin-top: 0; margin-bottom: 3px;">$1</h1>',
    )
    .replace(
      /^## (.+)\n/gm,
      '<h2 style="font-size: 14px; font-weight: 600; margin-top: 12px; margin-bottom: 3px;">$1</h2>',
    )
    // Convert custom example blocks
    .replace(/<examples>(.*?)<\/examples>/g, (_match: string, content: string) => {
      const examples = content.split('<examplesep>');
      const exampleHtml = examples
        .map(
          (ex: string) =>
            `<div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-family: monospace; margin-bottom: 8px;">${ex}</div>`,
        )
        .join('');
      return exampleHtml;
    })
    // Convert bold text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert inline code
    .replace(
      /`([^`]+)`/g,
      '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>',
    )
    // Convert code blocks
    .replace(
      // eslint-disable-next-line security/detect-unsafe-regex
      /```(\w+)?\n([\s\S]+?)```/g,
      '<pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 4px; overflow-x: auto; font-family: monospace; margin: 8px 0;"><code>$2</code></pre>',
    )
    // Convert newlines to breaks
    .replace(/\n/g, '<br>');

  return html;
}
