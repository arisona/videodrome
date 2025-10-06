/* eslint-env browser */

import * as monaco from 'monaco-editor';

import { detectNumberAtPosition } from '../components/monaco-parameter-control';
import { getSettings } from '../settings-service';

import { HYDRA_API, HYDRA_GLOBAL_DOCS } from './hydra-api';

/**
 * Register Hydra completion provider for Monaco editor
 */
export function registerHydraCompletionProvider(): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('hydra', {
    triggerCharacters: ['.'],
    provideCompletionItems: (model, position) => {
      // Return if Intellisense is disabled
      if (!getSettings().intellisenseEnabled) {
        return { suggestions: [], incomplete: false };
      }

      // Validate position is within document bounds
      const lineCount = model.getLineCount();
      if (position.lineNumber < 1 || position.lineNumber > lineCount) {
        return { suggestions: [], incomplete: false };
      }

      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const line = model.getLineContent(position.lineNumber);
      const textBeforeCursor = line.substring(0, position.column - 1);

      // Check if we're in a method chain (after a dot)
      const isMethodChain = textBeforeCursor.trim().endsWith('.');

      // Also check if there's a dot before the current word (e.g., "Math.r")
      const textBeforeWord = line.substring(0, word.startColumn - 1);
      const hasDotBeforeWord = textBeforeWord.trim().endsWith('.');

      // For method chains, only show completions if we're chaining after a Hydra expression
      if (isMethodChain || hasDotBeforeWord) {
        // Get the text before the dot
        const beforeDot = isMethodChain
          ? textBeforeCursor.trim().slice(0, -1).trim()
          : textBeforeWord.trim().slice(0, -1).trim();
        const lastWord = beforeDot.split(/[^\w]/).pop() ?? '';

        // Special case: Handle globals with properties
        const globalWithProps = HYDRA_GLOBAL_DOCS.find((g) => g.name === lastWord);
        if (globalWithProps?.properties) {
          return {
            suggestions: globalWithProps.properties.map((prop) => ({
              label: prop.name,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: prop.name,
              documentation: prop.description,
              detail: prop.type,
              range: range,
            })),
            incomplete: false,
          };
        }

        // Only show chainable function completions after function calls (ends with ')')
        // This prevents showing completions after non-chainable identifiers like Math, console, etc.
        if (!beforeDot.endsWith(')')) {
          return { suggestions: [], incomplete: false };
        }
      }

      const suggestions: Array<monaco.languages.CompletionItem> = [];

      // Add all Hydra functions
      for (const func of HYDRA_API) {
        // For method chains, only show chainable categories
        // Exclude: source (must be at start), synth (globals like speed, bpm, time, mouse)
        if (isMethodChain && (func.category === 'source' || func.category === 'synth')) {
          continue;
        }

        // Build parameter signature string
        const params = func.params
          .map((p) => {
            if (p.default) {
              return `${p.name}: ${p.type} = ${p.default}`;
            }
            return `${p.name}: ${p.type}`;
          })
          .join(', ');

        // Build insertText with parameter placeholders
        const placeholders = func.params
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          .map((p, index) => `\${${index + 1}:${p.default ?? p.name}}`)
          .join(', ');

        let documentation = func.description;
        if (func.params.length > 0) {
          documentation += '\n\nParameters:\n';
          for (const param of func.params) {
            documentation += `- ${param.name} (${param.type}): ${param.description}`;
            if (param.default) {
              documentation += ` [default: ${param.default}]`;
            }
            documentation += '\n';
          }
        }
        if (func.examples && func.examples.length > 0) {
          documentation += '\nExamples:\n';
          for (const example of func.examples) {
            documentation += `  ${example}\n`;
          }
        }

        suggestions.push({
          label: func.name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${func.name}(${placeholders})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: {
            value: documentation,
            isTrusted: true,
          },
          detail: `${func.name}(${params})${func.returns ? ` → ${func.returns}` : ''}`,
          range: range,
        });
      }

      // Add global objects (s0, s1, o0, etc.) only if not in method chain
      if (!isMethodChain) {
        for (const global of HYDRA_GLOBAL_DOCS) {
          suggestions.push({
            label: global.name,
            kind: monaco.languages.CompletionItemKind[global.kind],
            insertText: global.name,
            documentation: {
              value: global.shortDoc,
              isTrusted: true,
            },
            range: range,
          });
        }
      }

      return {
        suggestions,
        incomplete: false,
      };
    },
  });
}

