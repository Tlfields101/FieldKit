import { Grid, List } from "lucide-react";
import AssetCard from "./asset-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset } from "@shared/schema";

interface AssetGridProps {
  assets: Asset[];
  viewMode: "grid" | "list";
  isLoading?: boolean;
}

export default function AssetGrid({ assets, viewMode, isLoading }: AssetGridProps) {
  if (isLoading) {
    return (
      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        : "space-y-4"
      }>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={viewMode === "grid" ? "" : "flex gap-4"}>
            <Skeleton className={viewMode === "grid" ? "aspect-square w-full" : "w-24 h-24"} />
            {viewMode === "list" && (
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">
          {viewMode === "grid" ? <Grid className="h-12 w-12 mx-auto" /> : <List className="h-12 w-12 mx-auto" />}
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No assets found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search criteria or add folders to watch for assets.
        </p>
      </div>
    );
  }

  return (
    <div className={viewMode === "grid" 
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      : "space-y-2"
    }>
      {assets.map((asset) => (
        <AssetCard 
          key={asset.id} 
          asset={asset} 
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}
