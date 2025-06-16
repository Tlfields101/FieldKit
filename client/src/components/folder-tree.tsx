import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import type { Folder } from "@shared/schema";

interface FolderTreeProps {
  selectedFolder: string | null;
  onFolderSelect: (path: string | null) => void;
}

// 📁 Hook to fetch subfolders
function useSubfolders(parentPath: string | null) {
  return useQuery<Folder[]>({
    queryKey: ["/api/folders/subfolders", parentPath],
    queryFn: async () => {
      if (!parentPath) return [];
      const encoded = encodeURIComponent(parentPath);
      const res = await fetch(`/api/folders/subfolders/${encoded}`);
      if (!res.ok) throw new Error("Failed to fetch subfolders");
      return res.json();
    },
    enabled: !!parentPath,
  });
}

// 📁 Recursive folder item
function FolderItem({
  folder,
  level,
  expandedFolders,
  setExpandedFolders,
  selectedFolder,
  onFolderSelect,
}: {
  folder: Folder;
  level: number;
  expandedFolders: Set<string>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedFolder: string | null;
  onFolderSelect: (path: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const isExpanded = expandedFolders.has(folder.path);
  const isSelected = selectedFolder === folder.path;

  const { data: subfolders = [], isLoading } = useSubfolders(isExpanded ? folder.path : null);
  const [hasSubfolders, setHasSubfolders] = useState<boolean | null>(null);

  // Check for subfolders when the folder is first rendered
  useEffect(() => {
    if (!isExpanded) {
      fetch(`/api/folders/subfolders/${encodeURIComponent(folder.path)}`)
        .then(res => res.json())
        .then(folders => setHasSubfolders(folders.length > 0))
        .catch(() => setHasSubfolders(false));
    }
  }, [folder.path, isExpanded]);

  const toggleExpand = () => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      const isNowExpanded = !prev.has(folder.path);
      if (isNowExpanded) {
        next.add(folder.path);
        queryClient.invalidateQueries({
          queryKey: ["/api/folders/subfolders", folder.path],
        });
      } else {
        next.delete(folder.path);
      }
      return next;
    });
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer min-w-0 ${
          isSelected ? "bg-muted" : ""
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onFolderSelect(isSelected ? null : folder.path)}
      >
        {hasSubfolders && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={e => {
              e.stopPropagation();
              toggleExpand();
            }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        )}
        {!hasSubfolders && <div className="w-4" />}
        {isSelected ? (
          <FolderOpen className="h-4 w-4 text-primary" />
        ) : (
          <FolderIcon className="h-4 w-4 text-primary" />
        )}
        <span className={`text-sm truncate flex-1 ${isSelected ? "font-medium" : ""}`} title={folder.name}>
          {folder.name}
        </span>
      </div>
      {isExpanded && (
        <div className="pl-2">
          {isLoading ? (
            <div className="text-xs text-muted">Loading...</div>
          ) : subfolders.length === 0 ? (
            <div className="text-xs text-muted">No subfolders</div>
          ) : (
            subfolders.map(sub => (
              <FolderItem
                key={sub.path}
                folder={sub}
                level={level + 1}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
                selectedFolder={selectedFolder}
                onFolderSelect={onFolderSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// 📂 Main folder tree component
export default function FolderTree({ selectedFolder, onFolderSelect }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { data: watchedFolders = [] } = useQuery<string[]>({
    queryKey: ["/api/folders/watched"],
    queryFn: async () => {
      const res = await fetch("/api/folders/watched");
      return res.json();
    },
  });

  const { data: allFolders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      return res.json();
    },
  });

  const watchedFolderObjs = allFolders.filter(f => watchedFolders.includes(f.path));

  return (
    <ScrollArea className="h-[400px]">
      <div className="p-2">
        <Button
          variant={selectedFolder === null ? "secondary" : "ghost"}
          className="w-full justify-start mb-2"
          onClick={() => onFolderSelect(null)}
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          All Folders
        </Button>
        {watchedFolderObjs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No folders being watched</p>
            <p className="text-xs">Add folders to start monitoring</p>
          </div>
        ) : (
          watchedFolderObjs.map(folder => (
            <FolderItem
              key={folder.path}
              folder={folder}
              level={0}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
              selectedFolder={selectedFolder}
              onFolderSelect={onFolderSelect}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
