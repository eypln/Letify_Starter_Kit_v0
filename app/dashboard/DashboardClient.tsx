"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, BarChart3, FileText, Users, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpiredBannerFromQuery } from '@/components/ui/ToastBanner';

export default function DashboardClient({ user, profile }: { user: any; profile: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
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
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Çıkış yapılırken bir hata oluştu');
      }

      router.push('/sign-in');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      toast({
  title: 'Logout failed',
  description: 'An error occurred during logout',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
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
              Welcome, {user.email?.split('@')[0]}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to create content on Letify?
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/new-post">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
          <Link href="/dashboard/listings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
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
          <Link href="/dashboard/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
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
          <Link href="/dashboard/clients">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <span>Clients</span>
                </CardTitle>
                <CardDescription>
                  Client management and reporting (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
          <Button variant="secondary" className="w-full bg-purple-100 text-purple-700" disabled>Coming Soon</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/subscription">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
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
          <Link href="/dashboard/profile">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares This Month:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Listings:</span>
                  <span className="font-medium">0</span>
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
              <p className="text-muted-foreground text-sm">
                No activity yet. Start by creating your first content!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
