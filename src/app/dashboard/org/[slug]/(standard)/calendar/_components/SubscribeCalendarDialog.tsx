"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rss, Copy, RefreshCw, Check } from "lucide-react";
import { getICalLink, resetICalToken } from "@/actions/calendar";
import { toast } from "sonner";

export function SubscribeCalendarDialog() {
  const [link, setLink] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadLink = async () => {
    const url = await getICalLink();
    setLink(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link kopiert");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = async () => {
    if(!confirm("Wenn Sie den Link zurücksetzen, funktionieren alle bisherigen Kalender-Abos nicht mehr.")) return;
    await resetICalToken();
    loadLink(); // Neuen Link laden
    toast.success("Neuer Link generiert");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(val) loadLink(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
            <Rss className="w-4 h-4" /> Abonnieren
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kalender abonnieren</DialogTitle>
          <DialogDescription>
            Integrieren Sie Ihre Aufgaben in Outlook, Google Calendar oder Apple Kalender.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>Ihr privater Abo-Link</Label>
                <div className="flex gap-2">
                    <Input value={link} readOnly className="font-mono text-xs bg-slate-50" />
                    <Button size="icon" variant="outline" onClick={handleCopy}>
                        {copied ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Geben Sie diesen Link niemals weiter. Er enthält Zugriff auf Ihre Termine.
                </p>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full justify-start px-0">
                <RefreshCw className="w-3 h-3 mr-2" /> Link zurücksetzen (bei Missbrauch)
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}