import type { Metadata } from 'next'
import { seoPages, generateOGMetadata } from '@/lib/seo'
import packageJson from '@/package.json'

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
      <p className="text-sm sm:text-base text-muted-foreground mb-6 text-center max-w-md">Your Letting Assistant with Powerful Tools</p>
      <a 
        href="/sign-in" 
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl"
      >
        Start
      </a>
      <p className="mt-6 text-sm text-gray-400">Version {packageJson.version}</p>
    </main>
  )
}