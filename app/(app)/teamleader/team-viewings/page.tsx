"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import CreatableSelect from 'react-select/creatable';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

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

const teamColumns = [
  "#",
  "Agent Name",
  "Created Date",
  "Ref No",
  "City",
  "Viewing Date",
  "Viewing Time",
  "Client Name",
  "Client Mobile No",
  "Result",
  "Comments",
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
  for (const minute of [0, 15, 30, 45]) {
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    const timeValue = `${hourStr}:${minuteStr}`;
    timeOptions.push({ label: timeValue, value: timeValue });
  }
}

// Malta cities options (Mainland Malta only)
const maltaCitiesOptions = [
  { label: "Attard", value: "Attard" },
  { label: "Balzan", value: "Balzan" },
  { label: "Bahar ic-Caghaq", value: "Bahar ic-Caghaq" },
  { label: "Birgu", value: "Birgu" },
  { label: "Birkirkara", value: "Birkirkara" },
  { label: "Birzebbuga", value: "Birzebbuga" },
  { label: "Bormla", value: "Bormla" },
  { label: "Bugibba", value: "Bugibba" },
  { label: "Dingli", value: "Dingli" },
  { label: "Fgura", value: "Fgura" },
  { label: "Floriana", value: "Floriana" },
  { label: "Gharghur", value: "Gharghur" },
  { label: "Ghaxaq", value: "Ghaxaq" },
  { label: "Gudja", value: "Gudja" },
  { label: "Gzira", value: "Gzira" },
  { label: "Hamrun", value: "Hamrun" },
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
  { label: "Mellieha", value: "Mellieha" },
  { label: "Mgarr", value: "Mgarr" },
  { label: "Mosta", value: "Mosta" },
  { label: "Mqabba", value: "Mqabba" },
  { label: "Msida", value: "Msida" },
  { label: "Mtarfa", value: "Mtarfa" },
  { label: "Bugibba", value: "Bugibba" },
  { label: "Naxxar", value: "Naxxar" },
  { label: "Paola", value: "Paola" },
  { label: "Pembroke", value: "Pembroke" },
  { label: "Pieta", value: "Pieta" },
  { label: "Qawra", value: "Qawra" },
  { label: "Qormi", value: "Qormi" },
  { label: "Qrendi", value: "Qrendi" },
  { label: "Rabat", value: "Rabat" },
  { label: "Safi", value: "Safi" },
  { label: "San Giljan", value: "San Giljan" },
  { label: "St Julian's", value: "St Julian's" },
  { label: "San Gwann", value: "San Gwann" },
  { label: "San Pawl il-Bahar", value: "San Pawl il-Bahar" },
  { label: "Santa Lucija", value: "Santa Lucija" },
  { label: "Santa Venera", value: "Santa Venera" },
  { label: "Siggiewi", value: "Siggiewi" },
  { label: "Sliema", value: "Sliema" },
  { label: "St Paul's Bay", value: "St Paul's Bay" },
  { label: "Swatar", value: "Swatar" },
  { label: "Swieqi", value: "Swieqi" },
  { label: "Ta' Xbiex", value: "Ta' Xbiex" },
  { label: "Tarxien", value: "Tarxien" },
  { label: "Valletta", value: "Valletta" },
  { label: "Xemxija", value: "Xemxija" },
  { label: "Xghajra", value: "Xghajra" },
  { label: "Zabbar", value: "Zabbar" },
  { label: "Zebbug", value: "Zebbug" },
  { label: "Zejtun", value: "Zejtun" },
  { label: "Zurrieq", value: "Zurrieq" }
];

interface Viewing {
  id: number;
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
  created_at: string;
}

interface TeamViewing extends Viewing {
  agent_name?: string;
}

interface User {
  id: string;
  email?: string;
}

interface ListingSuggestion {
  label: string;
  value: string;
  city?: string;
}

interface ClientSuggestion {
  label: string;
  value: string;
  phone?: string;
}

