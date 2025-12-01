import type { Metadata } from 'next'
import { seoPages, generateOGMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: seoPages.home.title,
  description: seoPages.home.description,
  ...generateOGMetadata({
    title: seoPages.home.title,
    description: seoPages.home.description,
  }),
}

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src="/icons/Logo/96.png" 
        alt="Letify Logo" 
        width={96} 
        height={96}
        className="mb-6"
      />
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Welcome to Letify</h1>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6 text-center max-w-md">
        <span className="text-sm sm:text-base text-muted-foreground">Your Letting Assistant with Powerful Tools And</span>
        <span className="text-sm sm:text-base text-purple-600 font-medium">More...</span>
      </div>
      <a 
        href="/sign-in" 
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl"
      >
        Start
      </a>
    </main>
  )
}