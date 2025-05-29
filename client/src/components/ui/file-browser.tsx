import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, ArrowLeft } from "lucide-react";

interface FileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  mode: "folder" | "file";
  title?: string;
}

export default function FileBrowser({ 
  isOpen, 
  onClose, 
  onSelect, 
  mode, 
  title = "Select Folder" 
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("/");
  const [manualPath, setManualPath] = useState("");

  // In a real desktop application, this would:
  // 1. Use Node.js fs module to read directory contents
  // 2. Handle platform-specific path separators
  // 3. Show actual file system structure
  // 4. Handle permissions and access errors

  const mockFileSystem = {
    "/": {
      type: "folder",
      children: {
        "Documents": { type: "folder", children: {} },
        "Downloads": { type: "folder", children: {} },
        "Desktop": { type: "folder", children: {} },
        "Projects": { 
          type: "folder", 
          children: {
            "3D_Assets": { type: "folder", children: {} },
            "Blender_Files": { type: "folder", children: {} },
            "Maya_Scenes": { type: "folder", children: {} },
          }
        },
      }
    }
  };

  const handlePathSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  const handleManualPathSubmit = () => {
    if (manualPath.trim()) {
      handlePathSelect(manualPath.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4">
          {/* Manual Path Input */}
          <div className="flex gap-2">
            <Input
              placeholder={mode === "folder" ? "Enter folder path..." : "Enter file path..."}
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualPathSubmit()}
            />
            <Button onClick={handleManualPathSubmit} disabled={!manualPath.trim()}>
              Select
            </Button>
          </div>

          {/* Current Path */}
          <div className="text-sm text-muted-foreground">
            Current: {currentPath}
          </div>

          {/* File Browser */}
          <ScrollArea className="flex-1 border rounded-lg p-4">
            <div className="space-y-2">
              {/* Back Button */}
              {currentPath !== "/" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setCurrentPath("/")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}

              {/* Demo folders */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handlePathSelect("/home/user/Documents")}
                >
                  <Folder className="h-4 w-4 mr-2 text-blue-500" />
                  Documents
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handlePathSelect("/home/user/Downloads")}
                >
                  <Folder className="h-4 w-4 mr-2 text-blue-500" />
                  Downloads
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handlePathSelect("/home/user/Projects/3D_Assets")}
                >
                  <Folder className="h-4 w-4 mr-2 text-blue-500" />
                  3D_Assets
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handlePathSelect("/home/user/Projects/Blender_Files")}
                >
                  <Folder className="h-4 w-4 mr-2 text-blue-500" />
                  Blender_Files
                </Button>
              </div>
            </div>
          </ScrollArea>

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