/**
 * Register Hydra hover provider for Monaco editor
 * IMPORTANT: This provider checks for numbers first to avoid conflicts with parameter control
 */
export function registerHydraHoverProvider(): monaco.IDisposable {
  return monaco.languages.registerHoverProvider('hydra', {
    provideHover: (model, position) => {
      // Return if Intellisense is disabled
      if (!getSettings().intellisenseEnabled) {
        return null;
      }

      // Defensive check: validate model has required methods
      // TypeScript types guarantee model is defined, but we check for the method to be safe
      if (typeof model.getLineContent !== 'function') {
        return null;
      }

      // Validate position is within document bounds
      const lineCount = model.getLineCount();
      if (position.lineNumber < 1 || position.lineNumber > lineCount) {
        return null;
      }

      // CRITICAL: Check if hovering over a number first
      // If so, return null to let the parameter control widget handle it
      const numberDetection = detectNumberAtPosition(model, position);
      if (numberDetection) {
        return null; // Let parameter control handle numbers
      }

      const word = model.getWordAtPosition(position);
      if (!word) {
        return null;
      }

      // Check if word matches a Hydra function
      const func = HYDRA_API.find((f) => f.name === word.word);
      if (func) {
        const params = func.params
          .map((p) => {
            const defaultStr = p.default ? ` = ${p.default}` : '';
            return `  ${p.name}: ${p.type}${defaultStr} - ${p.description}`;
          })
          .join('\n');

        let markdown = `**${func.name}** - ${func.description}\n\n`;

        if (func.params.length > 0) {
          markdown += '**Parameters:**\n```\n' + params + '\n```\n\n';
        }

        if (func.returns) {
          markdown += `**Returns:** ${func.returns}\n\n`;
        }

        if (func.examples && func.examples.length > 0) {
          markdown += '**Examples:**\n```javascript\n';
          markdown += func.examples.join('\n');
          markdown += '\n```';
        }

        return {
          contents: [
            {
              value: markdown,
              isTrusted: true,
            },
          ],
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
        };
      }

      // Check if word matches a global
      const globalDoc = HYDRA_GLOBAL_DOCS.find((g) => g.name === word.word);
      if (globalDoc) {
        return {
          contents: [
            {
              value: globalDoc.detailedDoc,
              isTrusted: true,
            },
          ],
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
        };
      }

      return null;
    },
  });
}

/**
 * Register parameter hints provider for function signatures
 */
export function registerHydraSignatureHelpProvider(): monaco.IDisposable {
  return monaco.languages.registerSignatureHelpProvider('hydra', {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp: (model, position) => {
      // Return if Intellisense is disabled
      if (!getSettings().intellisenseEnabled) {
        return null;
      }

      // Validate position is within document bounds
      const lineCount = model.getLineCount();
      if (position.lineNumber < 1 || position.lineNumber > lineCount) {
        return null;
      }

      const line = model.getLineContent(position.lineNumber);
      const textBeforeCursor = line.substring(0, position.column - 1);

      // Find the function name before the opening parenthesis
      const regex = /(\w+)\s*\([^)]*$/;
      const match = regex.exec(textBeforeCursor);
      if (!match) {
        return null;
      }

      const functionName = match[1];
      const func = HYDRA_API.find((f) => f.name === functionName);

      if (!func) {
        return null;
      }

      // Count which parameter we're on by counting commas
      const paramsText = textBeforeCursor.substring(textBeforeCursor.lastIndexOf('(') + 1);
      const activeParameter = (paramsText.match(/,/g) ?? []).length;

      const parameters = func.params.map((p) => {
        const defaultStr = p.default ? ` = ${p.default}` : '';
        return {
          label: `${p.name}: ${p.type}${defaultStr}`,
          documentation: {
            value: p.description,
            isTrusted: true,
          },
        };
      });

      return {
        value: {
          signatures: [
            {
              label: `${func.name}(${func.params.map((p) => `${p.name}: ${p.type}`).join(', ')})`,
              documentation: {
                value: func.description,
                isTrusted: true,
              },
              parameters: parameters,
              activeParameter: Math.min(activeParameter, parameters.length - 1),
            },
          ],
          activeSignature: 0,
          activeParameter: Math.min(activeParameter, parameters.length - 1),
        },
        dispose: () => {
          /* empty */
        },
      };
    },
  });
}
