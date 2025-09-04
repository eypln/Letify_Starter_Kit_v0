
export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome to Letify</h1>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-base text-muted-foreground">Your Social Media Assistant And</span>
        <span className="text-base text-purple-600 font-medium">More...</span>
      </div>
      <a href="/sign-in" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition">Sign In</a>
    </main>
  )
}