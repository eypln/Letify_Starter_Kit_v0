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
  const [clients, setClients] = useState<any[]>([]);
  const [monthlyPostUsage, setMonthlyPostUsage] = useState<any[]>([]);
  const [monthlyClientsAdded, setMonthlyClientsAdded] = useState<any[]>([]);
  const [dailyViewings, setDailyViewings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setListings([]);
        setClients([]);
        setMonthlyPostUsage([]);
        setMonthlyClientsAdded([]);
        setLoading(false);
        return;
      }
      
      // Fetch listings data
      supabase
        .from('listings')
        .select('city,price,bedrooms')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          console.log('Supabase listings data:', data, 'error:', error);
          setListings(data ?? []);
        });
      
      // Fetch clients data
      supabase
        .from('clients')
        .select('cities,budget,created_at')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          console.log('Supabase clients data:', data, 'error:', error);
          setClients(data ?? []);
        });

      // Fetch monthly post usage from listings table
      supabase
        .from('listings')
        .select('created_at')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            // Group listings by creation month
            const grouped: Record<string, number> = {};
            data.forEach((listing: any) => {
              if (listing.created_at) {
                const date = new Date(listing.created_at);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                grouped[month] = (grouped[month] || 0) + 1;
              }
            });
            const monthlyData = Object.entries(grouped)
              .map(([month, count]) => ({ month, count }))
              .sort((a, b) => a.month.localeCompare(b.month));
            console.log('Monthly post usage data:', monthlyData, 'error:', error);
            setMonthlyPostUsage(monthlyData);
          }
        });

      // Fetch clients grouped by creation month
      supabase
        .from('clients')
        .select('created_at')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            // Group clients by month
            const grouped: Record<string, number> = {};
            data.forEach((client: any) => {
              if (client.created_at) {
                const date = new Date(client.created_at);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                grouped[month] = (grouped[month] || 0) + 1;
              }
            });
            const monthlyData = Object.entries(grouped)
              .map(([month, count]) => ({ month, count }))
              .sort((a, b) => a.month.localeCompare(b.month));
            setMonthlyClientsAdded(monthlyData);
          }
        });

      // Fetch viewings grouped by day for current month
      supabase
        .from('viewings')
        .select('created_at')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          console.log('Viewings data:', data, 'error:', error);
          if (!error && data) {
            // Get current month's first and last day
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            console.log('Current month range:', firstDay, 'to', lastDay);
            
            // Filter viewings for current month and group by day
            const grouped: Record<string, number> = {};
            data.forEach((viewing: any) => {
              if (viewing.created_at) {
                const createdDate = new Date(viewing.created_at);
                if (createdDate >= firstDay && createdDate <= lastDay) {
                  const day = createdDate.getDate();
                  grouped[day] = (grouped[day] || 0) + 1;
                }
              }
            });
            
            console.log('Grouped viewings by day:', grouped);
            
            // Create array with all days of the month
            const daysInMonth = lastDay.getDate();
            const dailyData = [];
            for (let day = 1; day <= daysInMonth; day++) {
              dailyData.push({
                day: day.toString(),
                count: grouped[day] || 0
              });
            }
            
            console.log('Daily viewings data:', dailyData);
            setDailyViewings(dailyData);
          }
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

  // Clients analytics
  // Şehirlere göre client dağılımı (Pie Chart)
  const clientCityCounts: Record<string, number> = {};
  clients.forEach((client: any) => {
    if (client.cities) {
      // Client'ın şehirleri virgülle ayrılmış olabilir
      const cities = client.cities.split(',');
      cities.forEach((city: string) => {
        const trimmedCity = city.trim();
        if (trimmedCity) {
          clientCityCounts[trimmedCity] = (clientCityCounts[trimmedCity] || 0) + 1;
        }
      });
    }
  });

  // Budget aralıklarına göre dağılım histogramı
  const budgetRanges = [0, 1000, 2000, 3000, 4000, 5000];
  const budgetHistogram: Record<string, number> = {};
  clients.forEach((client: any) => {
    if (client.budget) {
      const budget = Number(client.budget);
      let rangeLabel = '';
      for (let i = 0; i < budgetRanges.length - 1; i++) {
        if (budget >= budgetRanges[i] && budget < budgetRanges[i + 1]) {
          rangeLabel = `${budgetRanges[i]} - ${budgetRanges[i + 1]}`;
          break;
        }
      }
      if (!rangeLabel && budget >= budgetRanges[budgetRanges.length - 1]) {
        rangeLabel = `${budgetRanges[budgetRanges.length - 1]}+`;
      }
      if (rangeLabel) budgetHistogram[rangeLabel] = (budgetHistogram[rangeLabel] || 0) + 1;
    }
  });
  // Histogram verisini budgetRanges sırasına göre sırala
  const budgetHistogramLabels = budgetRanges.map((v, i) =>
    i < budgetRanges.length - 1 ? `${budgetRanges[i]} - ${budgetRanges[i + 1]}` : `${budgetRanges[i]}+`
  );
  const budgetHistogramData = budgetHistogramLabels.map(label => ({ range: label, count: budgetHistogram[label] || 0 }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Portfolio Analysis</h1>
        <a href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </a>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : listings.length === 0 && clients.length === 0 ? (
        <div className="text-red-500">No data found from Supabase. Check your listings and clients tables and Supabase connection.</div>
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
          
          {/* Client Analytics Charts */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="font-semibold mb-4">Clients by City</h2>
            <PieChart data={Object.entries(clientCityCounts).map(([city, count]) => ({ bedroom: city, count }))} />
          </div>
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="font-semibold mb-4">Clients by Budget Range</h2>
            <HistogramBarChart data={budgetHistogramData} />
          </div>

          {/* Monthly Posts & Clients - Combined Histogram */}
          <div className="bg-white rounded-lg shadow p-8 md:col-span-2">
            <h2 className="font-semibold mb-4">Monthly Activity: Posts vs Clients</h2>
            {monthlyPostUsage.length > 0 || monthlyClientsAdded.length > 0 ? (
              <div className="overflow-x-auto">
                <GroupedBarChart 
                  data={(() => {
                    // Combine both datasets by month
                    const allMonths = new Set([
                      ...monthlyPostUsage.map(d => d.month),
                      ...monthlyClientsAdded.map(d => d.month)
                    ]);
                    
                    return Array.from(allMonths)
                      .sort()
                      .map(month => ({
                        city: month,  // GroupedBarChart expects 'city' key for X-axis
                        'Posts': monthlyPostUsage.find(d => d.month === month)?.count ?? 0,
                        'Clients': monthlyClientsAdded.find(d => d.month === month)?.count ?? 0,
                      }));
                  })()} 
                />
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">No monthly activity data available yet.</div>
            )}
          </div>

          {/* Daily Viewings Chart */}
          <div className="bg-white rounded-lg shadow p-8 md:col-span-2">
            <h2 className="font-semibold mb-4">Monthly Activity: Viewings</h2>
            {dailyViewings.length > 0 ? (
              <div className="overflow-x-auto">
                <BarChart 
                  data={dailyViewings.map(({ day, count }) => ({ 
                    city: `Day ${day}`, 
                    count 
                  }))} 
                />
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">No viewings data available for this month.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}