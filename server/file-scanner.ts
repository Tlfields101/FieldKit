import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import type { InsertAsset, InsertFolder } from '@shared/schema';
import { storage } from './storage';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class FileScanner {
  private supportedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.blend', '.ma', '.mb', '.max', '.c4d'];

  async scanFolder(folderPath: string): Promise<InsertAsset[]> {
    const assets: InsertAsset[] = [];
    
    try {
      // First create the root folder entry
      const rootFolder = await storage.getFolderByPath(folderPath);
      if (!rootFolder) {
        await storage.createFolder({
          path: folderPath,
          name: path.basename(folderPath),
          parentId: null,
          isWatched: true,
          lastScanned: new Date(),
        });
      }

      await this.scanRecursive(folderPath, assets);
    } catch (error) {
      console.error('Error scanning folder:', error);
    }
    
    return assets;
  }

  private async scanRecursive(currentPath: string, assets: InsertAsset[], depth = 0): Promise<void> {
    // Limit recursion depth to prevent infinite loops
    if (depth > 10) return;

    try {
      const items = await readdir(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            // Skip hidden directories and common ignore patterns
            if (!item.startsWith('.') && !this.shouldIgnoreDirectory(item)) {
              // Create folder entry in database
              const existingFolder = await storage.getFolderByPath(fullPath);
              if (!existingFolder) {
                const parentFolder = await storage.getFolderByPath(currentPath);
                await storage.createFolder({
                  path: fullPath,
                  name: item,
                  parentId: parentFolder?.id || null,
                  isWatched: false,
                  lastScanned: new Date(),
                });
              }
              
              await this.scanRecursive(fullPath, assets, depth + 1);
            }
          } else if (stats.isFile()) {
            const ext = path.extname(item).toLowerCase();
            
            if (this.supportedExtensions.includes(ext)) {
              const asset = await this.createAssetFromFile(fullPath, stats);
              assets.push(asset);
            }
          }
        } catch (fileError) {
          // Skip files/folders that can't be accessed
          console.warn(`Cannot access ${fullPath}:`, fileError);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }
  }

  private shouldIgnoreDirectory(name: string): boolean {
    const ignoredDirs = [
      'node_modules', '.git', '.svn', 'temp', 'tmp', 'cache',
      'build', 'dist', 'output', '.vscode', '.idea', 'thumbs'
    ];
    return ignoredDirs.includes(name.toLowerCase());
  }

  private async createAssetFromFile(filePath: string, stats: fs.Stats): Promise<InsertAsset> {
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    const nameWithoutExt = path.basename(filename, ext);
    
    // Generate basic tags from filename and path
    const tags = this.generateTagsFromPath(filePath, nameWithoutExt);
    
    // Create basic metadata
    const metadata = {
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      directory: path.dirname(filePath),
      estimated: true // Mark as estimated since we're not parsing the actual 3D file
    };

    return {
      filename,
      filepath: filePath,
      filesize: stats.size,
      filetype: ext,
      lastModified: stats.mtime,
      tags,
      metadata: JSON.stringify(metadata)
    };
  }

  private generateTagsFromPath(filePath: string, filename: string): string[] {
    const tags: Set<string> = new Set();
    
    // Tags from file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.fbx') tags.add('fbx');
    if (ext === '.obj') tags.add('obj');
    if (ext === '.blend') tags.add('blender');
    if (ext === '.gltf' || ext === '.glb') tags.add('gltf');
    if (ext === '.ma' || ext === '.mb') tags.add('maya');
    
    // Tags from directory structure
    const pathParts = filePath.toLowerCase().split(path.sep);
    
    // Common folder name patterns
    if (pathParts.some(part => part.includes('character'))) tags.add('character');
    if (pathParts.some(part => part.includes('environment'))) tags.add('environment');
    if (pathParts.some(part => part.includes('vehicle'))) tags.add('vehicle');
    if (pathParts.some(part => part.includes('building'))) tags.add('building');
    if (pathParts.some(part => part.includes('prop'))) tags.add('prop');
    if (pathParts.some(part => part.includes('weapon'))) tags.add('weapon');
    if (pathParts.some(part => part.includes('texture'))) tags.add('textured');
    if (pathParts.some(part => part.includes('anim'))) tags.add('animation');
    if (pathParts.some(part => part.includes('rig'))) tags.add('rigged');
    
    // Tags from filename patterns
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('low')) tags.add('lowpoly');
    if (lowerFilename.includes('high')) tags.add('highpoly');
    if (lowerFilename.includes('rig')) tags.add('rigged');
    if (lowerFilename.includes('anim')) tags.add('animation');
    if (lowerFilename.includes('_v') || lowerFilename.includes('version')) tags.add('versioned');
    
    // File size estimation tags
    // Note: We'd need to implement actual 3D file parsing for accurate poly counts
    
    return Array.from(tags);
  }

  async getFolderInfo(folderPath: string): Promise<{
    path: string;
    exists: boolean;
    assetCount: number;
    totalSize: number;
  }> {
    try {
      await stat(folderPath);
      const assets = await this.scanFolder(folderPath);
      const totalSize = assets.reduce((sum, asset) => sum + asset.filesize, 0);
      
      return {
        path: folderPath,
        exists: true,
        assetCount: assets.length,
        totalSize
      };
    } catch (error) {
      return {
        path: folderPath,
        exists: false,
        assetCount: 0,
        totalSize: 0
      };
    }
  }
}

export const fileScanner = new FileScanner();