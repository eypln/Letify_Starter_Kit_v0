"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, Edit2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import EditDealModal from "../../../(app)/teamleader/team-revenue/EditDealModal";

// VAT Type enum
type VatType = 'vatable' | 'non-vatable' | 'part-time';

interface User {
  id: string;
  email?: string;
}

interface Revenue {
  id: number;
  user_id: string;
  ref_no: string | null;
  client_name: string | null;
  rent_amount: number | null;
  landlord_fee: number | null;
  client_fee: number | null;
  listing_fee: number | null;
  agent_income: number | null;
  agent_tax: number | null;
  landlord_discount: boolean;
  client_discount: boolean;
  has_listing_fee: boolean;
  only_listing_fee?: boolean;
  vat_type: VatType;
  vatable?: boolean;
  date_rented: string | null;
  date_signed: string | null;
  date_move_in: string | null;
  landlord_paid_date: string | null;
  client_paid_date: string | null;
  collaboration_with: string | null;
  inform_boss_after_both_sides_paid: boolean;
  created_at?: string;
}

export default function ManagerTeamRevenueClient({ user }: { user: User }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `€${amount.toFixed(2)}`;
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
      <div className="relative mt-8">
        <Link href="/manager" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Team Revenue Records */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Revenue Records</CardTitle>
            <div className="text-right">
              <span className="text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                Total Deals: <ManagerTotalDealCount />
              </span>
              <div className="text-[10px] text-gray-400 mt-0.5 text-right">from September 2025</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TeamRevenueTable formatDate={formatDate} formatCurrency={formatCurrency} />
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Monthly Team Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyRevenueChart />
        </CardContent>
      </Card>
    </div>
  );
}

// Total Deal Count Component
function ManagerTotalDealCount() {
  const [count, setCount] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCount() {
      const { count: totalCount, error } = await supabase
        .from("revenue")
        .select("id", { count: "exact", head: true });
      if (!error && totalCount !== null) setCount(totalCount);
    }
    fetchCount();
  }, [supabase]);

  return <>{count}</>;
}

