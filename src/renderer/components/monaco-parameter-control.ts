/* eslint-env browser */

import * as monaco from 'monaco-editor';

import {
  StandaloneParameterControl,
  registerParameterControl,
  type StandaloneParameterControlConfig,
} from './parameter-control';

export interface ParameterControlConfig extends Omit<StandaloneParameterControlConfig, 'onUpdate'> {
  onUpdate: (value: number, range: monaco.Range) => void;
}

/**
 * Monaco editor wrapper for StandaloneParameterControl
 * This widget integrates the standalone parameter control with Monaco editor's content widget system
 */
export class ParameterControlWidget implements monaco.editor.IContentWidget {
  private static readonly ID_PREFIX = 'parameter-control-widget';
  private static nextId = 0;

  private readonly id: string;
  private readonly editor: monaco.editor.IStandaloneCodeEditor;
  private readonly position: monaco.IPosition;
  private currentRange: monaco.Range;

  private standaloneControl: StandaloneParameterControl;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    position: monaco.IPosition,
    initialValue: number,
    initialRange: monaco.Range,
    config: Partial<ParameterControlConfig> = {},
  ) {
    this.id = `${ParameterControlWidget.ID_PREFIX}-${String(ParameterControlWidget.nextId++)}`;
    this.editor = editor;
    this.position = position;
    this.currentRange = initialRange;

    // Create the standalone control with Monaco-specific callbacks
    const standaloneConfig: Partial<StandaloneParameterControlConfig> = {
      onUpdate: (value: number) => {
        if (config.onUpdate) {
          config.onUpdate(value, this.currentRange);
        }
      },
      onCommit: (value: number) => {
        if (config.onCommit) {
          config.onCommit(value);
        }
      },
      onCancel: () => {
        if (config.onCancel) {
          config.onCancel();
        }
      },
    };

    this.standaloneControl = new StandaloneParameterControl(initialValue, standaloneConfig);

    // Register this widget in the central registry
    registerParameterControl(this.standaloneControl);
  }

  public updateRange(newRange: monaco.Range): void {
    this.currentRange = newRange;
  }

  public getCurrentRange(): monaco.Range {
    return this.currentRange;
  }

  // IContentWidget interface
  getId(): string {
    return this.id;
  }

  getDomNode(): HTMLElement {
    const domNode = this.standaloneControl.getDomNode();
    if (!domNode) {
      throw new Error('ParameterControlWidget: domNode is not initialized');
    }
    return domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    return {
      position: this.position,
      preference: [
        monaco.editor.ContentWidgetPositionPreference.ABOVE,
        monaco.editor.ContentWidgetPositionPreference.BELOW,
      ],
    };
  }

  dispose(): void {
    this.standaloneControl.dispose();
    this.editor.removeContentWidget(this);
  }
}

/**
 * Detects if the position in the editor contains a number literal
 * Returns the number value and its range if found
 */
export function detectNumberAtPosition(
  model: monaco.editor.ITextModel,
  position: monaco.IPosition,
): { value: number; range: monaco.Range } | null {
  const line = model.getLineContent(position.lineNumber);

  // Regex to match numbers (integers and decimals, including negative)
  // Uses negative lookbehind/lookahead to ensure numbers aren't part of identifiers
  const numberRegex = /(?<!\w)-?\d+\.?\d*(?!\w)/g;
  let match: RegExpExecArray | null;

  while ((match = numberRegex.exec(line)) !== null) {
    const startCol = match.index + 1; // Monaco columns are 1-based
    const endCol = match.index + match[0].length + 1;

    // Check if position is within this number
    if (position.column >= startCol && position.column <= endCol) {
      const value = parseFloat(match[0]);

      if (isNaN(value)) continue;

      // Check if this number is part of an array index (e.g., arr[123] or arr[ 123 ])
      // Test if there's a '[' before the number (ignoring whitespace)
      const beforeNumber = line.substring(0, match.index);
      if (/\[\s*$/.test(beforeNumber)) {
        continue; // Skip array indices
      }

      const range = new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol);

      return { value, range };
    }
  }

  return null;
}

/**
 * Creates and shows a parameter control widget at the current cursor position
 * Returns the widget instance or null if no number is detected
 */
export function showParameterControlAtCursor(
  editor: monaco.editor.IStandaloneCodeEditor,
  config: Partial<ParameterControlConfig> = {},
): ParameterControlWidget | null {
  const position = editor.getPosition();
  if (!position) return null;

  const model = editor.getModel();
  if (!model) return null;

  const detection = detectNumberAtPosition(model, position);
  if (!detection) return null;

  const { value, range } = detection;

  const widget = new ParameterControlWidget(editor, position, value, range, {
    onUpdate: (newValue, currentRange) => {
      // Update the editor text in real-time
      const newText = newValue.toString();
      const edits = editor.executeEdits('parameter-control', [
        {
          range: currentRange,
          text: newText,
        },
      ]);

      // Calculate the new range after the edit
      if (edits) {
        const lineNumber = currentRange.startLineNumber;
        const startCol = currentRange.startColumn;
        const endCol = startCol + newText.length;
        const newRange = new monaco.Range(lineNumber, startCol, lineNumber, endCol);
        widget.updateRange(newRange);
      }

      // Call custom onUpdate handler if provided
      if (config.onUpdate) {
        config.onUpdate(newValue, currentRange);
      }
    },
    onCommit: (finalValue) => {
      // Final value is already in the editor from onUpdate
      if (config.onCommit) {
        config.onCommit(finalValue);
      }
    },
    onCancel: () => {
      // Restore original value
      const currentRange = widget.getCurrentRange();
      editor.executeEdits('parameter-control', [
        {
          range: currentRange,
          text: value.toString(),
        },
      ]);

      if (config.onCancel) {
        config.onCancel();
      }
    },
  });

  editor.addContentWidget(widget);
  return widget;
}
