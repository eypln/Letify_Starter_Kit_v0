"use client";
import { useState, useTransition } from 'react';
import { createListing } from './actions';

export default function AddDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [referenceUrl, setUrl] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [bedroom, setBedroom] = useState('');
  const [bathroom, setBathroom] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = referenceUrl.trim();
    try { new URL(url); } catch { setError('Lütfen geçerli bir URL girin'); return; }
    setError('');
    start(() => {
      createListing({
        userId: "CURRENT_USER_ID", // TODO: Replace with actual user ID from session/auth
        referenceUrl: url,
        city: city || null,
        price: price ? Number(price) : null,
        bedroom: bedroom ? Number(bedroom) : null,
        bathroom: bathroom ? Number(bathroom) : null,
        propertyType: propertyType || null,
        description: description || null,
      })
      .then(() => {
        setOpen(false);
        if (typeof window !== 'undefined') window.location.reload();
      })
      .catch(err => setError(err.message || JSON.stringify(err)));
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
        + Add
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Add listing</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Reference URL *</label>
                <input value={referenceUrl} onChange={e=>setUrl(e.target.value)} type="url" required
                  placeholder="https://example.com/property/123"
                  className="mt-1 w-full rounded border px-3 py-2" />
                {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">City</label>
                  <input value={city} onChange={e=>setCity(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Price</label>
                  <input value={price} onChange={e=>setPrice(e.target.value)} type="number" min="0" className="mt-1 w-full rounded border px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Bedroom</label>
                  <input value={bedroom} onChange={e=>setBedroom(e.target.value)} type="number" min="0" className="mt-1 w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Bathroom</label>
                  <input value={bathroom} onChange={e=>setBathroom(e.target.value)} type="number" min="0" className="mt-1 w-full rounded border px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Property type</label>
                  <input value={propertyType} onChange={e=>setPropertyType(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Description</label>
                  <input value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded border">Cancel</button>
                <button disabled={pending} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">
                  {pending ? 'Adding…' : 'Add listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
