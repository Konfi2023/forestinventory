"use client";

import { Button } from "@/components/ui/button";
import { updateOrgStatus } from "@/actions/admin";
import { useState } from "react";
import { Loader2, Ban, CheckCircle } from "lucide-react";

export function OrgActions({ orgId, currentStatus }: { orgId: string, currentStatus: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Status wirklich auf ${newStatus} ändern?`)) return;
    setIsLoading(true);
    try {
      await updateOrgStatus(orgId, newStatus);
    } catch (e) {
      alert("Fehler beim Update");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus === "SUSPENDED") {
    return (
      <Button 
        size="sm" 
        variant="outline" 
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
        disabled={isLoading}
        onClick={() => handleStatusChange("ACTIVE")}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
        Reaktivieren
      </Button>
    );
  }

  return (
    <Button 
      size="sm" 
      variant="ghost" 
      className="text-red-500 hover:text-red-600 hover:bg-red-50"
      disabled={isLoading}
      onClick={() => handleStatusChange("SUSPENDED")}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
      Sperren
    </Button>
  );
}