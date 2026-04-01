"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useBillingController } from './subscription/useBillingController';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, BarChart3, FileText, Users, Settings, Users2, Calendar, Euro } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { PWAInstallButton } from '@/components/system/PWAInstallButton';

interface Activity {
  id: string;
  type: string;
  created_at: string;
  data?: Record<string, unknown> | null;
}

/** Activity type → label map: Bilinmeyen type'lar UI'da boş gösterilmesin */
function getActivityLabel(activity: Activity): string {
  switch (activity.type) {
    case 'listing': return 'New Listing Shared';
    case 'subscription': return 'Subscription Purchased';
    case 'credit': return `Credit Purchased: ${activity.data?.amount || 'N/A'}`;
    case 'profile_update': return 'Profile Updated';
    case 'listing_created': return `New Listing Created: ${activity.data?.title || 'Untitled'}`;
    case 'listing_updated': return `Listing Updated: ${activity.data?.title || 'Untitled'}`;
    case 'client_created':
    case 'new_client_added': return `New Client Added: ${activity.data?.name || 'Unnamed'}`;
    case 'post_shared': return `Post Shared: ${activity.data?.title || 'Untitled'}`;
    case 'teamwork_listing_shared': return `Listing Shared to Teamwork: ${activity.data?.listing_title || 'N/A'}`;
    case 'teamwork_client_shared': return `Client Shared to Teamwork: ${activity.data?.client_name || 'N/A'}`;
    case 'new_viewing_added': return `New Viewing Added: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`;
    case 'viewing_updated': return `Viewing Updated: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`;
    case 'new_revenue_added': return `New Revenue Added: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`;
    case 'revenue_updated': return `Revenue Updated: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`;
    case 'deal_finalized': return `Deal Finalized: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`;
    case 'agent_payment_sent': return `Agency Fee Sent: ${activity.data?.ref_no || 'N/A'}`;
    default: return '';
  }
}

interface DashboardStats {
  totalListings: number;
  sharesThisMonth: number;
  totalClients: number;
  clientsThisMonth: number;
  totalViewings: number;
  viewingsThisMonth: number;
  recentActivities: Activity[];
}

interface User {
  id: string;
  email?: string;
}

interface Profile {
  full_name?: string | null;
}

export default function DashboardClient({ user, profile, stats }: { user: User; profile: Profile; stats: DashboardStats }) {
  // Subscription reminder popup state
  const {
    sub,
  } = useBillingController();
  const [showReminder, setShowReminder] = useState(false);
  useEffect(() => {
    if (!sub || !sub.current_period_end || sub.status !== 'active') return;
    const end = new Date(sub.current_period_end);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (daysLeft === 3 || daysLeft === 2 || daysLeft === 1) {
      setShowReminder(true);
    } else {
      setShowReminder(false);
    }
  }, [sub]);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold mb-2">Loading or unauthorized access</h2>
        <p className="text-muted-foreground">Please sign in again.</p>
        <a href="/sign-in" className="mt-4 px-4 py-2 bg-purple-600 text-white rounded">Sign In</a>
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      console.log("Initiating logout request");
      
      // Reset theme preference to light for new user
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('dark');
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Logout response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Logout error response:", errorData);
        throw new Error(errorData.error || 'An error occurred during logout');
      }
      
      const data = await response.json();
      console.log("Logout successful:", data);
      
      router.push('/');
      router.refresh();
    } catch (error) {
      const err = error as Error;
      console.error('Logout error:', error);
      alert('Logout failed: ' + (err.message || 'An error occurred during logout'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Subscription expiry reminder popup */}
      {showReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReminder(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-2">Subscription Expiry Reminder</h2>
            <div className="text-sm text-muted-foreground mb-4">
              {sub && sub.current_period_end ? (
                <>
                  Your <b>{sub.plan_type === 'mini' ? 'Mini' : 'Full'} Plan</b> will expire on <b>{new Date(sub.current_period_end).toLocaleDateString('en-US')}</b>.<br />
                  Please renew your subscription to continue enjoying premium features.<br />
                  If you do not renew, your account will be downgraded to the Free plan.
                </>
              ) : null}
            </div>
            <button
              onClick={() => setShowReminder(false)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <main className="relative min-h-screen">
      <div className="pt-8 container mx-auto px-4 md:px-8 lg:px-16 pb-8">
        {/* Çıkış butonu ve theme toggle sağ üstte, container padding içinde */}
        <div className="flex justify-end items-center gap-2 mb-4">
          <PWAInstallButton />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, {profile.full_name || user.email?.split('@')[0]}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to create posts, leads, viewing schedules and revenue!
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/profile" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-purple-600" />
                  <span>Profile</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Account settings and Facebook integration
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Settings</button>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/new-post" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Plus className="h-6 w-6 text-purple-600" />
                  <span>Create New Post</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate content automatically from a listing link and share on Facebook
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Start</button>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/listings" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span>Listings</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  View your created content and shares
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View</button>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/analytics" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <span>Analytics</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Analyze your sharing performance and statistics
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Analyze</button>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/clients" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <span>Clients</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Client management and reporting
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Add Lead</button>
              </div>
            </div>
          </Link>
          <div className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm opacity-50 cursor-not-allowed h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                  <span>Subscription</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Manage your plan and billing information
                </p>
              </div>
              <div className="p-6 pt-0">
                <button disabled className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed">Manage</button>
              </div>
            </div>
          </div>
          <Link href="/dashboard/teamwork" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Users2 className="h-6 w-6 text-purple-600" />
                  <span>Teamwork</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Collaborate with your teammate if you have only a client or property in hand
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Collaborate</button>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/viewings" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <span>Viewings</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Follow up your viewings with your calendar
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Schedule</button>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/revenue" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Euro className="h-6 w-6 text-purple-600" />
                  <span>Revenue</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Rented records, contract dates, commission income include listing fee and bonuses
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View</button>
              </div>
            </div>
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Quick Stats</h2>
            </div>
            <div className="p-6 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posts This Month:</span>
                  <span className="font-medium">{stats.sharesThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Listings:</span>
                  <span className="font-medium">{stats.totalListings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clients This Month:</span>
                  <span className="font-medium">{stats.clientsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Clients:</span>
                  <span className="font-medium">{stats.totalClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Viewings This Month:</span>
                  <span className="font-medium">{stats.viewingsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Viewings:</span>
                  <span className="font-medium">{stats.totalViewings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Integration:</span>
                  <span className="font-medium">Facebook</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Recent Activities</h2>
            </div>
            <div className="p-6 pt-0">
              {stats.recentActivities.filter((a: Activity) => getActivityLabel(a) !== '').length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet. Start by creating your first content!</p>
              ) : (
                <ul className="space-y-2">
                  {stats.recentActivities.filter((a: Activity) => getActivityLabel(a) !== '').map((activity: Activity) => (
                    <li key={activity.id} className="flex items-center justify-between">
                      <span>{getActivityLabel(activity)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}