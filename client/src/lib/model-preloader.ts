import * as THREE from "three";
import { OBJLoader, FBXLoader } from "three-stdlib";

// Global model cache
const globalModelCache = new Map<string, THREE.Group>();
const loadingPromises = new Map<string, Promise<THREE.Group>>();

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
    
    // Return cached model if available
    if (globalModelCache.has(cacheKey)) {
      return globalModelCache.get(cacheKey)!.clone();
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
      globalModelCache.set(cacheKey, model);
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
    return cached ? cached.clone() : null;
  }

  preloadAll() {
    // Preload common models
    this.preloadModel('vehicle_car.obj', '.obj').catch(console.error);
    this.preloadModel('character_model.fbx', '.fbx').catch(console.error);
  }
}