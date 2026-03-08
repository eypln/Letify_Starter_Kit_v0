
"use client";
import ListingPostButton from '@/components/listing/listing-post-button';
import Image from 'next/image';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import Select from 'react-select';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Info } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  dateFormat?: string;
  placeholderText?: string;
  className?: string;
  isClearable?: boolean;
}

const DatePickerWrapper = dynamic(
  () => import('react-datepicker').then((mod) => {
    const Component = mod.default as ComponentType<DatePickerProps>;
    return { default: Component };
  }),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-gray-100 rounded animate-pulse" />,
  }
);
const DatePicker = DatePickerWrapper;

// Malta cities options (Mainland Malta only)
const maltaCitiesOptions = [
  { label: "Attard", value: "Attard" },
  { label: "Balzan", value: "Balzan" },
  { label: "Bahar ic-Caghaq", value: "Bahar ic-Caghaq" },
  { label: "Birgu", value: "Birgu" },
  { label: "Birkirkara", value: "Birkirkara" },
  { label: "Birzebbuga", value: "Birzebbuga" },
  { label: "Bormla", value: "Bormla" },
  { label: "Bugibba", value: "Bugibba" },
  { label: "Dingli", value: "Dingli" },
  { label: "Fgura", value: "Fgura" },
  { label: "Floriana", value: "Floriana" },
  { label: "Gharghur", value: "Gharghur" },
  { label: "Ghaxaq", value: "Ghaxaq" },
  { label: "Gudja", value: "Gudja" },
  { label: "Gzira", value: "Gzira" },
  { label: "Hamrun", value: "Hamrun" },
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
  { label: "Mellieha", value: "Mellieha" },
  { label: "Mgarr", value: "Mgarr" },
  { label: "Mosta", value: "Mosta" },
  { label: "Mqabba", value: "Mqabba" },
  { label: "Msida", value: "Msida" },
  { label: "Mtarfa", value: "Mtarfa" },
  { label: "Naxxar", value: "Naxxar" },
  { label: "Paola", value: "Paola" },
  { label: "Pembroke", value: "Pembroke" },
  { label: "Pieta", value: "Pieta" },
  { label: "Qawra", value: "Qawra" },
  { label: "Qormi", value: "Qormi" },
  { label: "Qrendi", value: "Qrendi" },
  { label: "Rabat", value: "Rabat" },
  { label: "Safi", value: "Safi" },
  { label: "San Giljan", value: "San Giljan" },
  { label: "San Gwann", value: "San Gwann" },
  { label: "San Pawl il-Bahar", value: "San Pawl il-Bahar" },
  { label: "Santa Lucija", value: "Santa Lucija" },
  { label: "Santa Venera", value: "Santa Venera" },
  { label: "Siggiewi", value: "Siggiewi" },
  { label: "Sliema", value: "Sliema" },
  { label: "St. Julian's", value: "St. Julian's" },
  { label: "St. Paul's Bay", value: "St. Paul's Bay" },
  { label: "Swatar", value: "Swatar" },
  { label: "Swieqi", value: "Swieqi" },
  { label: "Ta' Xbiex", value: "Ta' Xbiex" },
  { label: "Tarxien", value: "Tarxien" },
  { label: "Valletta", value: "Valletta" },
  { label: "Xemxija", value: "Xemxija" },
  { label: "Xghajra", value: "Xghajra" },
  { label: "Zabbar", value: "Zabbar" },
  { label: "Zebbug", value: "Zebbug" },
  { label: "Zejtun", value: "Zejtun" },
  { label: "Zurrieq", value: "Zurrieq" }
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

interface SelectOption {
  label: string;
  value: string;
}

interface Listing {
  referenceNo?: string;
  title?: string;
}

interface AddDialogProps {
  listings?: Listing[];
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onListingCreated?: (listingId: string) => void;
  showTrigger?: boolean;
}

export default function AddDialog({ externalOpen, onOpenChange, onListingCreated, showTrigger = true }: AddDialogProps) {
  const { toast } = useToast();
  const supabase = createClient();
  
  async function handleStart() {
    setLoading(true);
    try {
      // Eğer referans numarası boşsa, otomatik olarak API'den al
      let finalReferenceNo = referenceNo.trim();
      
      if (!finalReferenceNo) {
        try {
          const response = await fetch('/api/listings/next-reference');
          if (response.ok) {
            const { referenceNumber } = await response.json();
            finalReferenceNo = referenceNumber;
            setReferenceNo(referenceNumber);
          } else {
            toast({
              title: 'Error',
              description: 'Could not generate reference number. Please enter manually.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching reference number:', error);
          toast({
            title: 'Error',
            description: 'Could not generate reference number. Please enter manually.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }
      
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
        .eq('title', finalReferenceNo)
        .eq('user_id', userId)
        .maybeSingle();
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
              data: { listing_id: finalListingId, title: finalReferenceNo },
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
          .insert({ user_id: userId, title: finalReferenceNo, property_url: 'manual', availability: 'Available' })
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
              data: { listing_id: finalListingId, title: finalReferenceNo },
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
          title: finalReferenceNo,
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
    if (onListingCreated) onListingCreated(finalListingId);
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
    const updateFields: Record<string, string | number | null> = {
      city,
      price: price ? Number(price) : null,
      bedrooms: bedroom ? Number(bedroom) : null,
      bathrooms: bathroom ? Number(bathroom) : null,
      property_type: propertyType,
      description,
      title: referenceNo,
      available_date: availableDate ? `${availableDate.getFullYear()}-${String(availableDate.getMonth() + 1).padStart(2, '0')}-${String(availableDate.getDate()).padStart(2, '0')}` : null,
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
  const [_openInt, _setOpenInt] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : _openInt;
  const setOpen = (val: boolean) => { _setOpenInt(val); onOpenChange?.(val); };
  const [referenceNo, setReferenceNo] = useState("");
  const [suggestedNextNumber, setSuggestedNextNumber] = useState<number | null>(null);
  const [city, setCity] = useState("");
  const [price, setPrice] = useState<string>("");
  const [bedroom, setBedroom] = useState<string>("");
  const [bathroom, setBathroom] = useState<string>("");
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription] = useState("");
  const [availableDate, setAvailableDate] = useState<Date | null>(null);
  // Multi-image upload states
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string>("");
  const [listingId, setListingId] = useState<string>("");
  const [startDone, setStartDone] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  // Fetch suggested next number when dialog opens (for display only)
  useEffect(() => {
    async function fetchSuggestedNumber() {
      if (!open) return;
      
      try {
        // Query database for the highest L number (for display purposes only)
        const { data, error } = await supabase
          .from('listings')
          .select('title')
          .ilike('title', 'L%');

        if (error) {
          console.error('Error fetching reference numbers:', error);
          setSuggestedNextNumber(null);
          return;
        }

        // Extract numeric parts from reference numbers
        const manualReferences = (data || [])
          .map(l => l.title)
          .filter((title): title is string => title !== null && /^L\d+$/i.test(title))
          .map(title => parseInt(title.substring(1)))
          .filter(num => !isNaN(num));

        if (manualReferences.length > 0) {
          const maxNumber = Math.max(...manualReferences);
          setSuggestedNextNumber(maxNumber + 1);
        } else {
          setSuggestedNextNumber(1);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setSuggestedNextNumber(null);
      }
    }

    fetchSuggestedNumber();
  }, [open, supabase]);



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
      if (urls.length > 0) {
        const { data: currentListing } = await supabase
          .from('listings')
          .select('images')
          .eq('id', listingId)
          .single();
        
        const existingImages = Array.isArray(currentListing?.images) ? currentListing.images : [];
        const updatedImages = [...existingImages, ...urls];
        
        const { error: updateError } = await supabase
          .from('listings')
          .update({ images: updatedImages })
          .eq('id', listingId);
        
        if (updateError) {
          console.error('Error saving images to listing:', updateError);
        }
      }
      setImageUrls(urls);
      setUploadDone(true);
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
          available_date: availableDate ? `${availableDate.getFullYear()}-${String(availableDate.getMonth() + 1).padStart(2, '0')}-${String(availableDate.getDate()).padStart(2, '0')}` : null,
          images: imageUrls,
        }),
      });
      const { ok, message } = await res.json();
  if (!ok) throw new Error(message || 'Start failed');
      setOpen(false);
      setReferenceNo(""); setCity(""); setPrice(""); setBedroom(""); setBathroom(""); setPropertyType(""); setDescription(""); setAvailableDate(null); clearFiles();
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
      {showTrigger && <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-purple-600 text-white">+ Add</button>}
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleCreate} className="w-full max-w-[640px] bg-white dark:bg-gray-900 rounded-2xl p-5 space-y-3 shadow-lg my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add listing</h3>
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
                <label className="text-xs text-gray-600 dark:text-gray-400">Reference No</label>
                
                <input 
                  className="w-full border rounded-md px-3 py-2 mb-2" 
                  value={referenceNo} 
                  onChange={e => setReferenceNo(e.target.value)}
                  placeholder={suggestedNextNumber ? `Leave empty for auto L${suggestedNextNumber}, or enter manual (e.g., 86647)` : "e.g., L4 or 86647"}
                />
                
                {suggestedNextNumber !== null && !referenceNo && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                    <Info className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-700 text-xs flex-1">
                      If you leave this empty, <strong>L{suggestedNextNumber}</strong> will be automatically assigned when you click Start.
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">City</label>
                <Select
                  options={maltaCitiesOptions}
                  value={maltaCitiesOptions.find(opt => opt.value === city) || null}
                  onChange={(option: { value: string } | null) => setCity(option ? option.value : "")}
                  isClearable
                  placeholder="Select city"
                  name="city"
                  classNamePrefix="react-select"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Price</label>
                <input type="number" className="w-full border rounded-md px-3 py-2" value={price} onChange={e=>setPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Bedroom</label>
                <Select
                  options={[1,2,3,4,5].map(n => ({ label: n.toString(), value: n.toString() }))}
                  value={bedroom ? { label: bedroom, value: bedroom } : null}
                  onChange={(option: SelectOption | null) => setBedroom(option ? option.value : "")}
                  isClearable
                  placeholder="Select bedroom count"
                  name="bedroom"
                  classNamePrefix="react-select"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Bathroom</label>
                <Select
                  options={[1,2,3,4,5].map(n => ({ label: n.toString(), value: n.toString() }))}
                  value={bathroom ? { label: bathroom, value: bathroom } : null}
                  onChange={(option: SelectOption | null) => setBathroom(option ? option.value : "")}
                  isClearable
                  placeholder="Select bathroom count"
                  name="bathroom"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Property type</label>
                <Select
                  options={propertyTypeOptions}
                  value={propertyTypeOptions.find(opt => opt.value === propertyType) || null}
                  onChange={(option: { value: string } | null) => setPropertyType(option ? option.value : "")}
                  isClearable
                  placeholder="Select property type"
                  name="propertyType"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Available Date</label>
                <DatePicker
                  selected={availableDate}
                  onChange={(date) => setAvailableDate(date)}
                  dateFormat="dd.MM.yyyy"
                  isClearable
                  placeholderText="Select available date"
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Description</label>
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
                    <Image key={url} src={url} alt="preview" width={64} height={64} className="w-16 h-16 object-cover rounded" />
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
                setAvailableDate(null);
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
                    setAvailableDate(null);
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
