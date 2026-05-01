"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { getNames } from "country-list";
import "react-datepicker/dist/react-datepicker.css";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useDashboardUrl } from "@/lib/hooks/useDashboardUrl";

// Lazy load heavy components
const Select = dynamic(() => import("react-select"), {
  ssr: false,
  loading: () => <div className="h-10 bg-gray-100 rounded animate-pulse" />,
});

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  dateFormat?: string;
  placeholderText?: string;
  className?: string;
  isClearable?: boolean;
  showYearDropdown?: boolean;
  scrollableYearDropdown?: boolean;
}

// Create a wrapper for DatePicker to avoid type issues
const DatePickerWrapper = dynamic(
  () => import("react-datepicker").then((mod) => {
    const Component = mod.default as ComponentType<DatePickerProps>;
    return { default: Component };
  }),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-gray-100 rounded animate-pulse" />,
  }
);
const DatePicker = DatePickerWrapper;

// Client form interface
interface ClientForm {
  id?: number | null;
  user_id: string;
  adding_date: string;
  name: string;
  people: string;
  bedroom: string;
  cities: string;
  family_sharing: string;
  nationalities: string;
  jobs: string;
  pet: string;
  budget: string;
  move_in: string;
  phone: string;
  status: string;
}

const columns = [
  "#",
  "Adding Date",
  "Name",
  "People",
  "Bedroom",
  "Cities",
  "Family/Sharing",
  "Nationalities",
  "Jobs",
  "Pet",
  "Budget",
  "Move In",
  "Phone",
  "Status",
  "Teamwork",
];

const pageSize = 10;

interface Client {
  id: number;
  user_id: string;
  adding_date: string | Date;
  created_at?: string;
  name: string;
  people: string;
  bedroom: string;
  cities: string;
  family_sharing: string;
  nationalities: string;
  jobs: string;
  pet: string;
  budget: string;
  move_in: string | Date;
  phone: string;
  status?: string;
  isSharedInTeamwork?: boolean;
}

function ClientTeamworkShareButton({ clientId, clientName, isShared }: { clientId: number; clientName: string; isShared?: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const response = await fetch('/api/teamwork/clients/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: `"${clientName}" shared to Teamwork successfully`,
        });
        // Refresh the page to update the button state
        window.location.reload();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to share client',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sharing client:', error);
      toast({
        title: 'Error',
        description: 'Failed to share client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (isShared) {
    return (
      <span className="inline-flex items-center gap-1 text-gray-400 cursor-not-allowed">
        <Share2 className="w-4 h-4" />
        Shared
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleShare();
      }}
      disabled={loading}
      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 underline disabled:opacity-50"
      title="Share to Teamwork"
    >
      <Share2 className="w-4 h-4" />
      {loading ? 'Sharing...' : 'Share'}
    </button>
  );
}

