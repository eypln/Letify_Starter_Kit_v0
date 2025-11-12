"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import CreatableSelect from 'react-select/creatable';

// Viewing form interface
interface ViewingForm {
  id?: number | null;
  user_id: string;
  ref_no: string;
  city: string;
  viewing_date: string;
  viewing_time: string;
  client_name: string;
  client_mobile_no: string;
  result: string;
  comments: string;
  inform_teamleader: boolean;
}

const columns = [
  "#",
  "Created Date",
  "Ref No",
  "City",
  "Viewing Date",
  "Viewing Time",
  "Client Name",
  "Client Mobile No",
  "Result",
  "Comments",
  "Inform Teamleader",
];

const pageSize = 30;

const resultOptions = [
  { label: "DEAL", value: "DEAL" },
  { label: "NO DEAL", value: "NO DEAL" },
  { label: "Negotiating", value: "Negotiating" },
  { label: "Scheduled", value: "Scheduled" },
];

// Generate time options (07:00 to 21:00 in 15-minute intervals)
const timeOptions: { label: string; value: string }[] = [];
for (let hour = 7; hour <= 21; hour++) {
  for (let minute of [0, 15, 30, 45]) {
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    const timeValue = `${hourStr}:${minuteStr}`;
    timeOptions.push({ label: timeValue, value: timeValue });
  }
}