// Team Revenue Table Component
function TeamRevenueTable({ formatDate, formatCurrency }: { formatDate: (date: string | null) => string, formatCurrency: (amount: number | null) => string }) {
  const [teamRevenues, setTeamRevenues] = useState<(Revenue & { agent_name: string })[]>([]);
  const [allRevenues, setAllRevenues] = useState<(Revenue & { agent_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [filterAgentName, setFilterAgentName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const supabase = createClient();

  const pageSize = 10;

  const teamColumns = [
    "#",
    "Agent Name",
    "Date Rented",
    "Ref No",
    "Client Name",
    "Rent Amount (€)",
    "Landlord Fee (€)",
    "Client Fee (€)",
    "Listing Fee (€)",
    "Agent Net Income (€)",
    "Agent TAX (€)",
    "Date Signed",
    "Date Move In",
    "Landlord Paid",
    "Client Paid",
    "Collaboration",
    "Inform Boss",
    "Actions",
  ];
  
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);

  useEffect(() => {
    async function fetchTeamRevenues() {
      setLoading(true);
      
      const { data: revenueData, error: revenueError } = await supabase
        .from("revenue")
        .select("*")
        .order("created_at", { ascending: false });

      if (!revenueError && revenueData) {
        const userIds = [...new Set(revenueData.map(r => r.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        if (profilesError) {
          console.warn("Could not fetch some profile names, using fallback");
        }
        
        const profileMap = new Map(
          profilesData?.map(p => [p.user_id, p.full_name]) || []
        );
        
        const mappedData = revenueData.map((revenue: Revenue) => ({
          ...revenue,
          agent_name: profileMap.get(revenue.user_id) || 'Unknown Agent'
        }));
        
        setAllRevenues(mappedData);
      } else if (revenueError) {
        console.error("Error fetching team revenues:", revenueError);
      }
      
      setLoading(false);
    }

    fetchTeamRevenues();
  }, [supabase]);

  useEffect(() => {
    let filtered = [...allRevenues];

    if (filterAgentName) {
      filtered = filtered.filter(r => 
        r.agent_name.toLowerCase().includes(filterAgentName.toLowerCase())
      );
    }

    if (filterMonth) {
      filtered = filtered.filter(r => {
        if (!r.date_rented) return false;
        const date = new Date(r.date_rented);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return yearMonth === filterMonth;
      });
    }

    setTeamRevenues(filtered);
    setPageCount(Math.ceil(filtered.length / pageSize));
    setPage(1);
  }, [allRevenues, filterAgentName, filterMonth]);

  const paginatedRevenues = teamRevenues.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const hasActiveFilters = filterAgentName || filterMonth;

  const clearFilters = () => {
    setFilterAgentName('');
    setFilterMonth('');
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground">
              <span className="text-purple-600 font-medium">
                ({teamRevenues.length} filtered results)
              </span>
            </p>
          )}
        </div>
        
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant={hasActiveFilters ? "default" : "outline"} 
              size="sm"
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
              {hasActiveFilters && (
                <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {[filterAgentName, filterMonth].filter(Boolean).length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filter Team Revenue</h4>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-agent-name" className="text-xs">Agent Name</Label>
                <Input
                  id="filter-agent-name"
                  placeholder="e.g. John Doe..."
                  value={filterAgentName}
                  onChange={(e) => setFilterAgentName(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-month" className="text-xs">Month</Label>
                <select
                  id="filter-month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All Months</option>
                  <option value="2025-01">January 2025</option>
                  <option value="2025-02">February 2025</option>
                  <option value="2025-03">March 2025</option>
                  <option value="2025-04">April 2025</option>
                  <option value="2025-05">May 2025</option>
                  <option value="2025-06">June 2025</option>
                  <option value="2025-07">July 2025</option>
                  <option value="2025-08">August 2025</option>
                  <option value="2025-09">September 2025</option>
                  <option value="2025-10">October 2025</option>
                  <option value="2025-11">November 2025</option>
                  <option value="2025-12">December 2025</option>
                  <option value="2026-01">January 2026</option>
                  <option value="2026-02">February 2026</option>
                  <option value="2026-03">March 2026</option>
                  <option value="2026-04">April 2026</option>
                  <option value="2026-05">May 2026</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-07">July 2026</option>
                  <option value="2026-08">August 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-10">October 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">December 2026</option>
                </select>
              </div>

              <Button 
                onClick={() => setIsFilterOpen(false)} 
                className="w-full"
                size="sm"
              >
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {teamColumns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={teamColumns.length} className="text-center py-8 text-muted-foreground">
                  Loading team revenues...
                </td>
              </tr>
            ) : teamRevenues.length === 0 ? (
              <tr>
                <td colSpan={teamColumns.length} className="text-center py-8">
                  {hasActiveFilters ? (
                    <div>
                      <p className="text-muted-foreground mb-4">No revenues match your filters</p>
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No team revenues found.</p>
                  )}
                </td>
              </tr>
            ) : (
              paginatedRevenues.map((rev, idx) => (
                <tr key={rev.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rev.agent_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(rev.date_rented)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rev.ref_no || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rev.client_name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(rev.rent_amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(rev.landlord_fee)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(rev.client_fee)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(rev.listing_fee)}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap font-semibold text-green-600">{formatCurrency(rev.agent_income)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(rev.agent_tax)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(rev.date_signed)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(rev.date_move_in)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(rev.landlord_paid_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(rev.client_paid_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rev.collaboration_with || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      rev.inform_boss_after_both_sides_paid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rev.inform_boss_after_both_sides_paid ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => setEditingRevenue(rev)}
                      className="text-purple-600 hover:text-purple-900 font-medium flex items-center gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Edit Deal Modal */}
      {editingRevenue && (
        <EditDealModal
          revenue={editingRevenue}
          onClose={() => setEditingRevenue(null)}
          onSuccess={() => {
            setEditingRevenue(null);
            // Refresh data
            async function refreshData() {
              const { data: revenueData } = await supabase
                .from("revenue")
                .select("*")
                .order("created_at", { ascending: false });
              
              if (revenueData) {
                const userIds = [...new Set(revenueData.map(r => r.user_id))];
                const { data: profilesData } = await supabase
                  .from("profiles")
                  .select("user_id, full_name")
                  .in("user_id", userIds);
                
                const profileMap = new Map(
                  profilesData?.map(p => [p.user_id, p.full_name]) || []
                );
                
                const mappedData = revenueData.map((revenue: any) => ({
                  ...revenue,
                  agent_name: profileMap.get(revenue.user_id) || 'Unknown Agent'
                }));
                
                setAllRevenues(mappedData);
              }
            }
            refreshData();
          }}
        />
      )}

      {/* Pagination */}
      {!loading && teamRevenues.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>
            First
          </Button>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
            const pageNum = page <= 3 ? i + 1 : page + i - 2;
            if (pageNum > pageCount) return null;
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>
            Next
          </Button>
          <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(pageCount)}>
            Last
          </Button>
        </div>
      )}
    </>
  );
}

// Monthly Revenue Chart Component
function MonthlyRevenueChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMonthlyData() {
      setLoading(true);

      const { data: revenueData, error } = await supabase
        .from("revenue")
        .select("*");

      if (!error && revenueData) {
        const monthlyRentMap = new Map<string, number>();
        const monthlyIncomeMap = new Map<string, number>();

        revenueData.forEach((rev: Revenue) => {
          if (rev.date_rented && rev.rent_amount) {
            const date = new Date(rev.date_rented);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const currentRent = monthlyRentMap.get(monthKey) || 0;
            monthlyRentMap.set(monthKey, currentRent + rev.rent_amount);

            if (rev.agent_income) {
              const currentIncome = monthlyIncomeMap.get(monthKey) || 0;
              monthlyIncomeMap.set(monthKey, currentIncome + rev.agent_income);
            }
          }
        });

        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const allMonths = new Set([...monthlyRentMap.keys(), ...monthlyIncomeMap.keys()]);
        const TARGET_GOAL = 15000;

        const formattedData = Array.from(allMonths)
          .map((monthKey) => {
            const [year, month] = monthKey.split('-');
            const monthIndex = parseInt(month) - 1;
            const rentAmount = Math.round((monthlyRentMap.get(monthKey) || 0) * 100) / 100;
            const remaining = Math.max(0, TARGET_GOAL - rentAmount);
            
            return {
              month: `${monthNames[monthIndex]} ${year}`,
              rentAmount: rentAmount,
              remaining: remaining,
              agentIncome: Math.round((monthlyIncomeMap.get(monthKey) || 0) * 100) / 100,
              sortKey: monthKey
            };
          })
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
          .map(({ month, rentAmount, remaining, agentIncome }) => ({ month, rentAmount, remaining, agentIncome }));

        setChartData(formattedData);
      }

      setLoading(false);
    }

    fetchMonthlyData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        Loading chart data...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        No revenue data available for chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month" 
          angle={-45}
          textAnchor="end"
          height={80}
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          label={{ value: 'Rent Amount (€)', angle: -90, position: 'insideLeft' }}
          style={{ fontSize: '12px' }}
          domain={[0, 15000]}
        />
        <Tooltip 
          formatter={(value: any, name: string) => {
            if (name === 'Achieved') return [`€${value.toFixed(2)}`, 'Achieved Amount'];
            if (name === 'Remaining to Goal') return [`€${value.toFixed(2)}`, 'Remaining to €15,000'];
            if (name === 'Agent Net Income') return [`€${value.toFixed(2)}`, 'Total Agent Net Income'];
            return [`€${value.toFixed(2)}`, name];
          }}
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
        />
        <Bar 
          dataKey="rentAmount" 
          stackId="stack" 
          fill="#8b5cf6" 
          name="Achieved"
        />
        <Bar 
          dataKey="remaining" 
          stackId="stack" 
          fill="#e9d5ff" 
          name="Remaining to Goal"
          radius={[8, 8, 0, 0]}
        />
        <Line 
          type="monotone" 
          dataKey="agentIncome" 
          stroke="#ec4899" 
          strokeWidth={2}
          name="Agent Net Income"
          dot={{ fill: '#ec4899', r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
