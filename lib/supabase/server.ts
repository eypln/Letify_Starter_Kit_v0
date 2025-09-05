import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: (input: string | URL | Request | RequestInfo, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store', next: { revalidate: 0 } }),
      },
    }
  )
}

// Server-side utility functions
export async function getSession() {
  const supabase = createClient()
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export async function getUser() {
  const supabase = createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export async function getProfile(userId?: string) {
  const supabase = createClient()
  
  const id = userId || (await getUser())?.id
  if (!id) return null

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export async function getUserIntegrations(userId?: string) {
  const supabase = createClient()
  
  const id = userId || (await getUser())?.id
  if (!id) return null

  try {
    const { data: integrations, error } = await supabase
      .from('users_integrations')
      .select('*')
      .eq('user_id', id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching integrations:', error)
      return null
    }

    return integrations
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

// Export for API routes
export function getSupabaseServer() {
  return createClient()
}