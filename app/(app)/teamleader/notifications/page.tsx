"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, AlertCircle, Info, Calendar, Euro } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  agent_name: string;
  created_at: string;
  metadata?: Record<string, any>;
}

const pageSize = 50;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);

      // Build query
      let query = supabase
        .from("activity")
        .select(`
          id,
          type,
          data,
          created_at,
          profiles!activity_user_id_fkey(full_name)
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filter
      if (filterType !== "all") {
        query = query.eq("type", filterType);
      }

      // Apply pagination
      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;

      if (!error && data) {
        const mappedNotifications: Notification[] = data.map((item: any) => {
          const agentName = item.profiles?.full_name || "Unknown";
          const notifData = item.data || {};
          
          let title = "";
          let message = "";

          switch (item.type) {
            case "new_viewing_added":
              title = "New Viewing Added";
              message = `${agentName} added a viewing for ${notifData.ref_no || "N/A"} - ${notifData.client_name || "N/A"}`;
              break;
            case "viewing_updated":
              title = "Viewing Updated";
              message = `${agentName} updated viewing for ${notifData.ref_no || "N/A"} - ${notifData.client_name || "N/A"}`;
              break;
            case "new_revenue_added":
              title = "New Deal Added";
              message = `${agentName} added a deal for ${notifData.ref_no || "N/A"} - ${notifData.client_name || "N/A"}`;
              break;
            case "revenue_updated":
              title = "Deal Updated";
              message = `${agentName} updated deal for ${notifData.ref_no || "N/A"} - ${notifData.client_name || "N/A"}`;
              break;
            case "listing_created":
              title = "New Listing Created";
              message = `${agentName} created listing: ${notifData.title || "Untitled"}`;
              break;
            case "listing_updated":
              title = "Listing Updated";
              message = `${agentName} updated listing: ${notifData.title || "Untitled"}`;
              break;
            case "client_created":
              title = "New Client Added";
              message = `${agentName} added client: ${notifData.name || "Unnamed"}`;
              break;
            case "post_shared":
              title = "Post Shared";
              message = `${agentName} shared post: ${notifData.title || "Untitled"}`;
              break;
            case "teamwork_listing_shared":
              title = "Listing Shared to Teamwork";
              message = `${agentName} shared listing to teamwork: ${notifData.listing_title || "N/A"}`;
              break;
            case "teamwork_client_shared":
              title = "Client Shared to Teamwork";
              message = `${agentName} shared client to teamwork: ${notifData.client_name || "N/A"}`;
              break;
            default:
              title = item.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
              message = `${agentName} performed action: ${item.type}`;
          }

          return {
            id: item.id,
            type: item.type,
            title,
            message,
            agent_name: agentName,
            created_at: item.created_at,
            metadata: notifData,
          };
        });

        setNotifications(mappedNotifications);
        setPageCount(Math.ceil((count || 0) / pageSize));
      }

      setLoading(false);
    }

    fetchNotifications();
  }, [page, filterType, supabase]);

  const getIcon = (type: string) => {
    if (type.includes("viewing")) {
      return <Calendar className="h-5 w-5 text-blue-600" />;
    } else if (type.includes("revenue") || type.includes("deal")) {
      return <Euro className="h-5 w-5 text-green-600" />;
    } else if (type.includes("error") || type.includes("failed")) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    } else if (type.includes("success") || type.includes("completed")) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <Info className="h-5 w-5 text-gray-600" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
      <div className="relative mt-8">
        <Link href="/teamleader" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-purple-600" />
              <CardTitle>System Notifications</CardTitle>
            </div>
            
            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter:</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Notifications</option>
                <option value="new_viewing_added">New Viewings</option>
                <option value="viewing_updated">Viewing Updates</option>
                <option value="new_revenue_added">New Deals</option>
                <option value="revenue_updated">Deal Updates</option>
                <option value="listing_created">Listing Created</option>
                <option value="client_created">Client Created</option>
                <option value="post_shared">Post Shared</option>
                <option value="teamwork_listing_shared">Teamwork Listings</option>
                <option value="teamwork_client_shared">Teamwork Clients</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No notifications found.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-700 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {notification.agent_name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {notification.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
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
                        className={`px-3 py-1 min-w-[40px] ${
                          page === pageNum
                            ? "bg-purple-500 hover:bg-purple-600 text-white"
                            : ""
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
      </div>
    </div>
  );
}
