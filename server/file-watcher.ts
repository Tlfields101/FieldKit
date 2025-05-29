import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { storage } from './storage';
import { SUPPORTED_3D_FORMATS } from '@shared/schema';
import { generateThumbnail } from './thumbnail-generator';

class FileWatcher {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();

  async addWatchFolder(folderPath: string): Promise<void> {
    if (this.watchers.has(folderPath)) {
      return; // Already watching
    }

    // Create or update folder in storage
    let folder = await storage.getFolderByPath(folderPath);
    if (!folder) {
      folder = await storage.createFolder({
        path: folderPath,
        name: path.basename(folderPath),
        parentId: null,
        isWatched: true,
        lastScanned: new Date(),
      });
    }

    // Perform initial scan
    await this.scanFolder(folderPath);

    // Start watching
    const watcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files
    });

    watcher
      .on('add', async (filePath) => {
        if (this.is3DFile(filePath)) {
          await this.processAsset(filePath);
        }
      })
      .on('change', async (filePath) => {
        if (this.is3DFile(filePath)) {
          await this.processAsset(filePath);
        }
      })
      .on('unlink', async (filePath) => {
        const asset = await storage.getAssetByPath(filePath);
        if (asset) {
          await storage.deleteAsset(asset.id);
        }
      })
      .on('error', (error) => {
        console.error('File watcher error:', error);
      });

    this.watchers.set(folderPath, watcher);
  }

  async removeWatchFolder(folderPath: string): Promise<void> {
    const watcher = this.watchers.get(folderPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(folderPath);
    }

    // Update folder in storage
    const folder = await storage.getFolderByPath(folderPath);
    if (folder) {
      await storage.updateFolder(folder.id, { isWatched: false });
    }
  }

  private async scanFolder(folderPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        
        if (entry.isDirectory()) {
          // Create subfolder entry
          const existingFolder = await storage.getFolderByPath(fullPath);
          if (!existingFolder) {
            const parentFolder = await storage.getFolderByPath(folderPath);
            await storage.createFolder({
              path: fullPath,
              name: entry.name,
              parentId: parentFolder?.id || null,
              isWatched: false,
              lastScanned: new Date(),
            });
          }
          
          // Recursively scan subfolders
          await this.scanFolder(fullPath);
        } else if (this.is3DFile(fullPath)) {
          await this.processAsset(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning folder ${folderPath}:`, error);
    }
  }

  private async processAsset(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if asset already exists
      let asset = await storage.getAssetByPath(filePath);
      
      if (asset) {
        // Update existing asset if modified
        if (stats.mtime > asset.lastModified) {
          const thumbnailPath = await generateThumbnail(filePath);
          await storage.updateAsset(asset.id, {
            filesize: stats.size,
            lastModified: stats.mtime,
            thumbnailPath,
          });
        }
      } else {
        // Create new asset
        const thumbnailPath = await generateThumbnail(filePath);
        await storage.createAsset({
          filename: path.basename(filePath),
          filepath: filePath,
          filesize: stats.size,
          filetype: ext,
          thumbnailPath,
          tags: [],
          metadata: JSON.stringify({
            directory: path.dirname(filePath),
            extension: ext,
          }),
          lastModified: stats.mtime,
        });
      }
    } catch (error) {
      console.error(`Error processing asset ${filePath}:`, error);
    }
  }

  private is3DFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_3D_FORMATS.includes(ext as any);
  }

  async getWatchedFolders(): Promise<string[]> {
    return Array.from(this.watchers.keys());
  }

  async stopAll(): Promise<void> {
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
    this.watchers.clear();
  }
}

export const fileWatcher = new FileWatcher();
