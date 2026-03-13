"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, X, Loader2, ArrowRight } from "lucide-react";
import { acceptDashboardInvite, declineDashboardInvite } from "@/actions/invites";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  invites: any[];
}

export function InviteList({ invites }: Props) {
  const [isLoading, setIsLoading] = useState<string | null>(null); // ID des ladenden Items
  const router = useRouter();

  const handleAccept = async (inviteId: string) => {
    setIsLoading(inviteId);
    try {
      const result = await acceptDashboardInvite(inviteId);
      if (result.redirectSlug) {
        toast.success("Willkommen im Team!");
        router.push(`/dashboard/org/${result.redirectSlug}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Beitreten");
      setIsLoading(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    if(!confirm("Möchten Sie diese Einladung wirklich ablehnen?")) return;
    setIsLoading(inviteId);
    try {
      await declineDashboardInvite(inviteId);
      toast.success("Einladung abgelehnt");
      router.refresh();
    } catch (e) {
      toast.error("Fehler");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-10 space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Offene Einladungen</h2>
        <p className="text-slate-500">Sie wurden eingeladen, folgenden Teams beizutreten.</p>
      </div>

      {invites.map((invite) => (
        <Card key={invite.id} className="border-l-4 border-l-blue-500 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    Einladung
                </Badge>
                <span className="text-xs text-slate-400">
                    {new Date(invite.createdAt).toLocaleDateString('de-DE')}
                </span>
            </div>
            <CardTitle className="text-lg mt-2">{invite.organization.name}</CardTitle>
            <CardDescription>
                Rolle: <span className="font-medium text-slate-700">{invite.role.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                <Mail size={16} />
                <span className="truncate">{invite.email}</span>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 pt-2">
            <Button 
                variant="outline" 
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDecline(invite.id)}
                disabled={!!isLoading}
            >
                {isLoading === invite.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4 mr-2"/>}
                Ablehnen
            </Button>
            <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleAccept(invite.id)}
                disabled={!!isLoading}
            >
                {isLoading === invite.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>}
                Beitreten
            </Button>
          </CardFooter>
        </Card>
      ))}

        <div className="text-center mt-8">
            <p className="text-xs text-slate-400 mb-2">oder</p>
            <Button variant="link" className="text-slate-500" onClick={() => router.push('/dashboard?createOrg=1')}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Doch eine eigene Organisation erstellen?
            </Button>
        </div>
    </div>
  );
}