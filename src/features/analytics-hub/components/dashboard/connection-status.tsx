import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ConnectionStatusProps {
  status: WebSocketStatus;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ status, onReconnect, className }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-500 border-green-500/20',
        };
      case 'connecting':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Disconnected',
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
      case 'error':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Connection Error',
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="outline" 
        className={cn("font-medium", config.className)}
      >
        {config.icon}
        <span className="ml-1">{config.text}</span>
      </Badge>
      {(status === 'disconnected' || status === 'error') && onReconnect && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onReconnect}
          data-testid="button-reconnect"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
