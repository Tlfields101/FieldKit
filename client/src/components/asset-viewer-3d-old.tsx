import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import type { Asset } from "@shared/schema";

interface AssetViewer3DProps {
  asset: Asset;
}

export default function AssetViewer3D({ asset }: AssetViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Clear previous scene
    if (rendererRef.current) {
      container.removeChild(rendererRef.current.domElement);
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

    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Simple orbit controls (manual implementation)
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let currentModel: THREE.Group | null = null;

    // Load the actual 3D model based on file type
    const loadModel = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let model: THREE.Group | null = null;

        if (asset.filetype === '.obj') {
          // Load OBJ file
          const loader = new OBJLoader();
          const modelPath = `/models/Snowcat.OBJ`;
          
          try {
            model = await loader.loadAsync(modelPath);
            
            // Apply materials to the loaded model
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
          } catch (loadError) {
            console.error('OBJ loading error:', loadError);
            throw new Error(`OBJ loading failed: ${loadError instanceof Error ? loadError.message : 'Unknown OBJ error'}`);
          }
          
        } else if (asset.filetype === '.fbx') {
          // For FBX files, create a placeholder for now since FBX requires additional setup
          const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
          const material = new THREE.MeshLambertMaterial({ color: 0x0088ff });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          model = new THREE.Group();
          model.add(mesh);
          
        } else if (asset.filetype === '.blend') {
          // For Blend files, create a placeholder since they need special handling
          const geometry = new THREE.SphereGeometry(0.7, 16, 16);
          const material = new THREE.MeshLambertMaterial({ color: 0xff8800 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          model = new THREE.Group();
          model.add(mesh);
          
        } else {
          // Default placeholder
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshLambertMaterial({ color: 0x666666 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          model = new THREE.Group();
          model.add(mesh);
        }

        if (model) {
          // Scale and position the model appropriately
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim; // Scale to fit in a 2-unit cube
          model.scale.setScalar(scale);
          
          // Center the model
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center.multiplyScalar(scale));
          
          scene.add(model);
          currentModel = model; // Set reference for animation
          setIsLoading(false);
        }
        
      } catch (err) {
        console.error('Failed to load model:', err);
        console.error('Error details:', err instanceof Error ? err.message : 'Unknown error');
        setError(`Failed to load 3D model: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
        
        // Fallback to placeholder
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        const fallbackModel = new THREE.Group();
        fallbackModel.add(mesh);
        scene.add(fallbackModel);
        currentModel = fallbackModel;
      }
    };

    loadModel();

    // Add a ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    scene.add(plane);

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

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate the model if it exists
      if (currentModel) {
        // Smooth camera rotation
        currentModel.rotation.y += (targetX - currentModel.rotation.y) * 0.1;
        currentModel.rotation.x += (targetY - currentModel.rotation.x) * 0.1;

        // Auto-rotate when not interacting
        if (!mouseDown) {
          currentModel.rotation.y += 0.005;
        }
      }

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

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
          {/* 3D Canvas Container */}
          <div ref={containerRef} className="w-full h-full" />
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center">
                <Box className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading 3D viewer...</p>
              </div>
            </div>
          )}
          
          {/* File type indicator */}
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
            <Badge variant="secondary">{asset.filetype?.toUpperCase() || 'Unknown'}</Badge>
          </div>
          
          {/* Controls overlay */}
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

          {/* Info overlay */}
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
