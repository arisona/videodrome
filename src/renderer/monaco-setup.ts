/* eslint-env browser */

import * as monaco from 'monaco-editor';

const EDITOR_CONFIG = {
  LANGUAGE_ID: 'hydra',
  THEME: 'videodrome-dark',
  FONT_SIZE: 14,
  HOVER_DELAY_MS: 800,
} as const;

type MonacoGlobalScope = typeof self & {
  MonacoEnvironment?: {
    getWorker: ((workerId: string, label: string) => Worker) | (() => Worker);
  };
};

// Configure Monaco Environment to prevent worker errors (call once globally)
export function configureMonacoEnvironment(): void {
  const monacoGlobal = self as MonacoGlobalScope;
  monacoGlobal.MonacoEnvironment = {
    getWorker(_workerId?: string, _label?: string) {
      // Return a dummy worker for all worker requests
      return new Worker(
        URL.createObjectURL(new Blob(['self.onmessage = () => {}'], { type: 'text/javascript' })),
      );
    },
  };
}

// Define custom theme with darker menu background
export function defineVideodromeTheme(): void {
  monaco.editor.defineTheme('videodrome-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      // Menu/context menu colors
      'menu.background': '#1e1e1e',
      'menu.foreground': '#cccccc',
      'menu.selectionBackground': '#2a2d2e',
      'menu.selectionForeground': '#d4d4d4',
      'menu.separatorBackground': '#3e3e42',
      'menu.border': '#3e3e42',
    },
  });
}

// Register custom 'hydra' language with JavaScript syntax highlighting
export function registerHydraLanguage(): void {
  monaco.languages.register({ id: 'hydra' });

  // Use JavaScript's syntax highlighting for Hydra
  monaco.languages.setMonarchTokensProvider('hydra', {
    defaultToken: '',
    tokenPostfix: '.js',
    keywords: [
      'break',
      'case',
      'catch',
      'class',
      'continue',
      'const',
      'constructor',
      'debugger',
      'default',
      'delete',
      'do',
      'else',
      'export',
      'extends',
      'false',
      'finally',
      'for',
      'from',
      'function',
      'get',
      'if',
      'import',
      'in',
      'instanceof',
      'let',
      'new',
      'null',
      'return',
      'set',
      'super',
      'switch',
      'this',
      'throw',
      'true',
      'try',
      'typeof',
      'var',
      'void',
      'while',
      'with',
      'yield',
      'async',
      'await',
    ],
    operators: [
      '<=',
      '>=',
      '==',
      '!=',
      '===',
      '!==',
      '=>',
      '+',
      '-',
      '**',
      '*',
      '/',
      '%',
      '++',
      '--',
      '<<',
      '<',
      '>>',
      '>>>',
      '&',
      '|',
      '^',
      '!',
      '~',
      '&&',
      '||',
      '??',
      '?',
      ':',
      '=',
      '+=',
      '-=',
      '*=',
      '**=',
      '/=',
      '%=',
      '<<=',
      '>>=',
      '>>>=',
      '&=',
      '|=',
      '^=',
      '@',
    ],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /[\d_]+/,
    octaldigits: /[0-7_]+/,
    binarydigits: /[0-1_]+/,
    hexdigits: /[0-9a-fA-F_]+/,
    tokenizer: {
      root: [
        [/[{}]/, '@brackets'],
        [
          /[a-z_$][\w$]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
        { include: '@whitespace' },
        [/[()[\]]/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],
        [/(@digits)[eE][-+]?(@digits)/, 'number.float'],
        [/(@digits)\.(@digits)[eE][-+]?(@digits)/, 'number.float'],
        [/(@digits)\.(@digits)/, 'number.float'],
        [/0[xX](@hexdigits)/, 'number.hex'],
        [/0[oO]?(@octaldigits)/, 'number.octal'],
        [/0[bB](@binarydigits)/, 'number.binary'],
        [/(@digits)/, 'number'],
        [/[;,.]/, 'delimiter'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
        [/`/, 'string', '@string_backtick'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
      string_backtick: [
        [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
        [/[^\\`$]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/`/, 'string', '@pop'],
      ],
      bracketCounting: [
        [/\{/, 'delimiter.bracket', '@bracketCounting'],
        [/\}/, 'delimiter.bracket', '@pop'],
        { include: 'root' },
      ],
    },
  });

  // Set language configuration for brackets, comments, etc.
  monaco.languages.setLanguageConfiguration('hydra', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string'] },
      { open: '`', close: '`', notIn: ['string', 'comment'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*//\\s*#?region\\b'),
        end: new RegExp('^\\s*//\\s*#?endregion\\b'),
      },
    },
  });
}

export interface EditorOptions {
  container: HTMLElement;
  value: string;
  readOnly?: boolean;
}

// Register context menu actions for an editor
export function registerContextMenuActions(
  editor: monaco.editor.IStandaloneCodeEditor,
  contextMenuItems: Array<{
    id: string;
    label: string;
    run: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  }>,
): void {
  contextMenuItems.forEach((item) => {
    editor.addAction({
      id: item.id,
      label: item.label,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (ed) => {
        item.run(ed as monaco.editor.IStandaloneCodeEditor);
      },
    });
  });
}

// Create a Monaco editor with standard Hydra configuration
export function createHydraEditor(options: EditorOptions): monaco.editor.IStandaloneCodeEditor {
  const { container, value, readOnly = false } = options;

  return monaco.editor.create(container, {
    value,
    language: EDITOR_CONFIG.LANGUAGE_ID,
    theme: EDITOR_CONFIG.THEME,
    fontSize: EDITOR_CONFIG.FONT_SIZE,
    minimap: { enabled: false },
    lineNumbers: 'on',
    automaticLayout: true,
    readOnly,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    occurrencesHighlight: 'off',
    quickSuggestions: readOnly
      ? false
      : {
          other: true,
          comments: false,
          strings: false,
        },
    parameterHints: {
      enabled: !readOnly,
      cycle: true,
    },
    hover: {
      enabled: true,
      delay: EDITOR_CONFIG.HOVER_DELAY_MS,
    },
    suggest: readOnly
      ? undefined
      : {
          showMethods: true,
          showFunctions: true,
          showConstants: true,
          showVariables: true,
          showKeywords: false,
          showSnippets: false,
          filterGraceful: true,
          snippetsPreventQuickSuggestions: false,
        },
    wordBasedSuggestions: 'off',
    acceptSuggestionOnCommitCharacter: !readOnly,
    tabCompletion: readOnly ? 'off' : 'on',
  });
}
