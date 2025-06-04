// Utility functions for Three.js integration
// This file would contain helper functions for 3D operations

export interface ModelInfo {
  vertices: number;
  faces: number;
  materials: number;
  animations: string[];
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface LoaderOptions {
  enableShadows?: boolean;
  enableLighting?: boolean;
  autoRotate?: boolean;
  wireframe?: boolean;
}

// File extension to loader mapping
export const LOADER_MAP = {
  '.obj': 'OBJLoader',
  '.fbx': 'FBXLoader',
  '.gltf': 'GLTFLoader',
  '.glb': 'GLTFLoader',
  '.dae': 'ColladaLoader',
  '.3ds': 'TDSLoader',
  '.ply': 'PLYLoader',
  '.stl': 'STLLoader',
} as const;

// Common 3D file format support
export const THREEJS_SUPPORTED_FORMATS = [
  '.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.ply', '.stl'
] as const;

// Check if a file can be loaded with Three.js
export function isThreeJSSupported(filePath: string): boolean {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return THREEJS_SUPPORTED_FORMATS.includes(ext as any);
}

// Get the appropriate loader for a file
export function getLoaderForFile(filePath: string): string | null {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return LOADER_MAP[ext as keyof typeof LOADER_MAP] || null;
}

// Generate optimal camera position for a model
export function calculateCameraPosition(boundingBox: ModelInfo['boundingBox']): {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
} {
  const center = {
    x: (boundingBox.min.x + boundingBox.max.x) / 2,
    y: (boundingBox.min.y + boundingBox.max.y) / 2,
    z: (boundingBox.min.z + boundingBox.max.z) / 2,
  };

  const size = {
    x: boundingBox.max.x - boundingBox.min.x,
    y: boundingBox.max.y - boundingBox.min.y,
    z: boundingBox.max.z - boundingBox.min.z,
  };

  const maxDimension = Math.max(size.x, size.y, size.z);
  const distance = maxDimension * 2;

  return {
    position: {
      x: center.x + distance,
      y: center.y + distance * 0.5,
      z: center.z + distance,
    },
    target: center,
  };
}

// Default lighting setup for models
export function createDefaultLighting() {
  return {
    ambient: {
      color: 0x404040,
      intensity: 0.4,
    },
    directional: {
      color: 0xffffff,
      intensity: 0.8,
      position: { x: 10, y: 10, z: 5 },
      castShadow: true,
    },
    hemisphere: {
      skyColor: 0xffffbb,
      groundColor: 0x080820,
      intensity: 0.5,
    },
  };
}

// Common material settings for different file types
export function getDefaultMaterialSettings(fileType: string) {
  const settings = {
    roughness: 0.4,
    metalness: 0.2,
    envMapIntensity: 1.0,
  };

  switch (fileType.toLowerCase()) {
    case '.obj':
      return { ...settings, roughness: 0.6 };
    case '.fbx':
      return { ...settings, metalness: 0.1 };
    case '.gltf':
    case '.glb':
      return settings; // GLTF materials are usually pre-configured
    default:
      return settings;
  }
}

// Thumbnail generation settings
export const THUMBNAIL_CONFIG = {
  width: 256,
  height: 256,
  background: 0xf5f5f5,
  cameraFov: 50,
  quality: 0.8,
  format: 'image/png',
} as const;

// Animation helper functions
export function hasAnimations(modelInfo: ModelInfo): boolean {
  return modelInfo.animations.length > 0;
}

export function getModelComplexity(modelInfo: ModelInfo): 'low' | 'medium' | 'high' {
  const vertexCount = modelInfo.vertices;
  
  if (vertexCount < 10000) return 'low';
  if (vertexCount < 100000) return 'medium';
  return 'high';
}

// Performance optimization suggestions based on model
export function getOptimizationSuggestions(modelInfo: ModelInfo): string[] {
  const suggestions: string[] = [];
  const complexity = getModelComplexity(modelInfo);
  
  if (complexity === 'high') {
    suggestions.push('Consider using Level of Detail (LOD) for better performance');
    suggestions.push('Model has high vertex count - may cause performance issues');
  }
  
  if (modelInfo.materials > 10) {
    suggestions.push('High material count - consider texture atlasing');
  }
  
  if (hasAnimations(modelInfo)) {
    suggestions.push('Model contains animations - use animation mixer for playback');
  }
  
  return suggestions;
}
