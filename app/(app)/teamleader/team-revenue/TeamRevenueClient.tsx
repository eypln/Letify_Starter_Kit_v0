"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import EditDealModal from "./EditDealModal";
import DealDocumentUpload from "@/components/revenue/DealDocumentUpload";
import { isValidRevenueDate, parseRevenueDate, REVENUE_DATE_MAX, REVENUE_DATE_MIN } from "@/lib/revenue-date-validation";
import { getRevenueRentBasis } from "@/lib/revenue-calculations";
import InvoiceInfoModal from "@/components/revenue/InvoiceInfoModal";

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
  monthly_rent_amount: string;
  landlord_discount: boolean;
  client_discount: boolean;
  has_listing_fee: boolean;
  only_listing_fee: boolean;
  vat_type: VatType;
  deal_type: DealType;
  date_rented: string;
  date_signed: string;
  date_move_in: string;
  landlord_paid_date: string;
  client_paid_date: string;
  collaboration_with: string;
  inform_boss_after_both_sides_paid: boolean;
  inform_admin_for_invoice: boolean;
  invoice_owner_name: string;
  invoice_owner_id: string;
  invoice_client_name: string;
  invoice_client_id: string;
}

const columns = [
  "#",
  "Date Rented",
  "Ref No",
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
  monthly_rent_amount: number | null;
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
  deal_type?: DealType; // Optional for backward compatibility
  vatable?: boolean; // Backward compatibility
  date_rented: string | null;
  date_signed: string | null;
  date_move_in: string | null;
  landlord_paid_date: string | null;
  client_paid_date: string | null;
  collaboration_with: string | null;
  inform_boss_after_both_sides_paid: boolean;
  inform_admin_for_invoice?: boolean;
  invoice_owner_name?: string | null;
  invoice_owner_id?: string | null;
  invoice_client_name?: string | null;
  invoice_client_id?: string | null;
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
  user_id: string;
  full_name: string;
}

interface Agent {
  user_id: string;
  full_name: string;
}

