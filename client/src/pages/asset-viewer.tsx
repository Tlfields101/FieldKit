import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Edit, Download } from "lucide-react";
import AssetViewer3D from "@/components/asset-viewer-3d";
import MetadataEditor from "@/components/metadata-editor";
import { useState } from "react";
import type { Asset } from "@shared/schema";

export default function AssetViewer() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  const { data: asset, isLoading } = useQuery<Asset>({
    queryKey: ["/api/assets", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Asset Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The requested asset could not be found.
            </p>
            <Button onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const metadata = asset.metadata ? JSON.parse(asset.metadata) : {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{asset.filename}</h1>
                <p className="text-muted-foreground">{asset.filepath}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMetadata(!isEditingMetadata)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>3D Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AssetViewer3D asset={asset} />
              </CardContent>
            </Card>
          </div>

          {/* Asset Information */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Type</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{asset.filetype.toUpperCase()}</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Size</label>
                  <p className="text-sm mt-1">{formatFileSize(asset.filesize)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                  <p className="text-sm mt-1">{new Date(asset.lastModified).toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm mt-1">{new Date(asset.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                {asset.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingMetadata ? (
                  <MetadataEditor 
                    asset={asset} 
                    onSave={() => setIsEditingMetadata(false)}
                    onCancel={() => setIsEditingMetadata(false)}
                  />
                ) : (
                  <div className="space-y-2">
                    {Object.keys(metadata).length > 0 ? (
                      Object.entries(metadata).map(([key, value]) => (
                        <div key={key}>
                          <label className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <p className="text-sm mt-1">{String(value)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No metadata available</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
