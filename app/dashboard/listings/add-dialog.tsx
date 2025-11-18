
"use client";
import ListingPostButton from '@/components/listing/listing-post-button';

import { useState, useTransition, useRef, ChangeEvent, useEffect } from 'react';
import Select from 'react-select';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Info } from 'lucide-react';

// Malta cities options (Mainland Malta only)
const maltaCitiesOptions = [
  { label: "Attard", value: "Attard" },
  { label: "Balzan", value: "Balzan" },
  { label: "Birgu", value: "Birgu" },
  { label: "Birkirkara", value: "Birkirkara" },
  { label: "Birżebbuġa", value: "Birżebbuġa" },
  { label: "Bormla", value: "Bormla" },
  { label: "Dingli", value: "Dingli" },
  { label: "Fgura", value: "Fgura" },
  { label: "Floriana", value: "Floriana" },
  { label: "Għargħur", value: "Għargħur" },
  { label: "Għaxaq", value: "Għaxaq" },
  { label: "Gudja", value: "Gudja" },
  { label: "Gżira", value: "Gżira" },
  { label: "Ħamrun", value: "Ħamrun" },
  { label: "Iklin", value: "Iklin" },
  { label: "Isla", value: "Isla" },
  { label: "Kalkara", value: "Kalkara" },
  { label: "Kirkop", value: "Kirkop" },
  { label: "Lija", value: "Lija" },
  { label: "Luqa", value: "Luqa" },
  { label: "Marsa", value: "Marsa" },
  { label: "Marsaskala", value: "Marsaskala" },
  { label: "Marsaxlokk", value: "Marsaxlokk" },
  { label: "Mdina", value: "Mdina" },
  { label: "Mellieħa", value: "Mellieħa" },
  { label: "Mġarr", value: "Mġarr" },
  { label: "Mosta", value: "Mosta" },
  { label: "Mqabba", value: "Mqabba" },
  { label: "Msida", value: "Msida" },
  { label: "Mtarfa", value: "Mtarfa" },
  { label: "Bormla", value: "Bormla" },
  { label: "Bugibba", value: "Bugibba" },
  { label: "Naxxar", value: "Naxxar" },
  { label: "Paola", value: "Paola" },
  { label: "Pembroke", value: "Pembroke" },
  { label: "Pietà", value: "Pietà" },
  { label: "Qawra", value: "Qawra" },
  { label: "Qormi", value: "Qormi" },
  { label: "Qrendi", value: "Qrendi" },
  { label: "Rabat", value: "Rabat" },
  { label: "Safi", value: "Safi" },
  { label: "San Ġiljan", value: "San Ġiljan" },
  { label: "San Ġwann", value: "San Ġwann" },
  { label: "San Pawl il-Baħar", value: "San Pawl il-Baħar" },
  { label: "Santa Luċija", value: "Santa Luċija" },
  { label: "Santa Venera", value: "Santa Venera" },
  { label: "Siġġiewi", value: "Siġġiewi" },
  { label: "Sliema", value: "Sliema" },
  { label: "St. Julian's", value: "St. Julian's" },
  { label: "St. Paul's Bay", value: "St. Paul's Bay" },
  { label: "Swieqi", value: "Swieqi" },
  { label: "Ta' Xbiex", value: "Ta' Xbiex" },
  { label: "Tarxien", value: "Tarxien" },
  { label: "Valletta", value: "Valletta" },
  { label: "Xagħra", value: "Xagħra" },
  { label: "Xewkija", value: "Xewkija" },
  { label: "Xgħajra", value: "Xgħajra" },
  { label: "Żabbar", value: "Żabbar" },
  { label: "Żebbuġ", value: "Żebbuġ" },
  { label: "Żejtun", value: "Żejtun" },
  { label: "Żurrieq", value: "Żurrieq" }
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

interface AddDialogProps {
  listings?: any[];
}

export default function AddDialog({ listings = [] }: AddDialogProps) {
  const { toast } = useToast();
  async function handleStart() {
    setLoading(true);
    try {
      // Önce referans numarası ile daha önce oluşmuş bir listing var mı kontrol et
      const supabase = createClient();
      
      // Oturumdaki kullanıcı id'sini al (her iki durum için de kullanılmak üzere en başta tanımlanıyor)
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) {
            toast({
              title: 'User ID error',
              description: 'Could not get user id from Supabase auth.',
              variant: 'destructive',
            });
        setLoading(false);
        return;
      }
      const userId = user.id;
      
      const { data: existingListing, error: findError } = await supabase
        .from('listings')
        .select('id')
        .eq('title', referenceNo)
        .single();
      if (findError && findError.code !== 'PGRST116') {
            toast({
              title: 'Listing query error',
              description: findError.message,
              variant: 'destructive',
            });
        setLoading(false);
        return;
      }
      let finalListingId = "";
      if (existingListing) {
        finalListingId = existingListing.id;
        setListingId(finalListingId);
        // Mevcut satırı güncelle
        await updateListingFields(finalListingId);
        
        // Activity kaydı ekle - mevcut listing güncellendi
        try {
          await supabase
            .from('activity')
            .insert([{
              user_id: userId,
              type: 'listing_updated',
              data: { listing_id: finalListingId, title: referenceNo },
              created_at: new Date().toISOString(),
            }]);
        } catch (activityError) {
          console.error('Activity insert error:', activityError);
        }
        
            toast({
              title: 'Listing already exists',
              description: 'Only a new job will be created.',
              variant: 'default',
            });
      } else {
        // Yeni listing oluştur (user_id, title, property_url, availability)
        const { data: newListing, error: createError } = await supabase
          .from('listings')
          .insert({ user_id: userId, title: referenceNo, property_url: 'manual', availability: 'Available' })
          .select('id')
          .single();
        if (createError || !newListing) {
              toast({
                title: 'Listing could not be created',
                description: createError?.message || 'Unknown error',
                variant: 'destructive',
              });
          setLoading(false);
          return;
        }
        finalListingId = newListing.id;
        setListingId(finalListingId);
        // Detayları hemen güncelle
        await updateListingFields(finalListingId);
        
        // Activity kaydı ekle - yeni listing oluşturuldu
        try {
          await supabase
            .from('activity')
            .insert([{
              user_id: userId,
              type: 'listing_created',
              data: { listing_id: finalListingId, title: referenceNo },
              created_at: new Date().toISOString(),
            }]);
        } catch (activityError) {
          console.error('Activity insert error:', activityError);
        }
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
            toast({
              title: 'Job could not be created',
              description: message || 'Unknown error',
              variant: 'destructive',
            });
        setLoading(false);
        return;
      }
      setJobId(jobId);
    setStartDone(true);
    setTimerActive(true);
    setSecondsLeft(300); // 5 dakika (tekrar eski haline getirildi)
          toast({
            title: 'Job created successfully!',
            description: 'Your listing job has been created and will be processed.',
            variant: 'default',
          });
      // Zamanlayıcı başlat
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setTimerActive(false);
            setOpen(false);
                toast({
                  title: 'Dialog closed',
                  description: 'No upload was made within 5 minutes. Please try again.', // Açıklamayı da tekrar 5 dakika olarak güncelledik
                  variant: 'default',
                });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
          toast({
            title: 'Error',
            description: (e as Error).message,
            variant: 'destructive',
          });
    } finally {
      setLoading(false);
    }
  }

  // Zamanlayıcı için ek state ve ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 dakika (tekrar eski haline getirildi)
  
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
          toast({
               title: 'Listing update failed',
               description: error.message,
               variant: 'destructive',
             });
    }
  }
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [referenceNo, setReferenceNo] = useState("");
  const [suggestedNextNumber, setSuggestedNextNumber] = useState<number | null>(null);
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

  // Calculate suggested next reference number when dialog opens
  useEffect(() => {
    if (open && listings.length > 0) {
      // Find manual reference numbers (starting with "L" followed by digits, e.g., L1, L2, L3)
      const manualReferences = listings
        .map(l => l.referenceNo || l.title)
        .filter(ref => ref && /^L\d+$/i.test(ref.toString())) // Match L1, L2, L3, etc.
        .map(ref => parseInt(ref.toString().substring(1))) // Extract number part after "L"
        .filter(num => !isNaN(num));

      if (manualReferences.length > 0) {
        const maxNumber = Math.max(...manualReferences);
        setSuggestedNextNumber(maxNumber + 1);
      } else {
        setSuggestedNextNumber(1);
      }
    }
  }, [open, listings]);

  const handleUseSuggested = () => {
    if (suggestedNextNumber !== null) {
      setReferenceNo(`L${suggestedNextNumber}`);
    }
  };

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 15);
    setImages(files);
    setImageUrls(files.map(file => URL.createObjectURL(file)));
  }

  async function handleUpload() {
    if (!jobId || !listingId) {
      toast({
        title: 'Start required',
        description: 'You must click Start first.',
        variant: 'destructive',
      });
      return;
    }
    if (images.length === 0) {
    toast({
      title: 'No images',
      description: 'No images to upload.',
      variant: 'destructive',
    });
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
      toast({
        title: 'User ID error',
        description: 'Could not get user id from Supabase auth.',
        variant: 'destructive',
      });
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
        toast({
          title: 'Upload error',
          description: uploadError,
          variant: 'destructive',
        });
      } else if (urls.length > 0) {
        toast({
          title: 'Images uploaded',
          description: 'Images uploaded successfully.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'No images uploaded',
          description: 'No images were uploaded.',
          variant: 'default',
        });
      }
    } catch (e) {
    toast({
      title: 'Image upload failed',
      description: (e as Error).message,
      variant: 'destructive',
    });
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
    // localStorage'dan form state'ini de sil
    localStorage.removeItem('listingForm');
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
    toast({
      title: 'Error',
      description: (e as Error).message,
      variant: 'destructive',
    });
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
                // localStorage'dan form state'ini de sil
                localStorage.removeItem('listingForm');
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
                
                <input className="w-full border rounded-md px-3 py-2 mb-2" value={referenceNo} onChange={e=>setReferenceNo(e.target.value)} required />
                
                {suggestedNextNumber !== null && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-sm">
                    <Info className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span className="text-purple-700 text-xs">
                      Last used manual reference no: L{suggestedNextNumber - 1}
                    </span>
                    <button
                      type="button"
                      onClick={handleUseSuggested}
                      className="ml-auto px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      Use L{suggestedNextNumber}
                    </button>
                  </div>
                )}
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
              <button
                type="button"
                onClick={handleStart}
                disabled={loading || startDone}
                className={`px-3 py-2 rounded-md bg-blue-600 text-white${loading || startDone ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                Start
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!startDone || images.length === 0 || loading || uploadDone}
                className={`px-3 py-2 rounded-md bg-green-600 text-white${(!startDone || images.length === 0 || loading || uploadDone) ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                Upload
              </button>
              {/* Post tuşu sadece startDone && uploadDone && jobId && listingId olduğunda aktif, diğer zamanlarda disabled */}
              {startDone && uploadDone && jobId && listingId ? (
                <ListingPostButton
                  listingId={listingId}
                  jobId={jobId}
                  formData={{
                    referenceNo,
                    city,
                    price: price ? Number(price) : 0,
                    bedroom: bedroom ? Number(bedroom) : 0,
                    bathroom: bathroom ? Number(bathroom) : 0,
                    propertyType,
                    description,
                    images,
                  }}
                  onSuccess={() => {
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
                    // localStorage'dan form state'ini de sil
                    localStorage.removeItem('listingForm');
                  }}
                />
              ) : (
                <button type="button" disabled className="px-3 py-2 rounded-md bg-purple-600 text-white opacity-50 cursor-not-allowed">
                  Post
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
