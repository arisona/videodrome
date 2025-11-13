/* eslint-env browser */

import { FILE_EXTENSIONS, STATUS_MESSAGES } from '../../shared/constants';
import { registerContextMenuActions } from '../monaco-setup';
import { getSettings } from '../settings-service';
import { getFilename } from '../utils/path';

import { MonacoEditorPanel } from './monaco-editor-panel';

import type * as monaco from 'monaco-editor';

/**
 * Options for loading a patch
 */
export interface LoadOptions {
  /** Source of the patch content */
  source: 'disk' | 'memory' | 'new';
  /** File path (required for 'disk', optional for 'memory') */
  filePath?: string;
  /** File name (required for 'disk', optional for 'memory') */
  fileName?: string;
  /** Patch content (required for 'memory' and 'new', ignored for 'disk') */
  content?: string;
  /** Original (saved) content for dirty tracking (optional for 'memory', ignored otherwise) */
  originalContent?: string;
}

/**
 * Configuration for PatchPanel component
 */
export interface PatchPanelConfig {
  // DOM elements
  editorContainer: HTMLElement;
  statusElement: HTMLElement;
  fileNameElement: HTMLElement;

  // Optional button elements (wired automatically if provided)
  buttons?: {
    run?: HTMLElement | null;
    new?: HTMLElement | null;
    save?: HTMLElement | null;
    saveAs?: HTMLElement | null;
    revert?: HTMLElement | null;
  };

  // Editor configuration
  initialValue?: string;
  readOnly?: boolean;

  // Callbacks
  onRun: () => void;
  onFileChange?: (filePath: string | null, fileName: string | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;

  // Context menu actions
  contextMenuActions?: Array<{
    id: string;
    label: string;
    run: () => void;
  }>;

  // Save-as configuration
  saveAsEventName: string;
  additionalSaveAsData?: Record<string, unknown>;

  // Label prefix for file name display (e.g., "A: " for editor A)
  fileNamePrefix?: string;
}

/**
 * PatchPanel - Unified component for editing Hydra patches
 *
 * Encapsulates editor panel, file management, status display, and button handlers.
 * Used by both Composer and Performer tabs to eliminate duplication.
 */
export class PatchPanel {
  private editorPanel: MonacoEditorPanel;
  private config: PatchPanelConfig;

  // File state
  private loadedFile: string | null = null;
  private originalContent = '';
  private _isDirty = false;

  constructor(config: PatchPanelConfig) {
    this.config = config;

    // Create Monaco editor panel
    this.editorPanel = new MonacoEditorPanel({
      container: config.editorContainer,
      value: config.initialValue ?? '',
      readOnly: config.readOnly ?? false,
      onRun: config.onRun,
      onSave: () => {
        void this.save();
      },
      onSaveAs: () => {
        this.saveAs();
      },
      onRevert: () => {
        void this.revert();
      },
    });

    const editor = this.editorPanel.getEditor();

    // Listen to editor changes to update dirty state
    editor.onDidChangeModelContent(() => {
      this.updateDirtyState();
    });

    // Wire up buttons
    this.wireButtons();

    // Register context menu actions
    if (config.contextMenuActions && config.contextMenuActions.length > 0) {
      registerContextMenuActions(editor, config.contextMenuActions);
    }

    // File name click handler - reveal file in explorer
    config.fileNameElement.addEventListener('click', () => {
      if (this.loadedFile) {
        window.dispatchEvent(
          new CustomEvent('reveal-file-in-explorer', {
            detail: { filePath: this.loadedFile },
          }),
        );
      }
    });

    // Initial file title update
    this.updateFileTitle();

    // Setup drop zone for drag-and-drop patch loading
    this.setupDropZone();
  }

  /**
   * Get the underlying Monaco editor instance
   */
  public getEditor(): monaco.editor.IStandaloneCodeEditor {
    return this.editorPanel.getEditor();
  }

