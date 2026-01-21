import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Film, Loader2, Link2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dwbxr1s5l";
const CLOUDINARY_UPLOAD_PRESET = "mcm_botflow"; // Unsigned preset - needs to be created in Cloudinary

// Extend window type for Cloudinary
declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: CloudinaryUploadOptions,
        callback: (error: any, result: CloudinaryUploadResult) => void
      ) => CloudinaryWidget;
    };
  }
}

interface CloudinaryUploadOptions {
  cloudName: string;
  uploadPreset: string;
  sources?: string[];
  multiple?: boolean;
  maxFiles?: number;
  cropping?: boolean;
  croppingAspectRatio?: number;
  croppingShowDimensions?: boolean;
  croppingValidateDimensions?: boolean;
  minImageWidth?: number;
  minImageHeight?: number;
  maxImageWidth?: number;
  maxImageHeight?: number;
  maxVideoFileSize?: number;
  clientAllowedFormats?: string[];
  resourceType?: string;
  folder?: string;
  tags?: string[];
  styles?: {
    palette?: {
      window?: string;
      windowBorder?: string;
      tabIcon?: string;
      menuIcons?: string;
      textDark?: string;
      textLight?: string;
      link?: string;
      action?: string;
      inactiveTabIcon?: string;
      error?: string;
      inProgress?: string;
      complete?: string;
      sourceBg?: string;
    };
  };
}

interface CloudinaryUploadResult {
  event: string;
  info?: {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    bytes: number;
    thumbnail_url?: string;
    duration?: number; // For videos
  };
}

interface CloudinaryWidget {
  open: () => void;
  close: () => void;
  destroy: () => void;
}

type MediaType = "image" | "video";

interface MediaUploadProps {
  value: string;
  onChange: (url: string) => void;
  mediaType?: MediaType;
  aspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
  maxVideoSize?: number; // in MB
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  label?: string;
}

const DARK_THEME_STYLES = {
  palette: {
    window: "#1a1a2e",
    windowBorder: "#6366f1",
    tabIcon: "#ffffff",
    menuIcons: "#ffffff",
    textDark: "#000000",
    textLight: "#ffffff",
    link: "#6366f1",
    action: "#6366f1",
    inactiveTabIcon: "#6b7280",
    error: "#ef4444",
    inProgress: "#6366f1",
    complete: "#22c55e",
    sourceBg: "#0f0f23",
  },
};

export function MediaUpload({
  value,
  onChange,
  mediaType = "image",
  aspectRatio = 1.91,
  minWidth = 1200,
  minHeight = 628,
  maxVideoSize = 25, // 25MB default for Facebook
  placeholder,
  className,
  showPreview = true,
  label,
}: MediaUploadProps) {
  const widgetRef = useRef<CloudinaryWidget | null>(null);
  const onChangeRef = useRef(onChange);
  const [isLoading, setIsLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!window.cloudinary) {
      console.warn("Cloudinary widget not loaded");
      return;
    }

    const isVideo = mediaType === "video";

    // Widget options based on media type
    const options: CloudinaryUploadOptions = {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      sources: ["local", "url", "camera"],
      multiple: false,
      maxFiles: 1,
      resourceType: isVideo ? "video" : "image",
      folder: "mcm-botflow",
      tags: ["mcm-botflow", isVideo ? "message-video" : "message-image"],
      styles: DARK_THEME_STYLES,
      clientAllowedFormats: isVideo 
        ? ["mp4", "mov", "avi", "webm", "mkv"]
        : ["png", "jpg", "jpeg", "gif", "webp"],
    };

    // Add image-specific options
    if (!isVideo) {
      // NO FORCED CROPPING - accept any image size/ratio
      // User can upload images as-is without modification
      options.cropping = false;
    } else {
      // Video-specific options
      options.maxVideoFileSize = maxVideoSize * 1024 * 1024; // Convert MB to bytes
    }

    // Create the upload widget
    widgetRef.current = window.cloudinary.createUploadWidget(
      options,
      (error, result) => {
        if (error) {
          console.error("Upload error:", error);
          setIsLoading(false);
          return;
        }

        if (result.event === "success" && result.info) {
          onChangeRef.current(result.info.secure_url);
          setIsLoading(false);
        }

        if (result.event === "close") {
          setIsLoading(false);
        }
      }
    );

    return () => {
      widgetRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, aspectRatio, minWidth, minHeight, maxVideoSize]);

  const handleOpenWidget = () => {
    if (widgetRef.current) {
      setIsLoading(true);
      widgetRef.current.open();
    } else {
      setShowUrlInput(true);
    }
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
  };

  const isVideo = mediaType === "video";
  const Icon = isVideo ? Film : ImageIcon;
  const uploadLabel = isVideo ? "Upload Video" : "Upload Image";
  const defaultPlaceholder = isVideo 
    ? "https://example.com/video.mp4" 
    : "https://example.com/image.jpg";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </label>
      )}

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
              onClick={handleOpenWidget}
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
              onClick={handleOpenWidget}
              disabled={isLoading}
              title="Upload via Cloudinary"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
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
