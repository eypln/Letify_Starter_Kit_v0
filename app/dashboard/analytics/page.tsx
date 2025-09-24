"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
const GroupedBarChart = dynamic(() => import('@/components/ui/grouped-bar-chart'), { ssr: false });
const HistogramBarChart = dynamic(() => import('@/components/ui/histogram-bar-chart'), { ssr: false });

const BarChart = dynamic(() => import('@/components/ui/bar-chart'), { ssr: false });
const LineChart = dynamic(() => import('@/components/ui/line-chart'), { ssr: false });
const PieChart = dynamic(() => import('@/components/ui/pie-chart'), { ssr: false });

export default function AnalyticsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setListings([]);
        setLoading(false);
        return;
      }
      supabase
        .from('listings')
        .select('city,price,bedrooms')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          console.log('Supabase listings data:', data, 'error:', error);
          setListings(data ?? []);
          setLoading(false);
        });
    });
  }, []);

  // City count
  const cityCounts = listings.reduce<Record<string, number>>((acc, l) => {
    if (!l.city) return acc;
    acc[l.city] = (acc[l.city] || 0) + 1;
    return acc;
  }, {});

  // City avg price
  const cityPrices = listings.reduce<Record<string, { total: number; count: number }>>((acc, l) => {
    if (!l.city || !l.price) return acc;
    acc[l.city] = acc[l.city] || { total: 0, count: 0 };
    acc[l.city].total += Number(l.price);
    acc[l.city].count += 1;
    return acc;
  }, {});
  const cityAvgPrices = Object.entries(cityPrices).map(([city, { total, count }]) => ({
    city,
    avgPrice: Math.round(total / count),
  }));

  // Bedroom pie
  const bedroomCounts = listings.reduce<Record<string, number>>((acc, l) => {
    const key = l.bedrooms?.toString() ?? 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // 1. Oda sayısına göre ortalama fiyat (Bar Chart)
  const bedroomPrices = listings.reduce((acc: Record<string, { total: number; count: number }>, l) => {
    const key = l.bedrooms?.toString() ?? 'Unknown';
    if (!l.price) return acc;
    acc[key] = acc[key] || { total: 0, count: 0 };
    acc[key].total += Number(l.price);
    acc[key].count += 1;
    return acc;
  }, {});
  const avgPriceByBedroom = Object.entries(bedroomPrices).map(([bedrooms, { total, count }]) => ({
    bedrooms,
    avgPrice: Math.round(total / count),
  }));

  // 2. Şehir & oda kombinasyonu (Grouped Bar Chart)
  // Tüm unique oda sayıları
  const allBedrooms = Array.from(new Set(listings.map(l => l.bedrooms?.toString() ?? 'Unknown'))).sort();
  // Şehir-oda mapping
  const groupedCityBedroom: Record<string, Record<string, number>> = {};
  listings.forEach(l => {
    if (!l.city || !l.bedrooms) return;
    const city = l.city;
    const bedroom = l.bedrooms.toString();
    groupedCityBedroom[city] = groupedCityBedroom[city] || {};
    groupedCityBedroom[city][bedroom] = (groupedCityBedroom[city][bedroom] || 0) + 1;
  });
  // Her şehir için tüm oda sayıları barı (eksik olanlar 0)
  const groupedBarData: (Record<string, number> & { city: string })[] = Object.entries(groupedCityBedroom).map(([city, bedroomsObj]) => {
    const entry: Record<string, number> & { city: string } = { city } as any;
    allBedrooms.forEach(bedroom => {
      entry[bedroom] = typeof bedroomsObj[bedroom] === 'number' ? bedroomsObj[bedroom] : 0;
    });
    return entry;
  });

  // 3. Fiyat dağılımı histogramı
  const priceRanges = [0, 2000, 4000, 8000, 16000, 32000];
  const histogram: Record<string, number> = {};
  listings.forEach(l => {
    if (!l.price) return;
    const price = Number(l.price);
    let rangeLabel = '';
    for (let i = 0; i < priceRanges.length - 1; i++) {
      if (price >= priceRanges[i] && price < priceRanges[i + 1]) {
        rangeLabel = `${priceRanges[i]} - ${priceRanges[i + 1]}`;
        break;
      }
    }
    if (!rangeLabel && price >= priceRanges[priceRanges.length - 1]) {
      rangeLabel = `${priceRanges[priceRanges.length - 1]}+`;
    }
    if (rangeLabel) histogram[rangeLabel] = (histogram[rangeLabel] || 0) + 1;
  });
  // Histogram verisini priceRanges sırasına göre sırala
  const histogramLabels = priceRanges.map((v, i) =>
    i < priceRanges.length - 1 ? `${priceRanges[i]} - ${priceRanges[i + 1]}` : `${priceRanges[i]}+`
  );
  const histogramData = histogramLabels.map(label => ({ range: label, count: histogram[label] || 0 }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <a href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </a>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="text-red-500">No data found from Supabase. Check your listings table and Supabase connection.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="font-semibold mb-4">Listings by City</h2>
            <BarChart data={Object.entries(cityCounts).map(([city, count]) => ({ city, count }))} />
          </div>
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="font-semibold mb-4">Average Price by City</h2>
            <LineChart data={cityAvgPrices} />
          </div>
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="font-semibold mb-4">Listings by Bedroom Count</h2>
            <PieChart data={Object.entries(bedroomCounts).map(([bedroom, count]) => ({ bedroom, count }))} />
          </div>
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="font-semibold mb-4">Average Price by Bedroom Count</h2>
            <BarChart data={avgPriceByBedroom.map(({ bedrooms, avgPrice }) => ({ city: bedrooms, count: avgPrice }))} />
          </div>
          <div className="bg-white rounded-lg shadow p-8 md:col-span-2">
            <h2 className="font-semibold mb-4">Listings by City & Bedroom</h2>
            <GroupedBarChart data={groupedBarData} />
          </div>
          <div className="bg-white rounded-lg shadow p-8 md:col-span-2">
            <h2 className="font-semibold mb-4">Price Distribution Histogram</h2>
            <HistogramBarChart data={histogramData} />
          </div>
        </div>
      )}
    </div>
  );
}
