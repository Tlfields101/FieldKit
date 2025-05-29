import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull().unique(),
  filesize: integer("filesize").notNull(),
  filetype: text("filetype").notNull(),
  thumbnailPath: text("thumbnail_path"),
  tags: text("tags").array().default([]),
  metadata: text("metadata"), // JSON string for flexible metadata
  lastModified: timestamp("last_modified").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  isWatched: boolean("is_watched").default(true),
  lastScanned: timestamp("last_scanned"),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
});

export const updateAssetSchema = createInsertSchema(assets).omit({
  id: true,
  filepath: true,
  createdAt: true,
}).partial();

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type UpdateAsset = z.infer<typeof updateAssetSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;

// Supported 3D file types
export const SUPPORTED_3D_FORMATS = [
  '.obj', '.fbx', '.gltf', '.glb', '.usd', '.usda', '.usdc',
  '.blend', '.ma', '.mb', '.hip', '.hiplc', '.uasset'
] as const;

export type SupportedFormat = typeof SUPPORTED_3D_FORMATS[number];