  /**
   * Save the current patch
   */
  public async save(): Promise<boolean> {
    if (!this.loadedFile) {
      // No file loaded - trigger Save As instead
      this.saveAs();
      return false;
    }

    const content = this.editorPanel.getEditor().getValue();

    try {
      await window.electronAPI.savePatch(this.loadedFile, content);
      this.originalContent = content;
      this.setDirty(false);
      this.updateStatus(STATUS_MESSAGES.READY);
      return true;
    } catch (error) {
      console.error('Error saving patch:', error);
      this.updateStatus('Error saving patch', true);
      return false;
    }
  }

  /**
   * Trigger Save As dialog
   */
  public saveAs(): void {
    const content = this.editorPanel.getEditor().getValue();
    const settings = getSettings();
    const rootPatchDir = settings.patchDirectory;

    const initialValue = this.loadedFile
      ? getFilename(this.loadedFile).replace(FILE_EXTENSIONS.PATCH, '')
      : 'patch';

    window.dispatchEvent(
      new CustomEvent(this.config.saveAsEventName, {
        detail: {
          initialValue,
          content,
          currentFilePath: this.loadedFile,
          rootPatchDir,
          ...this.config.additionalSaveAsData,
        },
      }),
    );
  }

  /**
   * Load a patch
   */
  public async load(options: LoadOptions): Promise<boolean> {
    // Check dirty state and handle user choice if needed
    if (this._isDirty) {
      const confirmed = window.confirm('Patch is modified.\n\nClick OK to overwrite.');
      if (!confirmed) {
        return false;
      }
    }

    // Load content based on source type
    try {
      let contentToLoad: string;
      let newFilePath: string | null;
      let newFileName: string | null;
      let newOriginalContent: string;

      switch (options.source) {
        case 'disk': {
          if (!options.filePath || !options.fileName) {
            throw new Error('filePath and fileName required for disk source');
          }
          contentToLoad = await window.electronAPI.readPatch(options.filePath);
          newFilePath = options.filePath;
          newFileName = options.fileName;
          newOriginalContent = contentToLoad;
          break;
        }

        case 'memory': {
          if (options.content === undefined) {
            throw new Error('content required for memory source');
          }
          contentToLoad = options.content;
          newFilePath = options.filePath ?? null;
          newFileName = options.fileName ?? null;
          newOriginalContent = options.originalContent ?? options.content;
          break;
        }

        case 'new': {
          contentToLoad = options.content ?? '';
          newFilePath = null;
          newFileName = null;
          newOriginalContent = '';
          break;
        }

        default:
          throw new Error(`Unknown source type: ${String(options.source)}`);
      }

      // Update state and set editor content
      this.loadedFile = newFilePath;
      this.originalContent = newOriginalContent;
      this.editorPanel.getEditor().setValue(contentToLoad);

      // Trigger callbacks
      if (this.config.onFileChange) {
        this.config.onFileChange(newFilePath, newFileName);
      }
      this.updateFileTitle();
      this.updateStatus(STATUS_MESSAGES.READY);

      // Run the patch after loading
      this.config.onRun();

      return true;
    } catch (error) {
      console.error('Error loading patch:', error);
      const errorMsg =
        options.source === 'disk' && options.fileName
          ? `Error loading ${options.fileName}`
          : 'Error loading patch';
      this.updateStatus(errorMsg, true);
      return false;
    }
  }

  /**
   * Revert to last saved state
   */
  public async revert(): Promise<boolean> {
    if (!this.loadedFile) {
      this.updateStatus('No file to revert', true);
      return false;
    }

    try {
      const content = await window.electronAPI.readPatch(this.loadedFile);
      this.editorPanel.getEditor().setValue(content);
      this.originalContent = content;
      this.setDirty(false);

      const fileName = getFilename(this.loadedFile);
      this.updateStatus(`Reverted: ${fileName}`);

      // Run the patch after reverting
      this.config.onRun();

      return true;
    } catch (error) {
      console.error('Error reverting patch:', error);
      this.updateStatus('Error reverting patch', true);
      return false;
    }
  }

  /**
   * Create a new patch
   */
  public async newPatch(): Promise<boolean> {
    return this.load({ source: 'new' });
  }

