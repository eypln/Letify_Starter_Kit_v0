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
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// First call status options
const FIRST_CALL_STATUS_OPTIONS = [
  { label: "No Reply", value: "No Reply" },
  { label: "Not interested anymore", value: "Not interested anymore" },
  { label: "Missing Contact", value: "Missing Contact" },
  { label: "Requires Follow-up", value: "Requires Follow-up" },
  { label: "Scheduled Interview", value: "Scheduled Interview" },
  { label: "Found a job", value: "Found a job" },
  { label: "Refused Applicant", value: "Refused Applicant" },
];

// VAT Type options
const VAT_TYPE_OPTIONS = [
  { label: "Vatable (40%)", value: "Vatable (%40)" },
  { label: "Full Time (32%)", value: "Full Time (%32)" },
  { label: "Part Time (36%)", value: "Part Time (%36)" },
];

// Table columns
const columns = [
  "#",
  "Date",
  "Applicant",
  "Nationality",
  "Phone",
  "Email",
  "R.E. Experience",
  "1st Call",
  "2nd Call",
  "Appointment",
  "Interview Point",
  "VAT Type",
  "Start Date",
  "Actions",
];

const pageSize = 15;

interface User {
  id: string;
  email?: string;
}

interface Application {
  id: number;
  user_id: string;
  application_date: string;
  applicant_name: string;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  re_experience: boolean;
  first_call_status: string | null;
  second_call_notes: string | null;
  appointment_date: string | null;
  interview_point: string | null;
  vat_type: string | null;
  start_date: string | null;
  hired: boolean;
  created_at?: string;
}

interface ApplicationForm {
  id?: number | null;
  application_date: string;
  applicant_name: string;
  nationality: string;
  phone: string;
  email: string;
  re_experience: boolean;
  first_call_status: string;
  second_call_notes: string;
  appointment_date: string;
  interview_point: string;
  vat_type: string;
  start_date: string;
  hired: boolean;
}

// Hired team members table columns
const hiredColumns = [
  "#",
  "Start Date",
  "Name",
  "Nationality",
  "Phone",
  "Email",
  "VAT Type",
  "Actions",
];

