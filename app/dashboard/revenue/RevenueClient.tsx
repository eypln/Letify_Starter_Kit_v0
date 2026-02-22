"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trophy, Target, Award, TrendingUp, FileText, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDashboardUrl } from "@/lib/hooks/useDashboardUrl";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// VAT Type enum
type VatType = 'vatable' | 'non-vatable' | 'part-time';

// Deal Type enum
type DealType = 'longlet' | 'shortlet';

// Revenue form interface
interface RevenueForm {
  id?: number | null;
  user_id: string;
  ref_no: string;
  client_name: string;
  rent_amount: string;
  landlord_discount: boolean;
  client_discount: boolean;
  has_listing_fee: boolean;
  vat_type: VatType;
  deal_type: DealType;
  date_rented: string;
  date_signed: string;
  date_move_in: string;
  landlord_paid_date: string;
  client_paid_date: string;
  collaboration_with: string;
  inform_boss_after_both_sides_paid: boolean;
}

const columns = [
  "#",
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
  "Landlord Paid Date",
  "Client Paid Date",
  "Collaboration with",
  "Inform Boss",
  "Actions",
];

const pageSize = 10;

const vatOptions = [
  { label: "Vatable (40%)", value: 'vatable' as VatType },
  { label: "Non-Vatable (32%)", value: 'non-vatable' as VatType },
  { label: "Part Time (36%)", value: 'part-time' as VatType },
];

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
  vat_type: VatType;
  deal_type?: DealType; // Optional for backward compatibility
  vatable?: boolean; // Backward compatibility
  date_rented: string | null;
  date_signed: string | null;
  date_move_in: string | null;
  landlord_paid_date: string | null;
  client_paid_date: string | null;
  collaboration_with: string | null;
  inform_boss_after_both_sides_paid: boolean;
  created_at?: string;
}

interface Listing {
  id: string;
  title: string;
}

