"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("city", city);
    if (price) fd.append("price", price);
    if (bedroom) fd.append("bedroom", bedroom);
    if (bathroom) fd.append("bathroom", bathroom);
    if (propertyType) fd.append("propertyType", propertyType);
    fd.append("description", description);
    if (image) fd.append("image", image, image.name);

    startTransition(async () => {
      const res = await fetch("/api/listings/manual", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to add listing");
        return;
      }
      setOpen(false);
      router.refresh();
      setCity(""); setPrice(""); setBedroom(""); setBathroom(""); setPropertyType(""); setDescription(""); setImage(null);
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-purple-600 text-white">+ Add</button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form onSubmit={onSubmit} className="w-[640px] bg-white rounded-2xl p-5 space-y-3 shadow-lg">
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
                <label className="text-xs text-gray-600">Image (optional)</label>
                <input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0] ?? null)} />
                {image && <p className="text-xs text-gray-500 mt-1">{image.name}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
              <button disabled={pending} className="px-3 py-2 rounded-md bg-purple-600 text-white">
                {pending ? "Adding…" : "Add listing"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