// Status color mapping (matching Excel colors)
const getStatusColor = (status: string | null) => {
  switch (status) {
    case "No Reply":
      // Dark red / maroon
      return "bg-red-800 text-white dark:bg-red-900 dark:text-red-100";
    case "Not interested anymore":
      // Yellow
      return "bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900";
    case "Found a job":
      // Orange
      return "bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-900";
    case "Scheduled Interview":
      // Green
      return "bg-green-500 text-white dark:bg-green-600 dark:text-green-100";
    case "Requires Follow-up":
      // Light green
      return "bg-green-300 text-green-900 dark:bg-green-400 dark:text-green-900";
    case "Missing Contact":
      // Dark gray / black
      return "bg-gray-700 text-white dark:bg-gray-800 dark:text-gray-100";
    case "Refused Applicant":
      // Light gray
      return "bg-gray-200 text-gray-700 dark:bg-gray-400 dark:text-gray-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
};

export default function ApplicationsClient({ user, dashboardUrl = "/teamleader" }: { user: User; dashboardUrl?: string }) {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [hiredApplicants, setHiredApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hiredCount, setHiredCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const supabase = createClient();

  const [form, setForm] = useState<ApplicationForm>({
    id: undefined,
    application_date: "",
    applicant_name: "",
    nationality: "",
    phone: "",
    email: "",
    re_experience: false,
    first_call_status: "",
    second_call_notes: "",
    appointment_date: "",
    interview_point: "",
    vat_type: "",
    start_date: "",
    hired: false,
  });

  // Date states
  const [applicationDate, setApplicationDate] = useState<Date | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);

  const fetchApplications = useCallback(async (currentPage = page) => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from("applications")
      .select("*", { count: "exact" })
      .eq("hired", false)
      .order("application_date", { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    if (!error && data) {
      setApplications(data);
      setPageCount(Math.ceil((count || 0) / pageSize));
      setTotalCount(count || 0);
    } else {
      console.error("Fetch error:", error);
    }

    setLoading(false);
  }, [page, supabase]);

  const fetchHiredApplicants = useCallback(async () => {
    setHiredLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from("applications")
      .select("*", { count: "exact" })
      .eq("hired", true)
      .order("start_date", { ascending: false });

    if (!error && data) {
      setHiredApplicants(data);
      setHiredCount(count || 0);
    } else {
      console.error("Fetch hired error:", error);
    }

    setHiredLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchApplications();
    fetchHiredApplicants();
  }, [page, fetchApplications, fetchHiredApplicants]);

  // Realtime subscription
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("applications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
        },
        () => {
          fetchApplications();
          fetchHiredApplicants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, fetchApplications, fetchHiredApplicants, supabase]);

  const resetForm = () => {
    setForm({
      id: undefined,
      application_date: "",
      applicant_name: "",
      nationality: "",
      phone: "",
      email: "",
      re_experience: false,
      first_call_status: "",
      second_call_notes: "",
      appointment_date: "",
      interview_point: "",
      vat_type: "",
      start_date: "",
      hired: false,
    });
    setApplicationDate(null);
    setAppointmentDate(null);
    setStartDate(null);
  };

  const handleAddNew = () => {
    resetForm();
    setApplicationDate(new Date()); // Default to today
    setShowModal(true);
  };

  const handleEdit = (app: Application) => {
    setForm({
      id: app.id,
      application_date: app.application_date || "",
      applicant_name: app.applicant_name || "",
      nationality: app.nationality || "",
      phone: app.phone || "",
      email: app.email || "",
      re_experience: app.re_experience || false,
      first_call_status: app.first_call_status || "",
      second_call_notes: app.second_call_notes || "",
      appointment_date: app.appointment_date || "",
      interview_point: app.interview_point || "",
      vat_type: app.vat_type || "",
      start_date: app.start_date || "",
      hired: app.hired || false,
    });

    setApplicationDate(app.application_date ? new Date(app.application_date) : null);
    setAppointmentDate(app.appointment_date ? new Date(app.appointment_date) : null);
    setStartDate(app.start_date ? new Date(app.start_date) : null);

    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/applications?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Application deleted successfully",
          variant: "default",
        });
        setDeleteConfirmId(null);
        fetchApplications(1);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete application",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!form.applicant_name || !applicationDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields: Applicant Name and Date",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const payload = {
      ...form,
      application_date: applicationDate ? applicationDate.toISOString().split("T")[0] : null,
      appointment_date: appointmentDate ? appointmentDate.toISOString().split("T")[0] : null,
      start_date: startDate ? startDate.toISOString().split("T")[0] : null,
    };

    try {
      const response = await fetch("/api/applications", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: form.id ? "Application updated successfully" : "Application added successfully",
          variant: "default",
        });
        setShowModal(false);
        resetForm();
        await fetchApplications(1);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save application",
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
    return date.toLocaleDateString("en-GB");
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
      <div className="relative mt-8">
        <Link
          href={dashboardUrl}
          className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path
              d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"
              fill="currentColor"
            />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Job Applications</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total: <span className="font-semibold text-purple-600">{totalCount}</span> applications
            </p>
          </div>
          <Button
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2"
            onClick={handleAddNew}
          >
            <Plus className="h-4 w-4" /> Add Applicant
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
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
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  applications.map((app, idx) => (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(app.application_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {app.applicant_name || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.nationality || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.phone || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.email || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            app.re_experience
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {app.re_experience ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {app.first_call_status ? (
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(app.first_call_status)}`}>
                            {app.first_call_status}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                        {app.second_call_notes || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(app.appointment_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.interview_point || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.vat_type || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(app.start_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(app)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteConfirmId(app.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                  const showPage =
                    pageNum === 1 ||
                    pageNum === pageCount ||
                    (pageNum >= page - 1 && pageNum <= page + 1);

                  const showEllipsisBefore = pageNum === page - 2 && page > 3;
                  const showEllipsisAfter = pageNum === page + 2 && page < pageCount - 2;

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return (
                      <span key={pageNum} className="px-2">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 min-w-[40px] ${
                        page === pageNum ? "bg-purple-500 hover:bg-purple-600 text-white" : ""
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

      {/* Hired Team Members Table */}
      <Card className="mt-8">
        <CardHeader className="bg-green-50 dark:bg-green-900/20">
          <div>
            <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hired Team Members
            </CardTitle>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Total: <span className="font-semibold">{hiredCount}</span> team members
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-green-100 dark:bg-green-900/40">
                <tr>
                  {hiredColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {hiredLoading ? (
                  <tr>
                    <td colSpan={hiredColumns.length} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : hiredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={hiredColumns.length} className="px-4 py-8 text-center text-gray-500">
                      No hired team members yet.
                    </td>
                  </tr>
                ) : (
                  hiredApplicants.map((app, idx) => (
                    <tr
                      key={app.id}
                      className="hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(app.start_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {app.applicant_name || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.nationality || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.phone || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.email || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {app.vat_type || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(app)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteConfirmId(app.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this application? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirmId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {form.id ? "Edit Applicant" : "Add New Applicant"}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Date, Applicant Name, Nationality */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      selected={applicationDate}
                      onChange={(date) => setApplicationDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 ${
                        applicationDate ? "border-gray-300" : "border-red-500"
                      }`}
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Applicant Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={form.applicant_name}
                      onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                      placeholder="Enter applicant name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nationality</label>
                    <Input
                      value={form.nationality}
                      onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                      placeholder="Enter nationality"
                    />
                  </div>
                </div>

                {/* Row 2: Phone, Email, R.E. Experience */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="re_experience"
                      checked={form.re_experience}
                      onChange={(e) => setForm({ ...form, re_experience: e.target.checked })}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="re_experience" className="text-sm font-medium">
                      Real Estate Experience
                    </label>
                  </div>
                </div>

                {/* Row 3: First Call Status, Second Call Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">1st Call Status</label>
                    <Select
                      options={FIRST_CALL_STATUS_OPTIONS}
                      value={
                        form.first_call_status
                          ? FIRST_CALL_STATUS_OPTIONS.find((opt) => opt.value === form.first_call_status)
                          : null
                      }
                      onChange={(option) =>
                        setForm({ ...form, first_call_status: option ? option.value : "" })
                      }
                      isClearable
                      placeholder="Select status"
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "40px",
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">2nd Call Notes</label>
                    <Input
                      value={form.second_call_notes}
                      onChange={(e) => setForm({ ...form, second_call_notes: e.target.value })}
                      placeholder="Enter notes"
                    />
                  </div>
                </div>

                {/* Row 4: Appointment Date, Interview Point */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Appointment Date</label>
                    <DatePicker
                      selected={appointmentDate}
                      onChange={(date) => setAppointmentDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Interview Point</label>
                    <Input
                      value={form.interview_point}
                      onChange={(e) => setForm({ ...form, interview_point: e.target.value })}
                      placeholder="e.g., 7/10"
                    />
                  </div>
                </div>

                {/* Row 5: VAT Type, Start Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">VAT Type</label>
                    <Select
                      options={VAT_TYPE_OPTIONS}
                      value={
                        form.vat_type
                          ? VAT_TYPE_OPTIONS.find((opt) => opt.value === form.vat_type)
                          : null
                      }
                      onChange={(option) => setForm({ ...form, vat_type: option ? option.value : "" })}
                      isClearable
                      placeholder="Select VAT type"
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "40px",
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                      placeholderText="Select date"
                    />
                  </div>
                </div>

                {/* Row 6: Hired Checkbox */}
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <input
                    type="checkbox"
                    id="hired"
                    checked={form.hired}
                    onChange={(e) => setForm({ ...form, hired: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="hired" className="text-sm font-medium text-green-800 dark:text-green-200">
                    Hired - Mark this applicant as a team member
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {submitting ? "Saving..." : form.id ? "Update" : "Add Applicant"}
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
