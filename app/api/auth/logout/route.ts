import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  
  // Sign out the user
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    return NextResponse.json({ error: 'Çıkış yapılırken bir hata oluştu' }, { status: 500 })
  }
  
  return NextResponse.json({ message: 'Çıkış yapıldı' })
}