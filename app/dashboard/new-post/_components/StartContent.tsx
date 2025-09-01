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
      toast({ title: "URL gerekli", description: "İlan linkini girin.", variant: "destructive" });
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
          auth_required: "Giriş yapmanız gerekiyor",
          email_not_verified: "E-posta adresinizi doğrulamanız gerekiyor",
          full_name_required: "Profil sayfasından ad soyad bilginizi tamamlayın",
          phone_required: "Profil sayfasından telefon bilginizi tamamlayın",
          waiting_approval: "Admin onayınız bekleniyor",
        };
        
        const errorMessage = data?.message && errorMessages[data.message] 
          ? errorMessages[data.message]
          : data?.message || "İş başlatılamadı";
          
        throw new Error(errorMessage);
      }

      toast({ 
        title: "İçerik üretimi başladı", 
        description: `İşlem kuyruğa alındı. Job ID: ${data.jobId?.slice(0, 8)}...` 
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
      toast({ title: "Hata", description: e.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StartFlowCTA onClick={onStart} size="lg">+ Yeni içerik üretimine başla</StartFlowCTA>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İlan linkini gir</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="https://...... (emlak ilan linki)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Bu linkten ilan bilgileri çekilecek, başlık/açıklama oluşturulacak.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Vazgeç</Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? "Başlatılıyor..." : "Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}