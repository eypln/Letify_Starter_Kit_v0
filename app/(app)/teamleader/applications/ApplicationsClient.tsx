"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2, X, Download, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";
import HiredDocumentUpload from "./HiredDocumentUpload";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const PIE_COLORS: Record<string, string> = {
  "No Reply": "#991b1b",
  "Not interested anymore": "#facc15",
  "Missing Contact": "#374151",
  "Requires Follow-up": "#86efac",
  "Scheduled Interview": "#22c55e",
  "Found a job": "#fb923c",
  "Refused Applicant": "#d1d5db",
  "Hired": "#a855f7",
};

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
  cv_webviewlink: string | null;
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
  cv_webviewlink: string;
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
      return "bg-red-800 text-white dark:bg-red-900 dark:text-red-100";
    case "Not interested anymore":
      return "bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900";
    case "Found a job":
      return "bg-orange-400 text-orange-900 dark:bg-orange-500 dark:text-orange-900";
    case "Scheduled Interview":
      return "bg-green-500 text-white dark:bg-green-600 dark:text-green-100";
    case "Requires Follow-up":
      return "bg-green-300 text-green-900 dark:bg-green-400 dark:text-green-900";
    case "Missing Contact":
      return "bg-gray-700 text-white dark:bg-gray-800 dark:text-gray-100";
    case "Refused Applicant":
      return "bg-gray-200 text-gray-700 dark:bg-gray-400 dark:text-gray-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
};

// Row tint based on status
const getRowTint = (status: string | null) => {
  switch (status) {
    case "Scheduled Interview":
      return "bg-green-50/60 dark:bg-green-900/10";
    case "Requires Follow-up":
      return "bg-green-50/40 dark:bg-green-900/5";
    case "No Reply":
      return "bg-red-50/50 dark:bg-red-900/10";
    case "Refused Applicant":
      return "bg-gray-50/80 dark:bg-gray-800/20";
    case "Not interested anymore":
      return "bg-yellow-50/40 dark:bg-yellow-900/5";
    case "Found a job":
      return "bg-orange-50/40 dark:bg-orange-900/5";
    case "Missing Contact":
      return "bg-gray-100/60 dark:bg-gray-800/10";
    default:
      return "";
  }
};

