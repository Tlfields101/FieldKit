import { assets, folders, type Asset, type InsertAsset, type UpdateAsset, type Folder, type InsertFolder } from "@shared/schema";
import path from "path";

export interface IStorage {
  // Asset operations
  getAsset(id: number): Promise<Asset | undefined>;
  getAssets(): Promise<Asset[]>;
  getAssetsByFolder(folderPath: string): Promise<Asset[]>;
  getAssetsByType(filetype: string): Promise<Asset[]>;
  searchAssets(query: string): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: UpdateAsset): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  getAssetByPath(filepath: string): Promise<Asset | undefined>;

  // Folder operations
  getFolder(id: number): Promise<Folder | undefined>;
  getFolders(): Promise<Folder[]>;
  getFolderByPath(path: string): Promise<Folder | undefined>;
  getSubfolders(parentPath: string): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: number, updates: Partial<InsertFolder>): Promise<Folder | undefined>;
  deleteFolder(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private assets: Map<number, Asset>;
  private folders: Map<number, Folder>;
  private currentAssetId: number;
  private currentFolderId: number;

  constructor() {
    this.assets = new Map();
    this.folders = new Map();
    this.currentAssetId = 1;
    this.currentFolderId = 1;
    
    // Add some demo assets to show how the system works
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Demo assets for different project types
    const demoAssets = [
      {
        filename: "character_model.fbx",
        filepath: "P:/Projects/character_model.fbx",
        filesize: 15680000,
        filetype: ".fbx",
        tags: ["character", "rigged", "animation"],
        metadata: JSON.stringify({ 
          software: "Maya", 
          polyCount: 12500, 
          hasAnimations: true,
          project: "Game Character"
        })
      },
      {
        filename: "environment_building.blend",
        filepath: "P:/Projects/environment_building.blend",
        filesize: 8950000,
        filetype: ".blend",
        tags: ["environment", "architecture", "lowpoly"],
        metadata: JSON.stringify({ 
          software: "Blender", 
          polyCount: 5600, 
          materials: 8,
          project: "Environment Pack"
        })
      },
      {
        filename: "vehicle_car.obj",
        filepath: "P:/Projects/vehicle_car.obj",
        filesize: 4250000,
        filetype: ".obj",
        tags: ["vehicle", "transport", "textured"],
        metadata: JSON.stringify({ 
          polyCount: 8900, 
          hasTextures: true,
          project: "Vehicle Collection"
        })
      }
    ];

    demoAssets.forEach(asset => {
      const id = this.currentAssetId++;
      this.assets.set(id, {
        id,
        filename: asset.filename,
        filepath: asset.filepath,
        filesize: asset.filesize,
        filetype: asset.filetype,
        thumbnailPath: null,
        tags: asset.tags,
        metadata: asset.metadata,
        lastModified: new Date(),
        createdAt: new Date(),
      });
    });
  }

  // Asset operations
  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getAssetsByFolder(folderPath: string): Promise<Asset[]> {
    return Array.from(this.assets.values()).filter(asset => 
      asset.filepath.startsWith(folderPath)
    );
  }

  async getAssetsByType(filetype: string): Promise<Asset[]> {
    return Array.from(this.assets.values()).filter(asset => 
      asset.filetype === filetype
    );
  }

  async searchAssets(query: string): Promise<Asset[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.assets.values()).filter(asset => 
      asset.filename.toLowerCase().includes(lowerQuery) ||
      (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
      (asset.metadata && asset.metadata.toLowerCase().includes(lowerQuery))
    );
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = this.currentAssetId++;
    const asset: Asset = {
      id,
      filename: insertAsset.filename,
      filepath: insertAsset.filepath,
      filesize: insertAsset.filesize,
      filetype: insertAsset.filetype,
      thumbnailPath: insertAsset.thumbnailPath || null,
      tags: insertAsset.tags || [],
      metadata: insertAsset.metadata || null,
      lastModified: insertAsset.lastModified,
      createdAt: new Date(),
    };
    this.assets.set(id, asset);
    return asset;
  }

  async updateAsset(id: number, updates: UpdateAsset): Promise<Asset | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    const updatedAsset: Asset = { ...asset, ...updates };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }

  async deleteAsset(id: number): Promise<boolean> {
    return this.assets.delete(id);
  }

  async getAssetByPath(filepath: string): Promise<Asset | undefined> {
    return Array.from(this.assets.values()).find(asset => asset.filepath === filepath);
  }

  // Folder operations
  async getFolder(id: number): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  async getFolders(): Promise<Folder[]> {
    return Array.from(this.folders.values());
  }

  async getFolderByPath(path: string): Promise<Folder | undefined> {
    return Array.from(this.folders.values()).find(folder => folder.path === path);
  }

  async getSubfolders(parentPath: string): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter(folder => {
      // Only include folders that are direct children of the parent
      const relativePath = folder.path.slice(parentPath.length + 1);
      return folder.path.startsWith(parentPath) &&
        folder.path !== parentPath &&
        !relativePath.includes(path.sep) &&
        folder.isWatched;
    });
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const id = this.currentFolderId++;
    const folder: Folder = {
      id,
      path: insertFolder.path,
      name: insertFolder.name,
      parentId: insertFolder.parentId || null,
      isWatched: insertFolder.isWatched ?? true,
      lastScanned: insertFolder.lastScanned || null,
    };
    this.folders.set(id, folder);
    return folder;
  }

  async updateFolder(id: number, updates: Partial<InsertFolder>): Promise<Folder | undefined> {
    const folder = this.folders.get(id);
    if (!folder) return undefined;

    const updatedFolder: Folder = { ...folder, ...updates };
    this.folders.set(id, updatedFolder);
    return updatedFolder;
  }

  async deleteFolder(id: number): Promise<boolean> {
    return this.folders.delete(id);
  }
}

export const storage = new MemStorage();
