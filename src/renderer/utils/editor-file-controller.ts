/* eslint-env browser */

import { FILE_EXTENSIONS, STATUS_MESSAGES } from '../../shared/constants';
import { getSettings } from '../settings-service';

import { getFilename } from './path';

import type * as monaco from 'monaco-editor';

/**
 * Callbacks for file operation events
 */
export interface FileControllerCallbacks {
  /** Called when status message should be updated */
  onStatusUpdate: (message: string, isError?: boolean) => void;
  /** Called when dirty state changes */
  onDirtyChange: (isDirty: boolean) => void;
  /** Called when the loaded file changes (or is cleared) */
  onFileChange: (filePath: string | null, fileName: string | null) => void;
  /** Called after a file is loaded (e.g., to run code) */
  onAfterLoad?: () => void;
  /** Called after a file is reverted (e.g., to run code) */
  onAfterRevert?: () => void;
}

/**
 * EditorFileController - Manages file operations for a Monaco editor
 *
 * Encapsulates file state (loadedFile, isDirty, originalContent) and operations (save, load, revert).
 * Works with both saved files and "new patches" (no file connection).
 */
export class EditorFileController {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private callbacks: FileControllerCallbacks;

  // File state
  private loadedFile: string | null = null;
  private originalContent = '';
  private _isDirty = false;

  constructor(editor: monaco.editor.IStandaloneCodeEditor, callbacks: FileControllerCallbacks) {
    this.editor = editor;
    this.callbacks = callbacks;

    // Listen to editor changes to update dirty state
    this.editor.onDidChangeModelContent(() => {
      this.updateDirtyState();
    });
  }

  /**
   * Save the current content to the loaded file
   * If no file is loaded, triggers Save As instead
   */
  public async save(): Promise<boolean> {
    if (!this.loadedFile) {
      // No file loaded - can't save directly
      // Caller should handle Save As through triggerSaveAs()
      this.callbacks.onStatusUpdate('No file to save. Use Save As instead.', true);
      return false;
    }

    const content = this.editor.getValue();

    try {
      await window.electronAPI.savePatch(this.loadedFile, content);
      this.originalContent = content;
      this.setDirty(false);

      this.callbacks.onStatusUpdate(STATUS_MESSAGES.READY);
      return true;
    } catch (error) {
      console.error('Error saving patch:', error);
      this.callbacks.onStatusUpdate('Error saving patch', true);
      return false;
    }
  }

  /**
   * Load a file into the editor
   */
  public async load(filePath: string, fileName: string): Promise<boolean> {
    try {
      const content = await window.electronAPI.readPatch(filePath);
      this.editor.setValue(content);
      this.loadedFile = filePath;
      this.originalContent = content;
      this.setDirty(false);

      this.callbacks.onFileChange(filePath, fileName);
      this.callbacks.onStatusUpdate(STATUS_MESSAGES.READY);

      // Execute post-load callback (e.g., run code)
      if (this.callbacks.onAfterLoad) {
        this.callbacks.onAfterLoad();
      }

      return true;
    } catch (error) {
      console.error('Error loading patch:', error);
      this.callbacks.onStatusUpdate(`Error loading ${fileName}`, true);
      return false;
    }
  }

  /**
   * Load content that's already in memory (e.g., from another editor)
   * Similar to load() but doesn't read from disk
   */
  public loadFromContent(
    filePath: string,
    fileName: string,
    originalContent: string,
    currentContent: string,
  ): void {
    // Set file reference and original content BEFORE setting editor value
    // This ensures dirty state is calculated correctly when editor content changes
    this.loadedFile = filePath;
    this.originalContent = originalContent;

    // Setting editor value triggers onDidChangeModelContent which calls updateDirtyState()
    // The dirty state will be automatically calculated by comparing currentContent with originalContent
    this.editor.setValue(currentContent);

    this.callbacks.onFileChange(filePath, fileName);
    this.callbacks.onStatusUpdate(STATUS_MESSAGES.READY);

    // Execute post-load callback (e.g., run code)
    if (this.callbacks.onAfterLoad) {
      this.callbacks.onAfterLoad();
    }
  }

  /**
   * Revert the editor to the last saved state
   */
  public async revert(): Promise<boolean> {
    if (!this.loadedFile) {
      this.callbacks.onStatusUpdate('No file to revert', true);
      return false;
    }

    try {
      const content = await window.electronAPI.readPatch(this.loadedFile);
      this.editor.setValue(content);
      this.originalContent = content;
      this.setDirty(false);

      const fileName = getFilename(this.loadedFile);
      this.callbacks.onStatusUpdate(`Reverted: ${fileName}`);

      // Execute post-revert callback (e.g., run code)
      if (this.callbacks.onAfterRevert) {
        this.callbacks.onAfterRevert();
      }

      return true;
    } catch (error) {
      console.error('Error reverting patch:', error);
      this.callbacks.onStatusUpdate('Error reverting patch', true);
      return false;
    }
  }

  /**
   * Trigger a Save As operation by dispatching a custom event
   * The event is handled by editor.ts to show the inline save dialog
   */
  public triggerSaveAs(eventName: string, additionalData?: Record<string, unknown>): void {
    const content = this.editor.getValue();
    const settings = getSettings();
    const rootPatchDir = settings.patchDirectory;

    const initialValue = this.loadedFile
      ? getFilename(this.loadedFile).replace(FILE_EXTENSIONS.PATCH, '')
      : 'patch';

    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          initialValue,
          content,
          currentFilePath: this.loadedFile,
          rootPatchDir,
          ...additionalData,
        },
      }),
    );
  }

  /**
   * Called after a successful Save As operation to update file state
   */
  public onSaveAsComplete(filePath: string, content: string): void {
    this.loadedFile = filePath;
    this.originalContent = content;
    this.setDirty(false);

    const fileName = getFilename(filePath);
    this.callbacks.onFileChange(filePath, fileName);
    this.callbacks.onStatusUpdate(STATUS_MESSAGES.READY);
  }

  /**
   * Clear the loaded file (for creating a new patch)
   */
  public clearFile(): void {
    this.loadedFile = null;
    this.originalContent = '';
    this.editor.setValue('');
    this.setDirty(false);
    this.callbacks.onFileChange(null, null);
    this.callbacks.onStatusUpdate(STATUS_MESSAGES.READY);
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
   * Check if this is a new patch (no file loaded)
   */
  public isNewPatch(): boolean {
    return this.loadedFile === null;
  }

  /**
   * Get the original content (last saved or loaded state)
   */
  public getOriginalContent(): string {
    return this.originalContent;
  }

  /**
   * Update dirty state based on current vs original content
   */
  private updateDirtyState(): void {
    const currentContent = this.editor.getValue();
    const wasDirty = this._isDirty;
    this._isDirty = currentContent !== this.originalContent;

    if (wasDirty !== this._isDirty) {
      this.callbacks.onDirtyChange(this._isDirty);
    }
  }

  /**
   * Set dirty state explicitly
   */
  private setDirty(isDirty: boolean): void {
    const wasDirty = this._isDirty;
    this._isDirty = isDirty;

    if (wasDirty !== isDirty) {
      this.callbacks.onDirtyChange(isDirty);
    }
  }
}
