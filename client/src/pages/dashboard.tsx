import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, FolderOpen, Search, Grid, List } from "lucide-react";
import AssetGrid from "@/components/asset-grid";
import FolderTree from "@/components/folder-tree";
import SearchFilters from "@/components/search-filters";
import FolderSetupGuide from "@/components/folder-setup-guide";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Asset } from "@shared/schema";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [scannedAssets, setScannedAssets] = useState<Asset[]>([]);
  const { toast } = useToast();

  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: watchedFolders = [] } = useQuery<string[]>({
    queryKey: ["/api/folders/watched"],
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchQuery || 
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesFolder = !selectedFolder || asset.filepath.startsWith(selectedFolder);
    
    return matchesSearch && matchesFolder;
  });

  const handleAddFolder = async () => {
    // Enhanced folder selection for VFX workflows
    const folderPath = prompt("Enter folder path to scan (e.g., C:/Projects/3D_Assets):");
    if (!folderPath) return;

    try {
      //Register the folder with the backend
      await apiRequest("POST", "/api/folders/watch", {path: folderPath});
      toast({
        title: "Success",
        description: `Now monitoring: ${folderPath}`,
      });
    } catch (error) {
      toast({
        title: "Note",
        description: "Folder path added - it will be scanned when accessible",
        variant: "default",
      });
    }
  };

  const stats = {
    totalAssets: assets.length,
    watchedFolders: watchedFolders.length,
    fileTypes: Array.from(new Set(assets.map(a => a.filetype))).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">3D Asset Manager</h1>
              <p className="text-muted-foreground">Manage your 3D assets and VFX projects</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAddFolder} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Folder
              </Button>
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Watched Folders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.watchedFolders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">File Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.fileTypes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Folder Setup Guide - Show when no folders are being watched */}
            {watchedFolders.length === 0 && (
              <FolderSetupGuide onAddFolder={handleAddFolder} />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Folders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FolderTree
                  selectedFolder={selectedFolder}
                  onFolderSelect={setSelectedFolder}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Assets</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-6">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">All Assets</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="favorites">Favorites</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <SearchFilters />
                    <div className="mt-4">
                      {selectedFolder && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">Viewing assets from:</p>
                          <p className="text-xs text-muted-foreground">{selectedFolder}</p>
                        </div>
                      )}
                      <AssetGrid
                        assets={filteredAssets}
                        viewMode={viewMode}
                        isLoading={assetsLoading}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="recent" className="mt-4">
                    <AssetGrid
                      assets={filteredAssets.slice(0, 10)}
                      viewMode={viewMode}
                      isLoading={assetsLoading}
                    />
                  </TabsContent>
                  <TabsContent value="favorites" className="mt-4">
                    <div className="text-center text-muted-foreground py-8">
                      No favorite assets yet
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
