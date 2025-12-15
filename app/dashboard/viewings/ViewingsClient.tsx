"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function ViewingsClient() {
  return (
    <div className="relative min-h-screen">
      <div className="pt-8 container mx-auto px-4 md:px-8 lg:px-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Viewings</h1>
          <p className="text-muted-foreground mt-2">
            Follow up your viewings with your calendar
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="relative">
            <Link href="/dashboard" className="absolute -top-14 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
              </svg>
              Dashboard
            </Link>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <span>Viewing Schedule</span>
                </CardTitle>
              <CardDescription>
                Track and manage property viewings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Coming soon - Schedule and track your property viewings here
              </p>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