interface Client {
  id: number;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function RevenueClient({ user }: { user: User }) {
  const { toast } = useToast();
  const { dashboardUrl } = useDashboardUrl();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const [form, setForm] = useState<RevenueForm>({
    id: undefined,
    user_id: "",
    ref_no: "",
    client_name: "",
    rent_amount: "",
    landlord_discount: false,
    client_discount: false,
    has_listing_fee: false,
    vat_type: 'non-vatable',
    deal_type: 'longlet',
    date_rented: "",
    date_signed: "",
    date_move_in: "",
    landlord_paid_date: "",
    client_paid_date: "",
    collaboration_with: "",
    inform_boss_after_both_sides_paid: false,
  });

  // Date state
  const [dateRented, setDateRented] = useState<Date | null>(null);
  const [dateSigned, setDateSigned] = useState<Date | null>(null);
  const [dateMoveIn, setDateMoveIn] = useState<Date | null>(null);
  const [landlordPaidDate, setLandlordPaidDate] = useState<Date | null>(null);
  const [clientPaidDate, setClientPaidDate] = useState<Date | null>(null);

  // Calculated fees
  const [calculatedFees, setCalculatedFees] = useState({
    landlord_fee: 0,
    landlord_fee_vat: 0,
    landlord_fee_total: 0,
    client_fee: 0,
    client_fee_vat: 0,
    client_fee_total: 0,
    listing_fee: 0,
    agent_income: 0,
    agent_tax: 0,
  });

  // Check if Inform Boss checkbox should be enabled
  const isInformBossEnabled = useCallback(() => {
    // Both dates must be selected
    if (!landlordPaidDate || !clientPaidDate) {
      return false;
    }

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalize selected dates to midnight
    const landlordDate = new Date(landlordPaidDate);
    landlordDate.setHours(0, 0, 0, 0);

    const clientDate = new Date(clientPaidDate);
    clientDate.setHours(0, 0, 0, 0);

    // Both dates must be today or in the past
    return landlordDate <= today && clientDate <= today;
  }, [landlordPaidDate, clientPaidDate]);

  // Calculate fees when rent amount or discounts change
  useEffect(() => {
    const rentAmount = parseFloat(form.rent_amount) || 0;
    
    let landlord_fee = 0;
    let client_fee = 0;
    let listing_fee = 0;
    
    if (form.deal_type === 'shortlet') {
      // Shortlet: Total Owner Rent Income calculation
      // Base landlord fee: 10% of total owner rent income
      landlord_fee = rentAmount * 0.10;
      if (form.landlord_discount) {
        landlord_fee = landlord_fee * 0.85; // 15% discount
      }

      // Base client fee: 10% of total owner rent income
      client_fee = rentAmount * 0.10;
      if (form.client_discount) {
        client_fee = client_fee * 0.85; // 15% discount
      }
      
      // No listing fee for shortlet
      listing_fee = 0;
    } else {
      // Longlet: Rent Amount calculation (original logic)
      landlord_fee = rentAmount / 2;
      if (form.landlord_discount) {
        landlord_fee = landlord_fee * 0.85; // 15% discount
      }

      client_fee = rentAmount / 2;
      if (form.client_discount) {
        client_fee = client_fee * 0.85; // 15% discount
      }
      
      listing_fee = form.has_listing_fee ? rentAmount * 0.05 : 0; // 5% of rent amount if checked
    }

    // Calculate VAT (18%) for landlord and client fees
    const landlord_fee_vat = landlord_fee * 0.18;
    const landlord_fee_total = landlord_fee + landlord_fee_vat;

    const client_fee_vat = client_fee * 0.18;
    const client_fee_total = client_fee + client_fee_vat;
    
    // Calculate total revenue (with discounts applied)
    const totalRevenue = landlord_fee + client_fee;
    
    // Agent income calculation: Always 40% of total revenue (gross)
    const agent_income_gross = totalRevenue * 0.40;
    
    // Agent TAX calculation based on VAT type
    let agent_tax = 0;
    let agent_income = agent_income_gross;
    
    if (form.vat_type === 'vatable') {
      // Vatable (40%): No tax deduction - agent keeps full 40%
      agent_tax = 0;
      agent_income = agent_income_gross;
    } else if (form.vat_type === 'part-time') {
      // Part Time (36%): 10% tax on gross income
      agent_tax = agent_income_gross * 0.10;
      agent_income = agent_income_gross - agent_tax; // Net = 36% of total revenue
    } else if (form.vat_type === 'non-vatable') {
      // Full Time / Non-Vatable (32%): 20% tax on gross income
      agent_tax = agent_income_gross * 0.20;
      agent_income = agent_income_gross - agent_tax; // Net = 32% of total revenue
    }

    setCalculatedFees({
      landlord_fee,
      landlord_fee_vat,
      landlord_fee_total,
      client_fee,
      client_fee_vat,
      client_fee_total,
      listing_fee,
      agent_income,
      agent_tax,
    });
  }, [form.rent_amount, form.landlord_discount, form.client_discount, form.has_listing_fee, form.vat_type, form.deal_type]);

  // Auto-uncheck inform_boss if payment dates become invalid
  useEffect(() => {
    if (form.inform_boss_after_both_sides_paid && !isInformBossEnabled()) {
      setForm(prev => ({ ...prev, inform_boss_after_both_sides_paid: false }));
    }
  }, [landlordPaidDate, clientPaidDate, form.inform_boss_after_both_sides_paid, isInformBossEnabled]);

  async function getUserAndRevenues(currentPage = page) {
    setLoading(true);

    // Fetch revenues
    const { data, error, count } = await supabase
      .from("revenue")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    if (!error && data) {
      setRevenues(data);
      setPageCount(Math.ceil((count || 0) / pageSize));
    }

    // Fetch listings for Ref No dropdown
    const { data: listingsData } = await supabase
      .from("listings")
      .select("id, title")
      .order("created_at", { ascending: false });

    if (listingsData) {
      setListings(listingsData);
    }

    // Fetch clients for Client Name dropdown
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (clientsData) {
      setClients(clientsData);
    }

    // Fetch profiles for Collaboration With dropdown (exclude current user)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .neq("id", user.id)
      .order("full_name", { ascending: true });

    if (profilesData) {
      setProfiles(profilesData);
    }

    setLoading(false);
  }

  useEffect(() => {
    getUserAndRevenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const resetForm = () => {
    setForm({
      id: undefined,
      user_id: user?.id || "",
      ref_no: "",
      client_name: "",
      rent_amount: "",
      landlord_discount: false,
      client_discount: false,
      has_listing_fee: false,
      vat_type: 'non-vatable',
      deal_type: 'longlet',
      date_rented: "",
      date_signed: "",
      date_move_in: "",
      landlord_paid_date: "",
      client_paid_date: "",
      collaboration_with: "",
      inform_boss_after_both_sides_paid: false,
    });
    setDateRented(null);
    setDateSigned(null);
    setDateMoveIn(null);
    setLandlordPaidDate(null);
    setClientPaidDate(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (revenue: Revenue) => {
    // Backward compatibility: convert old vatable boolean to new vat_type
    let vatType: VatType = 'vatable';
    if (revenue.vat_type) {
      vatType = revenue.vat_type;
    } else if (revenue.vatable !== undefined) {
      vatType = revenue.vatable ? 'vatable' : 'non-vatable';
    }
    
    setForm({
      id: revenue.id,
      user_id: revenue.user_id,
      ref_no: revenue.ref_no || "",
      client_name: revenue.client_name || "",
      rent_amount: revenue.rent_amount?.toString() || "",
      landlord_discount: revenue.landlord_discount || false,
      client_discount: revenue.client_discount || false,
      has_listing_fee: revenue.has_listing_fee || false,
      vat_type: vatType,
      deal_type: revenue.deal_type || 'longlet', // Use stored deal_type or default to longlet
      date_rented: revenue.date_rented || "",
      date_signed: revenue.date_signed || "",
      date_move_in: revenue.date_move_in || "",
      landlord_paid_date: revenue.landlord_paid_date || "",
      client_paid_date: revenue.client_paid_date || "",
      collaboration_with: revenue.collaboration_with || "",
      inform_boss_after_both_sides_paid: revenue.inform_boss_after_both_sides_paid || false,
    });
    
    setDateRented(revenue.date_rented ? new Date(revenue.date_rented) : null);
    setDateSigned(revenue.date_signed ? new Date(revenue.date_signed) : null);
    setDateMoveIn(revenue.date_move_in ? new Date(revenue.date_move_in) : null);
    setLandlordPaidDate(revenue.landlord_paid_date ? new Date(revenue.landlord_paid_date) : null);
    setClientPaidDate(revenue.client_paid_date ? new Date(revenue.client_paid_date) : null);
    
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.ref_no || !form.client_name || !form.rent_amount || !dateRented || !dateSigned || !dateMoveIn) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Ref No, Client Name, Rent Amount, Date Rented, Date Signed, and Date Move In",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const payload = {
      ...form,
      date_rented: dateRented ? dateRented.toISOString() : null,
      date_signed: dateSigned ? dateSigned.toISOString() : null,
      date_move_in: dateMoveIn ? dateMoveIn.toISOString() : null,
      landlord_paid_date: landlordPaidDate ? landlordPaidDate.toISOString() : null,
      client_paid_date: clientPaidDate ? clientPaidDate.toISOString() : null,
      user_id: user?.id,
    };

    try {
      const response = await fetch('/api/revenue', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: form.id ? "Deal updated successfully" : "Deal added successfully",
          variant: "default",
        });
        setShowModal(false);
        resetForm();
        await getUserAndRevenues(1);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save deal",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        <Link href={dashboardUrl} className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
      </div>
      
      {/* Revenue Table */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue Overview</CardTitle>
            <Button 
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2"
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4" /> Add Deal
            </Button>
          </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : revenues.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                      No revenue records found.
                    </td>
                  </tr>
                ) : (
                  revenues.map((revenue: Revenue, idx: number) => (
                    <tr key={revenue.id} className="table-row-hover">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(revenue.date_rented)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {revenue.ref_no || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {revenue.client_name || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(revenue.rent_amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(revenue.landlord_fee)}
                        {revenue.landlord_discount && <span className="text-xs text-green-600 ml-1">(-15%)</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(revenue.client_fee)}
                        {revenue.client_discount && <span className="text-xs text-green-600 ml-1">(-15%)</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(revenue.listing_fee)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(revenue.agent_income)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({revenue.vat_type === 'vatable' ? "40%" : revenue.vat_type === 'part-time' ? "36%" : "32%"})
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(revenue.agent_tax)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(revenue.date_signed)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(revenue.date_move_in)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(revenue.landlord_paid_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(revenue.client_paid_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {revenue.collaboration_with || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="checkbox"
                          checked={revenue.inform_boss_after_both_sides_paid}
                          disabled
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(revenue)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1"
              >
                Prev
              </Button>
              
              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    pageNum === 1 || 
                    pageNum === pageCount || 
                    (pageNum >= page - 1 && pageNum <= page + 1);
                  
                  // Show ellipsis
                  const showEllipsisBefore = pageNum === page - 2 && page > 3;
                  const showEllipsisAfter = pageNum === page + 2 && page < pageCount - 2;
                  
                  if (showEllipsisBefore || showEllipsisAfter) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }
                  
                  if (!showPage) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 min-w-[40px] ${
                        page === pageNum 
                          ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                          : ''
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === pageCount}
                className="px-3 py-1"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(pageCount)}
                disabled={page === pageCount}
                className="px-3 py-1"
              >
                Last
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {form.id ? "Edit Deal" : "Add New Deal"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Deal Type Toggle */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Deal Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, deal_type: 'longlet', has_listing_fee: false })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        form.deal_type === 'longlet'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Longlet
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, deal_type: 'shortlet', has_listing_fee: false })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        form.deal_type === 'shortlet'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Shortlet
                    </button>
                  </div>
                </div>
                {/* Row 1: Ref No, Client Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Ref No <span className="text-red-500">*</span></label>
                    <Select
                      isClearable
                      placeholder="Select from listings or type manually..."
                      options={listings.map(listing => ({
                        label: listing.title,
                        value: listing.title
                      }))}
                      value={form.ref_no ? { label: form.ref_no, value: form.ref_no } : null}
                      onChange={(selected) => {
                        setForm({ ...form, ref_no: selected ? selected.value : '' });
                      }}
                      onInputChange={(inputValue, { action }) => {
                        // Allow manual typing
                        if (action === 'input-change') {
                          setForm({ ...form, ref_no: inputValue });
                        }
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: form.ref_no ? '#d1d5db' : '#ef4444',
                        }),
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select an existing listing or type a new reference number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Client Name <span className="text-red-500">*</span></label>
                    <Select
                      isClearable
                      placeholder="Select from clients or type manually..."
                      options={clients.map(client => ({
                        label: client.name,
                        value: client.name
                      }))}
                      value={form.client_name ? { label: form.client_name, value: form.client_name } : null}
                      onChange={(selected) => {
                        setForm({ ...form, client_name: selected ? selected.value : '' });
                      }}
                      onInputChange={(inputValue, { action }) => {
                        // Allow manual typing
                        if (action === 'input-change') {
                          setForm({ ...form, client_name: inputValue });
                        }
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: form.client_name ? '#d1d5db' : '#ef4444',
                        }),
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select an existing client or type a new name
                    </p>
                  </div>
                </div>

                {/* Row 2: Rent Amount, VAT Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                      {form.deal_type === 'shortlet' ? 'Total Owner Rent Income (€)' : 'Rent Amount (€)'} *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rent_amount}
                      onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                      placeholder={form.deal_type === 'shortlet' ? 'Enter total owner rent income' : 'Enter rent amount'}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">VAT Type</label>
                    <Select
                      options={vatOptions}
                      value={vatOptions.find(opt => opt.value === form.vat_type)}
                      onChange={(option) => setForm({ ...form, vat_type: option?.value ?? 'vatable' })}
                      placeholder="Select VAT type"
                      styles={{
                        control: (base) => ({
                          ...base,
                        }),
                      }}
                    />
                  </div>
                </div>

                {/* Discount Checkboxes */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="landlord_discount"
                      checked={form.landlord_discount}
                      onChange={(e) => setForm({ ...form, landlord_discount: e.target.checked })}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="landlord_discount" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Landlord 15% Discount
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="client_discount"
                      checked={form.client_discount}
                      onChange={(e) => setForm({ ...form, client_discount: e.target.checked })}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="client_discount" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Client 15% Discount
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_listing_fee"
                      checked={form.has_listing_fee}
                      onChange={(e) => setForm({ ...form, has_listing_fee: e.target.checked })}
                      disabled={form.deal_type === 'shortlet'}
                      className="h-4 w-4 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="has_listing_fee" className={`text-sm font-medium ${
                      form.deal_type === 'shortlet' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      Listing Fee (5%)
                    </label>
                  </div>
                </div>

                {/* Calculated Fees Display */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Calculated Fees</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 dark:text-gray-100">
                    <div>
                      Landlord Fee: <span className="font-semibold">{formatCurrency(calculatedFees.landlord_fee)}</span>
                      <span className="text-green-600 ml-1">+ {formatCurrency(calculatedFees.landlord_fee_vat)} VAT (18%)</span>
                    </div>
                    <div>
                      Client Fee: <span className="font-semibold">{formatCurrency(calculatedFees.client_fee)}</span>
                      <span className="text-green-600 ml-1">+ {formatCurrency(calculatedFees.client_fee_vat)} VAT (18%)</span>
                    </div>
                    <div>Listing Fee: <span className="font-semibold">{formatCurrency(calculatedFees.listing_fee)}</span></div>
                    <div>Agent Gross Income: <span className="font-semibold">{formatCurrency(calculatedFees.agent_income + calculatedFees.agent_tax)}</span></div>
                    <div>Agent TAX: <span className="font-semibold">{formatCurrency(calculatedFees.agent_tax)}</span></div>
                    <div>Agent Net Income: <span className="font-semibold">{formatCurrency(calculatedFees.agent_income)}</span></div>
                  </div>
                </div>

                {/* Row 3: Date Rented, Date Signed, Date Move In */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Date Rented <span className="text-red-500">*</span></label>
                    <DatePicker
                      selected={dateRented}
                      onChange={(date) => setDateRented(date)}
                      dateFormat="dd/MM/yyyy"
                      className={`w-full px-3 py-2 border rounded-md ${dateRented ? 'border-gray-300' : 'border-red-500'}`}
                      placeholderText="Select date"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Date Signed <span className="text-red-500">*</span></label>
                    <DatePicker
                      selected={dateSigned}
                      onChange={(date) => setDateSigned(date)}
                      dateFormat="dd/MM/yyyy"
                      className={`w-full px-3 py-2 border rounded-md ${dateSigned ? 'border-gray-300' : 'border-red-500'}`}
                      placeholderText="Select date"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Date Move In <span className="text-red-500">*</span></label>
                    <DatePicker
                      selected={dateMoveIn}
                      onChange={(date) => setDateMoveIn(date)}
                      dateFormat="dd/MM/yyyy"
                      className={`w-full px-3 py-2 border rounded-md ${dateMoveIn ? 'border-gray-300' : 'border-red-500'}`}
                      placeholderText="Select date"
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Payment Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Landlord Paid Date</label>
                    <DatePicker
                      selected={landlordPaidDate}
                      onChange={(date) => setLandlordPaidDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Client Paid Date</label>
                    <DatePicker
                      selected={clientPaidDate}
                      onChange={(date) => setClientPaidDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                </div>

                {/* Row 5: Collaboration */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Collaboration With</label>
                  <Select
                    value={
                      form.collaboration_with
                        ? { label: form.collaboration_with, value: form.collaboration_with }
                        : null
                    }
                    onChange={(option) =>
                      setForm({ ...form, collaboration_with: option ? option.value : "" })
                    }
                    onInputChange={(inputValue) => {
                      // Allow manual input by updating form when typing
                      if (inputValue) {
                        setForm({ ...form, collaboration_with: inputValue });
                      }
                    }}
                    options={profiles.map((profile) => ({
                      label: profile.full_name,
                      value: profile.full_name,
                    }))}
                    isClearable
                    placeholder="Select or type collaboration partner"
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "42px",
                      }),
                    }}
                  />
                </div>

                {/* Row 6: Inform Boss Checkbox */}
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inform_boss"
                      checked={form.inform_boss_after_both_sides_paid}
                      onChange={(e) => {
                        if (isInformBossEnabled()) {
                          setForm({ ...form, inform_boss_after_both_sides_paid: e.target.checked });
                        }
                      }}
                      disabled={!isInformBossEnabled()}
                      className="h-4 w-4 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label 
                      htmlFor="inform_boss" 
                      className={`text-sm font-medium ${
                        !isInformBossEnabled() ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      Inform Boss after both sides paid
                    </label>
                  </div>
                  {!isInformBossEnabled() && (
                    <p className="text-xs text-amber-600 mt-1 ml-6">
                      {!landlordPaidDate || !clientPaidDate 
                        ? 'Both payment dates must be filled to enable this option'
                        : 'Both payment dates must be today or in the past'}
                    </p>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : form.id ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Agent Revenue Chart */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Monthly Agent Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyAgentRevenueChart userId={user.id} />
        </CardContent>
      </Card>

      {/* Agent Bonus Section */}
      <AgentBonusSection userId={user.id} />
    </div>
  );
}

// Monthly Agent Revenue Chart Component
function MonthlyAgentRevenueChart({ userId }: { userId: string }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMonthlyData() {
      setLoading(true);

      // Fetch only this agent's revenue records
      const { data: revenueData, error } = await supabase
        .from("revenue")
        .select("date_rented, rent_amount, agent_income")
        .eq("user_id", userId)
        .order("date_rented", { ascending: true });

      if (!error && revenueData) {
        // Group by month and calculate total rent amount and agent income
        const monthlyRentMap = new Map<string, number>();
        const monthlyIncomeMap = new Map<string, number>();

        revenueData.forEach((revenue: any) => {
          if (revenue.date_rented) {
            const date = new Date(revenue.date_rented);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // Accumulate rent amount
            if (revenue.rent_amount) {
              const currentRent = monthlyRentMap.get(monthKey) || 0;
              monthlyRentMap.set(monthKey, currentRent + parseFloat(revenue.rent_amount));
            }
            
            // Accumulate agent income
            if (revenue.agent_income) {
              const currentIncome = monthlyIncomeMap.get(monthKey) || 0;
              monthlyIncomeMap.set(monthKey, currentIncome + parseFloat(revenue.agent_income));
            }
          }
        });

        // Convert to array and format for chart
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const TARGET_GOAL = 8500; // Agent personal goal

        // Get all unique months from both maps
        const allMonths = new Set([...monthlyRentMap.keys(), ...monthlyIncomeMap.keys()]);

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
  }, [supabase, userId]);

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
          domain={[0, 8500]}
        />
        <Tooltip 
          formatter={(value: any, name: string) => {
            if (name === 'Achieved') return [`€${value.toFixed(2)}`, 'Achieved Amount'];
            if (name === 'Remaining to Goal') return [`€${value.toFixed(2)}`, 'Remaining to €8,500'];
            if (name === 'Agent Net Income') return [`€${value.toFixed(2)}`, 'My Net Income'];
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

// ─── Agent Bonus Types ───────────────────────────────────────────────────────

interface AgentMonthlyBonus {
  month: string;
  monthLabel: string;
  completedDeals: number;
  totalRent: number;
  averageRent: number;
  bonusScheme: 'contract' | 'agency_fee' | 'none';
  contractRate: number;
  bonusAmount: number;
}

// ─── Agent Bonus Calculation ─────────────────────────────────────────────────

function getContractBonusRate(dealCount: number): { rate: number; label: string } | null {
  if (dealCount >= 10) return { rate: 0.70, label: '70%' };
  if (dealCount >= 9) return { rate: 0.65, label: '65%' };
  if (dealCount >= 8) return { rate: 0.60, label: '60%' };
  if (dealCount >= 7) return { rate: 0.55, label: '55%' };
  if (dealCount >= 6) return { rate: 0.50, label: '50%' };
  return null;
}

function getContractBonusLabel(dealCount: number): string {
  if (dealCount >= 10) return '10+ contracts → 70%';
  if (dealCount >= 9) return '9 contracts → 65%';
  if (dealCount >= 8) return '8 contracts → 60%';
  if (dealCount >= 7) return '7 contracts → 55%';
  if (dealCount >= 6) return '6 contracts → 50%';
  return `${dealCount} contract${dealCount !== 1 ? 's' : ''} (need 6 for bonus)`;
}

function calculateAgentBonus(
  dealCount: number,
  totalRent: number
): { scheme: 'contract' | 'agency_fee' | 'none'; rate: number; bonus: number } {
  if (dealCount >= 6) {
    const rateInfo = getContractBonusRate(dealCount);
    if (rateInfo) {
      const averageRent = dealCount > 0 ? totalRent / dealCount : 0;
      return {
        scheme: 'contract',
        rate: rateInfo.rate,
        bonus: rateInfo.rate * averageRent,
      };
    }
  }

  // Less than 6 deals: Monthly Agency Fee Bonus
  if (totalRent >= 5000) {
    return { scheme: 'agency_fee', rate: 0, bonus: 300 };
  }
  if (totalRent >= 3000) {
    return { scheme: 'agency_fee', rate: 0, bonus: 150 };
  }

  return { scheme: 'none', rate: 0, bonus: 0 };
}

function getAgentBonusCompletionMonth(deal: Revenue): string | null {
  const landlordDate = deal.landlord_paid_date ? new Date(deal.landlord_paid_date) : null;
  const clientDate = deal.client_paid_date ? new Date(deal.client_paid_date) : null;

  // Both dates must be present for a deal to be considered "completed"
  if (!landlordDate || !clientDate) return null;

  // Completion month = the later of the two dates
  const completionDate = landlordDate > clientDate ? landlordDate : clientDate;
  return `${completionDate.getFullYear()}-${String(completionDate.getMonth() + 1).padStart(2, '0')}`;
}

function formatBonusMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatBonusCurrency(amount: number): string {
  return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CONTRACT_TIERS = [
  { deals: 6, rate: 0.50, color: '#60a5fa' },
  { deals: 7, rate: 0.55, color: '#818cf8' },
  { deals: 8, rate: 0.60, color: '#a78bfa' },
  { deals: 9, rate: 0.65, color: '#c084fc' },
  { deals: 10, rate: 0.70, color: '#f59e0b' },
];

const BONUS_BAR_COLORS = {
  contract: '#8b5cf6',
  agency_fee: '#06b6d4',
  none: '#94a3b8',
};

const YEARLY_TARGET = 48000;

// ─── Agent Bonus Section Component ───────────────────────────────────────────

function AgentBonusSection({ userId }: { userId: string }) {
  const [allRevenues, setAllRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadBonusData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('revenue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) setAllRevenues(data);
      setLoading(false);
    }
    loadBonusData();
  }, [supabase, userId]);

  // Process deals: only completed deals (both paid dates present)
  const completedDeals = useMemo(() => {
    return allRevenues
      .map((deal) => {
        const completionMonth = getAgentBonusCompletionMonth(deal);
        if (!completionMonth) return null;

        const rentAmount = deal.rent_amount || 0;
        const hasCollaboration = (deal.collaboration_with?.trim() || '') !== '';
        const effectiveRent = hasCollaboration ? rentAmount / 2 : rentAmount;

        return {
          ...deal,
          completion_month: completionMonth,
          effective_rent: effectiveRent,
          is_collaboration: hasCollaboration,
        };
      })
      .filter(Boolean) as (Revenue & {
        completion_month: string;
        effective_rent: number;
        is_collaboration: boolean;
      })[];
  }, [allRevenues]);

  // Monthly bonus calculations
  const monthlyBonuses = useMemo((): AgentMonthlyBonus[] => {
    const monthGroups = new Map<string, typeof completedDeals>();
    completedDeals.forEach((deal) => {
      const month = deal.completion_month;
      if (!monthGroups.has(month)) monthGroups.set(month, []);
      monthGroups.get(month)!.push(deal);
    });

    const results: AgentMonthlyBonus[] = [];
    monthGroups.forEach((deals, month) => {
      const totalRent = deals.reduce((sum, d) => sum + d.effective_rent, 0);
      const dealCount = deals.length;
      const averageRent = dealCount > 0 ? totalRent / dealCount : 0;

      const bonusCalc = calculateAgentBonus(dealCount, totalRent);

      results.push({
        month,
        monthLabel: formatBonusMonthLabel(month),
        completedDeals: dealCount,
        totalRent: Math.round(totalRent * 100) / 100,
        averageRent: Math.round(averageRent * 100) / 100,
        bonusScheme: bonusCalc.scheme,
        contractRate: bonusCalc.rate,
        bonusAmount: Math.round(bonusCalc.bonus * 100) / 100,
      });
    });

    return results.sort((a, b) => a.month.localeCompare(b.month));
  }, [completedDeals]);

  // Current month summary
  const currentMonth = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthlyBonuses.find((mb) => mb.month === key) || null;
  }, [monthlyBonuses]);

  // Current year totals (for yearly reward)
  const yearlyData = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const yearBonuses = monthlyBonuses.filter((mb) => mb.month.startsWith(currentYear));
    const totalRent = yearBonuses.reduce((sum, mb) => sum + mb.totalRent, 0);
    const totalBonus = yearBonuses.reduce((sum, mb) => sum + mb.bonusAmount, 0);
    const totalDeals = yearBonuses.reduce((sum, mb) => sum + mb.completedDeals, 0);
    const progress = Math.min((totalRent / YEARLY_TARGET) * 100, 100);
    const yearlyBonusEarned = totalRent >= YEARLY_TARGET ? 2500 : 0;

    return { totalRent, totalBonus, totalDeals, progress, yearlyBonusEarned, monthCount: yearBonuses.length };
  }, [monthlyBonuses]);

  // Chart data
  const bonusChartData = useMemo(() => {
    return monthlyBonuses.map((mb) => {
      const shortMonth = mb.monthLabel.replace(/(\w+)\s(\d{4})/, (_, m, y) => {
        const shorts: Record<string, string> = {
          January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr',
          May: 'May', June: 'Jun', July: 'Jul', August: 'Aug',
          September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec',
        };
        return `${shorts[m] || m} ${y}`;
      });
      return {
        month: shortMonth,
        bonus: mb.bonusAmount,
        deals: mb.completedDeals,
        totalRent: mb.totalRent,
        scheme: mb.bonusScheme,
        rate: mb.contractRate,
      };
    });
  }, [monthlyBonuses]);

  // Donut data for current month deal progress
  const dealProgressData = useMemo(() => {
    const current = currentMonth?.completedDeals || 0;
    const target = 6;
    const achieved = Math.min(current, target);
    const remaining = Math.max(0, target - current);
    const extra = Math.max(0, current - target);

    return [
      { name: 'Completed', value: achieved, fill: '#8b5cf6' },
      ...(extra > 0 ? [{ name: 'Extra', value: extra, fill: '#f59e0b' }] : []),
      ...(remaining > 0 ? [{ name: 'Remaining', value: remaining, fill: '#e2e8f0' }] : []),
    ];
  }, [currentMonth]);

  if (loading) {
    return (
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            Loading bonus data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentDeals = currentMonth?.completedDeals || 0;
  const currentTotalRent = currentMonth?.totalRent || 0;
  const currentBonus = currentMonth?.bonusAmount || 0;
  const currentScheme = currentMonth?.bonusScheme || 'none';

  return (
    <>
      {/* ─── Section Header ──────────────────────────────────────────────── */}
      <div className="mt-12 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-7 w-7 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Bonus Tracker</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-10">
          Track your monthly contract bonuses, agency fee bonuses and yearly rewards
        </p>
      </div>

      {/* ─── Current Month Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Deals This Month */}
        <Card className={`border-2 ${currentDeals >= 6 ? 'border-purple-400' : 'border-gray-200 dark:border-gray-700'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">Deals This Month</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{currentDeals}</div>
            <div className="text-xs text-gray-500 mt-1">{getContractBonusLabel(currentDeals)}</div>
          </CardContent>
        </Card>

        {/* Total Rent */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-gray-500">Total Rent (excl. VAT)</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatBonusCurrency(currentTotalRent)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Avg: {formatBonusCurrency(currentDeals > 0 ? currentTotalRent / currentDeals : 0)} / deal
            </div>
          </CardContent>
        </Card>

        {/* Active Scheme */}
        <Card className={`border-2 ${
          currentScheme === 'contract' ? 'border-purple-400' :
          currentScheme === 'agency_fee' ? 'border-cyan-400' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500">Active Bonus Scheme</span>
            </div>
            <div className={`text-lg font-bold ${
              currentScheme === 'contract' ? 'text-purple-600' :
              currentScheme === 'agency_fee' ? 'text-cyan-600' : 'text-gray-400'
            }`}>
              {currentScheme === 'contract'
                ? `Contract Bonus (${Math.round((currentMonth?.contractRate || 0) * 100)}%)`
                : currentScheme === 'agency_fee'
                  ? `Agency Fee Bonus`
                  : 'No Bonus Yet'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentScheme === 'contract'
                ? `${currentDeals} contracts closed`
                : currentScheme === 'agency_fee'
                  ? currentTotalRent >= 5000 ? '€5,000+ rent tier' : '€3,000+ rent tier'
                  : currentDeals > 0 ? `Need ${Math.max(0, 3000 - currentTotalRent).toFixed(0)}€ more rent or ${Math.max(0, 6 - currentDeals)} more deals` : 'Close deals to earn bonus'}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Bonus */}
        <Card className={`border-2 ${currentBonus > 0 ? 'border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-500">Monthly Bonus</span>
            </div>
            <div className={`text-3xl font-bold ${currentBonus > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
              {formatBonusCurrency(currentBonus)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentScheme === 'contract'
                ? `${Math.round((currentMonth?.contractRate || 0) * 100)}% × ${formatBonusCurrency(currentMonth?.averageRent || 0)} avg`
                : currentScheme === 'agency_fee'
                  ? 'Fixed bonus tier'
                  : 'Start closing deals!'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Contract Progress & Yearly Target ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Contract Tier Progress */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Contract Bonus Progress (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Deal count donut */}
            <div className="flex items-center gap-6 mb-6">
              <div className="w-[130px] h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dealProgressData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {dealProgressData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-gray-100 text-2xl font-bold">
                      {currentDeals}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {currentDeals >= 6
                    ? '🎉 Contract bonus unlocked!'
                    : `${6 - currentDeals} more deal${6 - currentDeals !== 1 ? 's' : ''} to unlock contract bonus`}
                </div>
                {/* Tier steps */}
                <div className="space-y-1.5">
                  {CONTRACT_TIERS.map((tier) => (
                    <div key={tier.deals} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${currentDeals >= tier.deals ? '' : 'opacity-30'}`}
                        style={{ backgroundColor: tier.color }}
                      />
                      <span className={`text-xs font-medium ${
                        currentDeals >= tier.deals ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                      }`}>
                        {tier.deals}{tier.deals === 10 ? '+' : ''} contracts = {Math.round(tier.rate * 100)}%
                        {currentDeals === tier.deals && ' ←'}
                      </span>
                      {currentDeals >= tier.deals && (
                        <span className="text-xs text-green-500">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agency Fee Bonus info (when <6 deals) */}
            {currentDeals < 6 && (
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Agency Fee Bonus (when &lt;6 deals)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border-2 ${currentTotalRent >= 5000 ? 'border-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="text-xs text-gray-500 mb-1">Rent ≥ €5,000</div>
                    <div className={`text-lg font-bold ${currentTotalRent >= 5000 ? 'text-cyan-600' : 'text-gray-400'}`}>€300</div>
                    {currentTotalRent < 5000 && (
                      <div className="text-xs text-gray-400 mt-1">{formatBonusCurrency(Math.max(0, 5000 - currentTotalRent))} to go</div>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border-2 ${currentTotalRent >= 3000 && currentTotalRent < 5000 ? 'border-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="text-xs text-gray-500 mb-1">Rent ≥ €3,000</div>
                    <div className={`text-lg font-bold ${currentTotalRent >= 3000 ? 'text-cyan-600' : 'text-gray-400'}`}>€150</div>
                    {currentTotalRent < 3000 && (
                      <div className="text-xs text-gray-400 mt-1">{formatBonusCurrency(Math.max(0, 3000 - currentTotalRent))} to go</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Yearly Revenue Target */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Yearly Revenue Target ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Total Rent (excl. VAT)
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatBonusCurrency(yearlyData.totalRent)} / {formatBonusCurrency(YEARLY_TARGET)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 relative overflow-hidden">
                <div
                  className={`h-5 rounded-full transition-all duration-700 ${
                    yearlyData.progress >= 100
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                      : yearlyData.progress >= 75
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                        : yearlyData.progress >= 50
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                          : 'bg-gradient-to-r from-blue-400 to-blue-500'
                  }`}
                  style={{ width: `${yearlyData.progress}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                  {yearlyData.progress.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Yearly stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Total Deals (Year)</div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{yearlyData.totalDeals}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Total Monthly Bonuses</div>
                <div className="text-xl font-bold text-purple-600">{formatBonusCurrency(yearlyData.totalBonus)}</div>
              </div>
            </div>

            {/* Yearly reward card */}
            <div className={`p-4 rounded-lg border-2 ${
              yearlyData.yearlyBonusEarned > 0
                ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20'
                : 'border-dashed border-gray-300 dark:border-gray-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`text-3xl ${yearlyData.yearlyBonusEarned > 0 ? '' : 'grayscale opacity-40'}`}>💎</div>
                <div>
                  <div className={`text-sm font-medium ${yearlyData.yearlyBonusEarned > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500'}`}>
                    Yearly Reward
                  </div>
                  <div className={`text-2xl font-bold ${yearlyData.yearlyBonusEarned > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    €2,500
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {yearlyData.yearlyBonusEarned > 0
                      ? '🎉 Congratulations! You hit the €48,000 target!'
                      : `${formatBonusCurrency(Math.max(0, YEARLY_TARGET - yearlyData.totalRent))} remaining to unlock`}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Monthly Bonus Chart ────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Bonus Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {bonusChartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No completed deals yet. Close your first deal to see bonus progress!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart
                data={bonusChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: '11px' }}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: 'Bonus (€)', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: '11px' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Deals', angle: 90, position: 'insideRight' }}
                  style={{ fontSize: '11px' }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === 'Bonus') return [`€${Number(value).toFixed(2)}`, 'Bonus Amount'];
                    if (name === 'Deals') return [value, 'Completed Deals'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="bonus" name="Bonus" radius={[6, 6, 0, 0]}>
                  {bonusChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BONUS_BAR_COLORS[entry.scheme as keyof typeof BONUS_BAR_COLORS] || BONUS_BAR_COLORS.none}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="deals"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  name="Deals"
                  dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {/* Chart legend for scheme colors */}
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: BONUS_BAR_COLORS.contract }} />
              <span>Contract Bonus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: BONUS_BAR_COLORS.agency_fee }} />
              <span>Agency Fee Bonus</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Detailed Monthly Breakdown Table ───────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Detailed Monthly Bonus History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Month', 'Deals', 'Total Rent', 'Avg Rent / Deal', 'Scheme', 'Rate', 'Bonus'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {monthlyBonuses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No completed deals yet.
                    </td>
                  </tr>
                ) : (
                  [...monthlyBonuses].reverse().map((mb) => (
                    <tr key={mb.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {mb.monthLabel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          mb.completedDeals >= 6 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {mb.completedDeals}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatBonusCurrency(mb.totalRent)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatBonusCurrency(mb.averageRent)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          mb.bonusScheme === 'contract'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                            : mb.bonusScheme === 'agency_fee'
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {mb.bonusScheme === 'contract' ? 'Contract' : mb.bonusScheme === 'agency_fee' ? 'Agency Fee' : 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {mb.bonusScheme === 'contract' ? `${Math.round(mb.contractRate * 100)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                        <span className={mb.bonusAmount > 0 ? 'text-green-600' : 'text-gray-400'}>
                          {formatBonusCurrency(mb.bonusAmount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthlyBonuses.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {monthlyBonuses.reduce((s, m) => s + m.completedDeals, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatBonusCurrency(monthlyBonuses.reduce((s, m) => s + m.totalRent, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">-</td>
                    <td className="px-4 py-3 text-sm text-gray-500">-</td>
                    <td className="px-4 py-3 text-sm text-gray-500">-</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {formatBonusCurrency(monthlyBonuses.reduce((s, m) => s + m.bonusAmount, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Bonus Rules Reference ──────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Bonus Rules Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Contract Bonus */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                🏆 Contract Bonus (≥6 deals)
              </h4>
              <div className="space-y-1.5">
                {CONTRACT_TIERS.map((tier) => (
                  <div key={tier.deals} className="flex justify-between text-sm py-1 px-2 rounded" style={{ backgroundColor: `${tier.color}10` }}>
                    <span className="text-gray-700 dark:text-gray-300">
                      {tier.deals}{tier.deals === 10 ? '+' : ''} contracts
                    </span>
                    <span className="font-semibold" style={{ color: tier.color }}>
                      {Math.round(tier.rate * 100)}% × avg rent
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 italic">
                Bonus = rate × average rent per deal (excl. VAT)
              </p>
            </div>

            {/* Agency Fee Bonus */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                💰 Monthly Agency Fee (&lt;6 deals)
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm py-1 px-2 rounded bg-cyan-50 dark:bg-cyan-900/20">
                  <span className="text-gray-700 dark:text-gray-300">Rent ≥ €5,000</span>
                  <span className="font-semibold text-cyan-600">€300</span>
                </div>
                <div className="flex justify-between text-sm py-1 px-2 rounded bg-cyan-50 dark:bg-cyan-900/20">
                  <span className="text-gray-700 dark:text-gray-300">Rent ≥ €3,000</span>
                  <span className="font-semibold text-cyan-600">€150</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 italic">
                Applies only when less than 6 deals in a month. If 6+ deals, contract bonus applies instead.
              </p>
            </div>

            {/* Yearly Reward */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                🎯 Yearly Reward
              </h4>
              <div className="flex justify-between text-sm py-1 px-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                <span className="text-gray-700 dark:text-gray-300">€48,000 total rent</span>
                <span className="font-semibold text-yellow-600">€2,500</span>
              </div>
              <p className="text-xs text-gray-500 italic">
                Reach €48,000 in total agency fees (excl. VAT) within the calendar year.
              </p>
            </div>
          </div>

          {/* Important notes */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">📌 Important Notes</h4>
            <ul className="text-xs text-gray-500 space-y-1 list-disc ml-4">
              <li>A deal is considered <strong>completed</strong> when both Landlord Paid Date and Client Paid Date are filled.</li>
              <li>The completion month is determined by the later of the two payment dates.</li>
              <li>For <strong>collaboration</strong> deals, only half of the rent amount counts toward your bonus calculation.</li>
              <li>All amounts are calculated <strong>excluding VAT</strong>.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
