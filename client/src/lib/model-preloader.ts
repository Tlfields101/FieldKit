import * as THREE from "three";
import { OBJLoader, FBXLoader } from "three-stdlib";

// Global model cache with memory management
const globalModelCache = new Map<string, { model: THREE.Group; lastUsed: number; size: number }>();
const loadingPromises = new Map<string, Promise<THREE.Group>>();

// Memory management settings
const MAX_CACHE_SIZE_MB = 100; // Limit cache to 100MB
const MAX_CACHED_MODELS = 20;  // Keep max 20 models cached

export class ModelPreloader {
  private static instance: ModelPreloader;
  
  static getInstance(): ModelPreloader {
    if (!ModelPreloader.instance) {
      ModelPreloader.instance = new ModelPreloader();
    }
    return ModelPreloader.instance;
  }

  async preloadModel(filename: string, filetype: string): Promise<THREE.Group> {
    const cacheKey = `${filetype}_${filename}`;
    
    // Return cached model if available and update last used time
    if (globalModelCache.has(cacheKey)) {
      const cached = globalModelCache.get(cacheKey)!;
      cached.lastUsed = Date.now();
      return cached.model.clone();
    }

    // Return existing loading promise if in progress
    if (loadingPromises.has(cacheKey)) {
      const model = await loadingPromises.get(cacheKey)!;
      return model.clone();
    }

    // Start loading
    const loadPromise = this.loadModel(filename, filetype);
    loadingPromises.set(cacheKey, loadPromise);

    try {
      const model = await loadPromise;
      const modelSize = this.estimateModelSize(model);
      
      // Clean cache if needed before adding new model
      this.cleanCache(modelSize);
      
      globalModelCache.set(cacheKey, {
        model,
        lastUsed: Date.now(),
        size: modelSize
      });
      loadingPromises.delete(cacheKey);
      return model.clone();
    } catch (error) {
      loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  private async loadModel(filename: string, filetype: string): Promise<THREE.Group> {
    let model: THREE.Group;

    if (filetype === '.obj') {
      const loader = new OBJLoader();
      model = await loader.loadAsync('/models/Snowcat.OBJ');
      
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Optimize geometry
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
            // Merge vertices if possible
            if (child.geometry.index === null) {
              child.geometry = child.geometry.toNonIndexed();
            }
          }
          
          child.material = new THREE.MeshLambertMaterial({ 
            color: 0x888888,
            side: THREE.DoubleSide 
          });
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = true;
        }
      });
      
    } else if (filetype === '.fbx') {
      const loader = new FBXLoader();
      model = await loader.loadAsync('/models/FruitPears001.fbx');
      
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Optimize geometry
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
            if (child.geometry.index === null) {
              child.geometry = child.geometry.toNonIndexed();
            }
          }
          
          child.material = new THREE.MeshLambertMaterial({ 
            color: 0x88ff88,
            side: THREE.DoubleSide 
          });
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = true;
        }
      });
      
    } else {
      // Fallback
      const geometry = new THREE.SphereGeometry(0.7, 8, 8); // Reduced detail
      const material = new THREE.MeshLambertMaterial({ color: 0xff8800 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      model = new THREE.Group();
      model.add(mesh);
    }

    // Scale and center the model
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    model.scale.setScalar(scale);
    
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));

    return model;
  }

  getFromCache(filename: string, filetype: string): THREE.Group | null {
    const cacheKey = `${filetype}_${filename}`;
    const cached = globalModelCache.get(cacheKey);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.model.clone();
    }
    return null;
  }

  private estimateModelSize(model: THREE.Group): number {
    let totalSize = 0;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        const vertices = geometry.attributes.position?.count || 0;
        const faces = geometry.index ? geometry.index.count / 3 : vertices / 3;
        // Rough estimate: 32 bytes per vertex + 12 bytes per face
        totalSize += (vertices * 32) + (faces * 12);
      }
    });
    return totalSize / (1024 * 1024); // Convert to MB
  }

  private cleanCache(newModelSize: number) {
    // Check if we need to clean cache
    const currentSize = this.getCurrentCacheSize();
    const modelCount = globalModelCache.size;

    if (currentSize + newModelSize > MAX_CACHE_SIZE_MB || modelCount >= MAX_CACHED_MODELS) {
      // Sort by last used time (oldest first)
      const entries = Array.from(globalModelCache.entries())
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

      // Remove oldest entries until we have space
      while (entries.length > 0 && 
             (this.getCurrentCacheSize() + newModelSize > MAX_CACHE_SIZE_MB || 
              globalModelCache.size >= MAX_CACHED_MODELS)) {
        const [key, cached] = entries.shift()!;
        
        // Dispose geometry to free GPU memory
        cached.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
        
        globalModelCache.delete(key);
        console.log(`Removed cached model ${key} to free memory`);
      }
    }
  }

  private getCurrentCacheSize(): number {
    let totalSize = 0;
    globalModelCache.forEach(cached => {
      totalSize += cached.size;
    });
    return totalSize;
  }

  getCacheInfo() {
    return {
      modelCount: globalModelCache.size,
      totalSizeMB: this.getCurrentCacheSize(),
      maxSizeMB: MAX_CACHE_SIZE_MB,
      maxModels: MAX_CACHED_MODELS
    };
  }

  preloadAll() {
    // Preload common models
    this.preloadModel('vehicle_car.obj', '.obj').catch(console.error);
    this.preloadModel('character_model.fbx', '.fbx').catch(console.error);
  }
}