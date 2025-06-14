import { useEffect, useRef, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Box, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import type { Asset } from "@shared/schema";
import { ModelPreloader } from "@/lib/model-preloader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { LOADER_MAP } from '@/lib/three-utils';

interface AssetViewer3DProps {
  asset: Asset;
}

export default function AssetViewer3D({ asset }: AssetViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const preloader = useMemo(() => {
    const instance = ModelPreloader.getInstance();
    // Start preloading common models immediately
    instance.preloadAll();
    return instance;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Clear previous scene
    if (rendererRef.current) {
      if (container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current.dispose();
    }
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    // Set up Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Set up camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, 2, 5);
    cameraRef.current = camera;

    // Set up renderer with performance optimizations
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add a ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    scene.add(plane);

    // Controls
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseDown = (event: MouseEvent) => {
      mouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseUp = () => {
      mouseDown = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!mouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      targetX += deltaX * 0.01;
      targetY += deltaY * 0.01;

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onWheel = (event: WheelEvent) => {
      camera.position.multiplyScalar(1 + event.deltaY * 0.001);
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('wheel', onWheel);

    // Load model using preloader for much faster loading
    const loadModel = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load model from the streaming endpoint
        const response = await fetch(`/api/assets/${asset.id}/stream`);
        if (!response.ok) {
          throw new Error('Failed to load model');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        let model: THREE.Group | null = null;

        // Use appropriate loader based on file type
        if (asset.filetype === '.obj') {
          const loader = new OBJLoader();
          model = await loader.loadAsync(url);
          
          // Apply materials to OBJ models
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = new THREE.MeshLambertMaterial({ 
                color: 0x888888,
                side: THREE.DoubleSide 
              });
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
        } else if (asset.filetype === '.fbx') {
          const loader = new FBXLoader();
          model = await loader.loadAsync(url);
          
          // Apply materials to FBX models
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = new THREE.MeshLambertMaterial({ 
                color: 0x88ff88,
                side: THREE.DoubleSide 
              });
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
        } else if (asset.filetype === '.gltf' || asset.filetype === '.glb') {
          const loader = new GLTFLoader();
          const gltf = await loader.loadAsync(url);
          model = gltf.scene;
        } else {
          throw new Error(`Unsupported file type: ${asset.filetype}`);
        }

        if (!model) {
          throw new Error('Failed to load model: Model is null');
        }

        // Scale and center the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; // Scale to fit in a 2-unit cube
        model.scale.setScalar(scale);
        
        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        
        scene.add(model);
        modelRef.current = model;
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load model:', err);
        setError(`Failed to load 3D model: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
        
        // Fallback placeholder
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        const fallbackModel = new THREE.Group();
        fallbackModel.add(mesh);
        scene.add(fallbackModel);
        modelRef.current = fallbackModel;
      }
    };

    // Animation loop with performance optimization
    let lastTime = 0;
    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Limit to 60fps max
      if (currentTime - lastTime < 16.67) return;
      lastTime = currentTime;

      if (modelRef.current) {
        modelRef.current.rotation.y += (targetX - modelRef.current.rotation.y) * 0.1;
        modelRef.current.rotation.x += (targetY - modelRef.current.rotation.x) * 0.1;

        if (!mouseDown) {
          modelRef.current.rotation.y += 0.005;
        }
      }

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    loadModel().then(() => animate(0));

    // Cleanup
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('wheel', onWheel);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [asset]);

  const handleReset = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(2, 2, 5);
    }
  };

  const is3DViewable = asset.filetype && ['.obj', '.fbx', '.gltf', '.glb', '.blend'].includes(asset.filetype);

  return (
    <div className="relative w-full h-[500px] bg-muted rounded-lg overflow-hidden">
      {is3DViewable ? (
        <>
          <div ref={containerRef} className="w-full h-full" />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center">
                <Box className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading 3D viewer...</p>
              </div>
            </div>
          )}
          
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
            <Badge variant="secondary">{asset.filetype?.toUpperCase() || 'Unknown'}</Badge>
          </div>
          
          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Mouse: Drag to orbit<br />
              Wheel: Zoom
            </div>
          </div>

          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-sm font-medium">{asset.filename}</p>
            <p className="text-xs text-muted-foreground">Interactive 3D Preview</p>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">Preview Not Available</h3>
            <p className="text-muted-foreground mb-4">
              3D preview is not supported for {asset.filetype || 'unknown'} files
            </p>
            <Badge variant="outline">{asset.filetype?.toUpperCase() || 'Unknown'}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}