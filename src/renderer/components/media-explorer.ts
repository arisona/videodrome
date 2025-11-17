/* eslint-env browser */

import { ContentExplorerBase, type ExplorerConfig } from './content-explorer-base';
import { PreviewGenerator } from './preview-generator';

import type { MediaFile, MediaType } from '../../shared/ipc-types';
import type { HydraSourceSlot } from 'hydra-synth';

// Callbacks for media actions
interface MediaActionCallbacks {
  onMediaSelect: (
    mediaPath: string,
    mediaName: string,
    sourceSlot: HydraSourceSlot,
    mediaType: MediaType,
  ) => void;
}

/**
 * Media Explorer - extends ContentExplorerBase with media-specific functionality
 */
class MediaExplorer extends ContentExplorerBase<MediaFile> {
  private callbacks: MediaActionCallbacks;
  private previewGenerator: PreviewGenerator;
  private regeneratePreviewsBtn!: HTMLButtonElement;

  constructor(config: ExplorerConfig<MediaFile>, callbacks: MediaActionCallbacks) {
    super(config);
    this.callbacks = callbacks;
    this.previewGenerator = new PreviewGenerator();

    // Setup media-specific event listeners
    this.setupMediaEventListeners();
  }

  /**
   * Setup media-specific event listeners
   */
  private setupMediaEventListeners(): void {
    // Setup regenerate previews button
    this.regeneratePreviewsBtn = document.getElementById(
      'regenerate-previews-btn',
    ) as HTMLButtonElement;
    this.regeneratePreviewsBtn.addEventListener('click', () => {
      if (this.regeneratePreviewsBtn.disabled) return;

      this.searchInput.disabled = true;
      this.searchClearBtn.disabled = true;
      this.regeneratePreviewsBtn.disabled = true;

      void (async () => {
        try {
          await this.triggerPreviewRegeneration();
        } finally {
          this.searchInput.disabled = false;
          this.searchClearBtn.disabled = false;
          this.regeneratePreviewsBtn.disabled = false;
        }
      })();
    });
  }

  /**
   * Trigger preview regeneration
   */
  private async triggerPreviewRegeneration(): Promise<void> {
    try {
      // Show a temporary message
      this.list.innerHTML = '<li class="explorer-item">Generating previews: 0 of 0...</li>';

      // Generate previews for all media files
      await this.previewGenerator.generateAllPreviews(this.allItems, (current, total) => {
        this.list.innerHTML = `<li class="explorer-item">Generating previews: ${String(current)} of ${String(total)}...</li>`;
      });

      // Reload media list to show the new previews
      this.renderList();
    } catch (error) {
      console.error('Error triggering preview generation:', error);
      this.list.innerHTML = '<li class="explorer-item">Error generating previews</li>';
    }
  }

