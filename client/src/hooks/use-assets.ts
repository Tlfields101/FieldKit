import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Asset, UpdateAsset } from "@shared/schema";

export function useAssets() {
  return useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
}

export function useAsset(id: string | number) {
  return useQuery<Asset>({
    queryKey: ["/api/assets", id.toString()],
    enabled: !!id,
  });
}

export function useAssetsByFolder(folderPath: string) {
  return useQuery<Asset[]>({
    queryKey: ["/api/assets/folder", encodeURIComponent(folderPath)],
    enabled: !!folderPath,
  });
}

export function useSearchAssets(query: string) {
  return useQuery<Asset[]>({
    queryKey: ["/api/assets/search", encodeURIComponent(query)],
    enabled: !!query && query.length > 0,
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateAsset }) =>
      apiRequest("PUT", `/api/assets/${id}`, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets", id.toString()] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
  });
}

export function useWatchedFolders() {
  return useQuery<string[]>({
    queryKey: ["/api/folders/watched"],
  });
}

export function useAddWatchFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (path: string) =>
      apiRequest("POST", "/api/folders/watch", { path }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders/watched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
  });
}

export function useRemoveWatchFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (path: string) =>
      apiRequest("DELETE", "/api/folders/watch", { path }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders/watched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });
}

// Hook for real-time asset statistics
export function useAssetStats() {
  const { data: assets = [] } = useAssets();
  
  return {
    totalAssets: assets.length,
    totalSize: assets.reduce((sum, asset) => sum + asset.filesize, 0),
    fileTypes: [...new Set(assets.map(asset => asset.filetype))],
    recentAssets: assets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
    largestAssets: assets
      .sort((a, b) => b.filesize - a.filesize)
      .slice(0, 5),
  };
}

// Hook for filtering assets
export function useFilteredAssets(filters: {
  searchQuery?: string;
  fileTypes?: string[];
  folderPath?: string;
  tags?: string[];
}) {
  const { data: allAssets = [] } = useAssets();
  
  return allAssets.filter(asset => {
    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = asset.filename.toLowerCase().includes(query);
      const matchesTags = asset.tags.some(tag => tag.toLowerCase().includes(query));
      const matchesMetadata = asset.metadata && asset.metadata.toLowerCase().includes(query);
      
      if (!matchesName && !matchesTags && !matchesMetadata) {
        return false;
      }
    }
    
    // File type filter
    if (filters.fileTypes && filters.fileTypes.length > 0) {
      if (!filters.fileTypes.includes(asset.filetype)) {
        return false;
      }
    }
    
    // Folder path filter
    if (filters.folderPath) {
      if (!asset.filepath.startsWith(filters.folderPath)) {
        return false;
      }
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(filterTag => 
        asset.tags.includes(filterTag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    return true;
  });
}