export default function TeamViewingsPage() {
  const { toast } = useToast();
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [teamViewings, setTeamViewings] = useState<TeamViewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageCount, setTeamPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const supabase = createClient();

  // Filter states for Team Viewings
  const [filterResult, setFilterResult] = useState('');
  const [filterAgentName, setFilterAgentName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState(false);

  // Autocomplete suggestions
  const [listingsSuggestions, setListingsSuggestions] = useState<ListingSuggestion[]>([]);
  const [clientsSuggestions, setClientsSuggestions] = useState<ClientSuggestion[]>([]);
  
  // Agent list for dropdown
  const [agents, setAgents] = useState<Array<{ user_id: string; full_name: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

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
    const listingsRes = await fetch('/api/viewings/listings-suggestions');
    const listingsData = await listingsRes.json();
    if (listingsData.success) {
      setListingsSuggestions(listingsData.data);
    }

    const clientsRes = await fetch('/api/viewings/clients-suggestions');
    const clientsData = await clientsRes.json();
    if (clientsData.success) {
      setClientsSuggestions(clientsData.data);
    }
  }

  // Fetch all agents for dropdown
  async function fetchAgents() {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "agent")
      .order("full_name", { ascending: true });

    if (!error && data) {
      setAgents(data);
    }
  }

  async function getUserAndViewings(currentPage = page) {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || null;
    setUser(currentUser);
    
    if (currentUser?.id) {
      // Get user role
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();
      
      if (profileData?.role) {
        setUserRole(profileData.role.toLowerCase());
      }
      
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

  async function getTeamViewings(currentPage = teamPage) {
    setTeamLoading(true);
    if (user?.id) {
      // Get all viewings from all agents (without pagination to enable client-side filtering)
      const { data: viewingsData, error: viewingsError } = await supabase
        .from("viewings")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!viewingsError && viewingsData) {
        // Get unique user IDs from viewings
        const userIds = [...new Set(viewingsData.map(v => v.user_id))];
        
        // Fetch profile names for these users
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, role")
          .in("user_id", userIds);
        
        // Create a map of user_id to full_name
        const profileMap = new Map(
          profilesData?.map(p => [p.user_id, p.full_name]) || []
        );
        const roleMap = new Map(
          profilesData?.map(p => [p.user_id, p.role]) || []
        );
        
        // Map viewings with agent names
        const mappedData = viewingsData.map((viewing: any) => ({
          ...viewing,
          agent_name: profileMap.get(viewing.user_id) || 'Unknown Agent',
          agent_role: roleMap.get(viewing.user_id) || 'agent',
        }));
        
        setTeamViewings(mappedData);
        // Pagination will be calculated after filtering
      } else if (viewingsError) {
        console.error("Error fetching team viewings:", viewingsError);
      }
    }
    setTeamLoading(false);
  }

  useEffect(() => {
    getUserAndViewings();
    fetchSuggestions();
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (user?.id) {
      getTeamViewings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime subscription for viewing changes
  useEffect(() => {
    const channel = supabase
      .channel('team-viewing-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'viewings'
        },
        (payload) => {
          console.log('Viewing change detected:', payload);
          // Refresh team viewings data
          getTeamViewings();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamPage]);

  // Apply filters to team viewings
  const filteredTeamViewings = teamViewings.filter(viewing => {
    // Result filter
    if (filterResult && viewing.result !== filterResult) {
      return false;
    }
    
    // Agent Name filter
    if (filterAgentName && !viewing.agent_name?.toLowerCase().includes(filterAgentName.toLowerCase())) {
      return false;
    }
    
    // Month filter (format: YYYY-MM)
    if (filterMonth && viewing.viewing_date) {
      const viewingMonth = viewing.viewing_date.substring(0, 7); // Get YYYY-MM from YYYY-MM-DD
      if (viewingMonth !== filterMonth) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate pagination for filtered results
  const teamPageCountFiltered = Math.ceil(filteredTeamViewings.length / pageSize);
  const paginatedTeamViewings = filteredTeamViewings.slice(
    (teamPage - 1) * pageSize,
    teamPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setTeamPage(1);
  }, [filterResult, filterAgentName, filterMonth]);

  // Check if any filters are active
  const hasActiveTeamFilters = filterResult || filterAgentName || filterMonth;

  // Clear all team filters
  const clearTeamFilters = () => {
    setFilterResult('');
    setFilterAgentName('');
    setFilterMonth('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleViewingDateChange = (date: Date | null) => {
    setViewingDate(date);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setForm({ ...form, viewing_date: `${year}-${month}-${day}` });
    } else {
      setForm({ ...form, viewing_date: "" });
    }
  };

  const handleAddViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);
    
    const method = form.id ? 'PUT' : 'POST';
    // Use selectedAgentId if set (teamleader adding for agent), otherwise use own user.id
    const targetUserId = selectedAgentId || user.id;
    const payload = form.id ? form : { ...form, user_id: targetUserId };
    
    const response = await fetch('/api/viewings', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const error = result.success ? null : { message: result.error };
    
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
      setSelectedAgentId('');
      await getUserAndViewings(1);
      await getTeamViewings(1);
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
    
    for (let i = -1; i <= 1; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset + i, 1);
      const isMainMonth = i === 0;
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
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={`border border-gray-200 ${isMainMonth ? 'h-16 sm:h-20 md:h-24' : 'h-8 sm:h-10 md:h-12'}`}></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // For teamleader: show own viewings + all team viewings
      // For agent: show only own viewings
      const isTeamleader = userRole === 'teamleader' || userRole === 'manager' || userRole === 'boss' || userRole === 'admin';
      const dayViewings = isTeamleader 
        ? [...viewings.filter((v) => v.viewing_date === dateStr), ...teamViewings.filter((v) => v.viewing_date === dateStr && v.user_id !== user?.id)]
        : viewings.filter((v) => v.viewing_date === dateStr);
      
      const isToday = 
        day === new Date().getDate() && 
        month === new Date().getMonth() && 
        year === new Date().getFullYear();
      
      days.push(
        <div 
          key={day} 
          className={`border border-gray-200 p-0.5 sm:p-1 overflow-y-auto ${isMainMonth ? 'h-16 sm:h-20 md:h-24' : 'h-8 sm:h-10 md:h-12'} ${isToday ? 'bg-purple-50 border-purple-400' : ''}`}
        >
          <div className={`font-semibold text-gray-600 mb-0.5 sm:mb-1 ${isMainMonth ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[10px]'}`}>{day}</div>
          {isMainMonth && dayViewings.map((viewing) => (
            <div
              key={viewing.id}
              className={`text-[10px] sm:text-xs p-0.5 sm:p-1 mb-0.5 sm:mb-1 rounded cursor-pointer ${
                viewing.result === 'DEAL' ? 'bg-green-100 text-green-800' :
                viewing.result === 'NO DEAL' ? 'bg-red-100 text-red-800' :
                viewing.result === 'Negotiating' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}
              onClick={() => {
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
              <div className="font-bold text-[9px] sm:text-[10px]">#{viewing.id}</div>
              <div className="text-[9px] sm:text-[10px]">{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</div>
              <div className="truncate text-[9px] sm:text-[10px]">{viewing.ref_no}</div>
              {isTeamleader && viewing.user_id !== user?.id && (
                <div className="text-[8px] sm:text-[9px] text-gray-600 italic truncate">
                  {(viewing as TeamViewing).agent_name}
                  {(viewing as any).agent_role === 'intern' && <span className="text-orange-600"> (I)</span>}
                </div>
              )}
            </div>
          ))}
          {!isMainMonth && dayViewings.length > 0 && (
            <div className="text-[8px] sm:text-[10px] text-center text-purple-600 font-semibold">
              {dayViewings.length}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div key={monthName} className={`${isMainMonth ? 'min-w-[320px] sm:min-w-[480px] md:min-w-[600px]' : 'min-w-[200px] sm:min-w-[250px] opacity-50'} flex-shrink-0 transition-all`}>
        <h3 className={`font-bold text-center mb-2 ${isMainMonth ? 'text-base sm:text-lg md:text-xl' : 'text-xs sm:text-sm'}`}>{monthName}</h3>
        <div className="grid grid-cols-7 gap-0 border border-gray-300">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`text-center font-semibold p-0.5 sm:p-1 bg-gray-100 border border-gray-200 ${isMainMonth ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[10px]'}`}>
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
        <Link href="/teamleader" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
        
        {/* My Viewings Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Viewing Records</CardTitle>
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
                      <label className="block text-sm font-medium mb-1">Agent Name</label>
                      <Select
                        options={[
                          { label: "Myself (Teamleader)", value: user?.id || "" },
                          ...agents.map(agent => ({ label: agent.full_name, value: agent.user_id }))
                        ]}
                        value={
                          selectedAgentId 
                            ? agents.find(a => a.user_id === selectedAgentId)
                              ? { label: agents.find(a => a.user_id === selectedAgentId)!.full_name, value: selectedAgentId }
                              : { label: "Myself (Teamleader)", value: user?.id || "" }
                            : { label: "Myself (Teamleader)", value: user?.id || "" }
                        }
                        onChange={(option) => {
                          if (option) {
                            const newAgentId = option.value === user?.id ? '' : option.value;
                            setSelectedAgentId(newAgentId);
                          }
                        }}
                        placeholder="Select agent"
                        classNamePrefix="react-select"
                      />
                    </div>

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
                              city: option.city || form.city
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
                      <Select
                        options={maltaCitiesOptions}
                        value={maltaCitiesOptions.find(opt => opt.value === form.city) || null}
                        onChange={option => setForm({ ...form, city: option ? option.value : "" })}
                        placeholder="Select city"
                        isClearable
                        classNamePrefix="react-select"
                      />
                      <input
                        type="text"
                        value={form.city}
                        required
                        style={{ opacity: 0, height: 0, position: 'absolute' }}
                        onInvalid={(e) => {
                          e.preventDefault();
                          (e.target as HTMLInputElement).setCustomValidity('Please select a city.');
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
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
                              client_mobile_no: option.phone || form.client_mobile_no
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
                      <Button type="button" variant="outline" onClick={() => { setShowModal(false); setSelectedAgentId(''); }}>
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

            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-purple-50">
                    {columns.map((col) => (
                      <th key={col} className="px-2 sm:px-3 py-2 text-left font-semibold text-purple-700 border-b text-xs sm:text-sm whitespace-nowrap">
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
                    viewings.map((viewing, idx: number) => (
                      <tr 
                        key={viewing.id} 
                        className="border-b hover:bg-purple-50 cursor-pointer" 
                        onClick={() => {
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
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                          {viewing.created_at ? new Date(viewing.created_at).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.ref_no}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.city}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                          {viewing.viewing_date ? new Date(viewing.viewing_date).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.client_name}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.client_mobile_no}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
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
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm max-w-[100px] sm:max-w-[150px] truncate" title={viewing.comments}>
                          {viewing.comments}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-center">
                          {viewing.inform_teamleader ? '✓' : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)} className="text-xs sm:text-sm px-2 sm:px-3">
                First
              </Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="text-xs sm:text-sm px-2 sm:px-3">
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
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(page + 1)} className="text-xs sm:text-sm px-2 sm:px-3">
                Next
              </Button>
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(pageCount)} className="text-xs sm:text-sm px-2 sm:px-3">
                Last
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Team Viewing Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex items-center justify-between mb-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(prev => prev - 1)}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(0)}
                  disabled={currentMonthOffset === 0}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(prev => prev + 1)}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <div className="flex gap-2 md:gap-4 items-center justify-start md:justify-center">
                  {generateMonthsCalendar()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Viewings Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Viewing Records</CardTitle>
                {hasActiveTeamFilters && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-purple-600 font-medium">
                      ({filteredTeamViewings.length} filtered results)
                    </span>
                  </p>
                )}
              </div>
              
              {/* Filter Button */}
              <Popover open={isTeamFilterOpen} onOpenChange={setIsTeamFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant={hasActiveTeamFilters ? "default" : "outline"} 
                    size="sm"
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveTeamFilters && (
                      <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                        {[filterResult, filterAgentName, filterMonth].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filter Team Viewings</h4>
                      {hasActiveTeamFilters && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearTeamFilters}
                          className="h-auto p-1 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    {/* Result Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-result" className="text-xs">Result</Label>
                      <select
                        id="filter-result"
                        value={filterResult}
                        onChange={(e) => setFilterResult(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">All Results</option>
                        <option value="DEAL">DEAL</option>
                        <option value="NO DEAL">NO DEAL</option>
                        <option value="Negotiating">Negotiating</option>
                        <option value="Scheduled">Scheduled</option>
                      </select>
                    </div>

                    {/* Agent Name Filter */}
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

                    {/* Month Filter */}
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
                      onClick={() => setIsTeamFilterOpen(false)} 
                      className="w-full"
                      size="sm"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-blue-50">
                    {teamColumns.map((col) => (
                      <th key={col} className="px-2 sm:px-3 py-2 text-left font-semibold text-blue-700 border-b text-xs sm:text-sm whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamLoading ? (
                    <tr>
                      <td colSpan={teamColumns.length} className="text-center py-8 text-muted-foreground">
                        Loading team viewings...
                      </td>
                    </tr>
                  ) : teamViewings.length === 0 ? (
                    <tr>
                      <td colSpan={teamColumns.length} className="text-center py-8 text-muted-foreground">
                        No team viewings found.
                      </td>
                    </tr>
                  ) : filteredTeamViewings.length === 0 ? (
                    <tr>
                      <td colSpan={teamColumns.length} className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No viewings match your filters</p>
                        <Button variant="outline" size="sm" onClick={clearTeamFilters}>
                          Clear Filters
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    paginatedTeamViewings.map((viewing, idx: number) => (
                      <tr 
                        key={viewing.id} 
                        className="border-b hover:bg-blue-50"
                      >
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">{(teamPage - 1) * pageSize + idx + 1}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                          {viewing.agent_name}
                          {(viewing as any).agent_role === 'intern' && (
                            <span className="ml-1 text-xs text-orange-600 font-medium">(Intern)</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                          {viewing.created_at ? new Date(viewing.created_at).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.ref_no}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.city}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                          {viewing.viewing_date ? new Date(viewing.viewing_date).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.client_name}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.client_mobile_no}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
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
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm max-w-[100px] sm:max-w-[150px] truncate" title={viewing.comments}>
                          {viewing.comments}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Team Pagination Controls */}
            <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={teamPage === 1} onClick={() => setTeamPage(1)} className="text-xs sm:text-sm px-2 sm:px-3">
                First
              </Button>
              <Button variant="outline" size="sm" disabled={teamPage === 1} onClick={() => setTeamPage(teamPage - 1)} className="text-xs sm:text-sm px-2 sm:px-3">
                Prev
              </Button>
              {Array.from({ length: Math.min(teamPageCountFiltered, 5) }, (_, i) => {
                const pageNum = teamPage <= 3 ? i + 1 : teamPage + i - 2;
                if (pageNum > teamPageCountFiltered) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={teamPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTeamPage(pageNum)}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={teamPage === teamPageCountFiltered} onClick={() => setTeamPage(teamPage + 1)} className="text-xs sm:text-sm px-2 sm:px-3">
                Next
              </Button>
              <Button variant="outline" size="sm" disabled={teamPage === teamPageCountFiltered} onClick={() => setTeamPage(teamPageCountFiltered)} className="text-xs sm:text-sm px-2 sm:px-3">
                Last
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