  /**
   * Create a list item element for a media file
   */
  protected createListItem(media: MediaFile, showPath: boolean): HTMLLIElement {
    const li = document.createElement('li');
    li.className = media.isDirectory ? 'explorer-item folder' : 'explorer-item media-file';
    li.dataset.path = media.path;
    li.dataset.name = media.name;
    li.dataset.relativePath = media.relativePath;
    li.dataset.depth = media.depth.toString();

    if (showPath) {
      li.style.paddingLeft = '8px';
    } else {
      if (media.isDirectory) {
        li.style.paddingLeft = `${String(8 + media.depth * 12)}px`;

        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.classList.add(
          this.expandedFolders.has(media.relativePath) ? 'expanded' : 'collapsed',
        );
        expandIcon.addEventListener('click', (event) => {
          event.stopPropagation();
          this.toggleFolder(media.relativePath);
        });
        li.appendChild(expandIcon);
      } else {
        li.style.paddingLeft = `${String(8 + media.depth * 12 + 22)}px`;
      }
    }

    if (media.isDirectory) {
      // Folder: show name inline
      const nameSpan = document.createElement('span');
      nameSpan.className = 'item-name';
      nameSpan.textContent = media.name;
      li.appendChild(nameSpan);
    } else {
      // Media file: show preview (if available) above filename
      const previewDataUrl = this.previewGenerator.getPreviewDataUrl(media.path);
      if (previewDataUrl) {
        const preview = document.createElement('div');
        preview.className = 'media-preview';
        preview.style.backgroundImage = `url("${previewDataUrl}")`;
        li.appendChild(preview);
      } else if (media.type !== undefined && typeof media.mtime === 'number') {
        // Generate preview (queueing handled internally by generatePreview)
        const { type, mtime } = media;
        void (async () => {
          const dataUrl = await this.previewGenerator.generatePreview(media.path, type, mtime);
          if (dataUrl) {
            const preview = document.createElement('div');
            preview.className = 'media-preview';
            preview.style.backgroundImage = `url("${dataUrl}")`;
            // Insert at the beginning of li
            li.insertBefore(preview, li.firstChild);
          }
        })();
      }

      // Filename and path container on same line
      const fileInfoContainer = document.createElement('div');
      fileInfoContainer.className = 'media-file-info';

      const filenameSpan = document.createElement('span');
      filenameSpan.className = 'media-filename';
      filenameSpan.textContent = media.name;
      fileInfoContainer.appendChild(filenameSpan);

      // Show relative path in search results
      if (showPath && media.relativePath.includes('/')) {
        const pathSpan = document.createElement('span');
        pathSpan.className = 'item-path';
        const folderPath = media.relativePath.split('/').slice(0, -1).join('/');
        pathSpan.textContent = `(${folderPath})`;
        fileInfoContainer.appendChild(pathSpan);
      }

      li.appendChild(fileInfoContainer);
    }

    // Selection state
    if (this.selectedPath === media.path) {
      li.classList.add('selected');
    }

    // Folder click handler
    if (media.isDirectory) {
      li.addEventListener('click', (_event) => {
        this.selectItem(media.path);
        this.toggleFolder(media.relativePath);
      });
    } else {
      // Media file handlers
      li.addEventListener('click', (_event) => {
        this.selectItem(media.path);
        this.renderList();
      });

      li.addEventListener('contextmenu', (event) => {
        if (!media.type) return;

        event.preventDefault();
        this.selectItem(media.path);
        this.renderList();
        this.showMediaContextMenu(event, media.path, media.name, media.type);
      });
    }

    return li;
  }

  /**
   * Context menu for media files
   */
  private showMediaContextMenu(
    event: MouseEvent,
    mediaPath: string,
    mediaName: string,
    mediaType: MediaType,
  ): void {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${String(event.clientX)}px`;
    menu.style.top = `${String(event.clientY)}px`;

    const menuItems = [
      {
        label: 'Assign to s0',
        action: () => {
          this.callbacks.onMediaSelect(mediaPath, mediaName, 's0', mediaType);
        },
      },
      {
        label: 'Assign to s1',
        action: () => {
          this.callbacks.onMediaSelect(mediaPath, mediaName, 's1', mediaType);
        },
      },
      {
        label: 'Assign to s2',
        action: () => {
          this.callbacks.onMediaSelect(mediaPath, mediaName, 's2', mediaType);
        },
      },
      {
        label: 'Assign to s3',
        action: () => {
          this.callbacks.onMediaSelect(mediaPath, mediaName, 's3', mediaType);
        },
      },
    ];

    menuItems.forEach((item) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      menuItem.textContent = item.label;
      menuItem.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      menu.appendChild(menuItem);
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
}

// Module-level instance
let mediaExplorer: MediaExplorer;

// Initialize the media explorer
export function initMediaExplorer(actionCallbacks: MediaActionCallbacks): void {
  const config: ExplorerConfig<MediaFile> = {
    listElementId: 'media-list',
    searchInputId: 'media-search-input',
    searchClearBtnId: 'media-search-clear',
    sidebarContentId: 'sidebar-content',
    getItems: () => window.electronAPI.listMedia(),
    onItemsChanged: (callback) => {
      window.electronAPI.onMediaChanged(callback);
    },
  };

  mediaExplorer = new MediaExplorer(config, actionCallbacks);
}

// Load media files from the main process
export async function loadMedia(): Promise<void> {
  await mediaExplorer.loadItems();
}

// Expand all parent folders for a given file path
export function expandFoldersForPath(filePath: string): void {
  mediaExplorer.expandFoldersForPath(filePath);
}
