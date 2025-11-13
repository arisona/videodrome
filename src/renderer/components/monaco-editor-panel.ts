/* eslint-env browser */

import * as monaco from 'monaco-editor';

import { debounce, type DebouncedFunction } from '../../shared/debounce';
import { createHydraEditor } from '../monaco-setup';
import { getSettings } from '../settings-service';

import { showParameterControlAtCursor, detectNumberAtPosition } from './monaco-parameter-control';
import { HOVER_DELAY_MS } from './parameter-control';

import type { IDisposable } from 'monaco-editor';

const COMPILE_DEBOUNCE_MS = 150;

/**
 * Configuration for MonacoEditorPanel
 */
export interface MonacoEditorPanelConfig {
  /** Container element for the editor */
  container: HTMLElement;
  /** Initial code value */
  value: string;
  /** Whether the editor is read-only */
  readOnly: boolean;
  /** Callback when code should be run (Cmd+Enter) */
  onRun: () => void;
  /** Callback when code should be saved (Cmd+S) */
  onSave?: () => void;
  /** Callback when save as is triggered (Shift+Cmd+S) */
  onSaveAs?: () => void;
  /** Callback when revert is triggered (Cmd+R) */
  onRevert?: () => void;
  /** Callback when editor content changes */
  onChange?: () => void;
}

/**
 * Monaco Editor Panel with integrated keyboard shortcuts and parameter control
 * Encapsulates editor setup, keyboard shortcuts, hover behavior, and parameter control
 */
export class MonacoEditorPanel {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private config: MonacoEditorPanelConfig;
  private disposables: Array<IDisposable> = [];
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHoverPosition: monaco.IPosition | null = null;
  private debouncedRun: DebouncedFunction<() => void>;

  constructor(config: MonacoEditorPanelConfig) {
    this.config = config;
    this.editor = createHydraEditor({
      container: config.container,
      value: config.value,
      readOnly: config.readOnly,
    });

    this.debouncedRun = debounce(() => {
      this.config.onRun();
    }, COMPILE_DEBOUNCE_MS);

    this.setupKeyboardShortcuts();
    this.setupHoverBehavior();
    this.setupChangeTracking();
  }

  /**
   * Get the underlying Monaco editor instance
   */
  public getEditor(): monaco.editor.IStandaloneCodeEditor {
    return this.editor;
  }

  /**
   * Dispose of the editor and all event listeners
   */
  public dispose(): void {
    this.debouncedRun.cancel();

    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.disposables.forEach((d) => {
      d.dispose();
    });
    this.disposables = [];
    this.editor.dispose();
  }

  /**
   * Setup keyboard shortcuts for the editor
   */
  private setupKeyboardShortcuts(): void {
    const keyDownDisposable = this.editor.onKeyDown((e) => {
      // Shift+Enter - Open parameter control (if cursor on number)
      if (
        e.shiftKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.keyCode === monaco.KeyCode.Enter
      ) {
        // Check if parameter control popup is enabled
        if (!getSettings().parameterControl.enabled) {
          return;
        }

        const position = this.editor.getPosition();
        const model = this.editor.getModel();
        const detection = position && model ? detectNumberAtPosition(model, position) : null;
        if (position && detection) {
          e.preventDefault();
          e.stopPropagation();

          const { range } = detection;

          // Select the number
          this.editor.setSelection(range);

          // showParameterControlAtCursor will automatically register with central registry
          showParameterControlAtCursor(this.editor, {
            onUpdate: (_value, newRange) => {
              this.debouncedRun();
              // Keep the number selected
              this.editor.setSelection(newRange);
            },
            onCommit: () => {
              this.config.onRun();
              // Keep editor focused
              this.editor.focus();
            },
            onCancel: () => {
              this.config.onRun();
              // Keep editor focused and restore selection
              this.editor.focus();
              this.editor.setSelection(range);
            },
          });

          return;
        }
      }

      // Cmd+Enter - Run patch
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.keyCode === monaco.KeyCode.Enter) {
        e.preventDefault();
        e.stopPropagation();
        this.config.onRun();
      }

      // Cmd+S - Save
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.keyCode === monaco.KeyCode.KeyS) {
        e.preventDefault();
        e.stopPropagation();
        if (this.config.onSave) {
          this.config.onSave();
        }
      }

      // Shift+Cmd+S - Save as
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.keyCode === monaco.KeyCode.KeyS) {
        e.preventDefault();
        e.stopPropagation();
        if (this.config.onSaveAs) {
          this.config.onSaveAs();
        }
      }

      // Cmd+R - Revert
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.keyCode === monaco.KeyCode.KeyR) {
        e.preventDefault();
        e.stopPropagation();
        if (this.config.onRevert) {
          this.config.onRevert();
        }
      }
    });

    this.disposables.push(keyDownDisposable);
  }

  /**
   * Setup hover behavior for parameter control
   */
  private setupHoverBehavior(): void {
    const mouseMoveDisposable = this.editor.onMouseMove((e) => {
      // Clear any existing hover timer
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }

      // Only activate on content hover (not gutter, margins, etc.)
      if (e.target.position && e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        const currentPosition = e.target.position;
        const model = this.editor.getModel();

        // Check if hovering over a number
        const detection = model ? detectNumberAtPosition(model, currentPosition) : null;
        if (detection) {
          this.lastHoverPosition = currentPosition;

          this.hoverTimer = setTimeout(() => {
            if (!getSettings().parameterControl.enabled) {
              return;
            }

            // Verify we're still hovering over the same position
            if (
              this.lastHoverPosition &&
              this.lastHoverPosition.lineNumber === currentPosition.lineNumber &&
              this.lastHoverPosition.column === currentPosition.column
            ) {
              // Focus the editor first
              this.editor.focus();

              // Detect the number and its range
              const editorModel = this.editor.getModel();
              const detectedNumber = editorModel
                ? detectNumberAtPosition(editorModel, currentPosition)
                : null;
              if (detectedNumber) {
                const { range } = detectedNumber;

                // Select the number
                this.editor.setSelection(range);
                this.editor.setPosition(currentPosition);

                // showParameterControlAtCursor will automatically register with central registry
                showParameterControlAtCursor(this.editor, {
                  onUpdate: (_value, newRange) => {
                    this.debouncedRun();
                    // Keep the number selected
                    this.editor.setSelection(newRange);
                  },
                  onCommit: () => {
                    this.config.onRun();
                    // Keep editor focused
                    this.editor.focus();
                  },
                  onCancel: () => {
                    this.config.onRun();
                    // Keep editor focused and restore selection
                    this.editor.focus();
                    this.editor.setSelection(range);
                  },
                });
              }
            }
            this.hoverTimer = null;
          }, HOVER_DELAY_MS);
        } else {
          this.lastHoverPosition = null;
        }
      } else {
        this.lastHoverPosition = null;
      }
    });

    this.disposables.push(mouseMoveDisposable);
  }

  /**
   * Setup change tracking
   */
  private setupChangeTracking(): void {
    if (this.config.onChange) {
      const changeDisposable = this.editor.onDidChangeModelContent(() => {
        if (this.config.onChange) {
          this.config.onChange();
        }
      });

      this.disposables.push(changeDisposable);
    }
  }
}
