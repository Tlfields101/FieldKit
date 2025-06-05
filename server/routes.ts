import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fileWatcher } from "./file-watcher";
import { fileScanner } from "./file-scanner";
import { insertAssetSchema, updateAssetSchema, insertFolderSchema } from "@shared/schema";
import path from "path";
import fsStandard from "fs";
import fs from "fs/promises";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Asset routes
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.get("/api/assets/folder/:path", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.path);
      const assets = await storage.getAssetsByFolder(folderPath);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets by folder" });
    }
  });

  app.get("/api/assets/search/:query", async (req, res) => {
    try {
      const query = decodeURIComponent(req.params.query);
      const assets = await storage.searchAssets(query);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to search assets" });
    }
  });

  app.get("/api/assets/:id/stream", async (req, res) => {
    try{
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const filePath = asset.filepath;
      const stat = await fs.stat(filePath);

      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${asset.filename}`);

      const fileStream = fsStandard.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.put("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updateAssetSchema.parse(req.body);
      const asset = await storage.updateAsset(id, updates);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(400).json({ message: "Invalid asset data" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAsset(id);
      if (!deleted) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Folder routes
  app.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getFolders();
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.get("/api/folders/subfolders/:path", async (req, res) => {
    try {
      const parentPath = decodeURIComponent(req.params.path);
      const subfolders = await storage.getSubfolders(parentPath);
      res.json(subfolders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subfolders" });
    }
  });

  app.post("/api/folders/scan", async (req, res) => {
    try {
      const { path: folderPath } = req.body;
      if (!folderPath) {
        return res.status(400).json({ message: "Folder path is required" });
      }

      // Scan folder for 3D assets
      const assets = await fileScanner.scanFolder(folderPath);
      
      // Clear existing assets and add new ones
      const existingAssets = await storage.getAssets();
      for (const asset of existingAssets) {
        await storage.deleteAsset(asset.id);
      }
      
      // Add scanned assets to storage
      for (const assetData of assets) {
        await storage.createAsset(assetData);
      }

      // Mark the folder and all its subfolders as watched
      const allFolders = await storage.getFolders();
      const toWatch = allFolders.filter(f => f.path === folderPath || f.path.startsWith(folderPath + path.sep));
      for (const folder of toWatch) {
        await storage.updateFolder(folder.id, { isWatched: true });
      }

      res.json({ 
        message: `Scanned folder and found ${assets.length} 3D assets`, 
        path: folderPath,
        assetCount: assets.length 
      });
    } catch (error) {
      console.error('Folder scan error:', error);
      res.status(500).json({ message: "Failed to scan folder" });
    }
  });

  app.post("/api/folders/watch", async (req, res) => {
    try {
      const { path: folderPath } = req.body;
      if (!folderPath) {
        return res.status(400).json({ message: "Folder path is required" });
      }

      try {
        await fileWatcher.addWatchFolder(folderPath);
        res.json({ message: "Folder added to watch list", path: folderPath });
      } catch (error) {
        await storage.createFolder({
          path: folderPath,
          name: path.basename(folderPath),
          parentId: null,
          isWatched: true,
          lastScanned: new Date(),
        });
        res.json({ message: "Folder path registered for monitoring", path: folderPath });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to add folder to watch list" });
    }
  });

  app.delete("/api/folders/watch", async (req, res) => {
    try {
      const { path: folderPath } = req.body;
      if (!folderPath) {
        return res.status(400).json({ message: "Folder path is required" });
      }

      await fileWatcher.removeWatchFolder(folderPath);
      res.json({ message: "Folder removed from watch list", path: folderPath });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove folder from watch list" });
    }
  });

  app.get("/api/folders/watched", async (req, res) => {
    try {
      const watchedFolders = await fileWatcher.getWatchedFolders();
      res.json(watchedFolders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watched folders" });
    }
  });

  // Thumbnail serving
  app.get("/api/thumbnails/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const thumbnailPath = path.join(process.cwd(), 'thumbnails', filename);
      
      try {
        await fs.access(thumbnailPath);
        res.sendFile(thumbnailPath);
      } catch {
        res.status(404).json({ message: "Thumbnail not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to serve thumbnail" });
    }
  });

  // Serve model files
  app.get("/models/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const modelsPath = path.resolve(process.cwd(), "client", "public", "models", filename);
      
      // Check if file exists and serve it
      await fs.access(modelsPath);
      res.sendFile(modelsPath);
    } catch (error) {
      res.status(404).json({ message: "Model file not found" });
    }
  });

  // File system operations
  app.post("/api/files/open-folder", async (req, res) => {
    try {
      const { path: filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      // In a real desktop app, this would open the file manager
      // For web version, we'll return the folder path
      const folderPath = path.dirname(filePath);
      res.json({ message: "Folder path", path: folderPath });
    } catch (error) {
      res.status(500).json({ message: "Failed to open folder" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
