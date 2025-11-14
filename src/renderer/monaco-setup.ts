/* eslint-env browser */

import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import hydraTypeDefinitions from './hydra/hydra-globals.d.ts?raw';

const EDITOR_CONFIG = {
  LANGUAGE_ID: 'javascript',
  THEME: 'videodrome-dark',
  FONT_SIZE: 12,
  HOVER_DELAY_MS: 800,
} as const;

export function configureMonacoEnvironment(): void {
  self.MonacoEnvironment = {
    getWorker(moduleId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
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

/**
 * Register Hydra global type definitions with Monaco's TypeScript language service
 * This provides IntelliSense for all Hydra functions and globals without requiring imports
 */
export function registerHydraTypeDefinitions(): monaco.IDisposable {
  // Configure TypeScript compiler options for JavaScript
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    noLib: false, // Important: include standard library
  });

  // Enable diagnostics (errors and warnings)
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // Register Hydra type definitions
  const disposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(
    hydraTypeDefinitions,
    'file:///node_modules/@types/hydra/index.d.ts',
  );

  return disposable;
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
