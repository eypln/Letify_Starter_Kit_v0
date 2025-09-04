"use client";
"use client";

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle } from 'lucide-react'
import StartContent from './_components/StartContent'
import ContentDraftPanel from './_components/ContentDraftPanel'
import Step2Upload from '@/components/wizard/step2-upload'
import Step3Post from '@/components/wizard/step3-post'
import Step4PrepareReels from '@/components/wizard/step4-prepare-reels'
import Step5ShareReels from '@/components/wizard/step5-share-reels'
import { ExpiredBannerFromQuery } from '@/components/ui/ToastBanner'
import CreateHeader from '@/components/wizard/CreateHeader'
import { useWizardStore } from '@/lib/wizard/store'

export default function NewPostPage() {
  const searchParams = useSearchParams();
  const urlStep = Number(searchParams.get('step') || 1);
  const jobId = searchParams.get('job');
  const wizardStep = useWizardStore((s) => s.step);
  
  // Wizard store'dan gelen step'i kullan, URL'deki step sadece fallback
  const step = wizardStep || urlStep;

  // Debug: Component render bilgisi
  React.useEffect(() => {
    console.log('📄 NewPostPage rendered:', { step, jobId, allParams: searchParams.toString() });
  }, [step, jobId, searchParams]);

  const steps = [
    {
      step: 1,
      title: 'Paste Listing URL → Start Content',
      description: 'Paste the listing link, n8n WF#1 scrapes + prepares caption',
      status: step >= 1 ? 'active' : 'pending',
    },
    {
      step: 2,
      title: 'Upload Pictures',
      description: 'Up to 15 images, each ≤1MB; organize with thumbnail grid',
      status: step >= 2 ? 'active' : 'pending',
    },
    {
      step: 3,
      title: 'Share a Post',
      description: 'Share Facebook Post with n8n WF#2, get post_url',
      status: step >= 3 ? 'active' : 'pending',
    },
    {
      step: 4,
      title: 'Prepare Reels',
      description: 'Select 5 images, choose video template, render with n8n',
      status: step >= 4 ? 'active' : 'pending',
    },
    {
      step: 5,
      title: 'Share a Reels',
      description: 'Share Reels with WF#4, get final reel_url',
      status: step >= 5 ? 'active' : 'pending',
    },
  ];
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <ExpiredBannerFromQuery />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Create New Post</h1>
        <a href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Create New Post</span>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Access Approved
                </Badge>
              </CardTitle>
              <CardDescription>
                Start with a listing URL, generate AI-powered content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {steps.map((item) => (
                  <div
                    key={item.step}
                    className={`border rounded-lg p-4 ${
                      item.status === 'active' ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          item.status === 'active'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 1: İçerik ve ContentDraftPanel */}
              {step === 1 && <ContentDraftPanel />}
              
              {/* Eğer jobId yoksa StartContent'i de göster */}
              {!jobId && <StartContent />}
              
              {/* Step 2: Upload Pictures */}
              {step === 2 && <Step2Upload />}
              
              {/* Step 3: Share a Post */}
              {step === 3 && <Step3Post />}
              
              {/* Step 4: Prepare Reels */}
              {step === 4 && <Step4PrepareReels />}
              
              {/* Step 5: Share Reels */}
              {step === 5 && <Step5ShareReels />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Status</span>
                <Badge className="bg-green-100 text-green-800">
                  Approved
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Facebook Integration</span>
                <Badge className="bg-green-100 text-green-800">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Limit</span>
                <span className="text-sm text-green-600">∞ Unlimited</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No shares yet. Start by creating your first content!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p>• Choose high-resolution images</p>
                <p>• Make sure your listing title is clear</p>
                <p>• Ensure your Facebook page is active</p>
                <p>• Video render time is 5-6 minutes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}