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

  async function onSubmit() {
    if (!url.trim()) {
      toast({ title: "URL required", description: "Please enter the listing link.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'url', sourceUrl: url }),
      });
      const { ok, jobId, message } = await res.json();
      if (!ok) throw new Error(message || 'Start failed');
      setOpen(false);
      setUrl("");
      router.push(`/dashboard/new-post?jobId=${jobId}`);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? 'Starting...' : 'Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}