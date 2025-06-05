import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import type { Folder } from "@shared/schema";

interface FolderTreeProps {
  selectedFolder: string | null;
  onFolderSelect: (path: string | null) => void;
}

function useSubfolders(parentPath: string | null) {
  return useQuery<Folder[]>({
    queryKey: ["/api/folders/subfolders", encodeURIComponent(parentPath || "")],
    enabled: !!parentPath,
  });
}

export default function FolderTree({ selectedFolder, onFolderSelect }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Get watched folders as roots
  const { data: watchedFolders = [] } = useQuery<string[]>({
    queryKey: ["/api/folders/watched"],
  });

  // Get folder objects for watched roots
  const { data: allFolders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });
  const watchedFolderObjs = allFolders.filter(f => watchedFolders.includes(f.path));

  // Helper to recursively render folder and its subfolders
  const renderFolder = (folder: Folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const isSelected = selectedFolder === folder.path;
    const hasChildren = true; // Assume folders can have children, fetch on expand

    // Fetch subfolders only if expanded
    const { data: subfolders = [] } = useSubfolders(isExpanded ? folder.path : "");

    return (
      <div key={folder.path}>
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer min-w-0 ${
            isSelected ? 'bg-muted' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onFolderSelect(isSelected ? null : folder.path)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={e => {
              e.stopPropagation();
              const newExpanded = new Set(expandedFolders);
              if (isExpanded) newExpanded.delete(folder.path);
              else newExpanded.add(folder.path);
              setExpandedFolders(newExpanded);
            }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          {isSelected ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <FolderIcon className="h-4 w-4 text-primary" />
          )}
          <span className={`text-sm truncate flex-1 ${isSelected ? 'font-medium' : ''}`} title={folder.name}>
            {folder.name}
          </span>
        </div>
        {isExpanded && subfolders.length > 0 && (
          <div>
            {subfolders.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

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
          watchedFolderObjs.map(folder => renderFolder(folder))
        )}
      </div>
    </ScrollArea>
  );
}