export default function ClientsPage() {
  const { dashboardUrl } = useDashboardUrl();
  // Ülke listesi react-select için options formatında
  // Parantez içindeki ifadeleri kaldır ve French ile başlayan tüm varyantları "France" olarak birleştir
  const countryOptions = getNames()
    .map((name: string) => {
      // Parantez içindeki ifadeleri kaldır: "Saint Martin (French part)" -> "Saint Martin"
      let cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
      
      // Custom country name replacements
      const lowerName = cleanName.toLowerCase();
      
      // United Kingdom of Great Britain and Northern Ireland -> England
      if (lowerName.includes('united kingdom') || lowerName.includes('great britain')) {
        cleanName = 'England';
      }
      // United States of America -> America
      else if (lowerName.includes('united states of america')) {
        cleanName = 'America';
      }
      // American Samoa -> Samoa
      else if (lowerName === 'american samoa') {
        cleanName = 'Samoa';
      }
      // Tanzania, the United Republic of -> Tanzania
      else if (lowerName.includes('tanzania')) {
        cleanName = 'Tanzania';
      }
      // French ile başlayan tüm ülkeleri "France" yap
      else if (lowerName.startsWith('french')) {
        cleanName = 'France';
      }
      
      return cleanName;
    })
    // United States Minor Outlying Islands'ı kaldır ve tekrar edenleri kaldır
    .filter((name, index, self) => {
      const lowerName = name.toLowerCase();
      // United States Minor Outlying Islands'ı filtrele
      if (lowerName.includes('minor outlying')) return false;
      // Tekrar edenleri kaldır
      return self.indexOf(name) === index;
    })
    .sort()
    .map((name: string) => ({ label: name, value: name }));
  const [clients, setClients] = useState<Client[]>([]);
  const [foundClients, setFoundClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [jobsModal, setJobsModal] = useState<string | null>(null);
  const petOptions = [
    { label: "No", value: "No" },
    { label: "Dog", value: "Dog" },
    { label: "Cat", value: "Cat" },
  ];

  const familySharingOptions = [
    { label: "Family", value: "Family" },
    { label: "Couple", value: "Couple" },
    { label: "Single", value: "Single" },
    { label: "Sharing", value: "Sharing" },
    { label: "Company", value: "Company" },
    { label: "Sublet", value: "Sublet" },
  ];

  const peopleOptions = Array.from({ length: 8 }, (_, i) => ({ label: (i + 1).toString(), value: (i + 1).toString() }));

  const bedroomOptions = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "Room", value: "room" },
    { label: "Studio", value: "studio" },
  ];

  const statusOptions = [
    { label: "Urgent", value: "Urgent" },
    { label: "Looking", value: "Looking" },
    { label: "Found", value: "Found" },
  ];

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
  { label: "San Gwann", value: "San Gwann" },
  { label: "San Pawl il-Bahar", value: "San Pawl il-Bahar" },
  { label: "Santa Lucija", value: "Santa Lucija" },
  { label: "Santa Venera", value: "Santa Venera" },
  { label: "Siggiewi", value: "Siggiewi" },
  { label: "Sliema", value: "Sliema" },
  { label: "St. Julian's", value: "St. Julian's" },
  { label: "St. Paul's Bay", value: "St. Paul's Bay" },
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

  const [form, setForm] = useState<ClientForm>({
    id: undefined,
    user_id: "",
    adding_date: "",
    name: "",
    people: "",
    bedroom: "",
    cities: "",
    family_sharing: "",
    nationalities: "",
    jobs: "",
    pet: "",
    budget: "",
    move_in: "",
    phone: "",
    status: "Looking",
  });
  // DatePicker için ayrı state
  // const [addingDate, setAddingDate] = useState<Date | null>(null);
  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const supabase = createClient();

  // getUserAndClients fonksiyonunu dışarı çıkar
  async function getUserAndClients(currentPage = page) {
    setLoading(true);
    // Get user from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || null;
    setUser(currentUser);
    if (currentUser?.id) {
      // Get all clients first
      const { data: allData, error: allError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (!allError && allData) {
        // Get all client IDs that are shared in teamwork
        const clientIds = allData.map(c => c.id).filter(Boolean);
        const { data: sharedClients } = await supabase
          .from('teamwork_clients')
          .select('client_id')
          .in('client_id', clientIds);

        const sharedClientIds = new Set((sharedClients || []).map((item: { client_id: number }) => item.client_id));

        // Add isSharedInTeamwork property to each client
        const clientsWithSharedStatus = allData.map(client => ({
          ...client,
          isSharedInTeamwork: sharedClientIds.has(client.id),
        }));

        // Separate active and found clients
        const activeClientsList = clientsWithSharedStatus.filter(c => 
          c.status === 'Looking' || c.status === 'Urgent' || !c.status
        );
        const foundClientsList = clientsWithSharedStatus.filter(c => c.status === 'Found');

        // Pagination for active clients
        const activeStart = (currentPage - 1) * pageSize;
        const activeEnd = currentPage * pageSize;
        const paginatedActive = activeClientsList.slice(activeStart, activeEnd);

        setClients(paginatedActive);
        setFoundClients(foundClientsList); // No pagination for found clients
        setPageCount(Math.ceil(activeClientsList.length / pageSize));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    getUserAndClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Adding Date artık otomatik atanacak, kullanıcıdan alınmayacak

  const handleMoveInDateChange = (date: Date | null) => {
    setMoveInDate(date);
    setForm({ ...form, move_in: date ? date.toISOString() : "" });
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);
    let error;
    let clientId = form.id;
    if (form.id) {
      // Güncelleme
      const { id: _id, ...updatePayload } = form;
      const res = await supabase.from("clients").update(updatePayload).eq("id", _id);
      error = res.error;

      // If update successful, sync to teamwork_clients
      if (!error) {
        try {
          const response = await fetch('/api/teamwork/clients/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: _id,
              updates: {
                people: form.people || null,
                bedroom: form.bedroom || null,
                cities: form.cities || null,
                family_sharing: form.family_sharing || null,
                nationalities: form.nationalities || null,
                jobs: form.jobs || null,
                pet: form.pet || null,
                budget: form.budget || null,
                move_in: form.move_in || null,
              }
            })
          });

          if (!response.ok) {
            const syncError = await response.json();
            console.error('Error syncing teamwork clients:', syncError);
          } else {
            const result = await response.json();
            console.log('Teamwork clients synced:', result);
          }
        } catch (syncError) {
          console.error('Teamwork sync failed:', syncError);
        }
      }
    } else {
      // Ekleme - id alanını çıkart
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...insertPayload } = form;
      const payloadWithUser = { ...insertPayload, user_id: user.id, adding_date: new Date().toISOString() };
      const res = await supabase.from("clients").insert([payloadWithUser]).select('id').single();
      error = res.error;
      
      // Yeni eklenen client'ın id'sini al
      if (!error && res.data) {
        clientId = res.data.id as number;
      }
    }
    setSubmitting(false);
    if (!error) {
      // If status is Found, remove from teamwork_clients
      if (form.status === 'Found' && clientId) {
        await supabase
          .from('teamwork_clients')
          .delete()
          .eq('client_id', clientId);
      }

      // Client oluşturulduysa activity kaydı ekle
      if (!form.id && clientId) {
        try {
          await supabase
            .from('activity')
            .insert([{
              user_id: user.id,
              type: 'client_created',
              data: { client_id: clientId, name: form.name },
              created_at: new Date().toISOString(),
            }]);
        } catch (activityError) {
          console.error('Activity insert error:', activityError);
        }
      }
      
      setShowModal(false);
      setForm({
        id: undefined,
        user_id: user.id,
        adding_date: "",
        name: "",
        people: "",
        bedroom: "",
        cities: "",
        family_sharing: "",
        nationalities: "",
        jobs: "",
        pet: "",
        budget: "",
        move_in: "",
        phone: "",
        status: "Looking",
      });
      setMoveInDate(null);
      await getUserAndClients(1);
      setPage(1);
    } else {
      alert("Error: " + error.message);
    }
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
        <Link href={dashboardUrl} className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Clients</CardTitle>
          <Button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2" onClick={() => {
            setForm({
              ...form,
              id: undefined,
              name: "",
              people: "",
              bedroom: "",
              cities: "",
              family_sharing: "",
              nationalities: "",
              jobs: "",
              pet: "",
              budget: "",
              move_in: "",
              phone: "",
              status: "Looking",
            });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {/* Modal for Add Client */}
          {showModal && (
            <Dialog open={showModal} onOpenChange={setShowModal}>
              <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center overflow-y-auto p-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4 sticky top-0 bg-white dark:bg-gray-900 pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{form.id ? "Edit Client" : "Add New Client"}</h3>
                  <form onSubmit={handleAddClient} className="space-y-3">
                    <Input name="name" value={form.name} onChange={handleInputChange} placeholder="Name" required />
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">People</label>
                      <Select
                        options={peopleOptions}
                        value={peopleOptions.find((opt: { label: string; value: string }) => opt.value === form.people) || null}
                        onChange={option => setForm({ ...form, people: option ? (option as { value: string }).value : "" })}
                        placeholder="Select people count"
                        isClearable
                        name="people"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Bedroom</label>
                      <Select
                        options={bedroomOptions}
                        value={bedroomOptions.filter((opt: { label: string; value: string }) => form.bedroom.split(",").includes(opt.value))}
                        onChange={option => {
                          const values = Array.isArray(option) ? option.map((o: { value: string }) => o.value) : [];
                          setForm({ ...form, bedroom: values.join(",") });
                        }}
                        isMulti
                        placeholder="Select bedroom(s)"
                        name="bedroom"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Cities</label>
                      <Select
                        options={maltaCitiesOptions}
                        value={maltaCitiesOptions.filter((opt: { label: string; value: string }) => form.cities.split(",").includes(opt.value))}
                        onChange={option => {
                          const values = Array.isArray(option) ? option.map((o: { value: string }) => o.value) : [];
                          setForm({ ...form, cities: values.join(",") });
                        }}
                        isMulti
                        placeholder="Select city/cities"
                        name="cities"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Family/Sharing</label>
                      <Select
                        options={familySharingOptions}
                        value={familySharingOptions.filter((opt: { label: string; value: string }) => form.family_sharing.split(",").includes(opt.value))}
                        onChange={option => {
                          const values = Array.isArray(option) ? option.map((o: { value: string }) => o.value) : [];
                          setForm({ ...form, family_sharing: values.join(",") });
                        }}
                        isMulti
                        placeholder="Select family/sharing type(s)"
                        name="family_sharing"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Nationalities</label>
                      <Select
                        options={countryOptions}
                        value={countryOptions.find((opt: { label: string; value: string }) => opt.value === form.nationalities) || null}
                        onChange={option => setForm({ ...form, nationalities: option ? (option as { value: string }).value : "" })}
                        placeholder="Select nationality"
                        isClearable
                        name="nationalities"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <Input name="jobs" value={form.jobs} onChange={handleInputChange} placeholder="Jobs" required />
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Pet</label>
                      <Select
                        options={petOptions}
                        value={petOptions.filter((opt: { label: string; value: string }) => form.pet.split(",").includes(opt.value))}
                        onChange={option => {
                          const values = Array.isArray(option) ? option.map((o: { value: string }) => o.value) : [];
                          setForm({ ...form, pet: values.join(",") });
                        }}
                        isMulti
                        placeholder="Select pet(s)"
                        name="pet"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Budget €</label>
                      <Input 
                        name="budget" 
                        type="number"
                        min="0"
                        max="99999"
                        value={form.budget} 
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers and max 5 digits
                          if (value === '' || (/^\d{1,5}$/.test(value) && parseInt(value) <= 99999)) {
                            handleInputChange(e);
                          }
                        }}
                        placeholder="Budget (max 99999)" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Move In</label>
                      <DatePicker
                        selected={moveInDate}
                        onChange={handleMoveInDateChange}
                        dateFormat="dd.MM.yyyy"
                        isClearable
                        placeholderText="Select move in date"
                        className="w-full border rounded-md px-3 py-2"
                      />
                    </div>
                    <Input name="phone" value={form.phone} onChange={handleInputChange} placeholder="Phone" required />
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Status</label>
                      <Select
                        options={statusOptions}
                        value={statusOptions.find((opt: { label: string; value: string }) => opt.value === form.status) || null}
                        onChange={option => setForm({ ...form, status: option ? (option as { value: string }).value : "Looking" })}
                        placeholder="Select status"
                        name="status"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                      <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white" disabled={submitting}>{submitting ? (form.id ? "Updating..." : "Adding...") : (form.id ? "Update" : "Add")}</Button>
                    </div>
                  </form>
                </div>
              </div>
            </Dialog>
          )}
          
          {/* Active Clients Table (Looking & Urgent) */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-purple-700">Active Clients (Looking & Urgent)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-lg">
                <thead>
                  <tr className="bg-purple-50 dark:bg-purple-950/30">
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-purple-700 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">Loading...</td>
                    </tr>
                  ) : clients.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">No active clients found.</td>
                    </tr>
                  ) : (
                    clients.map((client: Client, idx: number) => (
                      <tr key={client.id} className="border-b border-adaptive table-row-hover cursor-pointer" onClick={() => {
                        setForm({
                          id: client.id,
                          user_id: client.user_id,
                          adding_date: typeof client.adding_date === 'string' ? client.adding_date : (client.adding_date instanceof Date ? client.adding_date.toISOString() : '') || client.created_at || "",
                          name: client.name || "",
                          people: client.people || "",
                          bedroom: client.bedroom || "",
                          cities: client.cities || "",
                          family_sharing: client.family_sharing || "",
                          nationalities: client.nationalities || "",
                          jobs: client.jobs || "",
                          pet: client.pet || "",
                          budget: client.budget || "",
                          move_in: typeof client.move_in === 'string' ? client.move_in : (client.move_in instanceof Date ? client.move_in.toISOString() : '') || "",
                          phone: client.phone || "",
                          status: client.status || "Looking",
                        });
                        setMoveInDate(client.move_in ? new Date(client.move_in) : null);
                        setShowModal(true);
                      }}>
                        <td className="px-3 py-2">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-3 py-2">
                          {typeof client.adding_date === "string"
                            ? client.adding_date.slice(0, 10)
                            : client.adding_date instanceof Date
                              ? client.adding_date.toISOString().slice(0, 10)
                              : String(client.adding_date || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-2">{client.name}</td>
                        <td className="px-3 py-2">{client.people}</td>
                        <td className="px-3 py-2">{client.bedroom}</td>
                        <td className="px-3 py-2">{client.cities}</td>
                        <td className="px-3 py-2">{client.family_sharing}</td>
                        <td className="px-3 py-2">{client.nationalities}</td>
                        <td 
                          className="px-3 py-2 max-w-[80px] truncate cursor-pointer hover:text-purple-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client.jobs) setJobsModal(client.jobs);
                          }}
                        >
                          {client.jobs}
                        </td>
                        <td className="px-3 py-2">{client.pet}</td>
                        <td className="px-3 py-2">{client.budget}</td>
                        <td className="px-3 py-2">
                          {typeof client.move_in === "string"
                            ? client.move_in.slice(0, 10)
                            : client.move_in instanceof Date
                              ? client.move_in.toISOString().slice(0, 10)
                              : String(client.move_in || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-2">{client.phone}</td>
                        <td className="px-3 py-2">
                          <span 
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              client.status === 'Found' ? 'bg-red-100 text-red-800' :
                              client.status === 'Looking' ? 'bg-blue-100 text-blue-800' :
                              client.status === 'Urgent' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {client.status || 'Looking'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ClientTeamworkShareButton clientId={client.id} clientName={client.name} isShared={client.isSharedInTeamwork} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
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
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</Button>
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(pageCount)}>Last</Button>
            </div>
          </div>

          {/* Found Clients Table */}
          {foundClients.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Found Clients</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {foundClients.map((client: Client, idx: number) => (
                      <tr key={client.id} className="border-b border-adaptive table-row-hover cursor-pointer" onClick={() => {
                        setForm({
                          id: client.id,
                          user_id: client.user_id,
                          adding_date: typeof client.adding_date === 'string' ? client.adding_date : (client.adding_date instanceof Date ? client.adding_date.toISOString() : '') || client.created_at || "",
                          name: client.name || "",
                          people: client.people || "",
                          bedroom: client.bedroom || "",
                          cities: client.cities || "",
                          family_sharing: client.family_sharing || "",
                          nationalities: client.nationalities || "",
                          jobs: client.jobs || "",
                          pet: client.pet || "",
                          budget: client.budget || "",
                          move_in: typeof client.move_in === 'string' ? client.move_in : (client.move_in instanceof Date ? client.move_in.toISOString() : '') || "",
                          phone: client.phone || "",
                          status: client.status || "Looking",
                        });
                        setMoveInDate(client.move_in ? new Date(client.move_in) : null);
                        setShowModal(true);
                      }}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">
                          {typeof client.adding_date === "string"
                            ? client.adding_date.slice(0, 10)
                            : client.adding_date instanceof Date
                              ? client.adding_date.toISOString().slice(0, 10)
                              : String(client.adding_date || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-2">{client.name}</td>
                        <td className="px-3 py-2">{client.people}</td>
                        <td className="px-3 py-2">{client.bedroom}</td>
                        <td className="px-3 py-2">{client.cities}</td>
                        <td className="px-3 py-2">{client.family_sharing}</td>
                        <td className="px-3 py-2">{client.nationalities}</td>
                        <td 
                          className="px-3 py-2 max-w-[80px] truncate cursor-pointer hover:text-purple-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client.jobs) setJobsModal(client.jobs);
                          }}
                        >
                          {client.jobs}
                        </td>
                        <td className="px-3 py-2">{client.pet}</td>
                        <td className="px-3 py-2">{client.budget}</td>
                        <td className="px-3 py-2">
                          {typeof client.move_in === "string"
                            ? client.move_in.slice(0, 10)
                            : client.move_in instanceof Date
                              ? client.move_in.toISOString().slice(0, 10)
                              : String(client.move_in || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-2">{client.phone}</td>
                        <td className="px-3 py-2">
                          <span 
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              client.status === 'Found' ? 'bg-red-100 text-red-800' :
                              client.status === 'Looking' ? 'bg-blue-100 text-blue-800' :
                              client.status === 'Urgent' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {client.status || 'Looking'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ClientTeamworkShareButton clientId={client.id} clientName={client.name} isShared={client.isSharedInTeamwork} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Jobs Modal */}
      {jobsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-lg w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black dark:hover:text-white"
              onClick={() => setJobsModal(null)}
              aria-label="Close"
            >✕</button>
            <div className="text-base whitespace-pre-line max-h-[60vh] overflow-auto text-gray-900 dark:text-gray-100">
              {jobsModal}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
