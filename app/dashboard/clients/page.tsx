"use client";

import { useState, useEffect } from "react";
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
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
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
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUserAndClients() {
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
          .range((page - 1) * pageSize, page * pageSize - 1);
        if (!error && data) {
          setClients(data);
          setPageCount(Math.ceil((count ?? 0) / pageSize));
        }
      }
      setLoading(false);
    }
    getUserAndClients();
  }, [page]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);
    const payload = { ...form, user_id: user.id };
    const { error } = await supabase.from("clients").insert([payload]);
    setSubmitting(false);
    if (!error) {
      setShowModal(false);
      setForm({
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
      // Refresh table
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
          <Button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {/* Modal for Add Client */}
          {showModal && (
            <Dialog open={showModal} onOpenChange={setShowModal}>
              <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
                  <h3 className="text-xl font-bold mb-4">Add New Client</h3>
                  <form onSubmit={handleAddClient} className="space-y-4">
                    <Input name="adding_date" type="datetime-local" value={form.adding_date} onChange={handleInputChange} placeholder="Adding Date" required />
                    <Input name="name" value={form.name} onChange={handleInputChange} placeholder="Name" required />
                    <Input name="people" value={form.people} onChange={handleInputChange} placeholder="People" required />
                    <Input name="bedroom" value={form.bedroom} onChange={handleInputChange} placeholder="Bedroom" required />
                    <Input name="cities" value={form.cities} onChange={handleInputChange} placeholder="Cities" required />
                    <Input name="family_sharing" value={form.family_sharing} onChange={handleInputChange} placeholder="Family/Sharing" required />
                    <Input name="nationalities" value={form.nationalities} onChange={handleInputChange} placeholder="Nationalities" required />
                    <Input name="jobs" value={form.jobs} onChange={handleInputChange} placeholder="Jobs" required />
                    <Input name="pet" value={form.pet} onChange={handleInputChange} placeholder="Pet" required />
                    <Input name="budget" value={form.budget} onChange={handleInputChange} placeholder="Budget" required />
                    <Input name="move_in" value={form.move_in} onChange={handleInputChange} placeholder="Move In" required />
                    <Input name="phone" value={form.phone} onChange={handleInputChange} placeholder="Phone" required />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                      <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white" disabled={submitting}>{submitting ? "Adding..." : "Add"}</Button>
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
                  clients.map((client, idx) => (
                    <tr key={client.id} className="border-b hover:bg-purple-50">
                      <td className="px-3 py-2">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-3 py-2">{client.adding_date}</td>
                      <td className="px-3 py-2">{client.name}</td>
                      <td className="px-3 py-2">{client.people}</td>
                      <td className="px-3 py-2">{client.bedroom}</td>
                      <td className="px-3 py-2">{client.cities}</td>
                      <td className="px-3 py-2">{client.family_sharing}</td>
                      <td className="px-3 py-2">{client.nationalities}</td>
                      <td className="px-3 py-2">{client.jobs}</td>
                      <td className="px-3 py-2">{client.pet}</td>
                      <td className="px-3 py-2">{client.budget}</td>
                      <td className="px-3 py-2">{client.move_in}</td>
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
