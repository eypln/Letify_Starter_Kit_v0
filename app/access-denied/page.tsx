"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Home } from "lucide-react";
import { getDashboardUrl } from "@/lib/middleware/roleGuard";
import type { UserRole } from "@/lib/middleware/roleGuard";

export default function AccessDeniedPage() {
  const router = useRouter();
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/sign-in");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role) {
        setDashboardUrl(getDashboardUrl(profile.role as UserRole));
      } else {
        // Fallback if no role found
        setDashboardUrl("/dashboard");
      }
      
      setLoading(false);
    };

    fetchUserRole();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="pt-6 pb-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-red-100 p-6">
              <ShieldAlert className="h-16 w-16 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-2 text-lg">
            You don't have permission to access this page.
          </p>
          
          <p className="text-gray-500 mb-8 text-sm">
            Please use pages appropriate to your permission level or contact your system administrator.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => dashboardUrl && router.push(dashboardUrl)}
              disabled={!dashboardUrl}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              size="lg"
            >
              <Home className="mr-2 h-5 w-5" />
              Back to Dashboard
            </Button>
            
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Go Back
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Error Code: 403 - Forbidden Access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}