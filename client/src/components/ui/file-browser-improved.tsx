import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, ArrowLeft, HardDrive } from "lucide-react";

interface FileBrowserImprovedProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  mode: "folder" | "file";
  title?: string;
}

export default function FileBrowserImproved({ 
  isOpen, 
  onClose, 
  onSelect, 
  mode, 
  title = "Select Folder" 
}: FileBrowserImprovedProps) {
  const [manualPath, setManualPath] = useState("");

  const handlePathSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  const handleManualPathSubmit = () => {
    if (manualPath.trim()) {
      handlePathSelect(manualPath.trim());
    }
  };

  // Common VFX project folder suggestions
  const projectSuggestions = [
    { path: "/Projects/3D_Assets", label: "3D Assets", icon: Folder },
    { path: "/Projects/Blender_Files", label: "Blender Projects", icon: Folder },
    { path: "/Projects/Maya_Scenes", label: "Maya Scenes", icon: Folder },
    { path: "/Projects/Houdini_Projects", label: "Houdini Projects", icon: Folder },
    { path: "/Projects/Unreal_Content", label: "Unreal Content", icon: Folder },
    { path: "/Downloads", label: "Downloads", icon: Folder },
    { path: "/Desktop", label: "Desktop", icon: Folder },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4">
          {/* Manual Path Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Enter Path Directly:</label>
            <div className="flex gap-2">
              <Input
                placeholder={mode === "folder" ? "e.g., /home/user/3D_Projects" : "e.g., /home/user/model.fbx"}
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualPathSubmit()}
              />
              <Button onClick={handleManualPathSubmit} disabled={!manualPath.trim()}>
                Select
              </Button>
            </div>
          </div>

          {/* Quick Access Suggestions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Common VFX Folders:</label>
            <ScrollArea className="flex-1 border rounded-lg p-4 max-h-[400px]">
              <div className="space-y-1">
                {projectSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.path}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePathSelect(suggestion.path)}
                  >
                    <suggestion.icon className="h-4 w-4 mr-2 text-blue-500" />
                    {suggestion.label}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {suggestion.path}
                    </span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Tips for folder selection:</p>
            <ul className="space-y-1">
              <li>• Use absolute paths (e.g., /home/username/Projects)</li>
              <li>• Windows users: Use forward slashes (e.g., C:/Projects)</li>
              <li>• The application will monitor this folder for 3D assets</li>
              <li>• Supported formats: {mode === "folder" ? "OBJ, FBX, GLTF, Blender, Maya, Houdini, Unreal" : "All 3D formats"}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}