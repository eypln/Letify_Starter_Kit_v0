"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// VAT Type enum
type VatType = 'vatable' | 'non-vatable' | 'part-time';

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
  "Agent Income (€)",
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
    vat_type: 'vatable',
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
  const isInformBossEnabled = () => {
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
  };

  // Calculate fees when rent amount or discounts change
  useEffect(() => {
    const rentAmount = parseFloat(form.rent_amount) || 0;
    
    let landlord_fee = rentAmount / 2;
    if (form.landlord_discount) {
      landlord_fee = landlord_fee * 0.85; // 15% discount
    }

    let client_fee = rentAmount / 2;
    if (form.client_discount) {
      client_fee = client_fee * 0.85; // 15% discount
    }

    // Calculate VAT (18%) for landlord and client fees
    const landlord_fee_vat = landlord_fee * 0.18;
    const landlord_fee_total = landlord_fee + landlord_fee_vat;

    const client_fee_vat = client_fee * 0.18;
    const client_fee_total = client_fee + client_fee_vat;

    const listing_fee = form.has_listing_fee ? rentAmount * 0.05 : 0; // 5% of rent amount if checked
    
    // Agent income calculation based on VAT type
    let agent_income_base_rate = 0.40; // Default: Vatable (40%)
    
    if (form.vat_type === 'non-vatable') {
      agent_income_base_rate = 0.32; // Non-Vatable (32%)
    } else if (form.vat_type === 'part-time') {
      agent_income_base_rate = 0.36; // Part Time (36%)
    }
    
    let agent_income = rentAmount * agent_income_base_rate;
    
    // Reduce agent income based on discounts
    // If landlord has 15% discount, reduce agent income by 7.5%
    // If client has 15% discount, reduce agent income by 7.5%
    let agent_income_reduction = 0;
    if (form.landlord_discount) {
      agent_income_reduction += 0.075; // 7.5%
    }
    if (form.client_discount) {
      agent_income_reduction += 0.075; // 7.5%
    }
    
    if (agent_income_reduction > 0) {
      agent_income = agent_income * (1 - agent_income_reduction);
    }

    // Agent TAX calculation
    let agent_tax = 0;
    if (form.vat_type === 'non-vatable') {
      // Non-vatable: Agent pays 20% tax on their income
      agent_tax = agent_income * 0.20;
      // Reduce agent income by the tax amount (net income)
      agent_income = agent_income - agent_tax;
    } else if (form.vat_type === 'part-time') {
      // Part-time: Agent pays 10% tax on their income
      agent_tax = agent_income * 0.10;
      // Reduce agent income by the tax amount (net income)
      agent_income = agent_income - agent_tax;
    }
    // If vatable, no tax deduction needed (already handled by company)

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
  }, [form.rent_amount, form.landlord_discount, form.client_discount, form.has_listing_fee, form.vat_type]);

  // Auto-uncheck inform_boss if payment dates become invalid
  useEffect(() => {
    if (form.inform_boss_after_both_sides_paid && !isInformBossEnabled()) {
      setForm(prev => ({ ...prev, inform_boss_after_both_sides_paid: false }));
    }
  }, [landlordPaidDate, clientPaidDate, form.inform_boss_after_both_sides_paid]);

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
      vat_type: 'vatable',
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
        <Link href="/dashboard" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 z-10">
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
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
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
                    <tr key={revenue.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.date_rented)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.ref_no || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.client_name || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(revenue.rent_amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(revenue.landlord_fee)}
                        {revenue.landlord_discount && <span className="text-xs text-green-600 ml-1">(-15%)</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(revenue.client_fee)}
                        {revenue.client_discount && <span className="text-xs text-green-600 ml-1">(-15%)</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(revenue.listing_fee)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(revenue.agent_income)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({revenue.vat_type === 'vatable' ? "40%" : revenue.vat_type === 'part-time' ? "36%" : "32%"})
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(revenue.agent_tax)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.date_signed)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.date_move_in)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.landlord_paid_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.client_paid_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.collaboration_with || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={revenue.inform_boss_after_both_sides_paid}
                          disabled
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {form.id ? "Edit Deal" : "Add New Deal"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Ref No, Client Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ref No</label>
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
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
                        }),
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select an existing listing or type a new reference number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client Name</label>
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
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
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
                    <label className="block text-sm font-medium mb-1">Rent Amount (€) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rent_amount}
                      onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                      placeholder="Enter rent amount"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">VAT Type</label>
                    <Select
                      options={vatOptions}
                      value={vatOptions.find(opt => opt.value === form.vat_type)}
                      onChange={(option) => setForm({ ...form, vat_type: option?.value ?? 'vatable' })}
                      placeholder="Select VAT type"
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
                    <label htmlFor="landlord_discount" className="text-sm font-medium">
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
                    <label htmlFor="client_discount" className="text-sm font-medium">
                      Client 15% Discount
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_listing_fee"
                      checked={form.has_listing_fee}
                      onChange={(e) => setForm({ ...form, has_listing_fee: e.target.checked })}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="has_listing_fee" className="text-sm font-medium">
                      Listing Fee (5%)
                    </label>
                  </div>
                </div>

                {/* Calculated Fees Display */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Calculated Fees</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Landlord Fee: <span className="font-semibold">{formatCurrency(calculatedFees.landlord_fee)}</span>
                      <span className="text-green-600 ml-1">+ {formatCurrency(calculatedFees.landlord_fee_vat)} VAT (18%)</span>
                    </div>
                    <div>
                      Client Fee: <span className="font-semibold">{formatCurrency(calculatedFees.client_fee)}</span>
                      <span className="text-green-600 ml-1">+ {formatCurrency(calculatedFees.client_fee_vat)} VAT (18%)</span>
                    </div>
                    <div>Listing Fee: <span className="font-semibold">{formatCurrency(calculatedFees.listing_fee)}</span></div>
                    <div>Agent Income: <span className="font-semibold">{formatCurrency(calculatedFees.agent_income)}</span></div>
                    <div>Agent TAX: <span className="font-semibold">{formatCurrency(calculatedFees.agent_tax)}</span></div>
                  </div>
                </div>

                {/* Row 3: Date Rented, Date Signed, Date Move In */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date Rented</label>
                    <DatePicker
                      selected={dateRented}
                      onChange={(date) => setDateRented(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date Signed</label>
                    <DatePicker
                      selected={dateSigned}
                      onChange={(date) => setDateSigned(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date Move In</label>
                    <DatePicker
                      selected={dateMoveIn}
                      onChange={(date) => setDateMoveIn(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                </div>

                {/* Row 4: Payment Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Landlord Paid Date</label>
                    <DatePicker
                      selected={landlordPaidDate}
                      onChange={(date) => setLandlordPaidDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client Paid Date</label>
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
                  <label className="block text-sm font-medium mb-1">Collaboration With</label>
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
                        !isInformBossEnabled() ? 'text-gray-400' : 'text-gray-900'
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
    </div>
  );
}
