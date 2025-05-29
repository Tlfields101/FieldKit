import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Save, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Asset } from "@shared/schema";

interface MetadataEditorProps {
  asset: Asset;
  onSave: () => void;
  onCancel: () => void;
}

export default function MetadataEditor({ asset, onSave, onCancel }: MetadataEditorProps) {
  const [tags, setTags] = useState<string[]>(asset.tags);
  const [newTag, setNewTag] = useState("");
  const [metadata, setMetadata] = useState(() => {
    try {
      return asset.metadata ? JSON.parse(asset.metadata) : {};
    } catch {
      return {};
    }
  });
  const [newMetadataKey, setNewMetadataKey] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAssetMutation = useMutation({
    mutationFn: (updates: { tags: string[]; metadata: string }) =>
      apiRequest("PUT", `/api/assets/${asset.id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets", asset.id.toString()] });
      toast({
        title: "Success",
        description: "Asset metadata updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update asset metadata",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddMetadata = () => {
    const trimmedKey = newMetadataKey.trim();
    const trimmedValue = newMetadataValue.trim();
    if (trimmedKey && trimmedValue) {
      setMetadata({ ...metadata, [trimmedKey]: trimmedValue });
      setNewMetadataKey("");
      setNewMetadataValue("");
    }
  };

  const handleRemoveMetadata = (key: string) => {
    const newMetadata = { ...metadata };
    delete newMetadata[key];
    setMetadata(newMetadata);
  };

  const handleSave = () => {
    updateAssetMutation.mutate({
      tags,
      metadata: JSON.stringify(metadata),
    });
  };

  const handleReset = () => {
    setTags(asset.tags);
    setNewTag("");
    try {
      setMetadata(asset.metadata ? JSON.parse(asset.metadata) : {});
    } catch {
      setMetadata({});
    }
    setNewMetadataKey("");
    setNewMetadataValue("");
  };

  return (
    <div className="space-y-6">
      {/* Tags Section */}
      <div>
        <Label className="text-sm font-medium">Tags</Label>
        <div className="mt-2 space-y-3">
          {/* Existing Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* Add New Tag */}
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Custom Metadata Section */}
      <div>
        <Label className="text-sm font-medium">Custom Metadata</Label>
        <div className="mt-2 space-y-3">
          {/* Existing Metadata */}
          {Object.keys(metadata).length > 0 && (
            <div className="space-y-2">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{key}</div>
                    <div className="text-sm text-muted-foreground">{String(value)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMetadata(key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add New Metadata */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Property name..."
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
              />
              <Input
                placeholder="Value..."
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMetadata()}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddMetadata}
              disabled={!newMetadataKey.trim() || !newMetadataValue.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateAssetMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateAssetMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
