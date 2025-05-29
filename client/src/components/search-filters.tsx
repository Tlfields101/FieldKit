import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const FILE_TYPES = [
  { value: '.obj', label: 'OBJ' },
  { value: '.fbx', label: 'FBX' },
  { value: '.gltf', label: 'GLTF' },
  { value: '.glb', label: 'GLB' },
  { value: '.blend', label: 'Blender' },
  { value: '.ma', label: 'Maya' },
  { value: '.hip', label: 'Houdini' },
  { value: '.uasset', label: 'Unreal Asset' },
  { value: '.umap', label: 'Unreal Level' },
];

const FILE_SIZES = [
  { value: 'small', label: 'Small (< 10MB)' },
  { value: 'medium', label: 'Medium (10MB - 100MB)' },
  { value: 'large', label: 'Large (> 100MB)' },
];

export default function SearchFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedSizes([]);
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedSizes.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {selectedTypes.length + selectedSizes.length}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          {/* File Types */}
          <div>
            <h4 className="font-medium text-sm mb-2">File Types</h4>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleType(type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* File Sizes */}
          <div>
            <h4 className="font-medium text-sm mb-2">File Size</h4>
            <div className="flex flex-wrap gap-2">
              {FILE_SIZES.map((size) => (
                <Button
                  key={size.value}
                  variant={selectedSizes.includes(size.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSize(size.value)}
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Active Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTypes.map((type) => (
                    <Badge key={type} variant="secondary">
                      {FILE_TYPES.find(t => t.value === type)?.label}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => toggleType(type)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedSizes.map((size) => (
                    <Badge key={size} variant="secondary">
                      {FILE_SIZES.find(s => s.value === size)?.label}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => toggleSize(size)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