  /**
   * Called after a successful Save As operation to update file state
   */
  public onSaveAsComplete(filePath: string, content: string): void {
    this.loadedFile = filePath;
    this.originalContent = content;
    this.setDirty(false);

    const fileName = getFilename(filePath);
    if (this.config.onFileChange) {
      this.config.onFileChange(filePath, fileName);
    }
    this.updateFileTitle();
    this.updateStatus(STATUS_MESSAGES.READY);
  }

  /**
   * Get the currently loaded file path
   */
  public getFilePath(): string | null {
    return this.loadedFile;
  }

  /**
   * Get the currently loaded file name
   */
  public getFileName(): string | null {
    return this.loadedFile ? getFilename(this.loadedFile) : null;
  }

  /**
   * Check if the editor has unsaved changes
   */
  public isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * Get the original content (last saved or loaded state)
   */
  public getOriginalContent(): string {
    return this.originalContent;
  }

  /**
   * Dispose of the editor and cleanup
   */
  public dispose(): void {
    this.editorPanel.dispose();
  }

  /**
   * Update status display
   */
  private updateStatus(status: string, isError = false): void {
    this.config.statusElement.textContent = status;
    this.config.statusElement.style.color = isError ? '#f48771' : '#858585';
  }

  /**
   * Update file title display
   */
  private updateFileTitle(): void {
    const fileName = this.getFileName();
    const dirtyIndicator = this._isDirty ? ' •' : '';
    const prefix = this.config.fileNamePrefix ?? '';

    if (fileName) {
      this.config.fileNameElement.textContent = `${prefix}${fileName}${dirtyIndicator}`;
      this.config.fileNameElement.classList.remove('is-new-patch');
    } else {
      this.config.fileNameElement.textContent = `${prefix}Untitled${dirtyIndicator}`;
      this.config.fileNameElement.classList.add('is-new-patch');
    }
  }

  /**
   * Update dirty state based on current vs original content
   */
  private updateDirtyState(): void {
    const currentContent = this.editorPanel.getEditor().getValue();
    const wasDirty = this._isDirty;
    this._isDirty = currentContent !== this.originalContent;

    if (wasDirty !== this._isDirty) {
      if (this.config.onDirtyChange) {
        this.config.onDirtyChange(this._isDirty);
      }
      this.updateFileTitle();
    }
  }

  /**
   * Set dirty state explicitly
   */
  private setDirty(isDirty: boolean): void {
    const wasDirty = this._isDirty;
    this._isDirty = isDirty;

    if (wasDirty !== isDirty) {
      if (this.config.onDirtyChange) {
        this.config.onDirtyChange(isDirty);
      }
      this.updateFileTitle();
    }
  }

  /**
   * Setup drop zone for drag-and-drop patch loading
   */
  private setupDropZone(): void {
    const editorElement = this.editorPanel.getEditor().getDomNode();
    if (!editorElement) return;

    editorElement.addEventListener('dragover', (event) => {
      if (!event.dataTransfer) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      editorElement.style.opacity = '0.7';
    });

    editorElement.addEventListener('dragleave', () => {
      editorElement.style.opacity = '1';
    });

    editorElement.addEventListener('drop', (event) => {
      if (!event.dataTransfer) return;

      event.preventDefault();
      editorElement.style.opacity = '1';

      const patchPath = event.dataTransfer.getData('patch-path');
      const patchName = event.dataTransfer.getData('patch-name');

      if (!patchPath) return;

      void this.load({ source: 'disk', filePath: patchPath, fileName: patchName });
    });
  }

  /**
   * Wire up button event handlers
   */
  private wireButtons(): void {
    const buttons = this.config.buttons;
    if (!buttons) return;

    if (buttons.run) {
      buttons.run.addEventListener('click', () => {
        this.config.onRun();
      });
    }

    if (buttons.new) {
      buttons.new.addEventListener('click', () => {
        void this.newPatch();
      });
    }

    if (buttons.save) {
      buttons.save.addEventListener('click', () => {
        void this.save();
      });
    }

    if (buttons.saveAs) {
      buttons.saveAs.addEventListener('click', () => {
        this.saveAs();
      });
    }

    if (buttons.revert) {
      buttons.revert.addEventListener('click', () => {
        void this.revert();
      });
    }
  }
}
