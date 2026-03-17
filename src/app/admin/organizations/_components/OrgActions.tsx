"use client";

import { Button } from "@/components/ui/button";
import { updateOrgStatus } from "@/actions/admin";
import { useState } from "react";
import { Loader2, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function OrgActions({ orgId, currentStatus }: { orgId: string, currentStatus: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!pendingStatus) return;
    setIsLoading(true);
    try {
      await updateOrgStatus(orgId, pendingStatus);
    } catch (e) {
      toast.error("Fehler beim Update");
    } finally {
      setIsLoading(false);
      setPendingStatus(null);
    }
  };

  const isCanceled = currentStatus === "CANCELED";

  return (
    <>
      {isCanceled ? (
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          disabled={isLoading}
          onClick={() => setPendingStatus("ACTIVE")}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
          Reaktivieren
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          disabled={isLoading}
          onClick={() => setPendingStatus("CANCELED")}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
          Sperren
        </Button>
      )}

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(o) => { if (!o) setPendingStatus(null); }}
        title={pendingStatus === "CANCELED" ? "Organisation sperren?" : "Organisation reaktivieren?"}
        description={pendingStatus === "CANCELED"
          ? "Die Organisation wird auf CANCELED gesetzt. Mitglieder haben keinen aktiven Zugang mehr."
          : "Die Organisation wird wieder auf ACTIVE gesetzt."}
        confirmLabel={pendingStatus === "CANCELED" ? "Sperren" : "Reaktivieren"}
        destructive={pendingStatus === "CANCELED"}
        loading={isLoading}
        onConfirm={handleConfirm}
      />
    </>
  );
}
