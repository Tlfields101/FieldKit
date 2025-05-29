import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Eye } from "lucide-react";
import type { Asset } from "@shared/schema";

interface AssetCardProps {
  asset: Asset;
  viewMode: "grid" | "list";
}

export default function AssetCard({ asset, viewMode }: AssetCardProps) {
  const [, setLocation] = useLocation();

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleView = () => {
    setLocation(`/asset/${asset.id}`);
  };

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleView}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              {asset.thumbnailPath ? (
                <img 
                  src={`/api/thumbnails/${asset.thumbnailPath.split('/').pop()}`}
                  alt={asset.filename}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-xs text-muted-foreground font-medium">
                  {asset.filetype.toUpperCase()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{asset.filename}</h3>
              <p className="text-sm text-muted-foreground truncate">{asset.filepath}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{asset.filetype}</Badge>
                <span className="text-xs text-muted-foreground">{formatFileSize(asset.filesize)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleView(); }}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={handleView}>
      <CardContent className="p-4">
        {/* Thumbnail */}
        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {asset.thumbnailPath ? (
            <img 
              src={`/api/thumbnails/${asset.thumbnailPath.split('/').pop()}`}
              alt={asset.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground font-medium">
              {asset.filetype.toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-medium text-foreground truncate" title={asset.filename}>
            {asset.filename}
          </h3>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">{asset.filetype}</Badge>
            <span className="text-xs text-muted-foreground">{formatFileSize(asset.filesize)}</span>
          </div>
          {asset.tags && asset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {asset.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {asset.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{asset.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>


      </CardContent>
    </Card>
  );
}
