"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useBillingController } from './subscription/useBillingController';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, BarChart3, FileText, Users, Settings, Users2, Calendar, Euro } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpiredBannerFromQuery } from '@/components/ui/ToastBanner';

export default function DashboardClient({ user, profile }: { user: any; profile: any }) {
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
  const { toast } = useToast();
  const supabase = createClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [totalListings, setTotalListings] = useState<number | null>(null);
  const [sharesThisMonth, setSharesThisMonth] = useState<number | null>(null);
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [clientsThisMonth, setClientsThisMonth] = useState<number | null>(null);
  const [viewingsThisMonth, setViewingsThisMonth] = useState<number | null>(null);
  const [totalViewings, setTotalViewings] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Quick Stats: Toplam ve bu ayki paylaşım sayısını çek
  useEffect(() => {
    async function fetchStats() {
      // Listing statistics
      const { count: total, error: totalError } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });
      if (!totalError) setTotalListings(total ?? 0);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayISO = firstDay.toISOString();
      const { count: monthCount, error: monthError } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayISO);
      if (!monthError) setSharesThisMonth(monthCount ?? 0);

      // Client statistics
      const { count: totalClientsCount, error: totalClientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!totalClientsError) setTotalClients(totalClientsCount ?? 0);

      const { count: monthClientsCount, error: monthClientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', firstDayISO);
      if (!monthClientsError) setClientsThisMonth(monthClientsCount ?? 0);

      // Viewings statistics
      const { count: totalViewingsCount, error: totalViewingsError } = await supabase
        .from('viewings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!totalViewingsError) setTotalViewings(totalViewingsCount ?? 0);

      const { count: monthViewingsCount, error: monthViewingsError } = await supabase
        .from('viewings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', firstDayISO);
      if (!monthViewingsError) setViewingsThisMonth(monthViewingsCount ?? 0);
    }
    fetchStats();
    // Dashboard refresh event listener
    const handler = () => fetchStats();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [user.id]);

  // Son 7 aktiviteyi çek
  useEffect(() => {
    async function fetchRecentActivities() {
      setRecentLoading(true);
      const { data, error } = await supabase
        .from('activity')
        .select('id, type, data, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);
      if (!error && data) setRecentActivities(data);
      setRecentLoading(false);
    }
    fetchRecentActivities();
    // Dashboard refresh event listener
    const handler = () => fetchRecentActivities();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [user.id]);

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
      
      router.push('/sign-in');
      router.refresh();
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: error.message || 'An error occurred during logout',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Subscription expiry reminder popup */}
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Expiry Reminder</DialogTitle>
            <DialogDescription>
              {sub && sub.current_period_end ? (
                <>
                  Your <b>{sub.plan_type === 'mini' ? 'Mini' : 'Full'} Plan</b> will expire on <b>{new Date(sub.current_period_end).toLocaleDateString('en-US')}</b>.<br />
                  Please renew your subscription to continue enjoying premium features.<br />
                  If you do not renew, your account will be downgraded to the Free plan.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      <div className="relative min-h-screen">
      <div className="pt-8 container mx-auto px-4 md:px-8 lg:px-16">
        {/* Çıkış butonu sağ üstte, container padding içinde */}
        <div className="flex justify-end mb-4">
          <Button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, {profile.full_name || user.email?.split('@')[0]}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to create content on Letify?
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/new-post" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-6 w-6 text-purple-600" />
                  <span>Create New Post</span>
                </CardTitle>
                <CardDescription>
                  Generate content automatically from a listing link and share on Facebook
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">Start</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/listings" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span>Listings</span>
                </CardTitle>
                <CardDescription>
                  View your created content and shares
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700">View</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/analytics" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <span>Analytics</span>
                </CardTitle>
                <CardDescription>
                  Analyze your sharing performance and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700">Analyze</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/clients" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <span>Clients</span>
                </CardTitle>
                <CardDescription>
                  Client management and reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold">Add Lead</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/subscription" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                  <span>Subscription</span>
                </CardTitle>
                <CardDescription>
                  Manage your plan and billing information
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700">Manage</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/profile" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-purple-600" />
                  <span>Profile</span>
                </CardTitle>
                <CardDescription>
                  Account settings and Facebook integration
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="outline" className="w-full bg-purple-100 text-purple-700">Settings</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/teamwork" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users2 className="h-6 w-6 text-purple-600" />
                  <span>Teamwork</span>
                </CardTitle>
                <CardDescription>
                  Collaborate with your teammate if you have only a client or property in hand
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700">Collaborate</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/viewings" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <span>Viewings</span>
                </CardTitle>
                <CardDescription>
                  Follow up your viewings with your calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700">Schedule</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/revenue" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Euro className="h-6 w-6 text-purple-600" />
                  <span>Revenue</span>
                </CardTitle>
                <CardDescription>
                  Rented records, contract dates, commission income include listing fee and bonuses
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700">View</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posts This Month:</span>
                  <span className="font-medium">{sharesThisMonth === null ? '...' : sharesThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Listings:</span>
                  <span className="font-medium">{totalListings === null ? '...' : totalListings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clients This Month:</span>
                  <span className="font-medium">{clientsThisMonth === null ? '...' : clientsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Clients:</span>
                  <span className="font-medium">{totalClients === null ? '...' : totalClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Viewings This Month:</span>
                  <span className="font-medium">{viewingsThisMonth === null ? '...' : viewingsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Viewings:</span>
                  <span className="font-medium">{totalViewings === null ? '...' : totalViewings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Integration:</span>
                  <span className="font-medium">Facebook</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : recentActivities.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet. Start by creating your first content!</p>
              ) : (
                <ul className="space-y-2">
                  {recentActivities.map((activity) => (
                    <li key={activity.id} className="flex items-center justify-between">
                      <span>
                        {activity.type === 'listing' && 'New Listing Shared'}
                        {activity.type === 'subscription' && 'Subscription Purchased'}
                        {activity.type === 'credit' && `Credit Purchased: ${activity.data?.amount || 'N/A'}`}
                        {activity.type === 'profile_update' && 'Profile Updated'}
                        {activity.type === 'listing_created' && `New Listing Created: ${activity.data?.title || 'Untitled'}`}
                        {activity.type === 'listing_updated' && `Listing Updated: ${activity.data?.title || 'Untitled'}`}
                        {activity.type === 'client_created' && `New Client Added: ${activity.data?.name || 'Unnamed'}`}
                        {activity.type === 'post_shared' && `Post Shared: ${activity.data?.title || 'Untitled'}`}
                        {activity.type === 'teamwork_listing_shared' && `Listing Shared to Teamwork: ${activity.data?.listing_title || 'N/A'}`}
                        {activity.type === 'teamwork_client_shared' && `Client Shared to Teamwork: ${activity.data?.client_name || 'N/A'}`}
                        {activity.type === 'new_viewing_added' && `New Viewing Added: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`}
                        {activity.type === 'viewing_updated' && `Viewing Updated: ${activity.data?.ref_no || 'N/A'} - ${activity.data?.client_name || 'N/A'}`}
                      </span>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}