export default function ViewingsPage() {
  const { toast } = useToast();
  const [viewings, setViewings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0); // For calendar slider
  const supabase = createClient();

  // Autocomplete suggestions
  const [listingsSuggestions, setListingsSuggestions] = useState<any[]>([]);
  const [clientsSuggestions, setClientsSuggestions] = useState<any[]>([]);

  const [form, setForm] = useState<ViewingForm>({
    id: undefined,
    user_id: "",
    ref_no: "",
    city: "",
    viewing_date: "",
    viewing_time: "",
    client_name: "",
    client_mobile_no: "",
    result: "",
    comments: "",
    inform_teamleader: false,
  });

  const [viewingDate, setViewingDate] = useState<Date | null>(null);

  // Fetch suggestions for autocomplete
  async function fetchSuggestions() {
    // Fetch listings suggestions
    const listingsRes = await fetch('/api/viewings/listings-suggestions');
    const listingsData = await listingsRes.json();
    if (listingsData.success) {
      setListingsSuggestions(listingsData.data);
    }

    // Fetch clients suggestions
    const clientsRes = await fetch('/api/viewings/clients-suggestions');
    const clientsData = await clientsRes.json();
    if (clientsData.success) {
      setClientsSuggestions(clientsData.data);
    }
  }

  async function getUserAndViewings(currentPage = page) {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || null;
    setUser(currentUser);
    
    if (currentUser?.id) {
      const { data, error, count } = await supabase
        .from("viewings")
        .select("*", { count: "exact" })
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      
      if (!error && data) {
        setViewings(data);
        setPageCount(Math.ceil((count ?? 0) / pageSize));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    getUserAndViewings();
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleViewingDateChange = (date: Date | null) => {
    setViewingDate(date);
    setForm({ ...form, viewing_date: date ? date.toISOString().split('T')[0] : "" });
  };

  const handleAddViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);
    
    let error;
    const method = form.id ? 'PUT' : 'POST';
    const payload = form.id ? form : { ...form, user_id: user.id };
    
    console.log('Submitting payload:', payload);
    console.log('Viewing time in payload:', payload.viewing_time);
    
    const response = await fetch('/api/viewings', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    error = result.success ? null : { message: result.error };
    
    setSubmitting(false);
    
    if (!error) {
      toast({
        title: 'Success',
        description: form.id ? 'Viewing updated successfully' : 'Viewing added successfully',
      });
      
      setShowModal(false);
      setForm({
        id: undefined,
        user_id: user.id,
        ref_no: "",
        city: "",
        viewing_date: "",
        viewing_time: "",
        client_name: "",
        client_mobile_no: "",
        result: "",
        comments: "",
        inform_teamleader: false,
      });
      setViewingDate(null);
      await getUserAndViewings(1);
      setPage(1);
    } else {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Generate calendar months with slider (previous, current, next)
  const generateMonthsCalendar = () => {
    const today = new Date();
    const months = [];
    
    // Generate 3 months: previous, current (main), next
    for (let i = -1; i <= 1; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset + i, 1);
      const isMainMonth = i === 0; // Middle month is the main one
      months.push(generateMonthCalendar(monthDate, isMainMonth));
    }
    
    return months;
  };

  const generateMonthCalendar = (monthDate: Date, isMainMonth: boolean = false) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={`border border-gray-200 ${isMainMonth ? 'h-24' : 'h-12'}`}></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayViewings = viewings.filter((v: any) => v.viewing_date === dateStr);
      
      const isToday = 
        day === new Date().getDate() && 
        month === new Date().getMonth() && 
        year === new Date().getFullYear();
      
      days.push(
        <div 
          key={day} 
          className={`border border-gray-200 p-1 overflow-y-auto ${isMainMonth ? 'h-24' : 'h-12'} ${isToday ? 'bg-purple-50 border-purple-400' : ''}`}
        >
          <div className={`font-semibold text-gray-600 mb-1 ${isMainMonth ? 'text-xs' : 'text-[10px]'}`}>{day}</div>
          {isMainMonth && dayViewings.map((viewing: any) => (
            <div
              key={viewing.id}
              className={`text-xs p-1 mb-1 rounded cursor-pointer ${
                viewing.result === 'DEAL' ? 'bg-green-100 text-green-800' :
                viewing.result === 'NO DEAL' ? 'bg-red-100 text-red-800' :
                viewing.result === 'Negotiating' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}
              onClick={() => {
                console.log('Viewing data:', viewing);
                console.log('Viewing time:', viewing.viewing_time);
                setForm({
                  id: viewing.id,
                  user_id: viewing.user_id,
                  ref_no: viewing.ref_no || "",
                  city: viewing.city || "",
                  viewing_date: viewing.viewing_date || "",
                  viewing_time: viewing.viewing_time || "",
                  client_name: viewing.client_name || "",
                  client_mobile_no: viewing.client_mobile_no || "",
                  result: viewing.result || "",
                  comments: viewing.comments || "",
                  inform_teamleader: viewing.inform_teamleader || false,
                });
                setViewingDate(viewing.viewing_date ? new Date(viewing.viewing_date) : null);
                setShowModal(true);
              }}
            >
              <div className="font-bold">#{viewing.id}</div>
              <div>{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</div>
              <div className="truncate">{viewing.ref_no}</div>
            </div>
          ))}
          {!isMainMonth && dayViewings.length > 0 && (
            <div className="text-[10px] text-center text-purple-600 font-semibold">
              {dayViewings.length}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div key={monthName} className={`${isMainMonth ? 'min-w-[600px]' : 'min-w-[250px] opacity-50'} flex-shrink-0 transition-all`}>
        <h3 className={`font-bold text-center mb-2 ${isMainMonth ? 'text-xl' : 'text-sm'}`}>{monthName}</h3>
        <div className="grid grid-cols-7 gap-0 border border-gray-300">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`text-center font-semibold p-1 bg-gray-100 border border-gray-200 ${isMainMonth ? 'text-xs' : 'text-[10px]'}`}>
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold mb-2">Loading...</h2>
        <p className="text-muted-foreground">User info is loading.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
      <div className="relative mt-8">
        <Link href="/dashboard" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Viewing Records</CardTitle>
            <Button 
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2" 
              onClick={() => {
                setForm({
                  id: undefined,
                  user_id: user.id,
                  ref_no: "",
                  city: "",
                  viewing_date: "",
                  viewing_time: "",
                  client_name: "",
                  client_mobile_no: "",
                  result: "",
                  comments: "",
                  inform_teamleader: false,
                });
                setViewingDate(null);
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {/* Modal for Add/Edit Viewing */}
            {showModal && (
              <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center overflow-y-auto">
                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg my-8">
                  <h3 className="text-xl font-bold mb-4">{form.id ? "Edit Viewing" : "Add New Viewing"}</h3>
                  <form onSubmit={handleAddViewing} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ref No</label>
                      <CreatableSelect
                        options={listingsSuggestions}
                        value={
                          listingsSuggestions.find((opt) => opt.value === form.ref_no) ||
                          (form.ref_no ? { label: form.ref_no, value: form.ref_no } : null)
                        }
                        onChange={(option) => {
                          if (option) {
                            setForm({ 
                              ...form, 
                              ref_no: option.value,
                              city: option.city || form.city // Auto-fill city if available
                            });
                          } else {
                            setForm({ ...form, ref_no: "" });
                          }
                        }}
                        placeholder="Select or enter Ref No"
                        isClearable
                        classNamePrefix="react-select"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">City</label>
                      <Input 
                        name="city" 
                        value={form.city} 
                        onChange={handleInputChange} 
                        placeholder="City" 
                        required 
                        onInvalid={(e) => {
                          e.preventDefault();
                          (e.target as HTMLInputElement).setCustomValidity('Please fill in this field');
                        }}
                        onInput={(e) => {
                          (e.target as HTMLInputElement).setCustomValidity('');
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Viewing Date</label>
                      <DatePicker
                        selected={viewingDate}
                        onChange={handleViewingDateChange}
                        dateFormat="dd.MM.yyyy"
                        todayButton="Today"
                        isClearable
                        placeholderText="Select viewing date"
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Viewing Time</label>
                      <Select
                        options={timeOptions}
                        value={timeOptions.find((opt) => opt.value === form.viewing_time?.substring(0, 5)) || null}
                        onChange={(option) => setForm({ ...form, viewing_time: option ? option.value : "" })}
                        placeholder="Select viewing time"
                        isClearable
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: form.viewing_time ? base.borderColor : '#e5e7eb',
                          }),
                        }}
                      />
                      <input
                        type="text"
                        value={form.viewing_time}
                        required
                        style={{ opacity: 0, height: 0, position: 'absolute' }}
                        onInvalid={(e) => {
                          e.preventDefault();
                          (e.target as HTMLInputElement).setCustomValidity('Please select a viewing time.');
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Client Name</label>
                      <CreatableSelect
                        options={clientsSuggestions}
                        value={
                          clientsSuggestions.find((opt) => opt.label === form.client_name) ||
                          (form.client_name ? { label: form.client_name, value: form.client_name } : null)
                        }
                        onChange={(option) => {
                          if (option) {
                            setForm({ 
                              ...form, 
                              client_name: option.label,
                              client_mobile_no: option.phone || form.client_mobile_no // Auto-fill phone if available
                            });
                          } else {
                            setForm({ ...form, client_name: "" });
                          }
                        }}
                        placeholder="Select or enter Client Name"
                        isClearable
                        classNamePrefix="react-select"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Client Mobile No</label>
                      <Input 
                        name="client_mobile_no" 
                        value={form.client_mobile_no} 
                        onChange={handleInputChange} 
                        placeholder="Client Mobile No" 
                        required 
                        onInvalid={(e) => {
                          e.preventDefault();
                          (e.target as HTMLInputElement).setCustomValidity('Please fill in this field');
                        }}
                        onInput={(e) => {
                          (e.target as HTMLInputElement).setCustomValidity('');
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Result</label>
                      <Select
                        options={resultOptions}
                        value={resultOptions.find((opt) => opt.value === form.result) || null}
                        onChange={(option) => setForm({ ...form, result: option ? option.value : "" })}
                        placeholder="Select result"
                        isClearable
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: form.result ? base.borderColor : '#e5e7eb',
                          }),
                        }}
                      />
                      <input
                        type="text"
                        value={form.result}
                        required
                        style={{ opacity: 0, height: 0, position: 'absolute' }}
                        onInvalid={(e) => {
                          e.preventDefault();
                          (e.target as HTMLInputElement).setCustomValidity('Please select a result.');
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Comments</label>
                      <textarea
                        name="comments"
                        value={form.comments}
                        onChange={handleInputChange}
                        placeholder="Comments"
                        className="w-full border rounded-md px-3 py-2"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="inform_teamleader"
                        checked={form.inform_teamleader}
                        onChange={(e) => setForm({ ...form, inform_teamleader: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm font-medium">Inform Teamleader</label>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-purple-500 hover:bg-purple-600 text-white" 
                        disabled={submitting}
                      >
                        {submitting ? (form.id ? "Updating..." : "Adding...") : (form.id ? "Update" : "Add")}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-lg">
                <thead>
                  <tr className="bg-purple-50">
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-purple-700 border-b">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : viewings.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                        No viewings found.
                      </td>
                    </tr>
                  ) : (
                    viewings.map((viewing: any, idx: number) => (
                      <tr 
                        key={viewing.id} 
                        className="border-b hover:bg-purple-50 cursor-pointer" 
                        onClick={() => {
                          console.log('Viewing data:', viewing);
                          console.log('Viewing time:', viewing.viewing_time);
                          setForm({
                            id: viewing.id,
                            user_id: viewing.user_id,
                            ref_no: viewing.ref_no || "",
                            city: viewing.city || "",
                            viewing_date: viewing.viewing_date || "",
                            viewing_time: viewing.viewing_time || "",
                            client_name: viewing.client_name || "",
                            client_mobile_no: viewing.client_mobile_no || "",
                            result: viewing.result || "",
                            comments: viewing.comments || "",
                            inform_teamleader: viewing.inform_teamleader || false,
                          });
                          setViewingDate(viewing.viewing_date ? new Date(viewing.viewing_date) : null);
                          setShowModal(true);
                        }}
                      >
                        <td className="px-3 py-2">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-3 py-2">
                          {viewing.created_at ? new Date(viewing.created_at).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-3 py-2">{viewing.ref_no}</td>
                        <td className="px-3 py-2">{viewing.city}</td>
                        <td className="px-3 py-2">
                          {viewing.viewing_date ? new Date(viewing.viewing_date).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-3 py-2">{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</td>
                        <td className="px-3 py-2">{viewing.client_name}</td>
                        <td className="px-3 py-2">{viewing.client_mobile_no}</td>
                        <td className="px-3 py-2">
                          <span 
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              viewing.result === 'DEAL' ? 'bg-green-100 text-green-800' :
                              viewing.result === 'NO DEAL' ? 'bg-red-100 text-red-800' :
                              viewing.result === 'Negotiating' ? 'bg-blue-100 text-blue-800' :
                              viewing.result === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {viewing.result}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[150px] truncate" title={viewing.comments}>
                          {viewing.comments}
                        </td>
                        <td className="px-3 py-2">
                          {viewing.inform_teamleader ? '✓' : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>
                First
              </Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>
                Next
              </Button>
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(pageCount)}>
                Last
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Calendar View */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Viewing Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(prev => prev - 1)}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(0)}
                  disabled={currentMonthOffset === 0}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(prev => prev + 1)}
                  className="flex items-center gap-2"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
              
              {/* Calendar */}
              <div className="overflow-hidden">
                <div className="flex gap-4 items-center justify-center">
                  {generateMonthsCalendar()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

