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

export default function FolderTree({ selectedFolder, onFolderSelect }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const { data: watchedFolders = [] } = useQuery<string[]>({
    queryKey: ["/api/folders/watched"],
  });

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const buildTree = (folders: Folder[]) => {
    const tree: { [key: string]: Folder & { children: Folder[] } } = {};
    const roots: (Folder & { children: Folder[] })[] = [];

    // Initialize all folders with children array
    folders.forEach(folder => {
      tree[folder.path] = { ...folder, children: [] };
    });

    // Build parent-child relationships
    folders.forEach(folder => {
      if (folder.parentId) {
        const parent = Object.values(tree).find(f => f.id === folder.parentId);
        if (parent) {
          parent.children.push(tree[folder.path]);
        } else {
          roots.push(tree[folder.path]);
        }
      } else {
        roots.push(tree[folder.path]);
      }
    });

    return roots;
  };

  const renderFolder = (folder: Folder & { children: Folder[] }, level = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const isSelected = selectedFolder === folder.path;
    const isWatched = watchedFolders.includes(folder.path);
    const hasChildren = folder.children.length > 0;

    return (
      <div key={folder.path}>
        <div 
          className={`flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer ${
            isSelected ? 'bg-muted' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onFolderSelect(isSelected ? null : folder.path)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.path);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}
          
          {isSelected ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <FolderIcon className={`h-4 w-4 ${isWatched ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
          
          <span className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}>
            {folder.name}
          </span>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map(child => renderFolder(child as any, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(folders);

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
        
        {watchedFolders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No folders being watched</p>
            <p className="text-xs">Add folders to start monitoring</p>
          </div>
        ) : (
          tree.map(folder => renderFolder(folder as any))
        )}
      </div>
    </ScrollArea>
  );
}
