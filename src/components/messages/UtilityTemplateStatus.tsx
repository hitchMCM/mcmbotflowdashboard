import { CheckCircle2, XCircle, Clock, AlertTriangle, Ban, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UtilityTemplateStatus as StatusType } from "@/hooks/useUtilityTemplates";

interface UtilityTemplateStatusProps {
  status: StatusType | null | undefined;
  templateId?: string | null;
  rejectionReason?: string | null;
  onRefreshStatus?: () => void;
  onResubmit?: () => void;
  refreshing?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, {
  icon: typeof CheckCircle2;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  APPROVED: {
    icon: CheckCircle2,
    label: 'Approved by Meta',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  PENDING: {
    icon: Clock,
    label: 'Pending approval',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  REJECTED: {
    icon: XCircle,
    label: 'Rejected by Meta',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  PAUSED: {
    icon: AlertTriangle,
    label: 'Paused',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  DISABLED: {
    icon: Ban,
    label: 'Disabled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
};

export function UtilityTemplateStatusBadge({ status }: { status: StatusType | null | undefined }) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.color, config.borderColor, config.bgColor, "gap-1")}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function UtilityTemplateStatusPanel({
  status,
  templateId,
  rejectionReason,
  onRefreshStatus,
  onResubmit,
  refreshing,
  className,
}: UtilityTemplateStatusProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      config.bgColor,
      config.borderColor,
      className
    )}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.color)} />
          <span className={cn("font-medium", config.color)}>{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {onRefreshStatus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshStatus}
              disabled={refreshing}
              className="h-7 text-xs"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", refreshing && "animate-spin")} />
              Check
            </Button>
          )}
        </div>
      </div>

      {/* Template ID */}
      {templateId && (
        <div className="text-xs text-muted-foreground">
          Template ID: <code className="bg-background/50 px-1.5 py-0.5 rounded">{templateId}</code>
        </div>
      )}

      {/* Rejection Reason */}
      {status === 'REJECTED' && rejectionReason && (
        <div className="bg-red-500/5 border border-red-500/20 rounded p-3 space-y-2">
          <p className="text-sm text-red-400 font-medium">Rejection reason:</p>
          <p className="text-sm text-red-300">{rejectionReason}</p>
        </div>
      )}

      {/* Actions */}
      {(status === 'REJECTED' || status === 'DISABLED') && onResubmit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResubmit}
          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
        >
          <Send className="h-3 w-3 mr-2" />
          Resubmit to Meta
        </Button>
      )}

      {/* Guidance per status */}
      {status === 'PENDING' && (
        <p className="text-xs text-muted-foreground">
          The template is being reviewed by Meta. This can take from a few minutes to 24 hours.
          Use the "Check" button to refresh the status.
        </p>
      )}
      {status === 'APPROVED' && (
        <p className="text-xs text-muted-foreground">
          ✅ This template is approved and can be used to send utility messages outside the 24h window.
        </p>
      )}
    </div>
  );
}
