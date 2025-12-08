"use client";

import { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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

interface EditDealModalProps {
  revenue: Revenue;
  onClose: () => void;
  onSuccess: () => void;
}

const vatOptions = [
  { label: "Vatable (40%)", value: 'vatable' as VatType },
  { label: "Non-Vatable (32%)", value: 'non-vatable' as VatType },
  { label: "Part Time (36%)", value: 'part-time' as VatType },
];

export default function EditDealModal({ revenue, onClose, onSuccess }: EditDealModalProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Initialize form with revenue data
  const [form, setForm] = useState<RevenueForm>(() => {
    let vatType: VatType = 'vatable';
    if (revenue.vat_type) {
      vatType = revenue.vat_type;
    } else if (revenue.vatable !== undefined) {
      vatType = revenue.vatable ? 'vatable' : 'non-vatable';
    }
    
    return {
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
    };
  });

  // Date state
  const [dateRented, setDateRented] = useState<Date | null>(revenue.date_rented ? new Date(revenue.date_rented) : null);
  const [dateSigned, setDateSigned] = useState<Date | null>(revenue.date_signed ? new Date(revenue.date_signed) : null);
  const [dateMoveIn, setDateMoveIn] = useState<Date | null>(revenue.date_move_in ? new Date(revenue.date_move_in) : null);
  const [landlordPaidDate, setLandlordPaidDate] = useState<Date | null>(revenue.landlord_paid_date ? new Date(revenue.landlord_paid_date) : null);
  const [clientPaidDate, setClientPaidDate] = useState<Date | null>(revenue.client_paid_date ? new Date(revenue.client_paid_date) : null);

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
    if (!landlordPaidDate || !clientPaidDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const landlordDate = new Date(landlordPaidDate);
    landlordDate.setHours(0, 0, 0, 0);

    const clientDate = new Date(clientPaidDate);
    clientDate.setHours(0, 0, 0, 0);

    return landlordDate <= today && clientDate <= today;
  }, [landlordPaidDate, clientPaidDate]);

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
      landlord_fee: Math.round(landlord_fee * 100) / 100,
      landlord_fee_vat: Math.round(landlord_fee_vat * 100) / 100,
      landlord_fee_total: Math.round(landlord_fee_total * 100) / 100,
      client_fee: Math.round(client_fee * 100) / 100,
      client_fee_vat: Math.round(client_fee_vat * 100) / 100,
      client_fee_total: Math.round(client_fee_total * 100) / 100,
      listing_fee: Math.round(listing_fee * 100) / 100,
      agent_income: Math.round(agent_income * 100) / 100,
      agent_tax: Math.round(agent_tax * 100) / 100,
    });
  }, [form.rent_amount, form.landlord_discount, form.client_discount, form.has_listing_fee, form.vat_type]);

  // Fetch listings, clients, and profiles
  useEffect(() => {
    async function fetchData() {
      // Fetch listings for the specific agent
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, title")
        .eq("user_id", revenue.user_id);
      if (listingsData) setListings(listingsData);

      // Fetch clients for the specific agent
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", revenue.user_id);
      if (clientsData) setClients(clientsData);

      // Fetch all profiles for collaboration
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .neq("user_id", revenue.user_id);
      if (profilesData) {
        setProfiles(profilesData.map(p => ({ id: p.user_id, full_name: p.full_name })));
      }
    }

    fetchData();
  }, [revenue.user_id, supabase]);

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
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
    };

    try {
      const response = await fetch('/api/revenue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update deal');
      }

      toast({
        title: "Success",
        description: "Deal updated successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update deal",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Edit Deal</h2>
          
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
                <div>Agent Gross Income: <span className="font-semibold">{formatCurrency(calculatedFees.agent_income + calculatedFees.agent_tax)}</span></div>
                <div>Agent TAX: <span className="font-semibold">{formatCurrency(calculatedFees.agent_tax)}</span></div>
                <div>Agent Net Income: <span className="font-semibold">{formatCurrency(calculatedFees.agent_income)}</span></div>
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
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Update"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
