import { TaskPriority } from "@prisma/client";
import { ArrowUp, ArrowDown, AlertTriangle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  priority: TaskPriority;
  showLabel?: boolean; // Optional: Nur Icon oder mit Text?
}

export function PriorityBadge({ priority, showLabel = true }: Props) {
  switch (priority) {
    case "URGENT":
      return (
        <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 gap-1 pr-2">
          <AlertTriangle size={12} fill="currentColor" className="text-red-600" />
          {showLabel && "Dringend"}
        </Badge>
      );
    case "HIGH":
      return (
        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 gap-1 pr-2">
          <ArrowUp size={12} strokeWidth={3} />
          {showLabel && "Hoch"}
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 gap-1 pr-2">
          <Circle size={10} fill="currentColor" className="text-blue-500" />
          {showLabel && "Mittel"}
        </Badge>
      );
    case "LOW":
      return (
        <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 gap-1 pr-2">
          <ArrowDown size={12} />
          {showLabel && "Niedrig"}
        </Badge>
      );
    default:
      return null;
  }
}