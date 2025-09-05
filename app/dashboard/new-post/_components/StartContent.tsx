"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useWizardStore } from "@/lib/wizard/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StartFlowCTA from "@/components/wizard/StartFlowCTA";

export default function StartContent() {
  const { toast } = useToast();
  const router = useRouter();
  const { setJobId, setListingId } = useWizardStore(); // 👈 Wizard store hook'u
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onStart = async () => setOpen(true);

  const onSubmit = async () => {
    if (!url.trim()) {
  toast({ title: "URL required", description: "Please enter the listing link.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/webhooks/content", {
        method: "POST",
        credentials: 'same-origin',   // opsiyonel, açıklık için
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing: { sourceUrl: url } }),
      });

      let data: any = null;
      try { 
        data = await res.json(); 
      } catch { 
        data = { ok: res.ok, message: "Parse error" }; 
      }

      if (!res.ok || !data?.ok) {
        // Specific error messages for better UX
        const errorMessages: Record<string, string> = {
          auth_required: "You need to sign in",
          email_not_verified: "You need to verify your email address",
          full_name_required: "Please complete your name information on the profile page",
          phone_required: "Please complete your phone information on the profile page",
          waiting_approval: "Waiting for admin approval",
        };
        
        const errorMessage = data?.message && errorMessages[data.message] 
          ? errorMessages[data.message]
          : data?.message || "İş başlatılamadı";
          
        throw new Error(errorMessage);
      }

      toast({ 
  title: "Content generation started", 
  description: `Process queued. Job ID: ${data.jobId?.slice(0, 8)}...` 
      });
      
      // 👇 JobId'yi wizard store'a TTL ile kaydet
      setJobId(data.jobId, Date.now()); // ← başlangıç zamanı yalnızca burada set edilir
      // ListingId'yi de kaydet (URL'den hash oluştur)
      const listingId = data.listingId || 'listing_' + Date.now();
      setListingId(listingId);
      
      setOpen(false);
      setUrl("");

      // Redirect to the same page with job parameter
      router.push(`/dashboard/new-post?job=${data.jobId}&step=1`);
    } catch (e: any) {
  toast({ title: "Error", description: e.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
  <StartFlowCTA onClick={onStart} size="lg" className="bg-purple-500 hover:bg-purple-600 text-white">+ Start new content generation</StartFlowCTA>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter listing link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="https://...... (real estate listing link)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Listing information will be fetched from this link, and title/description will be generated.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? "Baslatiliyor..." : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}