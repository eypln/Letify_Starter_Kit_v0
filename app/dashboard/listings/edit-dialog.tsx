"use client";
import Image from 'next/image';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Select from 'react-select';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Edit2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  { label: "Bugibba", value: "Bugibba" },
  { label: "Naxxar", value: "Naxxar" },
  { label: "Paola", value: "Paola" },
  { label: "Pembroke", value: "Pembroke" },
  { label: "Pietà", value: "Pietà" },
  { label: "Pieta", value: "Pieta" },
  { label: "Qawra", value: "Qawra" },
  { label: "Qormi", value: "Qormi" },
  { label: "Qrendi", value: "Qrendi" },
  { label: "Rabat", value: "Rabat" },
  { label: "Safi", value: "Safi" },
  { label: "San Ġiljan", value: "San Ġiljan" },
  { label: "St Julian's", value: "St Julian's" },
  { label: "San Ġwann", value: "San Ġwann" },
  { label: "San Pawl il-Baħar", value: "San Pawl il-Baħar" },
  { label: "Santa Luċija", value: "Santa Luċija" },
  { label: "Santa Venera", value: "Santa Venera" },
  { label: "Siġġiewi", value: "Siġġiewi" },
  { label: "Sliema", value: "Sliema" },
  { label: "St Paul's Bay", value: "St Paul's Bay" },
  { label: "Swatar", value: "Swatar" },
  { label: "Swieqi", value: "Swieqi" },
  { label: "Ta' Xbiex", value: "Ta' Xbiex" },
  { label: "Tal-Pietà", value: "Tal-Pietà" },
  { label: "Tarxien", value: "Tarxien" },
  { label: "Valletta", value: "Valletta" },
  { label: "Xagħra", value: "Xagħra" },
  { label: "Xemxija", value: "Xemxija" },
  { label: "Xgħajra", value: "Xgħajra" },
  { label: "Żabbar", value: "Żabbar" },
  { label: "Żebbuġ", value: "Żebbuġ" },
  { label: "Żejtun", value: "Żejtun" },
  { label: "Żurrieq", value: "Żurrieq" }
];

// Property type options
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

interface Listing {
  id: string;
  addingDate: string;
  sourceUrl: string;
  title?: string;
  city?: string;
  price?: number;
  bedroom?: number;
  bathroom?: number;
  propertyType?: string;
  description?: string;
  availability?: 'Available' | 'Rented' | 'Soon';
  fbPostUrl?: string;
  fbReelsUrl?: string;
  isSharedInTeamwork?: boolean;
  photos?: { url: string }[];
}

interface EditDialogProps {
  listing: Listing;
  onUpdate: () => void;
}

interface FormData {
  sourceUrl: string;
  title: string;
  city: string;
  price: string;
  bedroom: string;
  bathroom: string;
  propertyType: string;
  description: string;
  availability: 'Available' | 'Rented' | 'Soon';
  fbPostUrl: string;
  fbReelsUrl: string;
}

