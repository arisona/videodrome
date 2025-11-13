/* eslint-env browser */

import { FILE_EXTENSIONS, STATUS_MESSAGES } from '../../shared/constants';
import { getSettings } from '../settings-service';

import { getFilename } from './path';

import type * as monaco from 'monaco-editor';

/**
 * User action for dirty content before loading new patch
 */
export type BeforeLoadAction = 'save' | 'discard' | 'cancel';

/**
 * Current patch state passed to onBeforeLoad callback
 */
export interface PatchState {
  content: string;
  filePath: string | null;
  fileName: string | null;
  isDirty: boolean;
}

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
 * Callbacks for patch operation events
 */
export interface PatchControllerCallbacks {
  /** Called when status message should be updated */
  onStatusUpdate: (message: string, isError?: boolean) => void;
  /** Called when dirty state changes */
  onDirtyChange: (isDirty: boolean) => void;
  /** Called when the loaded file changes (or is cleared) */
  onFileChange: (filePath: string | null, fileName: string | null) => void;
  /**
   * Called before loading new content when current content is dirty
   * Should prompt user and return their choice: 'save', 'discard', or 'cancel'
   * If not provided, defaults to 'discard' (no protection)
   */
  onBeforeLoad?: (currentState: PatchState) => Promise<BeforeLoadAction> | BeforeLoadAction;
  /** Called after a file is loaded (e.g., to run code) */
  onAfterLoad?: () => void;
  /** Called after a file is reverted (e.g., to run code) */
  onAfterRevert?: () => void;
}

/**
 * PatchController - Manages patch operations for a Monaco editor
 *
 * Encapsulates patch state (file path, dirty state, content) and operations (save, load, revert).
 * Works with both file-based patches and in-memory patches (no file connection).
 */
export class PatchController {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private callbacks: PatchControllerCallbacks;

  // File state
  private loadedFile: string | null = null;
  private originalContent = '';
  private _isDirty = false;

  constructor(editor: monaco.editor.IStandaloneCodeEditor, callbacks: PatchControllerCallbacks) {
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
      // No file loaded - can't save directly and caller should use triggerSaveAs()
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
   * Unified load method for all patch loading scenarios
   * Handles dirty state checking, user prompts, and various load sources
   */
  public async load(options: LoadOptions): Promise<boolean> {
    // Step 1: Check dirty state and handle user choice if needed
    if (this._isDirty && this.callbacks.onBeforeLoad) {
      const currentState: PatchState = {
        content: this.editor.getValue(),
        filePath: this.loadedFile,
        fileName: this.loadedFile ? getFilename(this.loadedFile) : null,
        isDirty: true,
      };

      const action = await this.callbacks.onBeforeLoad(currentState);

      if (action === 'cancel') {
        return false; // User cancelled, don't load
      }

      if (action === 'save') {
        // Try to save current content
        const saved = await this.save();
        if (!saved) {
          // Save failed, don't proceed with load
          return false;
        }
      }

      // If action === 'discard', just continue with load
    }

    // Step 2: Load content based on source type
    try {
      let contentToLoad: string;
      let newFilePath: string | null;
      let newFileName: string | null;
      let newOriginalContent: string;

      switch (options.source) {
        case 'disk': {
          // Load from disk
          if (!options.filePath || !options.fileName) {
            throw new Error('filePath and fileName required for disk source');
          }
          contentToLoad = await window.electronAPI.readPatch(options.filePath);
          newFilePath = options.filePath;
          newFileName = options.fileName;
          newOriginalContent = contentToLoad; // Disk content is the original
          break;
        }

        case 'memory': {
          // Load from memory (e.g., from another editor)
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
          // Create new patch
          contentToLoad = options.content ?? '';
          newFilePath = null;
          newFileName = null;
          newOriginalContent = '';
          break;
        }

        default:
          throw new Error(`Unknown source type: ${String(options.source)}`);
      }

      // Step 3: Update state and set editor content
      this.loadedFile = newFilePath;
      this.originalContent = newOriginalContent;

      // Setting editor value triggers onDidChangeModelContent which calculates dirty state
      this.editor.setValue(contentToLoad);

      // Step 4: Trigger callbacks
      this.callbacks.onFileChange(newFilePath, newFileName);
      this.callbacks.onStatusUpdate(STATUS_MESSAGES.READY);

      if (this.callbacks.onAfterLoad) {
        this.callbacks.onAfterLoad();
      }

      return true;
    } catch (error) {
      console.error('Error loading patch:', error);
      const errorMsg =
        options.source === 'disk' && options.fileName
          ? `Error loading ${options.fileName}`
          : 'Error loading patch';
      this.callbacks.onStatusUpdate(errorMsg, true);
      return false;
    }
  }

  /**
   * @deprecated Use load() with LoadOptions instead
   * Legacy method for backward compatibility during migration
   */
  public async loadFromDisk(filePath: string, fileName: string): Promise<boolean> {
    return this.load({ source: 'disk', filePath, fileName });
  }

  /**
   * @deprecated Use load() with LoadOptions instead
   * Legacy method for backward compatibility during migration
   */
  public loadFromContent(
    filePath: string,
    fileName: string,
    originalContent: string,
    currentContent: string,
  ): Promise<boolean> {
    return this.load({
      source: 'memory',
      filePath,
      fileName,
      content: currentContent,
      originalContent,
    });
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
   * Clear the loaded file and create a new patch
   * Note: This checks dirty state and may prompt the user
   */
  public async clearFile(): Promise<boolean> {
    return this.load({ source: 'new' });
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
