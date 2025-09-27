"use client";

import { useState, useTransition, useRef, ChangeEvent } from 'react';
import Select from 'react-select';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Malta cities options (full list)
const maltaCitiesOptions = [
  { label: "Valletta", value: "Valletta" },
  { label: "Sliema", value: "Sliema" },
  { label: "St. Julian's", value: "St. Julian's" },
  { label: "Birkirkara", value: "Birkirkara" },
  { label: "Mosta", value: "Mosta" },
  { label: "Qormi", value: "Qormi" },
  { label: "Żabbar", value: "Żabbar" },
  { label: "Żebbuġ", value: "Żebbuġ" },
  { label: "Marsaskala", value: "Marsaskala" },
  { label: "Marsaxlokk", value: "Marsaxlokk" },
  { label: "Mellieħa", value: "Mellieħa" },
  { label: "Mdina", value: "Mdina" },
  { label: "Rabat", value: "Rabat" },
  { label: "Paola", value: "Paola" },
  { label: "Birżebbuġa", value: "Birżebbuġa" },
  { label: "Naxxar", value: "Naxxar" },
  { label: "Senglea", value: "Senglea" },
  { label: "Birgu", value: "Birgu" },
  { label: "Bormla", value: "Bormla" },
  { label: "Gżira", value: "Gżira" },
  { label: "Msida", value: "Msida" },
  { label: "Floriana", value: "Floriana" },
  { label: "Swieqi", value: "Swieqi" },
  { label: "Xgħajra", value: "Xgħajra" },
  { label: "Kalkara", value: "Kalkara" },
  { label: "Attard", value: "Attard" },
  { label: "Balzan", value: "Balzan" },
  { label: "Lija", value: "Lija" },
  { label: "Santa Venera", value: "Santa Venera" },
  { label: "Luqa", value: "Luqa" },
  { label: "Gudja", value: "Gudja" },
  { label: "Kirkop", value: "Kirkop" },
  { label: "Mqabba", value: "Mqabba" },
  { label: "Qrendi", value: "Qrendi" },
  { label: "Safi", value: "Safi" },
  { label: "Żurrieq", value: "Żurrieq" },
  { label: "Dingli", value: "Dingli" },
  { label: "Mtarfa", value: "Mtarfa" },
  { label: "Siġġiewi", value: "Siġġiewi" },
  { label: "Għargħur", value: "Għargħur" },
  { label: "Pembroke", value: "Pembroke" },
  { label: "St. Paul's Bay", value: "St. Paul's Bay" },
  { label: "Xemxija", value: "Xemxija" },
  { label: "Bugibba", value: "Bugibba" }
];
const propertyTypeOptions = [
  { label: 'Apartments', value: 'Apartments' },
  { label: 'Maisonettes', value: 'Maisonettes' },
  { label: 'Penthouses', value: 'Penthouses' },
  { label: 'Terraced Houses', value: 'Terraced Houses' },
  { label: 'Townhouses', value: 'Townhouses' },
  { label: 'House of Character', value: 'House of Character' },
  { label: 'Detached Villa', value: 'Detached Villa' },
  { label: 'Farmhouses', value: 'Farmhouses' },
  { label: 'Bungalows', value: 'Bungalows' },
  { label: 'Palace/Castle/Manor', value: 'Palace/Castle/Manor' },
  { label: 'Land', value: 'Land' },
  { label: 'Boathouses', value: 'Boathouses' },
  { label: 'Site', value: 'Site' },
  { label: 'Semi Detached Villa', value: 'Semi Detached Villa' },
  { label: 'Studio Apartments', value: 'Studio Apartments' },
  { label: 'Block', value: 'Block' },
  { label: 'Rooms', value: 'Rooms' }
];
export default function AddDialog() {
  async function handleStart() {
    setLoading(true);
    try {
      // Önce referans numarası ile daha önce oluşmuş bir listing var mı kontrol et
      const supabase = createClient();
      const { data: existingListing, error: findError } = await supabase
        .from('listings')
        .select('id')
        .eq('title', referenceNo)
        .single();
      if (findError && findError.code !== 'PGRST116') {
  alert('Listing query error: ' + findError.message);
        setLoading(false);
        return;
      }
      let finalListingId = "";
      if (existingListing) {
        finalListingId = existingListing.id;
        setListingId(finalListingId);
        // Mevcut satırı güncelle
        await updateListingFields(finalListingId);
        alert('A listing with this reference number already exists. Only a new job will be created.');
      } else {
        // Yeni listing oluştur
        const { data: newListing, error: createError } = await supabase
          .from('listings')
          .insert({ title: referenceNo, property_url: 'manual' })
          .select('id')
          .single();
        if (createError || !newListing) {
          alert('Listing could not be created: ' + (createError?.message || 'Unknown error'));
          setLoading(false);
          return;
        }
        finalListingId = newListing.id;
        setListingId(finalListingId);
        // Detayları hemen güncelle
        await updateListingFields(finalListingId);
      }
      // Job oluştur
      const res = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'manual',
          listingId: finalListingId,
          sourceUrl: '',
          title: referenceNo,
        }),
      });
      const { ok, jobId, message } = await res.json();
      if (!ok || !jobId) {
  alert('Job could not be created: ' + (message || 'Unknown error'));
        setLoading(false);
        return;
      }
      setJobId(jobId);
      setStartDone(true);
      setTimerActive(true);
      setSecondsLeft(300);
  alert('Job created successfully!');
      // Zamanlayıcı başlat
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setTimerActive(false);
            setOpen(false);
            alert('Dialog closed because no upload was made within 5 minutes. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
  alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  // Zamanlayıcı için ek state ve ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 dakika
  async function updateListingFields(listingId: string) {
    const supabase = createClient();
    const updateFields: Record<string, any> = {
      city,
      price: price ? Number(price) : null,
      bedrooms: bedroom ? Number(bedroom) : null,
      bathrooms: bathroom ? Number(bathroom) : null,
      property_type: propertyType,
      description,
      title: referenceNo,
    };
    const { error } = await supabase
      .from('listings')
      .update(updateFields)
      .eq('id', listingId);
    if (error) {
  alert('Listing update failed: ' + error.message);
    }
  }
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [referenceNo, setReferenceNo] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState<string>("");
  const [bedroom, setBedroom] = useState<string>("");
  const [bathroom, setBathroom] = useState<string>("");
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription] = useState("");
  // Multi-image upload states
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string>("");
  const [listingId, setListingId] = useState<string>("");
  const [startDone, setStartDone] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 15);
    setImages(files);
    setImageUrls(files.map(file => URL.createObjectURL(file)));
  }

  async function handleUpload() {
    if (!jobId || !listingId) {
  alert("You must click Start first.");
      return;
    }
    if (images.length === 0) {
  alert("No images to upload.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const now = new Date();
      // Oturumdaki kullanıcı id'sini dinamik olarak al
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('Could not get user id from Supabase auth.');
        setLoading(false);
        return;
      }
      const userId = user.id;
      const urls: string[] = [];
      let uploadError = null;
      // uuid fonksiyonu için import eklemeniz gerekebilir: import { v4 as uuidv4 } from 'uuid';
      for (const file of images) {
        const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const rand = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2, 10));
        const cleanName = compressed.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = `${userId}/${y}/${m}/${jobId}/${Date.now()}-${rand}-${cleanName}`;
        const { error } = await supabase.storage
          .from('user_uploads')
          .upload(filePath, compressed, { upsert: true });
        if (!error) {
          const url = supabase.storage.from('user_uploads').getPublicUrl(filePath).data.publicUrl;
          urls.push(url);
        } else {
          uploadError = error.message;
        }
      }
      setImageUrls(urls);
      setUploadDone(true);
      // Zamanlayıcıyı durdur
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimerActive(false);
      if (uploadError) {
        alert('Some images failed to upload: ' + uploadError);
      } else if (urls.length > 0) {
        alert('Images uploaded successfully.');
      } else {
        alert('No images were uploaded.');
      }
    } catch (e) {
  alert('Image upload failed: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  function clearFiles() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImages([]);
    setImageUrls([]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const listingId = 'listing_' + Date.now();
      const res = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'manual',
          listingId,
          sourceUrl: '',
          title: referenceNo,
          city,
          price,
          bedroom,
          bathroom,
          propertyType,
          description,
          images: imageUrls,
        }),
      });
      const { ok, jobId, message } = await res.json();
      if (!ok) throw new Error(message || 'Start failed');
      setOpen(false);
      setReferenceNo(""); setCity(""); setPrice(""); setBedroom(""); setBathroom(""); setPropertyType(""); setDescription(""); clearFiles();
    } catch (e) {
  alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-purple-600 text-white">+ Add</button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form onSubmit={handleCreate} className="w-[640px] bg-white rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add listing</h3>
              <button type="button" onClick={() => {
                setOpen(false);
                setReferenceNo("");
                setCity("");
                setPrice("");
                setBedroom("");
                setBathroom("");
                setPropertyType("");
                setDescription("");
                setImages([]);
                setImageUrls([]);
                setJobId("");
                setListingId("");
                setStartDone(false);
                setUploadDone(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                setTimerActive(false);
              }} className="p-1">✕</button>
            </div>
            {timerActive && (
              <div className="mb-2 text-sm text-red-600 text-center">
                Time left: {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Reference No</label>
                <input className="w-full border rounded-md px-3 py-2" value={referenceNo} onChange={e=>setReferenceNo(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-gray-600">City</label>
                <Select
                  options={maltaCitiesOptions}
                  value={maltaCitiesOptions.find(opt => opt.value === city) || null}
                  onChange={(option: any) => setCity(option ? option.value : "")}
                  isClearable
                  placeholder="Select city"
                  name="city"
                  classNamePrefix="react-select"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Price</label>
                <input type="number" className="w-full border rounded-md px-3 py-2" value={price} onChange={e=>setPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Bedroom</label>
                <Select
                  options={[1,2,3,4,5].map(n => ({ label: n.toString(), value: n.toString() }))}
                  value={bedroom ? { label: bedroom, value: bedroom } : null}
                  onChange={(option: any) => setBedroom(option ? option.value : "")}
                  isClearable
                  placeholder="Select bedroom count"
                  name="bedroom"
                  classNamePrefix="react-select"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Bathroom</label>
                <Select
                  options={[1,2,3,4,5].map(n => ({ label: n.toString(), value: n.toString() }))}
                  value={bathroom ? { label: bathroom, value: bathroom } : null}
                  onChange={(option: any) => setBathroom(option ? option.value : "")}
                  isClearable
                  placeholder="Select bathroom count"
                  name="bathroom"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Property type</label>
                <Select
                  options={propertyTypeOptions}
                  value={propertyTypeOptions.find(opt => opt.value === propertyType) || null}
                  onChange={(option: any) => setPropertyType(option ? option.value : "")}
                  isClearable
                  placeholder="Select property type"
                  name="propertyType"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Description</label>
                <textarea rows={6} className="w-full border rounded-md px-3 py-2 resize-y"
                  value={description} onChange={e=>setDescription(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Images (optional, up to 15)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={onFileChange}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button type="button" className="px-2 py-1 rounded bg-gray-200" onClick={triggerFilePicker}>
                    {images.length > 0 ? 'Choose other files' : 'Choose files'}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {images.length > 0 ? `${images.length} file(s) selected` : 'No files selected'}
                  </span>
                  {images.length > 0 && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-gray-100"
                      onClick={clearFiles}
                      aria-label="Clear selected files"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Thumbnail preview */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url) => (
                    <img key={url} src={url} alt="preview" className="w-16 h-16 object-cover rounded" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => {
                setOpen(false);
                setReferenceNo("");
                setCity("");
                setPrice("");
                setBedroom("");
                setBathroom("");
                setPropertyType("");
                setDescription("");
                setImages([]);
                setImageUrls([]);
                setJobId("");
                setListingId("");
                setStartDone(false);
                setUploadDone(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                setTimerActive(false);
              }} className="px-3 py-2 rounded-md border">Cancel</button>
              <button type="button" onClick={handleStart} disabled={loading || startDone} className="px-3 py-2 rounded-md bg-blue-600 text-white">
                Start
              </button>
              <button type="button" onClick={handleUpload} disabled={!startDone || loading || uploadDone} className="px-3 py-2 rounded-md bg-green-600 text-white">
                Upload
              </button>
              <button type="button" disabled className="px-3 py-2 rounded-md bg-purple-600 text-white opacity-50 cursor-not-allowed">
                Finish
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
