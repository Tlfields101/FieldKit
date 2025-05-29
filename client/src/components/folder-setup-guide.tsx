import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Info } from "lucide-react";

interface FolderSetupGuideProps {
  onAddFolder: (path: string) => void;
}

export default function FolderSetupGuide({ onAddFolder }: FolderSetupGuideProps) {
  const commonPaths = [
    {
      category: "Windows Paths",
      paths: [
        "C:/Projects/3D_Assets",
        "C:/Users/YourName/Documents/Blender",
        "D:/VFX_Projects",
        "C:/UnrealEngine/Projects"
      ]
    },
    {
      category: "Mac/Linux Paths", 
      paths: [
        "/Users/YourName/3D_Projects",
        "/home/user/Blender_Files",
        "/Projects/Maya_Scenes",
        "/opt/UnrealEngine/Content"
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Getting Started - Add Your 3D Asset Folders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect this tool to your existing 3D project folders. Once added, it will automatically scan and organize your assets.
        </p>
        
        <div className="space-y-3">
          {commonPaths.map((section) => (
            <div key={section.category}>
              <Badge variant="outline" className="mb-2">{section.category}</Badge>
              <div className="grid grid-cols-1 gap-2">
                {section.paths.map((path) => (
                  <Button
                    key={path}
                    variant="ghost"
                    className="justify-between h-auto p-2"
                    onClick={() => onAddFolder(path)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{path}</span>
                    </div>
                    <Plus className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Supported File Types:</p>
          <p>OBJ, FBX, GLTF/GLB, Blender (.blend), Maya (.ma/.mb), Houdini (.hip), Unreal (.uasset/.umap)</p>
        </div>
      </CardContent>
    </Card>
  );
}