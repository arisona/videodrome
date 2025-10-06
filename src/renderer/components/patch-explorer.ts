/* eslint-env browser */

import { getSettings } from '../settings-service';
import { getDirectoryFromPath } from '../utils/path';

import { ContentExplorerBase, type ExplorerConfig } from './content-explorer-base';

import type { PatchFile } from '../../shared/types';

const INPUT_BLUR_DELAY_MS = 200;

/**
 * Validates a filename or folder name for security (client-side UX validation)
 * NOTE: This is a duplicate of the validation in src/main/path-security.ts
 * The main process performs the authoritative security validation.
 * This client-side check is solely for providing immediate user feedback.
 * @see src/main/path-security.ts for the security boundary validation
 */
function isValidName(name: string): boolean {
  if (!name || name.trim() === '') {
    return false;
  }

  // Reject names containing path separators
  if (name.includes('/') || name.includes('\\')) {
    return false;
  }

  // Reject path traversal attempts
  if (name === '..' || name === '.') {
    return false;
  }

  // Reject null bytes (security risk)
  if (name.includes('\0')) {
    return false;
  }

  // Reject names starting with ./ or .\
  if (name.startsWith('./') || name.startsWith('.\\')) {
    return false;
  }

  return true;
}

/**
 * Sanitizes a filename by removing dangerous characters (client-side UX helper)
 * NOTE: This is a duplicate of the sanitization in src/main/path-security.ts
 * The main process performs the authoritative security sanitization.
 * This client-side sanitization is solely for providing immediate user feedback.
 * @see src/main/path-security.ts for the security boundary sanitization
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}

// Callbacks for patch actions
interface PatchActionCallbacks {
  onPatchDoubleClick: (patchPath: string, patchName: string) => void;
  onPatchDragStart: (patchPath: string, patchName: string) => void;
}

/**
 * Patch Explorer - extends ContentExplorerBase with patch-specific functionality
 */
class PatchExplorer extends ContentExplorerBase<PatchFile> {
  private callbacks: PatchActionCallbacks;

  constructor(config: ExplorerConfig<PatchFile>, callbacks: PatchActionCallbacks) {
    super(config);
    this.callbacks = callbacks;

    // Setup patch-specific event listeners
    this.setupPatchEventListeners();
  }

  /**
   * Setup patch-specific event listeners
   */
  private setupPatchEventListeners(): void {
    // Setup new patch button
    document.getElementById('new-patch-btn')?.addEventListener('click', () => {
      this.dispatchNewPatchEvent();
    });

    // Listen for custom events
    window.addEventListener('patch-explorer-new-patch', () => {
      // Event handled elsewhere
    });

    // Listen for reveal-file-in-explorer events
    window.addEventListener('reveal-file-in-explorer', (event) => {
      const customEvent = event as CustomEvent<{ filePath: string }>;

      // Switch to patches tab to show the explorer
      window.dispatchEvent(new CustomEvent('switch-to-patches-tab'));

      this.selectAndRevealFile(customEvent.detail.filePath);
    });
  }