export default function RevenueClient({ user }: { user: User }) {
  const { toast } = useToast();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teamRefreshKey, setTeamRefreshKey] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceInfo, setInvoiceInfo] = useState({ ownerName: '', ownerId: '', clientName: '', clientId: '' });
  const supabase = createClient();

  const [form, setForm] = useState<RevenueForm>({
    id: undefined,
    user_id: "",
    ref_no: "",
    client_name: "",
    rent_amount: "",
    monthly_rent_amount: "",
    landlord_discount: false,
    client_discount: false,
    has_listing_fee: false,
    only_listing_fee: false,
    vat_type: 'non-vatable',
    deal_type: 'longlet',
    date_rented: "",
    date_signed: "",
    date_move_in: "",
    landlord_paid_date: "",
    client_paid_date: "",
    collaboration_with: "",
    inform_boss_after_both_sides_paid: false,
    inform_admin_for_invoice: false,
    invoice_owner_name: '', invoice_owner_id: '', invoice_client_name: '', invoice_client_id: '',
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
      
      // Listing fee is 5% of rent amount if has_listing_fee is true
      listing_fee = form.has_listing_fee ? rentAmount * 0.05 : 0;
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

    // Fetch profiles for Collaboration With dropdown (only approved agents, exclude current user)
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "agent")
      .eq("status", "approved")
      .neq("user_id", user.id)
      .order("full_name", { ascending: true });

    if (profilesError) {
      console.warn("Could not fetch profiles for collaboration dropdown");
    } else if (profilesData) {
      setProfiles(profilesData);
    }

    // Fetch agents for Assign to Agent dropdown (role = 'agent', only approved users)
    const { data: agentsData, error: agentsError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "agent")
      .eq("status", "approved")
      .order("full_name", { ascending: true });

    if (agentsError) {
      console.warn("Could not fetch agents for assign dropdown");
    } else if (agentsData) {
      setAgents(agentsData);
    }

    setLoading(false);
  }

  useEffect(() => {
    getUserAndRevenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Realtime subscription for revenue changes
  useEffect(() => {
    const channel = supabase
      .channel('team-revenue-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'revenue'
        },
        (payload) => {
          console.log('Revenue change detected:', payload);
          // Refresh the current page data
          getUserAndRevenues();
          setTeamRefreshKey(k => k + 1);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const resetForm = () => {
    setForm({
      id: undefined,
      user_id: user?.id || "",
      ref_no: "",
      client_name: "",
      rent_amount: "",
      monthly_rent_amount: "",
      landlord_discount: false,
      client_discount: false,
      has_listing_fee: false,
      only_listing_fee: false,
      vat_type: 'non-vatable',
      deal_type: 'longlet',
      date_rented: "",
      date_signed: "",
      date_move_in: "",
      landlord_paid_date: "",
      client_paid_date: "",
      collaboration_with: "",
      inform_boss_after_both_sides_paid: false,
      inform_admin_for_invoice: false,
      invoice_owner_name: '', invoice_owner_id: '', invoice_client_name: '', invoice_client_id: '',
    });
    setDateRented(null);
    setDateSigned(null);
    setDateMoveIn(null);
    setLandlordPaidDate(null);
    setClientPaidDate(null);
    setSelectedAgentId('');
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
      monthly_rent_amount: revenue.monthly_rent_amount?.toString() || "",
      landlord_discount: revenue.landlord_discount || false,
      client_discount: revenue.client_discount || false,
      has_listing_fee: revenue.has_listing_fee || false,
      only_listing_fee: revenue.only_listing_fee || false,
      vat_type: vatType,
      deal_type: revenue.deal_type || 'longlet',
      date_rented: revenue.date_rented || "",
      date_signed: revenue.date_signed || "",
      date_move_in: revenue.date_move_in || "",
      landlord_paid_date: revenue.landlord_paid_date || "",
      client_paid_date: revenue.client_paid_date || "",
      collaboration_with: revenue.collaboration_with || "",
      inform_boss_after_both_sides_paid: revenue.inform_boss_after_both_sides_paid || false,
      inform_admin_for_invoice: revenue.inform_admin_for_invoice || false,
      invoice_owner_name: revenue.invoice_owner_name || '',
      invoice_owner_id: revenue.invoice_owner_id || '',
      invoice_client_name: revenue.invoice_client_name || '',
      invoice_client_id: revenue.invoice_client_id || '',
    });
    setInvoiceInfo({ ownerName: revenue.invoice_owner_name || '', ownerId: revenue.invoice_owner_id || '', clientName: revenue.invoice_client_name || '', clientId: revenue.invoice_client_id || '' });
    
    setDateRented(parseRevenueDate(revenue.date_rented));
    setDateSigned(parseRevenueDate(revenue.date_signed));
    setDateMoveIn(parseRevenueDate(revenue.date_move_in));
    setLandlordPaidDate(parseRevenueDate(revenue.landlord_paid_date));
    setClientPaidDate(parseRevenueDate(revenue.client_paid_date));
    
    // Pre-select the agent if the deal belongs to someone else
    if (revenue.user_id !== user.id) {
      setSelectedAgentId(revenue.user_id);
    } else {
      setSelectedAgentId('');
    }
    
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.ref_no || !form.rent_amount || !dateRented || !dateSigned || !dateMoveIn) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Ref No, Rent Amount, Date Rented, Date Signed, and Date Move In",
        variant: "destructive",
      });
      return;
    }

    const selectedDates = [dateRented, dateSigned, dateMoveIn, landlordPaidDate, clientPaidDate];
    if (selectedDates.some((date) => date && !isValidRevenueDate(date.toISOString()))) {
      toast({ title: "Validation Error", description: "All dates must be between 2025 and 2050.", variant: "destructive" });
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
      inform_admin_for_invoice: form.inform_admin_for_invoice,
      invoice_owner_name: form.invoice_owner_name,
      invoice_owner_id: form.invoice_owner_id,
      invoice_client_name: form.invoice_client_name,
      invoice_client_id: form.invoice_client_id,
      // If teamleader selected an agent, pass their user_id as target
      target_user_id: selectedAgentId || undefined,
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
        setTeamRefreshKey(k => k + 1);
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
        <Link href="/teamleader" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
      </div>
      
      {/* Monthly Revenue Chart */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Monthly Team Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyRevenueChart />
        </CardContent>
      </Card>

      {/* Leadership Performance Table */}
      <LeadershipPerformanceTable />

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
                    <tr key={revenue.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
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
                        {formatCurrency(
                          getRevenueRentBasis(revenue.deal_type, revenue.rent_amount, revenue.monthly_rent_amount)
                        )}
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
                      className={`px-3 py-1 min-w-10 ${
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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
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
                      onClick={() => setForm({ ...form, deal_type: 'shortlet', has_listing_fee: false, only_listing_fee: false })}
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
                      classNamePrefix="react-select"
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
                          borderColor: form.ref_no ? '#d1d5db' : '#ef4444',
                        }),
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select an existing listing or type a new reference number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Client Name</label>
                    <Select
                      isClearable
                      classNamePrefix="react-select"
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
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                      {form.deal_type === 'shortlet' ? 'Total Owner Rent Income (€)' : 'Monthly Rent Amount (€)'} *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rent_amount}
                      onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                      placeholder={form.deal_type === 'shortlet' ? 'Enter total owner rent income' : 'Enter monthly rent amount'}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">VAT Type</label>
                    <Select
                      classNamePrefix="react-select"
                      options={vatOptions}
                      value={vatOptions.find(opt => opt.value === form.vat_type)}
                      onChange={(option) => setForm({ ...form, vat_type: option?.value ?? 'non-vatable' })}
                      placeholder="Select VAT type"
                    />
                  </div>
                </div>

                {/* Shortlet Monthly Rent Amount */}
                {form.deal_type === 'shortlet' && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                      Monthly Rent Amount (€) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.monthly_rent_amount}
                      onChange={(e) => setForm({ ...form, monthly_rent_amount: e.target.value })}
                      placeholder="Enter monthly rent amount"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Stored for reference only</p>
                  </div>
                )}

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
                      onChange={(e) => setForm({ ...form, has_listing_fee: e.target.checked, only_listing_fee: e.target.checked ? form.only_listing_fee : false })}
                      className="h-4 w-4 mr-2"
                      disabled={form.deal_type === 'shortlet'}
                    />
                    <label 
                      htmlFor="has_listing_fee" 
                      className={`text-sm font-medium ${
                        form.deal_type === 'shortlet' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      Listing Fee (5%)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="only_listing_fee"
                      checked={form.only_listing_fee}
                      onChange={(e) => setForm({ ...form, only_listing_fee: e.target.checked })}
                      disabled={!form.has_listing_fee}
                      className="h-4 w-4 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label 
                      htmlFor="only_listing_fee" 
                      className={`text-sm font-medium ${
                        !form.has_listing_fee ? 'text-gray-400 dark:text-gray-500' : 'text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      Only Listing Fee
                    </label>
                  </div>
                </div>

                {/* Calculated Fees Display */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
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
                      onChange={(date: Date | null) => setDateRented(date)}
                      dateFormat="dd/MM/yyyy"
                      minDate={REVENUE_DATE_MIN}
                      maxDate={REVENUE_DATE_MAX}
                      className={`w-full px-3 py-2 border rounded-md ${dateRented ? 'border-gray-300' : 'border-red-500'}`}
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Date Signed <span className="text-red-500">*</span></label>
                    <DatePicker
                      selected={dateSigned}
                      onChange={(date: Date | null) => setDateSigned(date)}
                      dateFormat="dd/MM/yyyy"
                      minDate={REVENUE_DATE_MIN}
                      maxDate={REVENUE_DATE_MAX}
                      className={`w-full px-3 py-2 border rounded-md ${dateSigned ? 'border-gray-300' : 'border-red-500'}`}
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Date Move In <span className="text-red-500">*</span></label>
                    <DatePicker
                      selected={dateMoveIn}
                      onChange={(date: Date | null) => setDateMoveIn(date)}
                      dateFormat="dd/MM/yyyy"
                      minDate={REVENUE_DATE_MIN}
                      maxDate={REVENUE_DATE_MAX}
                      className={`w-full px-3 py-2 border rounded-md ${dateMoveIn ? 'border-gray-300' : 'border-red-500'}`}
                      placeholderText="Select date"
                    />
                  </div>
                </div>

                {/* Row 4: Payment Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Landlord Paid Date</label>
                    <DatePicker
                      selected={landlordPaidDate}
                      onChange={(date: Date | null) => setLandlordPaidDate(date)}
                      dateFormat="dd/MM/yyyy"
                      minDate={REVENUE_DATE_MIN}
                      maxDate={REVENUE_DATE_MAX}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Client Paid Date</label>
                    <DatePicker
                      selected={clientPaidDate}
                      onChange={(date: Date | null) => setClientPaidDate(date)}
                      dateFormat="dd/MM/yyyy"
                      minDate={REVENUE_DATE_MIN}
                      maxDate={REVENUE_DATE_MAX}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholderText="Select date"
                    />
                  </div>
                </div>

                {/* Row 5: Assign to Agent */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Assign to Agent</label>
                  <Select
                    classNamePrefix="react-select"
                    value={
                      selectedAgentId
                        ? {
                            label: agents.find(a => a.user_id === selectedAgentId)?.full_name || '',
                            value: selectedAgentId,
                          }
                        : null
                    }
                    onChange={(option) => setSelectedAgentId(option ? option.value : '')}
                    options={agents.map((agent) => ({
                      label: agent.full_name,
                      value: agent.user_id,
                    }))}
                    isClearable
                    placeholder="Select agent (leave empty for yourself)"
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "42px",
                      }),
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select an agent to assign this deal to. If left empty, the deal will be assigned to you.
                  </p>
                </div>

                {/* Row 6: Collaboration */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Collaboration With</label>
                  <Select
                    classNamePrefix="react-select"
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

                <div className="flex items-center">
                  <input type="checkbox" id="inform_admin_invoice_team" checked={form.inform_admin_for_invoice} onChange={(event) => {
                    if (form.ref_no && dateRented && dateSigned && dateMoveIn) setShowInvoiceModal(event.target.checked);
                  }} disabled={!form.ref_no || !dateRented || !dateSigned || !dateMoveIn} className="mr-2 h-4 w-4 disabled:opacity-50" />
                  <label htmlFor="inform_admin_invoice_team" className="text-sm font-medium text-gray-900 dark:text-gray-100">Inform Admin for Invoice</label>
                </div>

                {/* Row 7: Deal Documents Upload */}
                <DealDocumentUpload refNo={form.ref_no} />

                {/* Form Buttons */}
                <div className="flex items-center pt-4">
                  {form.id && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={submitting}
                      className="flex items-center gap-2"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this deal? This action cannot be undone.')) return;
                        try {
                          const res = await fetch(`/api/revenue?id=${form.id}`, { method: 'DELETE' });
                          const result = await res.json();
                          if (result.success) {
                            toast({ title: 'Deal deleted successfully', variant: 'default' });
                            setShowModal(false);
                            resetForm();
                            await getUserAndRevenues(1);
                            setTeamRefreshKey(k => k + 1);
                          } else {
                            toast({ title: 'Error', description: result.error || 'Failed to delete deal', variant: 'destructive' });
                          }
                        } catch {
                          toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Deal
                    </Button>
                  )}
                  <div className="flex-1" />
                  <div className="flex gap-2">
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
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <InvoiceInfoModal
          value={invoiceInfo}
          onChange={(value) => {
            setInvoiceInfo(value);
            setForm({ ...form, inform_admin_for_invoice: true, invoice_owner_name: value.ownerName, invoice_owner_id: value.ownerId, invoice_client_name: value.clientName, invoice_client_id: value.clientId });
          }}
          onSend={() => {
            setForm({ ...form, inform_admin_for_invoice: true, invoice_owner_name: invoiceInfo.ownerName, invoice_owner_id: invoiceInfo.ownerId, invoice_client_name: invoiceInfo.clientName, invoice_client_id: invoiceInfo.clientId });
            setShowInvoiceModal(false);
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Team Revenue Records */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Revenue Records</CardTitle>
            <div className="text-right">
              <TeamTotalDealCount refreshKey={teamRefreshKey} />
              <div className="text-[10px] text-gray-400 mt-0.5 text-right">from September 2025</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TeamRevenueTable refreshKey={teamRefreshKey} onRefresh={() => setTeamRefreshKey(k => k + 1)} />
        </CardContent>
      </Card>
    </div>
  );
}

// Total Deal Count Component (counts unique DB records, not double-counting collab)
function TeamTotalDealCount({ refreshKey = 0 }: { refreshKey?: number }) {
  const [teamCount, setTeamCount] = useState<number>(0);
  const [listingCount, setListingCount] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCount() {
      const [teamRes, listingRes] = await Promise.all([
        supabase.from("revenue").select("id", { count: "exact", head: true }).eq("only_listing_fee", false),
        supabase.from("revenue").select("id", { count: "exact", head: true }).eq("only_listing_fee", true),
      ]);
      if (!teamRes.error && teamRes.count !== null) setTeamCount(teamRes.count);
      if (!listingRes.error && listingRes.count !== null) setListingCount(listingRes.count);
    }
    fetchCount();
  }, [supabase, refreshKey]);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-sm font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full">
        Total Team Deals: {teamCount}
      </span>
      <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-0.5 rounded-full">
        Listing Fee Deals: {listingCount}
      </span>
    </div>
  );
}

// Team Revenue Table Component
function TeamRevenueTable({ refreshKey = 0, onRefresh }: { refreshKey?: number; onRefresh?: () => void }) {
  const [teamRevenues, setTeamRevenues] = useState<(Revenue & { agent_name: string })[]>([]);
  const [allRevenues, setAllRevenues] = useState<(Revenue & { agent_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [filterAgentName, setFilterAgentName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterRefNo, setFilterRefNo] = useState('');
  const supabase = createClient();

  const pageSize = 20;

  const teamColumns = [
    "#",
    "Actions",
    "Agent Name",
    "Date Rented",
    "Ref No",
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
  ];
  
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);

  useEffect(() => {
    async function fetchTeamRevenues() {
      setLoading(true);
      
      // Fetch ALL revenue records from ALL agents (no pagination here, we'll paginate after filtering)
      const { data: revenueData, error: revenueError } = await supabase
        .from("revenue")
        .select("*")
        .order("created_at", { ascending: false });

      if (!revenueError && revenueData) {
        // Get unique user IDs from revenues
        const userIds = [...new Set(revenueData.map(r => r.user_id))];
        
        // Fetch profile names for these users (silently handle errors)
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, role")
          .in("user_id", userIds);
        
        // Suppress profile fetch errors - we'll show "Unknown Agent" for missing profiles
        if (profilesError) {
          console.warn("Could not fetch some profile names, using fallback");
        }
        
        // Create a map of user_id to full_name
        const profileMap = new Map(
          profilesData?.map(p => [p.user_id, p.full_name]) || []
        );
        const roleMap = new Map(
          profilesData?.map(p => [p.user_id, p.role]) || []
        );
        
        // Map revenues with agent names
        const mappedData = revenueData.map((revenue: any) => ({
          ...revenue,
          agent_name: profileMap.get(revenue.user_id) || 'Unknown Agent',
          agent_role: roleMap.get(revenue.user_id) || 'agent',
        }));
        
        setAllRevenues(mappedData);
      } else if (revenueError) {
        console.error("Error fetching team revenues:", revenueError);
      }
      
      setLoading(false);
    }

    fetchTeamRevenues();
  }, [supabase, refreshKey]);

  // Client-side filtering and pagination
  useEffect(() => {
    let filtered = [...allRevenues];

    // Filter by agent name (includes deals where agent is the owner OR collaboration partner)
    if (filterAgentName) {
      filtered = filtered.filter(r => 
        r.agent_name.toLowerCase().includes(filterAgentName.toLowerCase()) ||
        (r.collaboration_with && r.collaboration_with.toLowerCase().includes(filterAgentName.toLowerCase()))
      );
    }

    // Filter by month
    if (filterMonth) {
      filtered = filtered.filter(r => {
        if (!r.date_rented) return false;
        const date = new Date(r.date_rented);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return yearMonth === filterMonth;
      });
    }

    // Filter by ref no
    if (filterRefNo) {
      filtered = filtered.filter(r =>
        r.ref_no?.toString().includes(filterRefNo)
      );
    }

    // Update page count
    setPageCount(Math.ceil(filtered.length / pageSize));
    
    // Reset to page 1 if current page is out of bounds
    if (page > Math.ceil(filtered.length / pageSize)) {
      setPage(1);
    }

    // Paginate filtered results
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    setTeamRevenues(filtered.slice(startIdx, endIdx));
  }, [allRevenues, filterAgentName, filterMonth, filterRefNo, page]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `€${amount.toFixed(2)}`;
  };

  // Generate month options — only months that have at least one revenue record
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthOptions = Array.from(
    new Set(
      allRevenues
        .filter(r => r.date_rented)
        .map(r => {
          const d = new Date(r.date_rented!);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        })
    )
  )
    .sort()
    .reverse()
    .map(value => {
      const [year, month] = value.split('-');
      return { value, label: `${monthNames[parseInt(month) - 1]} ${year}` };
    });

  // Get unique agent names for dropdown (includes collaboration partners)
  const uniqueAgentNames = [...new Set([
    ...allRevenues.map(r => r.agent_name),
    ...allRevenues
      .filter(r => r.collaboration_with && r.collaboration_with.trim() !== '')
      .map(r => r.collaboration_with!.trim())
  ])].sort();

  return (
    <>
      {/* Filter Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agent Name Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Agent Name
          </label>
          <select
            value={filterAgentName}
            onChange={(e) => {
              setFilterAgentName(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Agents</option>
            {uniqueAgentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Month
          </label>
          <select
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Months</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ref No Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search by Ref No
          </label>
          <input
            type="text"
            value={filterRefNo}
            onChange={(e) => {
              setFilterRefNo(e.target.value);
              setPage(1);
            }}
            placeholder="Enter ref no..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              {teamColumns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={teamColumns.length} className="px-4 py-8 text-center text-gray-500">
                  Loading team revenue records...
                </td>
              </tr>
            ) : teamRevenues.length === 0 ? (
              <tr>
                <td colSpan={teamColumns.length} className="px-4 py-8 text-center text-gray-500">
                  No team revenue records found.
                </td>
              </tr>
            ) : (
              teamRevenues.map((revenue, idx: number) => (
                <tr key={revenue.id} className="hover:bg-blue-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setEditingRevenue(revenue)}
                      className="text-purple-600 hover:text-purple-900 font-medium flex items-center gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {revenue.agent_name}
                    {(revenue as any).agent_role === 'intern' && (
                      <span className="ml-1 text-xs text-orange-600 font-medium">(Intern)</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(revenue.date_rented)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {revenue.ref_no || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(
                      getRevenueRentBasis(revenue.deal_type, revenue.rent_amount, revenue.monthly_rent_amount)
                    )}
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
                  .select("user_id, full_name, role")
                  .in("user_id", userIds);
                
                const profileMap = new Map(
                  profilesData?.map(p => [p.user_id, p.full_name]) || []
                );
                const roleMap = new Map(
                  profilesData?.map(p => [p.user_id, p.role]) || []
                );
                
                const mappedData = revenueData.map((revenue: any) => ({
                  ...revenue,
                  agent_name: profileMap.get(revenue.user_id) || 'Unknown Agent',
                  agent_role: roleMap.get(revenue.user_id) || 'agent',
                }));
                
                setAllRevenues(mappedData);
              }
            }
            refreshData();
            if (onRefresh) onRefresh();
          }}
        />
      )}

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
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              const pageNum = page <= 3 ? i + 1 : page + i - 2;
              if (pageNum > pageCount) return null;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 min-w-10 ${
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
    </>
  );
}

// Monthly Revenue Chart Component
// ─── Leadership Performance Table ──────────────────────────────────────────

interface AgentStat {
  user_id: string;
  full_name: string;
  dealCount: number;
  completedCount: number;
  pendingCount: number;
  totalRent: number;
  totalAgentIncome: number;
  collabCount: number;
}

const AGENT_PALETTE = [
  { bg: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", bar: "#8b5cf6" },
  { bg: "bg-pink-500",   light: "bg-pink-100 dark:bg-pink-900/40",   text: "text-pink-700 dark:text-pink-300",   bar: "#ec4899" },
  { bg: "bg-cyan-500",   light: "bg-cyan-100 dark:bg-cyan-900/40",   text: "text-cyan-700 dark:text-cyan-300",   bar: "#06b6d4" },
  { bg: "bg-emerald-500",light: "bg-emerald-100 dark:bg-emerald-900/40",text:"text-emerald-700 dark:text-emerald-300",bar:"#10b981"},
  { bg: "bg-amber-500",  light: "bg-amber-100 dark:bg-amber-900/40",  text: "text-amber-700 dark:text-amber-300",  bar: "#f59e0b" },
  { bg: "bg-indigo-500", light: "bg-indigo-100 dark:bg-indigo-900/40",text: "text-indigo-700 dark:text-indigo-300",bar: "#6366f1" },
  { bg: "bg-rose-500",   light: "bg-rose-100 dark:bg-rose-900/40",   text: "text-rose-700 dark:text-rose-300",   bar: "#f43f5e" },
  { bg: "bg-teal-500",   light: "bg-teal-100 dark:bg-teal-900/40",   text: "text-teal-700 dark:text-teal-300",   bar: "#14b8a6" },
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function leaderboardMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${names[parseInt(month) - 1]} ${year}`;
}

function LeadershipPerformanceTable() {
  const supabase = createClient();
  const [allData, setAllData] = useState<{ revenue: any[]; agents: Map<string, string>; nameToId: Map<string, string> }>({ revenue: [], agents: new Map(), nameToId: new Map() });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: revenueData }, { data: profilesData }] = await Promise.all([
        supabase.from("revenue").select("user_id, rent_amount, monthly_rent_amount, deal_type, agent_income, landlord_paid_date, client_paid_date, date_rented, only_listing_fee, collaboration_with"),
        supabase.from("profiles").select("user_id, full_name").in("role", ["agent", "teamleader"]),
      ]);
      if (!revenueData || !profilesData) { setLoading(false); return; }
      const agentMap = new Map<string, string>();
      profilesData.forEach((p: any) => agentMap.set(p.user_id, p.full_name));
      setAllData({ revenue: revenueData, agents: agentMap, nameToId: new Map(profilesData.map((p: any) => [p.full_name.trim().toLowerCase(), p.user_id])) });
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  // Derive available months from data
  const availableMonths = (() => {
    const seen = new Set<string>();
    allData.revenue.forEach((r: any) => {
      if (r.date_rented) {
        const d = new Date(r.date_rented);
        seen.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(seen).sort().reverse();
  })();

  // Build stats filtered by month
  const stats: AgentStat[] = (() => {
    const map = new Map<string, AgentStat>();
    allData.revenue.forEach((r: any) => {
      const name = allData.agents.get(r.user_id);
      if (!name) return;

      if (selectedMonth !== "all" && r.date_rented) {
        const d = new Date(r.date_rented);
        const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        if (m !== selectedMonth) return;
      }

      if (!map.has(r.user_id)) {
        map.set(r.user_id, { user_id: r.user_id, full_name: name, dealCount: 0, completedCount: 0, pendingCount: 0, totalRent: 0, totalAgentIncome: 0, collabCount: 0 });
      }
      const stat = map.get(r.user_id)!;
      const isOnlyListingFee = r.only_listing_fee || false;
      const isCompleted = !!r.landlord_paid_date && !!r.client_paid_date;
      if (!isOnlyListingFee) {
        stat.dealCount += 1;
        if (isCompleted) stat.completedCount += 1; else stat.pendingCount += 1;
      }
      const baseRent = getRevenueRentBasis(r.deal_type, r.rent_amount, r.monthly_rent_amount);
      const collabName = r.collaboration_with?.trim() || "";
      const hasCollab = collabName !== "";
      const isCollabExternal = hasCollab && (collabName.toLowerCase() === "agent" || collabName.toLowerCase() === "unknown agent" || collabName.toLowerCase().startsWith("agent ("));
      const effectiveRent = isOnlyListingFee ? 0 : hasCollab ? baseRent / 2 : baseRent;
      stat.totalRent += effectiveRent;
      stat.totalAgentIncome += r.agent_income ? parseFloat(r.agent_income) : 0;

      // If this deal has any collab (internal or external), owner's collabCount++
      if (hasCollab && !isOnlyListingFee) {
        stat.collabCount += 1;
      }

      // If internal collab partner: add a virtual entry for them
      if (hasCollab && !isCollabExternal && !isOnlyListingFee) {
        const collabUserId = allData.nameToId.get(collabName.toLowerCase());
        if (collabUserId && allData.agents.has(collabUserId)) {
          const collabFullName = allData.agents.get(collabUserId)!;
          if (!map.has(collabUserId)) {
            map.set(collabUserId, { user_id: collabUserId, full_name: collabFullName, dealCount: 0, completedCount: 0, pendingCount: 0, totalRent: 0, totalAgentIncome: 0, collabCount: 0 });
          }
          const collabStat = map.get(collabUserId)!;
          collabStat.dealCount += 1;
          if (isCompleted) collabStat.completedCount += 1; else collabStat.pendingCount += 1;
          collabStat.totalRent += baseRent / 2;
          // Partner was added as collab — their collabCount++ too
          collabStat.collabCount += 1;
        }
      }
    });
    const isExternalAgentName = (name: string) =>
      name.toLowerCase() === "agent" || name.toLowerCase() === "unknown agent" || name.toLowerCase().startsWith("agent (");
    return Array.from(map.values())
      .filter((s) => !isExternalAgentName(s.full_name))
      .sort((a, b) => b.totalRent - a.totalRent);
  })();

  const maxRent = stats[0]?.totalRent || 1;
  const totalRentAll = stats.reduce((s, a) => s + a.totalRent, 0);

  // Footer totals: count unique revenue records (no double-counting for collab)
  const footerTotals = (() => {
    let deals = 0, completed = 0, pending = 0, collab = 0;
    allData.revenue.forEach((r: any) => {
      const name = allData.agents.get(r.user_id);
      if (!name) return;
      // Use local time to match what Team Revenue Records table shows
      if (selectedMonth !== "all" && r.date_rented) {
        const d = new Date(r.date_rented);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (m !== selectedMonth) return;
      }
      if (r.only_listing_fee) return;
      deals += 1;
      if (!!r.landlord_paid_date && !!r.client_paid_date) completed += 1; else pending += 1;
      if (r.collaboration_with?.trim()) collab += 1;
    });
    return { deals, completed, pending, collab };
  })();

  const rankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-2xl leading-none">🥇</span>;
    if (rank === 2) return <span className="text-2xl leading-none">🥈</span>;
    if (rank === 3) return <span className="text-2xl leading-none">🥉</span>;
    return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
  };

  return (
    <Card className="mt-6 overflow-hidden border-0 shadow-lg">
      {/* Gradient header bar */}
      <div className="h-1.5 w-full bg-linear-to-r from-purple-500 via-pink-500 to-cyan-400" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
        <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
          🏅 Agent Leadership
        </CardTitle>
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter by month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          >
            <option value="all">All Time</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{leaderboardMonthLabel(m)}</option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : stats.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No agent data for this period.</div>
        ) : (
          <div className="space-y-3">
            {stats.map((agent, idx) => {
              const palette = AGENT_PALETTE[idx % AGENT_PALETTE.length];
              const barPct = Math.round((agent.totalRent / maxRent) * 100);
              const sharePct = totalRentAll > 0 ? Math.round((agent.totalRent / totalRentAll) * 100) : 0;
              return (
                <div
                  key={agent.user_id}
                  className="relative flex items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Rank */}
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    {rankBadge(idx + 1)}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full ${palette.bg} shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                    {initials(agent.full_name)}
                  </div>

                  {/* Agent name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{agent.full_name}</span>
                      <span className={`text-sm font-bold ${palette.text} ml-2 whitespace-nowrap`}>
                        €{agent.totalRent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, backgroundColor: palette.bar }}
                      />
                    </div>
                    {/* Sub stats */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">{agent.dealCount} deals</span>
                      {agent.collabCount > 0 && (
                        <span className="text-xs text-gray-400">{agent.collabCount} collab</span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        {agent.completedCount} completed
                      </span>
                      {agent.pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                          {agent.pendingCount} pending
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{sharePct}% of total</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary footer */}
            <div className="mt-4 rounded-xl bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-100 dark:border-purple-900/40 px-5 py-3 flex flex-wrap gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Deals</div>
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{footerTotals.deals}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Collab</div>
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{footerTotals.collab}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Completed</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{footerTotals.completed}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Pending</div>
                <div className="text-lg font-bold text-amber-500">{footerTotals.pending}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Rent</div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  €{totalRentAll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyRevenueChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMonthlyData() {
      setLoading(true);

      const { data: revenueData, error } = await supabase
        .from("revenue")
        .select("date_rented, rent_amount, monthly_rent_amount, deal_type, only_listing_fee, collaboration_with, user_id")
        .order("date_rented", { ascending: true });

      const EXTERNAL_AGENT_UUID = "62ab03a6-3c64-491d-bfa4-313c7ba57988";

      const isExternalCollabName = (name: string) =>
        name.toLowerCase() === "agent" ||
        name.toLowerCase() === "unknown agent" ||
        name.toLowerCase().startsWith("agent (");

      if (!error && revenueData) {
        const monthlyRentMap = new Map<string, number>();
        const monthlyDealMap = new Map<string, number>();

        revenueData.forEach((revenue: any) => {
          if (!revenue.date_rented) return;
          if (revenue.user_id === EXTERNAL_AGENT_UUID) return;

          const isOnlyListingFee = revenue.only_listing_fee || false;
          const date = new Date(revenue.date_rented);
          // Rent: UTC bucketing (matches Leadership table)
          const monthKeyUTC = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
          // Deal count: local time bucketing (matches Records table)
          const monthKeyLocal = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!isOnlyListingFee) {
            const baseRent = getRevenueRentBasis(revenue.deal_type, revenue.rent_amount, revenue.monthly_rent_amount);
            const collabName = revenue.collaboration_with?.trim() || "";
            const hasExternalCollab = collabName !== "" && isExternalCollabName(collabName);
            const effectiveRent = hasExternalCollab ? baseRent / 2 : baseRent;
            monthlyRentMap.set(monthKeyUTC, (monthlyRentMap.get(monthKeyUTC) || 0) + effectiveRent);
            monthlyDealMap.set(monthKeyLocal, (monthlyDealMap.get(monthKeyLocal) || 0) + 1);
          }
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // Merge all months from both maps
        const allMonths = new Set([...monthlyRentMap.keys(), ...monthlyDealMap.keys()]);
        const TARGET_GOAL = 15000;

        const formattedData = Array.from(allMonths)
          .map((monthKey) => {
            const [year, month] = monthKey.split('-');
            const monthIndex = parseInt(month) - 1;
            const rentAmount = Math.round((monthlyRentMap.get(monthKey) || 0) * 100) / 100;
            const remaining = Math.max(0, TARGET_GOAL - rentAmount);
            return {
              month: `${monthNames[monthIndex]} ${year}`,
              rentAmount,
              remaining,
              dealCount: monthlyDealMap.get(monthKey) || 0,
              sortKey: monthKey,
            };
          })
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
          .map(({ month, rentAmount, remaining, dealCount }) => ({ month, rentAmount, remaining, dealCount }));

        setChartData(formattedData);
      }

      setLoading(false);
    }

    fetchMonthlyData();
  }, [supabase]);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const achieved = payload.find((p: any) => p.dataKey === "rentAmount");
    const remaining = payload.find((p: any) => p.dataKey === "remaining");
    const dealCount = payload[0]?.payload?.dealCount;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl p-4 text-sm min-w-45">
        <div className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-base">{label}</div>
        {achieved && (
          <div className="flex items-center justify-between gap-4 mb-1.5">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
              Achieved
            </span>
            <span className="font-bold text-violet-600 dark:text-violet-400">€{achieved.value.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {remaining && remaining.value > 0 && (
          <div className="flex items-center justify-between gap-4 mb-1.5">
            <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-200 inline-block" />
              To €15k
            </span>
            <span className="font-semibold text-gray-400 dark:text-gray-500">€{remaining.value.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {dealCount != null && (
          <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Deals
            </span>
            <span className="font-bold text-amber-500">{dealCount}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-105 flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-sm">Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-105 flex items-center justify-center text-gray-400 text-sm">
        No revenue data available for chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={chartData} margin={{ top: 24, right: 48, left: 8, bottom: 64 }}>
        <defs>
          <linearGradient id="achievedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="remainingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ede9fe" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ddd6fe" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f5" vertical={false} />
        <XAxis
          dataKey="month"
          angle={-35}
          textAnchor="end"
          height={72}
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="rent"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
          width={52}
        />
        <YAxis
          yAxisId="deals"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#f59e0b' }}
          axisLine={false}
          tickLine={false}
          width={32}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.4)]}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.04)' }} />
        <Legend
          wrapperStyle={{ paddingTop: '16px', fontSize: '13px', color: '#6b7280' }}
          iconType="circle"
          iconSize={10}
        />
        <Bar
          yAxisId="rent"
          dataKey="rentAmount"
          stackId="stack"
          fill="url(#achievedGradient)"
          name="Achieved"
          maxBarSize={52}
        />
        <Bar
          yAxisId="rent"
          dataKey="remaining"
          stackId="stack"
          fill="url(#remainingGradient)"
          name="Remaining to Goal"
          radius={[6, 6, 0, 0]}
          maxBarSize={52}
        />
        <Line
          yAxisId="deals"
          type="monotone"
          dataKey="dealCount"
          stroke="#f59e0b"
          strokeWidth={2.5}
          name="Deals"
          dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#ffffff' }}
          activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
