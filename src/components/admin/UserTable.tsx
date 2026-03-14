"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MoreHorizontal, 
  Trash2, 
  Shield, 
  UserCog, 
  Mail, 
  RefreshCw, 
  XCircle,
  Lock
} from "lucide-react";

import { removeMember, updateMemberRole } from "@/actions/users";
import { revokeInvite, resendInvite } from "@/actions/invites";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ManageAccessDialog } from "@/components/admin/ManageAccessDialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Member = {
  id: string;
  role: { id: string; name: string };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    accessibleForests?: any[];
  };
};

type Invite = {
  id: string;
  email: string;
  role: { id: string; name: string };
  createdAt: Date;
  status: string;
};

type Role = {
  id: string;
  name: string;
};

interface UserTableProps {
  members: Member[];
  invites: Invite[];
  availableRoles: Role[];
  orgSlug: string;
  currentUserId: string;
  currentUserRole: { id: string; name: string; isSystemRole: boolean };
  forests: { id: string; name: string }[];
}

export function UserTable({ 
  members, 
  invites, 
  availableRoles, 
  orgSlug, 
  currentUserId,
  currentUserRole,
  forests 
}: UserTableProps) {
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [confirm, setConfirm] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const handleRemoveMember = (memberId: string) => {
    const targetMember = members.find(m => m.id === memberId);
    const isMe = targetMember?.user.id === currentUserId;
    setConfirm({
      title: isMe ? "Organisation verlassen?" : "Mitglied entfernen?",
      description: isMe
        ? "Sie verlieren sofort den Zugriff auf diese Organisation."
        : "Der Benutzer wird aus der Organisation entfernt und verliert alle Zugriffsrechte.",
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const result = await removeMember(orgSlug, memberId);
          if (result.isSelf) window.location.href = "/";
        } catch (e: any) {
          toast.error(e.message || "Fehler beim Entfernen");
        } finally {
          setIsLoading(false);
          setConfirm(null);
        }
      },
    });
  };

  const handleRoleChange = async (memberId: string, newRoleId: string) => {
    setIsLoading(true);
    try {
      await updateMemberRole(orgSlug, memberId, newRoleId);
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Ändern der Rolle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeInvite = (inviteId: string) => {
    setConfirm({
      title: "Einladung zurückziehen?",
      description: "Der Einladungslink wird ungültig. Der Empfänger kann ihn nicht mehr verwenden.",
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await revokeInvite(orgSlug, inviteId);
        } catch (e: any) {
          toast.error(e.message || "Fehler beim Zurückziehen");
        } finally {
          setIsLoading(false);
          setConfirm(null);
        }
      },
    });
  };

  const handleResendInvite = async (inviteId: string) => {
    setIsLoading(true);
    try {
      await resendInvite(orgSlug, inviteId);
      toast.success("Einladung erneut gesendet.");
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Senden");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Benutzer / E-Mail</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead>Zugriff</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => (
            <TableRow key={invite.id} className="bg-amber-50/30 hover:bg-amber-50/60">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 bg-transparent border border-dashed border-amber-300">
                    <AvatarFallback className="bg-transparent text-amber-500">
                      <Mail className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">
                      {invite.email}
                    </span>
                    <span className="text-xs text-amber-600 italic flex items-center gap-1">
                      Wartet auf Annahme...
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-slate-500 border-slate-300 font-normal">
                  {invite.role.name}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs text-slate-400">-</span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500" disabled={isLoading}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Einladung verwalten</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleResendInvite(invite.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Erneut senden
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleRevokeInvite(invite.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Zurückziehen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}

          {members.map((member) => {
            const initials = `${member.user.firstName?.[0] || ""}${member.user.lastName?.[0] || ""}` || member.user.email[0].toUpperCase();
            const isMe = member.user.id === currentUserId;
            
            const targetIsAdmin = member.role.name === "Administrator";
            const amIAdmin = currentUserRole.name === "Administrator";

            const canEdit = amIAdmin || !targetIsAdmin || isMe;

            const accessCount = member.user.accessibleForests?.length || 0;
            const accessLabel = targetIsAdmin 
                ? "Alle (Admin)" 
                : accessCount === 0 ? "Kein Zugriff" : `${accessCount} Wälder`;

            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="" /> 
                      <AvatarFallback className="bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        {member.user.firstName 
                          ? `${member.user.firstName} ${member.user.lastName || ""}`
                          : member.user.email 
                        }
                        {isMe && <span className="text-[10px] text-slate-400 font-normal border px-1 rounded">(Du)</span>}
                      </span>
                      <span className="text-xs text-slate-500">{member.user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 font-normal border-slate-200">
                    <Shield className="h-3 w-3 text-indigo-500" />
                    {member.role.name}
                  </Badge>
                </TableCell>
                <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${targetIsAdmin ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {accessLabel}
                    </span>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <div className="flex justify-end items-center gap-1">
                        {amIAdmin && !targetIsAdmin && (
                            <ManageAccessDialog 
                                user={member.user}
                                forests={forests}
                                orgSlug={orgSlug}
                            />
                        )}

                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Benutzer verwalten</DropdownMenuLabel>
                            <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={isMe && !amIAdmin}> 
                                <UserCog className="mr-2 h-4 w-4" />
                                Rolle ändern
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup 
                                value={member.role.id} 
                                onValueChange={(val: string) => handleRoleChange(member.id, val)}
                                >
                                {availableRoles.map(role => (
                                    <DropdownMenuRadioItem key={role.id} value={role.id}>
                                    {role.name}
                                    </DropdownMenuRadioItem>
                                ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleRemoveMember(member.id)}
                            >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isMe ? "Organisation verlassen" : "Entfernen"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  ) : (
                    <div className="flex justify-end pr-2 text-slate-300" title="Keine Berechtigung zur Bearbeitung">
                      <Lock className="h-4 w-4" />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {members.length === 0 && invites.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Keine Mitglieder gefunden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    <ConfirmDialog
      open={!!confirm}
      onOpenChange={(o) => { if (!o) setConfirm(null); }}
      title={confirm?.title ?? ""}
      description={confirm?.description}
      confirmLabel="Bestätigen"
      destructive
      loading={isLoading}
      onConfirm={() => confirm?.onConfirm()}
    />
  );
}