export default function EditDialog({ listing, onUpdate }: EditDialogProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  
  const [formData, setFormData] = useState<FormData>({
    sourceUrl: listing.sourceUrl || '',
    title: listing.title || '',
    city: listing.city || '',
    price: listing.price?.toString() || '',
    bedroom: listing.bedroom?.toString() || '',
    bathroom: listing.bathroom?.toString() || '',
    propertyType: listing.propertyType || '',
    description: listing.description || '',
    availability: listing.availability || 'Available',
    fbPostUrl: listing.fbPostUrl || '',
    fbReelsUrl: listing.fbReelsUrl || ''
  });

  const [photos, setPhotos] = useState<Array<{ file?: File; url?: string; preview?: string }>>([]);
  const [deletedPhotoUrls, setDeletedPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      if (modalOpen) {
        console.log('[EditDialog] Modal opened, listing.id:', listing.id);
        
        try {
          // Fetch the full listing data including images
          const { data: listingData, error: listingError } = await supabase
            .from('listings')
            .select('*')
            .eq('id', listing.id)
            .single();
          
          if (listingError) {
            console.error('[EditDialog] Error fetching listing:', listingError);
            toast({
              title: 'Error loading photos',
              description: listingError.message,
              variant: 'destructive'
            });
            setPhotos([]);
            return;
          }
          
          // Since uploaded_assets can't be accessed from client (RLS issue),
          // we'll migrate existing photos to listings.images field via API
          
          // For now, try to get photos from listings.images
          let photosArray: { url: string }[] = [];
          
          if (listingData?.images && Array.isArray(listingData.images) && listingData.images.length > 0) {
            photosArray = listingData.images.map((img: string | { url: string }) => ({
              url: typeof img === 'string' ? img : img.url
            }));
          }
          
          // If no photos in images field, try to migrate from uploaded_assets server-side
          if (photosArray.length === 0) {
            const response = await fetch('/api/migrate-listing-photos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ listingId: listing.id })
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.images && result.images.length > 0) {
                photosArray = result.images.map((url: string) => ({ url }));
              }
            }
          }
          
          setPhotos(photosArray);
        } catch (error) {
          console.error('[EditDialog] Exception loading photos:', error);
          setPhotos([]);
        }
      } else {
        // Reset when modal closes
        setPhotos([]);
        setDeletedPhotoUrls([]);
      }
    };
    
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, listing.id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, option: { value: string; label: string } | null) => {
    setFormData((prev) => ({ ...prev, [field]: option?.value || '' }));
  };

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photos.length + files.length > 30) {
      toast({
        title: 'Too many photos',
        description: 'You can upload a maximum of 30 photos.',
        variant: 'destructive'
      });
      return;
    }

    const newPhotos = await Promise.all(
      files.map(async (file) => {
        // Compress the image
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        
        try {
          const compressedFile = await imageCompression(file, options);
          const preview = URL.createObjectURL(compressedFile);
          return { file: compressedFile, preview };
        } catch (error) {
          console.error('Error compressing image:', error);
          const preview = URL.createObjectURL(file);
          return { file, preview };
        }
      })
    );

    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (photo.url && !photo.file) {
      // This is an existing photo, mark it for deletion
      setDeletedPhotoUrls([...deletedPhotoUrls, photo.url]);
    }
    if (photo.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (listingId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');
    
    const newPhotoUrls: string[] = [];
    
    for (const photo of photos.filter(p => p.file)) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const rand = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
      const cleanName = photo.file!.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filePath = `${user.id}/${y}/${m}/${listingId}/${Date.now()}-${rand}-${cleanName}`;
      
      const { error } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, photo.file!, { upsert: true });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      const url = supabase.storage.from('user_uploads').getPublicUrl(filePath).data.publicUrl;
      newPhotoUrls.push(url);
    }

    if (newPhotoUrls.length > 0) {
      const { data: currentListing } = await supabase
        .from('listings')
        .select('images')
        .eq('id', listingId)
        .single();
      
      const existingImages = Array.isArray(currentListing?.images) ? currentListing.images : [];
      const updatedImages = [...existingImages, ...newPhotoUrls];
      
      const { error } = await supabase
        .from('listings')
        .update({ images: updatedImages })
        .eq('id', listingId);
      
      if (error) {
        console.error('Error saving photo records:', error);
        throw error;
      }
    }
  };

  const deletePhotos = async () => {
    if (deletedPhotoUrls.length > 0) {
      const { data: currentListing } = await supabase
        .from('listings')
        .select('images')
        .eq('id', listing.id)
        .single();
      
      const existingImages = Array.isArray(currentListing?.images) ? currentListing.images : [];
      const filteredImages = existingImages.filter((img: string) => !deletedPhotoUrls.includes(img));
      
      const { error: updateError } = await supabase
        .from('listings')
        .update({ images: filteredImages })
        .eq('id', listing.id);
      
      if (updateError) {
        console.error('Error updating images:', updateError);
      }

      const { error: assetError } = await supabase
        .from('uploaded_assets')
        .delete()
        .in('public_url', deletedPhotoUrls);
      
      if (assetError) {
        console.error('Error deleting from uploaded_assets:', assetError);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploading(true);

    try {
      // Update main listing
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          property_url: formData.sourceUrl || null,
          title: formData.title || null,
          city: formData.city || null,
          price: formData.price ? parseFloat(formData.price) : null,
          bedrooms: formData.bedroom ? parseInt(formData.bedroom) : null,
          bathrooms: formData.bathroom ? parseInt(formData.bathroom) : null,
          property_type: formData.propertyType || null,
          description: formData.description || null,
          availability: formData.availability,
          facebook_post_url: formData.fbPostUrl || null,
          facebook_reel_url: formData.fbReelsUrl || null
        })
        .eq('id', listing.id);

      if (updateError) throw updateError;

      // Handle photo deletions
      await deletePhotos();

      // Upload new photos
      await uploadPhotos(listing.id);

      toast({
        title: 'Success',
        description: 'Listing updated successfully!',
      });
      
      setModalOpen(false);
      onUpdate();
      
      // Reset form
      setPhotos([]);
      setDeletedPhotoUrls([]);
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update listing. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setModalOpen(true)}
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Edit Listing</h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setPhotos([]);
                    setDeletedPhotoUrls([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Photos Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-medium">Photos</label>
                    <span className="text-sm text-gray-500">{photos.length}/30</span>
                  </div>
                  
                  {/* Photo Grid */}
                  <div className="grid grid-cols-5 gap-4">
                    {photos.map((photo, index) => {
                      const imageUrl = photo.preview || photo.url;
                      const isExisting = !photo.file && photo.url;
                      
                      const handleDownload = async (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!imageUrl) return;
                        try {
                          const response = await fetch(imageUrl, { mode: 'cors' });
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `listing_${listing.id}_photo_${index + 1}.jpg`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          toast({
                            title: 'Photo downloaded',
                            description: `Photo ${index + 1} has been downloaded.`,
                          });
                        } catch (error) {
                          console.error('Download error:', error);
                          toast({
                            title: 'Download failed',
                            description: 'Could not download the photo.',
                            variant: 'destructive'
                          });
                        }
                      };
                      
                      return (
                        <div key={index} className="relative group">
                          {imageUrl ? (
                            <>
                              <Image
                                src={imageUrl}
                                alt={`Photo ${index + 1}`}
                                width={150}
                                height={150}
                                className="w-full h-32 object-cover rounded-lg"
                                unoptimized
                              />
                              {isExisting && (
                                <button
                                  type="button"
                                  onClick={handleDownload}
                                  className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 shadow-lg"
                                  title="Download photo"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                title="Remove photo"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                    
                    {/* Add Photo Button */}
                    {photos.length < 30 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                      >
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs text-gray-500 mt-1 font-medium">Add Photo</span>
                      </button>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Source URL */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Source URL</label>
                    <input
                      type="text"
                      name="sourceUrl"
                      value={formData.sourceUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://example.com/listing"
                    />
                  </div>

                  {/* Reference No / Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Reference No</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g. 82757"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <Select
                      value={maltaCitiesOptions.find(opt => opt.value === formData.city)}
                      onChange={(option) => handleSelectChange('city', option)}
                      options={maltaCitiesOptions}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder="Select a city"
                      isClearable
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Price (€)</label>
                    <input
                      type="text"
                      name="price"
                      value={formData.price}
                      onChange={e => {
                        // Sadece rakam girilmesine izin ver
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          handleChange(e);
                        }
                      }}
                      onFocus={(e) => {
                        e.target.addEventListener('wheel', (evt) => evt.preventDefault(), { passive: false });
                      }}
                      onBlur={(e) => {
                        e.target.removeEventListener('wheel', (evt) => evt.preventDefault());
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g. 1500"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                    />
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Bedrooms</label>
                    <input
                      type="number"
                      name="bedroom"
                      value={formData.bedroom}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g. 2"
                      min="0"
                    />
                  </div>

                  {/* Bathrooms */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Bathrooms</label>
                    <input
                      type="number"
                      name="bathroom"
                      value={formData.bathroom}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g. 1"
                      min="0"
                    />
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Property Type</label>
                    <Select
                      value={propertyTypeOptions.find(opt => opt.value === formData.propertyType)}
                      onChange={(option) => handleSelectChange('propertyType', option)}
                      options={propertyTypeOptions}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder="Select property type"
                      isClearable
                    />
                  </div>

                  {/* Availability */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Availability</label>
                    <select
                      name="availability"
                      value={formData.availability}
                      onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value as 'Available' | 'Rented' | 'Soon' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="Available">Available</option>
                      <option value="Rented">Rented</option>
                      <option value="Soon">Soon</option>
                    </select>
                  </div>

                  {/* Facebook Post URL */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Facebook Post URL</label>
                    <input
                      type="text"
                      name="fbPostUrl"
                      value={formData.fbPostUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  {/* Facebook Reels URL */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Facebook Reels URL</label>
                    <input
                      type="text"
                      name="fbReelsUrl"
                      value={formData.fbReelsUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter property description..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setPhotos([]);
                      setDeletedPhotoUrls([]);
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Update Listing'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}