"use client";
export const dynamic = 'force-dynamic';
import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getListings, updateListingAvailability, getAllAvailableAndSoonListings } from './actions';
import Link from 'next/link';
import AddDialog from './add-dialog';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CheckCircle, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MaltaMap from '@/components/listing/malta-map';

// DEBUG: Her render'da kaç kayıt geldiğini ve son eklenen kaydın id'sini göster
import { useSearchParams } from 'next/navigation';

const queryClient = new QueryClient();

function TeamworkShareButton({ listingId, title }: { listingId: string; title: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const response = await fetch('/api/teamwork/listings/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: `"${title}" shared to Teamwork successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to share listing',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sharing listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to share listing',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 underline disabled:opacity-50"
      title="Share to Teamwork"
    >
      <Share2 className="w-4 h-4" />
      {loading ? 'Sharing...' : 'Share'}
    </button>
  );
}

function AvailabilitySelector({ 
  listingId, 
  currentValue, 
  onUpdate 
}: { 
  listingId: string; 
  currentValue: 'Available' | 'Rented' | 'Soon'; 
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleChange(newValue: 'Available' | 'Rented' | 'Soon') {
    if (newValue === currentValue) return;
    
    setLoading(true);
    try {
      await updateListingAvailability(listingId, newValue);
      toast({
        title: 'Success',
        description: `Availability updated to ${newValue}`,
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rented': return 'bg-red-100 text-red-700 border-red-200';
      case 'Soon': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <select
      value={currentValue}
      onChange={(e) => handleChange(e.target.value as 'Available' | 'Rented' | 'Soon')}
      disabled={loading}
      className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(currentValue)} disabled:opacity-50 cursor-pointer`}
    >
      <option value="Available">Available</option>
      <option value="Rented">Rented</option>
      <option value="Soon">Soon</option>
    </select>
  );
}

function ListingsContent() {
  const [descModal, setDescModal] = React.useState<string|null>(null);
  const [listingsData, setListingsData] = React.useState<any>(null);
  const [mapListings, setMapListings] = React.useState<any[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  React.useEffect(() => {
    getListings({ page }).then(setListingsData);
  }, [page, refreshKey]);

  // Fetch all Available and Soon listings for the map
  React.useEffect(() => {
    getAllAvailableAndSoonListings().then(setMapListings);
  }, [refreshKey]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  if (!listingsData) {
    return <div className="max-w-6xl mx-auto p-6">Loading…</div>;
  }
  const { rows, pageCount, pageSize } = listingsData;
  const startIndex = (page - 1) * pageSize;

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `?${params.toString()}`;
  }

  const first = 1;
  const last = pageCount;
  const prev = Math.max(first, page - 1);
  const next = Math.min(last, page + 1);
  const windowSize = 5;
  const start = Math.max(first, page - Math.floor(windowSize / 2));
  const end = Math.min(last, start + windowSize - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-6xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="mb-6 relative">
        {/* Dashboard button - top right */}
        <Link href="/dashboard" className="absolute -top-2 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
        
        {/* Listings title + Add */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Listings</h1>
          <AddDialog listings={rows || []} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th className="w-12">#</th>
              <th>Adding date</th>
              <th>Source URL</th>
              <th>Reference No</th>
              <th>City</th>
              <th>Price</th>
              <th>Bedroom</th>
              <th>Bathroom</th>
              <th>Property type</th>
              <th>Description</th>
              <th>Availability</th>
              <th>FB post</th>
              <th>FB reels</th>
              <th>Teamwork</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2">
            {rows.map((r: any, i: number) => (
              <tr key={r.id} className="border-t">
                <td className="text-right text-gray-500">{startIndex + i + 1}</td>
                <td className="whitespace-nowrap">{new Date(r.addingDate).toLocaleString()}</td>
                <td className="max-w-[220px] truncate">
                  {r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Link</a> : <span className="text-gray-400">—</span>}
                </td>
                <td className="whitespace-nowrap">{r.title ?? '—'}</td>
                <td className="max-w-[120px] truncate">{r.city ?? '—'}</td>
                <td className="whitespace-nowrap">{typeof r.price === 'number' ? r.price.toLocaleString() : '—'}</td>
                <td>{r.bedroom ?? '—'}</td>
                <td>{r.bathroom ?? '—'}</td>
                <td className="max-w-[140px] truncate">{r.propertyType ?? '—'}</td>
                <td
                  className="max-w-[320px] h-[3.25rem] overflow-hidden text-ellipsis truncate cursor-pointer text-blue-700 underline"
                  onClick={() => r.description && setDescModal(r.description)}
                  title="Click to view full description"
                >
                  {r.description ?? '—'}
                </td>
                <td className="whitespace-nowrap">
                  <AvailabilitySelector 
                    listingId={r.id} 
                    currentValue={r.availability || 'Available'} 
                    onUpdate={handleRefresh}
                  />
                </td>
                <td className="max-w-[220px] truncate">
                  {r.fbPostUrl
                    ? <a href={r.fbPostUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-600 underline"><CheckCircle className="w-4 h-4" />Open</a>
                    : <span className="text-gray-400">pending</span>}
                </td>
                <td className="max-w-[220px] truncate">
                  {r.fbReelsUrl
                    ? <a href={r.fbReelsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-600 underline"><CheckCircle className="w-4 h-4" />Open</a>
                    : <span className="text-gray-400">pending</span>}
                </td>
                <td className="whitespace-nowrap">
                  <TeamworkShareButton listingId={r.id} title={r.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-center space-x-2 mt-4">
        <Button variant="outline" size="sm" asChild>
          <a href={hrefFor(first)} aria-disabled={page===first}>First</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={hrefFor(prev)} aria-disabled={page===first}>Prev</a>
        </Button>

        {start > first && <span className="px-2">…</span>}
        {pages.map(n => (
          <Button
            key={n}
            variant={n === page ? "default" : "outline"}
            size="sm"
            asChild
          >
            <a href={hrefFor(n)}>{n}</a>
          </Button>
        ))}
        {end < last && <span className="px-2">…</span>}

        <Button variant="outline" size="sm" asChild>
          <a href={hrefFor(next)} aria-disabled={page===last}>Next</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={hrefFor(last)} aria-disabled={page===last}>Last</a>
        </Button>
      </div>
      {/* Description Modal */}
      {descModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setDescModal(null)}
              aria-label="Close"
            >✕</button>
            <div className="text-base whitespace-pre-line max-h-[60vh] overflow-auto">
              {descModal}
            </div>
          </div>
        </div>
      )}

      {/* Malta Map */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Malta Listings Map
          <span className="text-sm font-normal text-gray-500">
            (Showing Available & Soon properties)
          </span>
        </h2>
        <div className="mb-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>
            <span className="text-gray-600">Soon / Mixed</span>
          </div>
          <div className="text-gray-500 ml-auto">
            {mapListings.length} properties on map
          </div>
        </div>
        <MaltaMap listings={mapListings} />
      </div>
      </div>
    </QueryClientProvider>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto p-6">Loading...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
