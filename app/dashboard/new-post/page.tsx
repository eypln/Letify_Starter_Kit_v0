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
      description: 'İlan linkini yapıştır, n8n WF#1 linkten scrape + caption hazırlar',
      status: step >= 1 ? 'active' : 'pending',
    },
    {
      step: 2,
      title: 'Upload Pictures',
      description: '≤15 dosya, her biri ≤1MB; thumbnail grid ile organize et',
      status: step >= 2 ? 'active' : 'pending',
    },
    {
      step: 3,
      title: 'Share a Post',
      description: 'n8n WF#2 ile Facebook Post paylaş, post_url al',
      status: step >= 3 ? 'active' : 'pending',
    },
    {
      step: 4,
      title: 'Prepare Reels',
      description: '5 görsel seç, video template belirle, n8n ile render et',
      status: step >= 4 ? 'active' : 'pending',
    },
    {
      step: 5,
      title: 'Share a Reels',
      description: 'WF#4 ile Reels paylaş, sonuç reel_url al',
      status: step >= 5 ? 'active' : 'pending',
    },
  ];
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <ExpiredBannerFromQuery />
      <CreateHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>5 Adımlı İçerik Üretim Süreci</span>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Erişim Onaylandı
                </Badge>
              </CardTitle>
              <CardDescription>
                İlan URL'si ile başlayın, yapay zeka destekli içerik üretin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {steps.map((item) => (
                  <div
                    key={item.step}
                    className={`border rounded-lg p-4 ${
                      item.status === 'active' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          item.status === 'active'
                            ? 'bg-blue-600 text-white'
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
              <CardTitle className="text-lg">Hesap Durumu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profil Durumu</span>
                <Badge className="bg-green-100 text-green-800">
                  Onaylandı
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Facebook Entegrasyonu</span>
                <Badge variant="secondary">Kontrol Et</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Limiti</span>
                <span className="text-sm text-green-600">∞ Sınırsız</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Son Paylaşımlar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Henüz paylaşım yapılmamış. İlk içeriğinizi oluşturmaya başlayın!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hızlı İpuçları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p>• Yüksek çözünürlüklü görseller seçin</p>
                <p>• İlan başlığını anlaşılır tutun</p>
                <p>• Facebook sayfanızın aktif olduğundan emin olun</p>
                <p>• Video render süresi 5-6 dakika sürer</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}