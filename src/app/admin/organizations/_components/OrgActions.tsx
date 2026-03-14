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

  return (
    <>
      {currentStatus === "SUSPENDED" ? (
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
          onClick={() => setPendingStatus("SUSPENDED")}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
          Sperren
        </Button>
      )}

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(o) => { if (!o) setPendingStatus(null); }}
        title={pendingStatus === "SUSPENDED" ? "Organisation sperren?" : "Organisation reaktivieren?"}
        description={pendingStatus === "SUSPENDED"
          ? "Die Organisation wird gesperrt. Mitglieder können sich nicht mehr einloggen."
          : "Die Organisation wird wieder aktiviert."}
        confirmLabel={pendingStatus === "SUSPENDED" ? "Sperren" : "Reaktivieren"}
        destructive={pendingStatus === "SUSPENDED"}
        loading={isLoading}
        onConfirm={handleConfirm}
      />
    </>
  );
}
