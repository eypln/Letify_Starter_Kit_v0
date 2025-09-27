"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { getNames } from "country-list";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
];

const pageSize = 10;
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

export default function ClientsPage() {
  // Ülke listesi react-select için options formatında
  const countryOptions = getNames().map((name: string) => ({ label: name, value: name }));
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
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

  const maltaCitiesOptions = [
    { label: "Valletta", value: "Valletta" },
    { label: "Sliema", value: "Sliema" },
    { label: "St. Julian's", value: "St. Julian's" },
    { label: "Birkirkara", value: "Birkirkara" },
    { label: "Mosta", value: "Mosta" },
    { label: "Qormi", value: "Qormi" },
    { label: "Żabbar", value: "Żabbar" },
    { label: "Żebbuġ", value: "Żebbuġ" },
    { label: "Marsaskala", value: "Marsaskala" },
    { label: "Marsaxlokk", value: "Marsaxlokk" },
    { label: "Mellieħa", value: "Mellieħa" },
    { label: "Mdina", value: "Mdina" },
    { label: "Rabat", value: "Rabat" },
    { label: "Paola", value: "Paola" },
    { label: "Birżebbuġa", value: "Birżebbuġa" },
    { label: "Naxxar", value: "Naxxar" },
    { label: "Senglea", value: "Senglea" },
    { label: "Birgu", value: "Birgu" },
    { label: "Bormla", value: "Bormla" },
    { label: "Gżira", value: "Gżira" },
    { label: "Msida", value: "Msida" },
    { label: "Floriana", value: "Floriana" },
    { label: "Swieqi", value: "Swieqi" },
    { label: "Xgħajra", value: "Xgħajra" },
    { label: "Kalkara", value: "Kalkara" },
    { label: "Attard", value: "Attard" },
    { label: "Balzan", value: "Balzan" },
    { label: "Lija", value: "Lija" },
    { label: "Santa Venera", value: "Santa Venera" },
    { label: "Tarxien", value: "Tarxien" },
    { label: "Luqa", value: "Luqa" },
    { label: "Gudja", value: "Gudja" },
    { label: "Għaxaq", value: "Għaxaq" },
    { label: "Kirkop", value: "Kirkop" },
    { label: "Mqabba", value: "Mqabba" },
    { label: "Qrendi", value: "Qrendi" },
    { label: "Safi", value: "Safi" },
    { label: "Żurrieq", value: "Żurrieq" },
    { label: "Dingli", value: "Dingli" },
    { label: "Mtarfa", value: "Mtarfa" },
    { label: "Siġġiewi", value: "Siġġiewi" },
    { label: "Għargħur", value: "Għargħur" },
    { label: "Pembroke", value: "Pembroke" },
    { label: "St. Paul's Bay", value: "St. Paul's Bay" },
    { label: "Xemxija", value: "Xemxija" },
    { label: "Bugibba", value: "Bugibba" },
  ];

  const [form, setForm] = useState({
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
  });
  // DatePicker için ayrı state
  // const [addingDate, setAddingDate] = useState<Date | null>(null);
  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  // getUserAndClients fonksiyonunu dışarı çıkar
  async function getUserAndClients(currentPage = page) {
    setLoading(true);
    // Get user from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || null;
    setUser(currentUser);
    if (currentUser?.id) {
      const { data, error, count } = await supabase
        .from("clients")
        .select("*", { count: "exact" })
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      if (!error && data) {
        setClients(data);
        setPageCount(Math.ceil((count ?? 0) / pageSize));
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
    if (form.id) {
      // Güncelleme
      const updatePayload = { ...form };
      delete updatePayload.id;
      const res = await supabase.from("clients").update(updatePayload).eq("id", form.id);
      error = res.error;
    } else {
      // Ekleme
      const now = new Date();
      const payload = { ...form, user_id: user.id, adding_date: now.toISOString() };
      const res = await supabase.from("clients").insert([payload]);
      error = res.error;
    }
    setSubmitting(false);
    if (!error) {
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
      {/* Dashboard button top right */}
      <div className="flex justify-end mb-6">
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-lg shadow-none">
            <LayoutGrid className="h-4 w-4" /> Dashboard
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Clients</CardTitle>
          <Button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2" onClick={() => {
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
              <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
                  <h3 className="text-xl font-bold mb-4">{form.id ? "Edit Client" : "Add New Client"}</h3>
                  <form onSubmit={handleAddClient} className="space-y-4">
                    <Input name="name" value={form.name} onChange={handleInputChange} placeholder="Name" required />
                    <div>
                      <label className="block text-sm font-medium mb-1">People</label>
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
                      <label className="block text-sm font-medium mb-1">Bedroom</label>
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
                      <label className="block text-sm font-medium mb-1">Cities</label>
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
                      <label className="block text-sm font-medium mb-1">Family/Sharing</label>
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
                      <label className="block text-sm font-medium mb-1">Nationalities</label>
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
                      <label className="block text-sm font-medium mb-1">Pet</label>
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
                    <Input name="budget" value={form.budget} onChange={handleInputChange} placeholder="Budget" required />
                    <div>
                      <label className="block text-sm font-medium mb-1">Move In</label>
                      <DatePicker
                        selected={moveInDate}
                        onChange={handleMoveInDateChange}
                        dateFormat="dd.MM.yyyy"
                        todayButton="Today"
                        isClearable
                        placeholderText="Select move in date"
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <Input name="phone" value={form.phone} onChange={handleInputChange} placeholder="Phone" required />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                      <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white" disabled={submitting}>{submitting ? (form.id ? "Updating..." : "Adding...") : (form.id ? "Update" : "Add")}</Button>
                    </div>
                  </form>
                </div>
              </div>
            </Dialog>
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
                    <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">No clients found.</td>
                  </tr>
                ) : (
                  clients.map((client: any, idx: number) => (
                    <tr key={client.id} className="border-b hover:bg-purple-50 cursor-pointer" onClick={() => {
                      setForm({
                        id: client.id,
                        user_id: client.user_id,
                        adding_date: client.adding_date || client.created_at || "",
                        name: client.name || "",
                        people: client.people || "",
                        bedroom: client.bedroom || "",
                        cities: client.cities || "",
                        family_sharing: client.family_sharing || "",
                        nationalities: client.nationalities || "",
                        jobs: client.jobs || "",
                        pet: client.pet || "",
                        budget: client.budget || "",
                        move_in: client.move_in || "",
                        phone: client.phone || "",
                      });
                      setMoveInDate(client.move_in ? new Date(client.move_in) : null);
                      setShowModal(true);
                    }}>
                      <td className="px-3 py-2">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-3 py-2">
                        {typeof client.adding_date === "string"
                          ? client.adding_date.slice(0, 10)
                          : client.adding_date?.toISOString
                            ? client.adding_date.toISOString().slice(0, 10)
                            : JSON.stringify(client.adding_date)}
                      </td>
                      <td className="px-3 py-2">{client.name}</td>
                      <td className="px-3 py-2">{client.people}</td>
                      <td className="px-3 py-2">{client.bedroom}</td>
                      <td className="px-3 py-2">{client.cities}</td>
                      <td className="px-3 py-2">{client.family_sharing}</td>
                      <td className="px-3 py-2">{client.nationalities}</td>
                      <td className="px-3 py-2">{client.jobs}</td>
                      <td className="px-3 py-2">{client.pet}</td>
                      <td className="px-3 py-2">{client.budget}</td>
                      <td className="px-3 py-2">
                        {typeof client.move_in === "string"
                          ? client.move_in.slice(0, 10)
                          : client.move_in?.toISOString
                            ? client.move_in.toISOString().slice(0, 10)
                            : client.move_in}
                      </td>
                      <td className="px-3 py-2">{client.phone}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-end items-center gap-2 mt-4">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(1)}>First</Button>
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
            <span className="px-2">{page}</span>
            <Button variant="outline" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</Button>
            <Button variant="outline" disabled={page === pageCount} onClick={() => setPage(pageCount)}>Last</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