  /**
   * Select and reveal a file in the explorer
   * Expands parent folders, selects the item, and scrolls it into view
   */
  public selectAndRevealFile(filePath: string): void {
    // Expand parent folders
    this.expandFoldersForPath(filePath);

    // Select the item
    this.selectItem(filePath);

    // Re-render to show the selection
    this.renderList();

    // Scroll the item into view
    this.list
      .querySelector<HTMLElement>(`[data-path="${filePath}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Get the target directory for saving files
   * Priority: 1) Selected folder or directory of selected file, 2) Directory of current file, 3) Root patch directory
   */
  public getTargetSaveDirectory(
    currentFilePath: string | null,
    rootPatchDirectory: string,
  ): string {
    // If something is selected in the explorer
    if (this.selectedPath) {
      const selected = this.allItems.find((p) => p.path === this.selectedPath);
      if (selected?.isDirectory) {
        // If a folder is selected, use it
        return this.selectedPath;
      } else if (selected) {
        // If a file is selected, use its directory
        return getDirectoryFromPath(this.selectedPath);
      }
    }

    // If there's a currently loaded file, use its directory
    if (currentFilePath) {
      return getDirectoryFromPath(currentFilePath);
    }

    // Fall back to root patch directory
    return rootPatchDirectory;
  }

  /**
   * Create inline patch editor
   */
  public createInlinePatchEditor(
    initialValue: string,
    onSave: (filename: string) => Promise<void>,
  ): void {
    this.createInlineInput('Enter patch name...', initialValue, onSave);
  }

  /**
   * Dispatch event to request a new patch from the editor
   */
  private dispatchNewPatchEvent(): void {
    window.dispatchEvent(new CustomEvent('patch-explorer-new-patch'));
  }

  /**
   * Override: Handle context menu on empty area
   */
  protected onEmptyAreaContextMenu(event: MouseEvent): void {
    this.showRootContextMenu(event);
  }

  /**
   * Create a list item element for a patch
   */
  protected createListItem(patch: PatchFile, showPath: boolean): HTMLLIElement {
    const li = document.createElement('li');
    li.className = patch.isDirectory ? 'explorer-item folder' : 'explorer-item';
    li.dataset.path = patch.path;
    li.dataset.name = patch.name;
    li.dataset.relativePath = patch.relativePath;
    li.dataset.depth = patch.depth.toString();

    if (showPath) {
      // No indentation in search results
      li.style.paddingLeft = '8px';
    } else {
      // Expand/collapse icon for folders only (in normal tree view)
      if (patch.isDirectory) {
        // Add indentation based on depth
        li.style.paddingLeft = `${String(8 + patch.depth * 12)}px`;

        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.classList.add(
          this.expandedFolders.has(patch.relativePath) ? 'expanded' : 'collapsed',
        );
        expandIcon.addEventListener('click', (event) => {
          event.stopPropagation();
          this.toggleFolder(patch.relativePath);
        });
        li.appendChild(expandIcon);
      } else {
        // Add indentation based on depth + extra space to compensate for missing expand icon
        li.style.paddingLeft = `${String(8 + patch.depth * 12 + 22)}px`;
      }
    }

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = patch.name;
    li.appendChild(nameSpan);

    // Show relative path in search results
    if (showPath && patch.relativePath.includes('/')) {
      const pathSpan = document.createElement('span');
      pathSpan.className = 'item-path';
      const folderPath = patch.relativePath.split('/').slice(0, -1).join('/');
      pathSpan.textContent = `(${folderPath})`;
      li.appendChild(pathSpan);
    }

    // Selection state
    if (this.selectedPath === patch.path) {
      li.classList.add('selected');
    }

    // Folder click handler
    if (patch.isDirectory) {
      li.addEventListener('click', (_event) => {
        // Single click: select AND toggle expand/collapse
        this.selectItem(patch.path);
        this.toggleFolder(patch.relativePath);
      });

      li.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this.selectItem(patch.path);
        this.renderList();
        this.showPatchContextMenu(event, patch.path, patch.name, true);
      });
    } else {
      // Patch file handlers
      li.draggable = true;

      li.addEventListener('click', (_event) => {
        // Single click: select
        this.selectItem(patch.path);
        this.renderList();
      });

      li.addEventListener('dragstart', (event) => {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData('patch-path', patch.path);
        event.dataTransfer.setData('patch-name', patch.name);
        event.dataTransfer.effectAllowed = 'copy';
        this.callbacks.onPatchDragStart(patch.path, patch.name);
      });

      li.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this.selectItem(patch.path);
        this.renderList();
        this.showPatchContextMenu(event, patch.path, patch.name, patch.isDirectory);
      });

      li.addEventListener('dblclick', () => {
        this.callbacks.onPatchDoubleClick(patch.path, patch.name);
      });
    }

    return li;
  }

  /**
   * Root context menu (for empty area)
   */
  private showRootContextMenu(event: MouseEvent): void {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${String(event.clientX)}px`;
    menu.style.top = `${String(event.clientY)}px`;

    const settings = getSettings();
    const patchDir = settings.patchDirectory;

    const menuItems: Array<
      { separator: true } | { label: string; action: () => void | Promise<void> }
    > = [
      {
        label: 'New Patch...',
        action: () => {
          this.createNewPatchInFolder(patchDir);
        },
      },
      {
        label: 'New Folder...',
        action: () => {
          this.createNewFolderInFolder(patchDir);
        },
      },
    ];

    menuItems.forEach((item) => {
      if ('separator' in item) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        menu.appendChild(separator);
      } else if ('label' in item) {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.addEventListener('click', () => {
          if (typeof item.action === 'function') {
            void item.action();
          }
          menu.remove();
        });
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  /**
   * Context menu functionality for patches/folders
   */
  private showPatchContextMenu(
    event: MouseEvent,
    patchPath: string,
    patchName: string,
    isDirectory: boolean,
  ): void {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${String(event.clientX)}px`;
    menu.style.top = `${String(event.clientY)}px`;

    const menuItems: Array<
      { separator: true } | { label: string; danger?: boolean; action: () => void | Promise<void> }
    > = [];

    if (isDirectory) {
      // Folder context menu
      menuItems.push(
        {
          label: 'New Patch...',
          action: () => {
            this.createNewPatchInFolder(patchPath);
          },
        },
        {
          label: 'New Folder...',
          action: () => {
            this.createNewFolderInFolder(patchPath);
          },
        },
        { separator: true },
        {
          label: 'Rename...',
          action: () => {
            this.renameItem(patchPath, patchName, true);
          },
        },
        { separator: true },
        {
          label: 'Delete Folder',
          danger: true,
          action: () => {
            void this.deleteItem(patchPath, patchName, true);
          },
        },
      );
    } else {
      // Patch file context menu
      menuItems.push(
        {
          label: 'Open in Composer',
          action: () => {
            window.dispatchEvent(
              new CustomEvent('patch-explorer-open-patch', {
                detail: { patchPath, patchName, target: 'composer' },
              }),
            );
          },
        },
        {
          label: 'Open in Performer Slot A',
          action: () => {
            window.dispatchEvent(
              new CustomEvent('patch-explorer-open-patch', {
                detail: { patchPath, patchName, target: 'performer-a' },
              }),
            );
          },
        },
        {
          label: 'Open in Performer Slot B',
          action: () => {
            window.dispatchEvent(
              new CustomEvent('patch-explorer-open-patch', {
                detail: { patchPath, patchName, target: 'performer-b' },
              }),
            );
          },
        },
        { separator: true },
        {
          label: 'Rename...',
          action: () => {
            this.renameItem(patchPath, patchName, false);
          },
        },
        {
          label: 'Duplicate',
          action: () => {
            void this.duplicatePatch(patchPath, patchName);
          },
        },
        { separator: true },
        {
          label: 'Delete',
          danger: true,
          action: () => {
            void this.deleteItem(patchPath, patchName, false);
          },
        },
      );
    }

    menuItems.forEach((item) => {
      if ('separator' in item) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        menu.appendChild(separator);
      } else if ('label' in item) {
        const menuItem = document.createElement('div');
        menuItem.className = `context-menu-item${item.danger ? ' danger' : ''}`;
        menuItem.textContent = item.label;
        menuItem.addEventListener('click', () => {
          if (typeof item.action === 'function') {
            void item.action();
          }
          menu.remove();
        });
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

    // Close menu on click outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  /**
   * Duplicate a patch
   */
  private async duplicatePatch(patchPath: string, patchName: string): Promise<void> {
    try {
      const content = await window.electronAPI.readPatch(patchPath);
      const settings = getSettings();
      const patchDir = settings.patchDirectory;

      // Generate a unique name
      const baseName = patchName.replace('.js', '');
      const newName = `${baseName}-copy`;

      this.createInlinePatchEditor(newName, async (filename) => {
        const finalFilename = filename.endsWith('.js') ? filename : `${filename}.js`;
        const filePath = `${patchDir}/${finalFilename}`;

        try {
          await window.electronAPI.savePatch(filePath, content);
          await this.loadItems();
        } catch (error) {
          console.error('Error duplicating patch:', error);
        }
      });
    } catch (error) {
      console.error('Error duplicating patch:', error);
    }
  }

  /**
   * Rename patch or folder
   */
  private renameItem(oldPath: string, oldName: string, isDirectory: boolean): void {
    const nameWithoutExt = oldName.replace(/\.js$/, '');

    this.createInlineInput(
      `Rename ${isDirectory ? 'folder' : 'patch'}`,
      nameWithoutExt,
      async (newName) => {
        if (newName === nameWithoutExt) {
          return;
        }

        const finalName = isDirectory
          ? newName
          : newName.endsWith('.js')
            ? newName
            : `${newName}.js`;

        try {
          await window.electronAPI.renamePatch(oldPath, finalName);
          await this.loadItems();
        } catch (error) {
          console.error('Error renaming:', error);
          alert(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    );
  }

  /**
   * Delete patch or folder
   */
  private async deleteItem(
    itemPath: string,
    itemName: string,
    isDirectory: boolean,
  ): Promise<void> {
    const itemType = isDirectory ? 'folder' : 'patch';
    const message = isDirectory
      ? `Are you sure you want to delete the folder "${itemName}" and all its contents?`
      : `Are you sure you want to delete "${itemName}"?`;

    const confirmed = confirm(message);
    if (!confirmed) {
      return;
    }

    try {
      await window.electronAPI.deletePatch(itemPath, isDirectory);
      await this.loadItems();
    } catch (error) {
      console.error(`Error deleting ${itemType}:`, error);
      alert(
        `Failed to delete ${itemType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create new folder
   */
  private createNewFolderInFolder(parentPath: string): void {
    this.createInlineInput('New folder name', '', async (folderName) => {
      try {
        await window.electronAPI.createFolder(parentPath, folderName);
        // Expand the parent folder
        const parentRelativePath = this.allItems.find((p) => p.path === parentPath)?.relativePath;
        if (parentRelativePath) {
          this.expandedFolders.add(parentRelativePath);
        }
        await this.loadItems();
      } catch (error) {
        console.error('Error creating folder:', error);
        alert(
          `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  /**
   * Create new patch in folder
   */
  private createNewPatchInFolder(folderPath: string): void {
    this.createInlineInput('New patch name (without .js)', '', async (patchName) => {
      const finalFilename = patchName.endsWith('.js') ? patchName : `${patchName}.js`;
      const filePath = `${folderPath}/${finalFilename}`;

      const defaultContent = `// New patch
osc(10, 0.1, 1)
  .kaleid(4)
  .out()`;

      try {
        await window.electronAPI.savePatch(filePath, defaultContent);
        // Expand the parent folder
        const parentRelativePath = this.allItems.find((p) => p.path === folderPath)?.relativePath;
        if (parentRelativePath) {
          this.expandedFolders.add(parentRelativePath);
        }
        await this.loadItems();
      } catch (error) {
        console.error('Error creating patch:', error);
        alert(
          `Failed to create patch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  /**
   * Helper function for inline input editing
   */
  private createInlineInput(
    placeholder: string,
    initialValue: string,
    onSave: (value: string) => Promise<void>,
    insertBefore?: HTMLElement | null,
  ): void {
    const li = document.createElement('li');
    li.className = 'explorer-item editing new-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = initialValue;

    li.appendChild(input);
    if (insertBefore?.parentNode) {
      insertBefore.parentNode.insertBefore(li, insertBefore);
    } else {
      this.list.insertBefore(li, this.list.firstChild);
    }

    input.focus();
    if (initialValue) {
      input.select();
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = input.value.trim();

        if (!value) {
          li.remove();
          return;
        }

        // Validate the name before saving
        if (!isValidName(value)) {
          alert(
            'Invalid name: File and folder names cannot contain path separators (/ or \\) or path traversal sequences (..).',
          );
          return;
        }

        // Sanitize as an extra precaution
        const sanitized = sanitizeFilename(value);

        void onSave(sanitized).finally(() => {
          li.remove();
        });
      } else if (event.key === 'Escape') {
        event.preventDefault();
        li.remove();
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (li.parentNode) {
          li.remove();
        }
      }, INPUT_BLUR_DELAY_MS);
    };

    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('blur', handleBlur);
  }
}

// Module-level instance
let patchExplorer: PatchExplorer;

// Initialize the patch explorer
export function initPatchExplorer(actionCallbacks: PatchActionCallbacks): void {
  const config: ExplorerConfig<PatchFile> = {
    listElementId: 'patch-list',
    searchInputId: 'patch-search-input',
    searchClearBtnId: 'patch-search-clear',
    sidebarContentId: 'sidebar-content',
    getItems: () => window.electronAPI.listPatches(),
    onItemsChanged: (callback) => {
      window.electronAPI.onPatchesChanged(callback);
    },
  };

  patchExplorer = new PatchExplorer(config, actionCallbacks);
}

// Load patches from the main process
export async function loadPatches(): Promise<void> {
  await patchExplorer.loadItems();
}

// Expand all parent folders for a given file path
export function expandFoldersForPath(filePath: string): void {
  patchExplorer.expandFoldersForPath(filePath);
}

// Get the target directory for saving files
export function getTargetSaveDirectory(
  currentFilePath: string | null,
  rootPatchDirectory: string,
): string {
  return patchExplorer.getTargetSaveDirectory(currentFilePath, rootPatchDirectory);
}

// Public API for creating inline patch editor
export function createInlinePatchEditor(
  initialValue: string,
  onSave: (filename: string) => Promise<void>,
): void {
  patchExplorer.createInlinePatchEditor(initialValue, onSave);
}

// Select and reveal a file in the explorer
export function selectAndRevealFile(filePath: string): void {
  patchExplorer.selectAndRevealFile(filePath);
}
