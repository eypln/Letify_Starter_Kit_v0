"use client";

import { useState, useTransition, useRef, ChangeEvent } from 'react';
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function AddDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [city, setCity] = useState("");
  const [price, setPrice] = useState<string>("");
  const [bedroom, setBedroom] = useState<string>("");
  const [bathroom, setBathroom] = useState<string>("");
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f || null);
    setImage(f || null);
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedFile(null);
    setImage(null);
  }

  const [loading, setLoading] = useState(false);
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // You may want to create the listing first, then get its ID
      // For now, let's assume listingId is generated here (could be from DB after insert)
      const listingId = 'listing_' + Date.now();
      const res = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'manual',
          listingId,
          sourceUrl: '', // If you have a sourceUrl field, pass it here
        }),
      });
      const { ok, jobId, message } = await res.json();
      if (!ok) throw new Error(message || 'Start failed');
      setOpen(false);
      router.push(`/dashboard/new-post?jobId=${jobId}`);
      setCity(""); setPrice(""); setBedroom(""); setBathroom(""); setPropertyType(""); setDescription(""); setImage(null); setSelectedFile(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-purple-600 text-white">+ Add</button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form onSubmit={handleCreate} className="w-[640px] bg-white rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add listing</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">City</label>
                <input className="w-full border rounded-md px-3 py-2" value={city} onChange={e=>setCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Price</label>
                <input type="number" className="w-full border rounded-md px-3 py-2" value={price} onChange={e=>setPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Bedroom</label>
                <input type="number" className="w-full border rounded-md px-3 py-2" value={bedroom} onChange={e=>setBedroom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Bathroom</label>
                <input type="number" className="w-full border rounded-md px-3 py-2" value={bathroom} onChange={e=>setBathroom(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Property type</label>
                <input className="w-full border rounded-md px-3 py-2" value={propertyType} onChange={e=>setPropertyType(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Description</label>
                <textarea rows={6} className="w-full border rounded-md px-3 py-2 resize-y"
                  value={description} onChange={e=>setDescription(e.target.value)} />
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Image (optional)</label>
                    {/* Native input'ı gizli tutuyoruz ama formda kalıyor */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="image"
                      accept="image/*"
                      className="sr-only"
                      onChange={onFileChange}
                    />

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={triggerFilePicker}>
                        {selectedFile ? 'Choose another file' : 'Choose file'}
                      </Button>

                      <span className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : 'No file selected'}
                      </span>

                      {selectedFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearFile}
                          aria-label="Clear selected file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
              <button type="submit" disabled={loading} className="px-3 py-2 rounded-md bg-purple-600 text-white">
                {loading ? "Creating..." : "+ Add"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
