import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Scan, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LocalFolderBrowserProps {
  onFolderScanned: () => void;
}

export default function LocalFolderBrowser({ onFolderScanned }: LocalFolderBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scanFolderMutation = useMutation({
    mutationFn: async (path: string) => {
      const response = await fetch(`/api/folders/scan`, {
        method: "POST",
        body: JSON.stringify({ path }),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error('Failed to scan folder');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Folder Scanned Successfully",
        description: `Found ${data.assetCount} 3D assets in the selected folder`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders/watched"] });
      setIsOpen(false);
      setFolderPath("");
      onFolderScanned();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: error.message || "Failed to scan the selected folder",
      });
    },
  });

  const handleScanFolder = () => {
    if (!folderPath.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Path",
        description: "Please enter a valid folder path",
      });
      return;
    }

    scanFolderMutation.mutate(folderPath.trim());
  };

  const handleBrowseFolder = () => {
    // For desktop app, this would open a native folder dialog
    // For now, we'll show instructions for manual path entry
    toast({
      title: "Enter Folder Path",
      description: "Type or paste the full path to your 3D assets folder",
    });
  };

  const examplePaths = [
    "C:\\Users\\YourName\\Documents\\3D Assets",
    "D:\\Projects\\Models",
    "/Users/yourname/Documents/3D Assets",
    "/home/yourname/3d-models"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          Browse Local Folder
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select 3D Assets Folder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-path">Folder Path</Label>
            <div className="flex gap-2">
              <Input
                id="folder-path"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Enter folder path..."
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBrowseFolder}
              >
                Browse
              </Button>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Example Paths:</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  {examplePaths.map((path, index) => (
                    <li key={index} className="font-mono">{path}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Supported formats:</strong> .obj, .fbx, .gltf, .glb, .blend, .ma, .mb, .max, .c4d
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              The scanner will search all subfolders automatically
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleScanFolder}
              disabled={!folderPath.trim() || scanFolderMutation.isPending}
              className="flex-1 gap-2"
            >
              <Scan className="h-4 w-4" />
              {scanFolderMutation.isPending ? "Scanning..." : "Scan Folder"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={scanFolderMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}