interface StatusCounts {
  [key: string]: number;
}

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
  const [hiredPage, setHiredPage] = useState(1);
  const [hiredPageCount, setHiredPageCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);
  const inlineRef = useRef<HTMLDivElement>(null);
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) {
        setBulkActionOpen(false);
      }
      if (inlineRef.current && !inlineRef.current.contains(e.target as Node)) {
        setInlineEditId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchApplications = useCallback(async (currentPage = page, search = debouncedSearch) => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("applications")
      .select("*", { count: "exact" })
      .eq("hired", false);

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`applicant_name.ilike.${term},phone.ilike.${term}`);
    }

    if (statusFilter.length > 0) {
      query = query.in("first_call_status", statusFilter);
    }

    const { data, error, count } = await query
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter]);

  const fetchStatusCounts = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("applications")
      .select("first_call_status")
      .eq("hired", false);

    if (!error && data) {
      const counts: StatusCounts = {};
      data.forEach((row: { first_call_status: string | null }) => {
        const status = row.first_call_status || "No Status";
        counts[status] = (counts[status] || 0) + 1;
      });
      setStatusCounts(counts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const HIRED_PER_PAGE = 20;

  const fetchHiredApplicants = useCallback(async () => {
    setHiredLoading(true);

    const from = (hiredPage - 1) * HIRED_PER_PAGE;
    const to = from + HIRED_PER_PAGE - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from("applications")
      .select("*", { count: "exact" })
      .eq("hired", true)
      .order("start_date", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setHiredApplicants(data);
      setHiredCount(count || 0);
      setHiredPageCount(Math.max(1, Math.ceil((count || 0) / HIRED_PER_PAGE)));
    } else {
      console.error("Fetch hired error:", error);
    }

    setHiredLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiredPage]);

  useEffect(() => {
    fetchApplications();
    fetchHiredApplicants();
    fetchStatusCounts();
  }, [page, fetchApplications, fetchHiredApplicants, fetchStatusCounts]);

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
          fetchStatusCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchApplications, fetchHiredApplicants, fetchStatusCounts]);

  // Clear selections when page/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, statusFilter]);

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
      cv_webviewlink: "",
    });
    setApplicationDate(null);
    setAppointmentDate(null);
    setStartDate(null);
  };

  const handleAddNew = () => {
    resetForm();
    setApplicationDate(new Date());
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
      cv_webviewlink: app.cv_webviewlink || "",
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
        toast({ title: "Application deleted successfully", variant: "default" });
        setDeleteConfirmId(null);
        fetchApplications(1);
        fetchStatusCounts();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete application", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const response = await fetch(`/api/applications?ids=${ids.join(",")}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        toast({ title: `${result.deleted} application(s) deleted`, variant: "default" });
        setSelectedIds(new Set());
        setBulkDeleteConfirm(false);
        fetchApplications(1);
        fetchStatusCounts();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const response = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, first_call_status: status }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: `${result.updated} application(s) updated`, variant: "default" });
        setSelectedIds(new Set());
        setBulkActionOpen(false);
        fetchApplications();
        fetchStatusCounts();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    }
  };

  const handleInlineStatusUpdate = async (appId: number, status: string) => {
    try {
      const response = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [appId], first_call_status: status }),
      });
      const result = await response.json();
      if (result.success) {
        setInlineEditId(null);
        fetchApplications();
        fetchStatusCounts();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.applicant_name || !applicationDate) {
      toast({ title: "Validation Error", description: "Please fill in required fields: Applicant Name and Date", variant: "destructive" });
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
        toast({ title: form.id ? "Application updated successfully" : "Application added successfully", variant: "default" });
        setShowModal(false);
        resetForm();
        await fetchApplications(1);
        fetchStatusCounts();
      } else {
        toast({ title: "Error", description: result.error || "Failed to save application", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB");
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map(a => a.id)));
    }
  };

  const handleExportExcel = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("applications")
      .select("*")
      .eq("hired", false);

    if (debouncedSearch.trim()) {
      const term = `%${debouncedSearch.trim()}%`;
      query = query.or(`applicant_name.ilike.${term},phone.ilike.${term}`);
    }
    if (statusFilter.length > 0) {
      query = query.in("first_call_status", statusFilter);
    }

    const { data } = await query.order("application_date", { ascending: false });

    if (!data || data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Date", "Applicant", "Nationality", "Phone", "Email", "R.E. Experience", "1st Call", "2nd Call", "Appointment", "Interview Point", "VAT Type", "Start Date"];
    const rows = data.map((app: Application) => ({
      "Date": formatDate(app.application_date),
      "Applicant": app.applicant_name || "",
      "Nationality": app.nationality || "",
      "Phone": app.phone || "",
      "Email": app.email || "",
      "R.E. Experience": app.re_experience ? "Yes" : "No",
      "1st Call": app.first_call_status || "",
      "2nd Call": app.second_call_notes || "",
      "Appointment": formatDate(app.appointment_date),
      "Interview Point": app.interview_point || "",
      "VAT Type": app.vat_type || "",
      "Start Date": formatDate(app.start_date),
    }));

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws["!cols"] = headers.map(h => ({ wch: h === "Email" ? 28 : h === "Applicant" ? 22 : 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, `job_applications_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({ title: `Exported ${data.length} applications`, variant: "default" });
  };

  const handleExportPdfReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    // Title
    doc.setFontSize(20);
    doc.setTextColor(107, 33, 168); // purple
    doc.text("Job Applications Report", 105, 22, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`From 01.06.2025  |  Generated: ${dateStr}`, 105, 30, { align: "center" });

    // Divider line
    doc.setDrawColor(168, 85, 247);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    // Overview section
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Overview", 14, 44);

    const allStatusTotal = FIRST_CALL_STATUS_OPTIONS.reduce((s, o) => s + (statusCounts[o.value] || 0), 0);
    const grandTotal = allStatusTotal + hiredCount;

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Applications (in pipeline): ${allStatusTotal}`, 14, 53);
    doc.text(`Hired Team Members: ${hiredCount}`, 14, 60);
    doc.text(`Grand Total: ${grandTotal}`, 14, 67);

    // Status breakdown table
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Status Breakdown", 14, 80);

    const statusRows = FIRST_CALL_STATUS_OPTIONS.map(opt => {
      const count = statusCounts[opt.value] || 0;
      const pct = grandTotal > 0 ? ((count / grandTotal) * 100).toFixed(1) : "0.0";
      return [opt.label, String(count), `${pct}%`];
    });
    statusRows.push(["Hired", String(hiredCount), grandTotal > 0 ? ((hiredCount / grandTotal) * 100).toFixed(1) + "%" : "0.0%"]);
    statusRows.push(["Total", String(grandTotal), "100.0%"]);

    autoTable(doc, {
      startY: 84,
      head: [["Status", "Count", "Percentage"]],
      body: statusRows,
      theme: "grid",
      headStyles: { fillColor: [107, 33, 168], textColor: 255, fontStyle: "bold", fontSize: 10 },
      bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 240, 255] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 35, halign: "center" },
      },
      // Bold the last row (Total)
      didParseCell(data) {
        if (data.section === "body" && data.row.index === statusRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [233, 213, 255];
        }
      },
    });

    // Key insights
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableEndY = (doc as any).lastAutoTable?.finalY || 170;
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Key Insights", 14, tableEndY + 14);

    // Find top status
    let topStatus = "";
    let topCount = 0;
    FIRST_CALL_STATUS_OPTIONS.forEach(opt => {
      const c = statusCounts[opt.value] || 0;
      if (c > topCount) { topCount = c; topStatus = opt.label; }
    });

    const hiredPct = grandTotal > 0 ? ((hiredCount / grandTotal) * 100).toFixed(1) : "0.0";
    const scheduledCount = statusCounts["Scheduled Interview"] || 0;
    const scheduledPct = grandTotal > 0 ? ((scheduledCount / grandTotal) * 100).toFixed(1) : "0.0";
    const noReplyCount = statusCounts["No Reply"] || 0;
    const noReplyPct = grandTotal > 0 ? ((noReplyCount / grandTotal) * 100).toFixed(1) : "0.0";

    const interviewToHire = scheduledCount + hiredCount;
    const conversionPct = interviewToHire > 0 ? ((hiredCount / interviewToHire) * 100).toFixed(1) : "0.0";

    const insights = [
      `Most common status: "${topStatus}" with ${topCount} applicants.`,
      `Hire rate: ${hiredPct}% of all applicants have been hired (${hiredCount} of ${grandTotal}).`,
      `Scheduled interviews: ${scheduledCount} applicants (${scheduledPct}%) are in the pipeline.`,
      `No reply rate: ${noReplyCount} applicants (${noReplyPct}%) have not responded.`,
      `Interview to hire conversion: Out of ${interviewToHire} interviewed applicants, ${hiredCount} were hired (${conversionPct}% conversion rate).`,
    ];

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    let insightY = tableEndY + 22;
    insights.forEach((line) => {
      doc.text(`\u2022  ${line}`, 16, insightY);
      insightY += 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Letify HR — Confidential", 105, 285, { align: "center" });

    doc.save(`applications_report_${now.toISOString().split("T")[0]}.pdf`);
    toast({ title: "PDF Report downloaded", variant: "default" });
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) return prev.filter(s => s !== status);
      return [...prev, status];
    });
    setPage(1);
  };

  const pieData = useMemo(() => {
    const entries = FIRST_CALL_STATUS_OPTIONS.map(opt => ({
      name: opt.label,
      value: statusCounts[opt.value] || 0,
      color: PIE_COLORS[opt.value] || "#9ca3af",
    }));
    entries.push({ name: "Hired", value: hiredCount, color: PIE_COLORS["Hired"] });
    return entries.filter(e => e.value > 0);
  }, [statusCounts, hiredCount]);

  const pieTotal = useMemo(() => pieData.reduce((s, e) => s + e.value, 0), [pieData]);

  const colCount = 16; // checkbox + 15 data columns (includes CV)

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

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {FIRST_CALL_STATUS_OPTIONS.map(opt => {
          const count = statusCounts[opt.value] || 0;
          const isActive = statusFilter.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleStatusFilter(opt.value)}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                isActive
                  ? "ring-2 ring-purple-500 border-purple-400 shadow-md"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
              <div className="mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] leading-tight ${getStatusColor(opt.value)}`}>
                  {opt.label}
                </span>
              </div>
            </button>
          );
        })}
        <div className="rounded-xl border border-purple-300 dark:border-purple-700 p-3 text-left bg-purple-50/50 dark:bg-purple-900/10">
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{hiredCount}</div>
          <div className="mt-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] leading-tight bg-purple-500 text-white dark:bg-purple-600">
              Hired
            </span>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      {pieTotal > 0 && (
        <div className="flex justify-center mb-6">
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-4 pb-2">
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={(props: any) => `${props.name} ${((props.value / pieTotal) * 100).toFixed(1)}%`}
                    labelLine={true}
                    style={{ fontSize: 13 }}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / pieTotal) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Filters */}
      {statusFilter.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-gray-500">Filtering by:</span>
          {statusFilter.map(s => (
            <button
              key={s}
              onClick={() => toggleStatusFilter(s)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(s)}`}
            >
              {s}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={() => { setStatusFilter([]); setPage(1); }}
            className="text-xs text-purple-600 hover:text-purple-800 underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Job Applications</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total: <span className="font-semibold text-purple-600">{totalCount}</span> applications
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-600 font-medium">{selectedIds.size} selected</span>
                <div className="relative" ref={bulkRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkActionOpen(!bulkActionOpen)}
                    className="flex items-center gap-1"
                  >
                    Bulk Actions <ChevronDown className="h-3 w-3" />
                  </Button>
                  {bulkActionOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30 py-1">
                      <div className="px-3 py-1.5 text-xs text-gray-500 uppercase font-medium">Change Status</div>
                      {FIRST_CALL_STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleBulkStatusUpdate(opt.value)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(opt.value).split(" ")[0]}`} />
                          {opt.label}
                        </button>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={() => { setBulkActionOpen(false); setBulkDeleteConfirm(true); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete Selected
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center gap-1"
              title="Export to Excel"
            >
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdfReport}
              className="flex items-center gap-1 text-purple-600 border-purple-300 hover:bg-purple-50"
              title="Download PDF Report"
            >
              <Download className="h-4 w-4" /> PDF Report
            </Button>
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-2"
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4" /> Add Applicant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto relative">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && selectedIds.size === applications.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Nationality</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">R.E. Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">1st Call</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">2nd Call</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Appointment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Interview Point</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">VAT Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">CV</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-8 text-center text-gray-500">
                      {debouncedSearch || statusFilter.length > 0 ? (
                        <div>
                          <p className="mb-2">No results found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}{statusFilter.length > 0 ? " with selected filters" : ""}</p>
                          <button
                            onClick={() => { setSearchQuery(""); setStatusFilter([]); setPage(1); }}
                            className="text-purple-600 hover:text-purple-800 text-sm underline"
                          >
                            Clear all filters
                          </button>
                        </div>
                      ) : (
                        "No applications found."
                      )}
                    </td>
                  </tr>
                ) : (
                  applications.map((app, idx) => {
                    const rowTint = getRowTint(app.first_call_status);
                    const isSelected = selectedIds.has(app.id);
                    return (
                      <tr
                        key={app.id}
                        className={`hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors ${rowTint} ${isSelected ? "!bg-purple-50 dark:!bg-purple-900/20" : ""}`}
                      >
                        <td className="px-2 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(app.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(app.application_date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(app)} className="h-7 w-7 p-0">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                              onClick={() => setDeleteConfirmId(app.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                        {/* 1st Call - inline editable */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm relative">
                          {app.first_call_status ? (
                            <button
                              onClick={() => setInlineEditId(inlineEditId === app.id ? null : app.id)}
                              className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(app.first_call_status)}`}
                              title="Click to change status"
                            >
                              {app.first_call_status}
                            </button>
                          ) : (
                            <button
                              onClick={() => setInlineEditId(inlineEditId === app.id ? null : app.id)}
                              className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                              title="Click to set status"
                            >
                              + Set status
                            </button>
                          )}
                          {inlineEditId === app.id && (
                            <div
                              ref={inlineRef}
                              className="absolute left-2 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30 py-1"
                            >
                              {FIRST_CALL_STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleInlineStatusUpdate(app.id, opt.value)}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                                    app.first_call_status === opt.value ? "bg-gray-50 dark:bg-gray-700 font-semibold" : ""
                                  }`}
                                >
                                  <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(opt.value).split(" ")[0]}`} />
                                  {opt.label}
                                </button>
                              ))}
                            </div>
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {app.cv_webviewlink ? (
                            <a
                              href={app.cv_webviewlink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded text-xs font-medium transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View CV
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1">First</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1">Prev</Button>

              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                  const showPage =
                    pageNum === 1 ||
                    pageNum === pageCount ||
                    (pageNum >= page - 1 && pageNum <= page + 1);

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
                        page === pageNum ? "bg-purple-500 hover:bg-purple-600 text-white" : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === pageCount} className="px-3 py-1">Next</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={page === pageCount} className="px-3 py-1">Last</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hired Team Members Table */}
      <Card className="mt-8">
        <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
          <div>
            <CardTitle className="text-purple-800 dark:text-purple-200 flex items-center gap-2">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hired Team Members
            </CardTitle>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Total: <span className="font-semibold">{hiredCount}</span> team members
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-purple-100 dark:bg-purple-900/40">
                <tr>
                  {hiredColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {hiredLoading ? (
                  <tr>
                    <td colSpan={hiredColumns.length} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : hiredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={hiredColumns.length} className="px-4 py-8 text-center text-gray-500">No hired team members yet.</td>
                  </tr>
                ) : (
                  hiredApplicants.map((app, idx) => (
                    <tr key={app.id} className="hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{(hiredPage - 1) * HIRED_PER_PAGE + idx + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(app.start_date)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">{app.applicant_name || "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{app.nationality || "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{app.phone || "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{app.email || "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{app.vat_type || "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(app)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteConfirmId(app.id)}>
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

          {/* Hired Pagination */}
          {hiredPageCount > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setHiredPage(1)} disabled={hiredPage === 1} className="px-3 py-1">First</Button>
              <Button variant="outline" size="sm" onClick={() => setHiredPage(hiredPage - 1)} disabled={hiredPage === 1} className="px-3 py-1">Prev</Button>

              <div className="flex gap-1">
                {Array.from({ length: hiredPageCount }, (_, i) => i + 1).map((pageNum) => {
                  const showPage =
                    pageNum === 1 ||
                    pageNum === hiredPageCount ||
                    (pageNum >= hiredPage - 1 && pageNum <= hiredPage + 1);

                  const showEllipsisBefore = pageNum === hiredPage - 2 && hiredPage > 3;
                  const showEllipsisAfter = pageNum === hiredPage + 2 && hiredPage < hiredPageCount - 2;

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }

                  if (!showPage) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={hiredPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHiredPage(pageNum)}
                      className={`px-3 py-1 min-w-[40px] ${
                        hiredPage === pageNum ? "bg-purple-500 hover:bg-purple-600 text-white" : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" onClick={() => setHiredPage(hiredPage + 1)} disabled={hiredPage === hiredPageCount} className="px-3 py-1">Next</Button>
              <Button variant="outline" size="sm" onClick={() => setHiredPage(hiredPageCount)} disabled={hiredPage === hiredPageCount} className="px-3 py-1">Last</Button>
            </div>
          )}
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
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirmId)} className="bg-red-600 hover:bg-red-700">Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Bulk Delete</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-bold text-red-600">{selectedIds.size}</span> application(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                Delete {selectedIds.size} Application(s)
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

                <div>
                  <label className="block text-sm font-medium mb-1">CV Link (Google Drive)</label>
                  <div className="flex gap-2">
                    <Input
                      value={form.cv_webviewlink}
                      onChange={(e) => setForm({ ...form, cv_webviewlink: e.target.value })}
                      placeholder="Paste Google Drive webViewLink here"
                    />
                    {form.cv_webviewlink && (
                      <a
                        href={form.cv_webviewlink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded text-sm whitespace-nowrap"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open
                      </a>
                    )}
                  </div>
                </div>

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

                <HiredDocumentUpload
                  applicantName={form.applicant_name}
                  isHired={form.hired}
                />

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
