import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Film, Loader2, Link2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const VPS_UPLOAD_URL = "/upload";

type MediaType = "image" | "video";

interface MediaUploadProps {
  value: string;
  onChange: (url: string) => void;
  mediaType?: MediaType;
  aspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
  maxVideoSize?: number;
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  label?: string;
}

export function MediaUpload({
  value,
  onChange,
  mediaType = "image",
  aspectRatio = 1.91,
  minWidth = 1200,
  minHeight = 628,
  maxVideoSize = 25,
  placeholder,
  className,
  showPreview = true,
  label,
}: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isVideo = mediaType === "video";
  const Icon = isVideo ? Film : ImageIcon;
  const defaultPlaceholder = isVideo
    ? "https://example.com/video.mp4"
    : "https://example.com/image.jpg";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(VPS_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.url) throw new Error("No URL returned from server");
      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload error");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const handleClear = () => {
    onChange("");
    setUploadError(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={
          isVideo
            ? "video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
            : "image/png,image/jpeg,image/gif,image/webp"
        }
        onChange={handleFileChange}
      />

      {/* Preview */}
      {showPreview && value && (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/20">
          {isVideo ? (
            <div className="relative w-full h-32 bg-black/40 flex items-center justify-center">
              <video
                src={value}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  (e.target as HTMLVideoElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 rounded-full p-3">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOpenFilePicker}
            >
              <Upload className="h-4 w-4 mr-1" />
              Change
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload buttons */}
      {!value && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-dashed border-white/20 hover:border-primary/50"
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Coller URL d'image
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              onClick={handleOpenFilePicker}
              disabled={isLoading}
              title="Upload vers VPS"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}
        </div>
      )}

      {/* URL Input fallback */}
      {showUrlInput && !value && (
        <div className="flex gap-2">
          <Input
            placeholder={placeholder || defaultPlaceholder}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="flex-1"
          />
          <Button type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
            Add
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowUrlInput(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Small info text */}
      {!value && !showUrlInput && (
        <p className="text-xs text-muted-foreground">
          {isVideo
            ? `Max ${maxVideoSize}MB. Supported: MP4, MOV, AVI, WebM`
            : `Recommended: ${minWidth}x${minHeight}px minimum, ${aspectRatio}:1 ratio`
          }
        </p>
      )}
    </div>
  );
}

// Re-export ImageUpload as an alias for backward compatibility
export function ImageUpload(props: Omit<MediaUploadProps, "mediaType">) {
  return <MediaUpload {...props} mediaType="image" />;
}

// Export VideoUpload for convenience
export function VideoUpload(props: Omit<MediaUploadProps, "mediaType" | "aspectRatio" | "minWidth" | "minHeight">) {
  return <MediaUpload {...props} mediaType="video" />;
}
