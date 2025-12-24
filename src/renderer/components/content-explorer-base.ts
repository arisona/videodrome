import { debounce, type DebouncedFunction } from '../../shared/debounce';

/**
 * Base interface for items that can be displayed in the explorer
 */
export interface ExplorerItem {
  path: string;
  name: string;
  relativePath: string;
  depth: number;
  isDirectory: boolean;
}

/**
 * Configuration for initializing the content explorer
 */
export interface ExplorerConfig<T extends ExplorerItem> {
  listElementId: string;
  searchInputId: string;
  searchClearBtnId: string;
  sidebarContentId: string;
  getItems: () => Promise<Array<T>>;
  onItemsChanged: (callback: (items: Array<T>) => void) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Abstract base class for content explorers (patches, media, etc.)
 * Provides common functionality for tree-based file/folder explorers with search
 */
export abstract class ContentExplorerBase<T extends ExplorerItem> {
  // State
  protected allItems: Array<T> = [];
  protected expandedFolders = new Set<string>();
  protected searchQuery = '';
  protected selectedPath: string | null = null;

  // DOM elements
  protected list: HTMLUListElement;
  protected searchInput: HTMLInputElement;
  protected searchClearBtn: HTMLButtonElement;
  protected sidebarContent: HTMLElement | null;

  // Configuration
  protected config: ExplorerConfig<T>;

  // Debounced search handler
  protected debouncedSearch: DebouncedFunction<() => void>;

  constructor(config: ExplorerConfig<T>) {
    this.config = config;

    this.list = document.getElementById(config.listElementId) as HTMLUListElement;
    this.searchInput = document.getElementById(config.searchInputId) as HTMLInputElement;
    this.searchClearBtn = document.getElementById(config.searchClearBtnId) as HTMLButtonElement;
    this.sidebarContent = document.getElementById(config.sidebarContentId);

    this.debouncedSearch = debounce(() => {
      this.searchQuery = this.searchInput.value.trim();
      this.updateClearButtonVisibility();
      this.renderList();
    }, SEARCH_DEBOUNCE_MS);

    this.setupEventListeners();
    this.setupLiveUpdates();
  }

  /**
   * Setup event listeners for search, selection, etc.
   */
  private setupEventListeners(): void {
    // Search functionality
    this.searchInput.addEventListener('input', () => {
      this.debouncedSearch();
    });

    this.searchClearBtn.addEventListener('click', () => {
      this.clearSearch();
    });

    // ESC key to clear search
    this.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.clearSearch();
      }
    });

    // Empty area handlers
    if (this.sidebarContent) {
      this.sidebarContent.addEventListener('contextmenu', (event) => {
        const target = event.target as HTMLElement;
        if (
          target === this.sidebarContent ||
          target === this.list ||
          (target.classList.contains('explorer-item') && !target.dataset.path)
        ) {
          event.preventDefault();
          this.onEmptyAreaContextMenu?.(event);
        }
      });

      // Click on empty area to deselect
      this.sidebarContent.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (
          target === this.sidebarContent ||
          target === this.list ||
          (target.classList.contains('explorer-item') && !target.dataset.path)
        ) {
          this.selectedPath = null;
          this.renderList();
        }
      });
    }
  }

  /**
   * Setup live updates from main process
   */
  private setupLiveUpdates(): void {
    this.config.onItemsChanged((items) => {
      this.allItems = items;
      if (this.selectedPath && !this.allItems.find((item) => item.path === this.selectedPath)) {
        this.selectedPath = null;
      }
      this.renderList();
    });
  }

  /**
   * Load items from the main process
   */
  public async loadItems(): Promise<void> {
    try {
      this.allItems = await this.config.getItems();
      this.renderList();
    } catch (error) {
      console.error('Error loading items:', error);
      this.list.innerHTML = '<li class="explorer-item">Error loading items</li>';
    }
  }

  /**
   * Clear search query and refresh list
   */
  protected clearSearch(): void {
    // Cancel any pending debounced search
    this.debouncedSearch.cancel();

    this.searchInput.value = '';
    this.searchQuery = '';
    this.updateClearButtonVisibility();
    this.renderList();
    this.searchInput.focus();
  }

  /**
   * Update visibility of the clear button based on search input
   */
  protected updateClearButtonVisibility(): void {
    if (this.searchInput.value.trim()) {
      this.searchClearBtn.classList.add('visible');
    } else {
      this.searchClearBtn.classList.remove('visible');
    }
  }

  /**
   * Expand all parent folders for a given file path
   */
  public expandFoldersForPath(filePath: string): void {
    const item = this.allItems.find((i) => i.path === filePath);
    if (!item) return;

    if (item.isDirectory) {
      this.expandedFolders.add(item.relativePath);
    }

    const parts = item.relativePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/');
      this.expandedFolders.add(parentPath);
    }

    this.renderList();
  }

  /**
   * Check if all parent folders of a path are expanded
   */
  protected isParentExpanded(relativePath: string): boolean {
    const parts = relativePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/');
      if (!this.expandedFolders.has(parentPath)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Toggle folder expansion state
   */
  protected toggleFolder(relativePath: string): void {
    if (this.expandedFolders.has(relativePath)) {
      this.expandedFolders.delete(relativePath);
    } else {
      this.expandedFolders.add(relativePath);
    }
    this.renderList();
  }

  /**
   * Select an item by path
   */
  protected selectItem(path: string): void {
    this.selectedPath = path;
  }

  /**
   * Get the currently selected path
   */
  public getSelectedPath(): string | null {
    return this.selectedPath;
  }

  /**
   * Render the list of items (tree or flat view based on search)
   */
  protected renderList(): void {
    if (this.allItems.length === 0) {
      this.list.innerHTML = '<li class="explorer-item">No items found</li>';
      return;
    }

    // Filter items based on search query
    const filteredItems = this.searchQuery
      ? this.allItems.filter((item) =>
          item.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
        )
      : this.allItems;

    if (filteredItems.length === 0) {
      this.list.innerHTML = '<li class="explorer-item">No matches found</li>';
      return;
    }

    this.list.innerHTML = '';

    // When searching, show flat list
    if (this.searchQuery) {
      filteredItems.forEach((item) => {
        if (item.isDirectory) return;
        const li = this.createListItem(item, true);
        this.list.appendChild(li);
      });
      return;
    }

    // Normal tree view
    filteredItems.forEach((item) => {
      const li = this.createListItem(item, false);

      // Hide if parent folder is collapsed
      if (item.depth > 0 && !this.isParentExpanded(item.relativePath)) {
        li.classList.add('hidden');
      }

      this.list.appendChild(li);
    });
  }

  /**
   * Create a list item element for an explorer item
   * Must be implemented by subclasses to provide specific rendering
   */
  protected abstract createListItem(item: T, showPath: boolean): HTMLLIElement;

  /**
   * Optional: Handle context menu on empty area
   */
  protected onEmptyAreaContextMenu?(event: MouseEvent): void;
}
