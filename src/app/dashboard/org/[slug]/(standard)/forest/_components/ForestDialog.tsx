"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2, Trees } from "lucide-react";
import { createForest, updateForest } from "@/actions/forest";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Props {
  orgSlug: string;
  members: any[]; // Alle Mitarbeiter der Org
  forest?: any;   // Wenn undefined -> Erstellen Modus, sonst Bearbeiten
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ForestDialog({ orgSlug, members, forest, trigger, open: controlledOpen, onOpenChange }: Props) {
  const t = useTranslations('ForestDialog');
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  
  // Fields
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [desc, setDesc] = useState("");
  
  // Access Management: Liste der User-IDs, die Zugriff haben
  const [grantedIds, setGrantedIds] = useState<string[]>([]);

  // Init Data on Open
  useEffect(() => {
    if (isOpen) {
      if (forest) {
        setName(forest.name);
        setLocation(forest.location || "");
        setAreaHa(forest.areaHa?.toString() || "");
        setDesc(forest.description || "");
        // Lade bestehende Zuweisungen
        setGrantedIds(forest.grantedUsers?.map((u: any) => u.id) || []);
      } else {
        // Reset für Create Mode
        setName(""); setLocation(""); setAreaHa(""); setDesc(""); setGrantedIds([]);
      }
    }
  }, [isOpen, forest]);

  const handleSubmit = async () => {
    if (!name) return toast.error(t('nameRequired'));
    setIsLoading(true);

    try {
      const payload = {
        name,
        location,
        areaHa: areaHa ? parseFloat(areaHa) : undefined,
        description: desc,
        grantedUserIds: grantedIds
      };

      if (forest) {
        await updateForest(orgSlug, forest.id, payload);
        toast.success(t('forestUpdated'));
      } else {
        await createForest(orgSlug, payload);
        toast.success(t('forestCreated'));
      }
      setOpen(false);
    } catch (e) {
      toast.error(t('errorSaving'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setGrantedIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button>
                <Plus className="mr-2 h-4 w-4" /> {t('newForest')}
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{forest ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
            
            {/* Stammdaten */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('nameLabel')}</Label>
                    <Input placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>{t('locationLabel')}</Label>
                    <Input placeholder={t('locationPlaceholder')} value={location} onChange={e => setLocation(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t('areaLabel')}</Label>
                <Input type="number" placeholder="0.0" value={areaHa} onChange={e => setAreaHa(e.target.value)} />
            </div>

            <div className="space-y-2">
                <Label>{t('descriptionLabel')}</Label>
                <Textarea placeholder={t('descriptionPlaceholder')} value={desc} onChange={e => setDesc(e.target.value)} />
            </div>

            {/* Berechtigungen */}
            <div className="space-y-3 border rounded-md p-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Trees className="h-4 w-4 text-slate-500" />
                    <Label className="font-semibold">{t('accessLabel')}</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                    {t('accessHint')}
                </p>
                
                <ScrollArea className="h-40 border rounded bg-white p-2">
                    <div className="space-y-2">
                        {members.map((member) => {
                            const isAdmin = member.role.name === "Administrator";
                            const isSelected = grantedIds.includes(member.user.id);
                            
                            return (
                                <div key={member.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded">
                                    <Checkbox 
                                        id={member.id} 
                                        checked={isAdmin || isSelected} 
                                        disabled={isAdmin} // Admins können nicht abgewählt werden
                                        onCheckedChange={() => toggleUser(member.user.id)}
                                    />
                                    <label htmlFor={member.id} className="text-sm flex-1 cursor-pointer">
                                        <span className="font-medium text-slate-700">
                                            {member.user.firstName} {member.user.lastName}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-2">
                                            {isAdmin ? t('adminNote') : member.role.name}
                                        </span>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t('save')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}