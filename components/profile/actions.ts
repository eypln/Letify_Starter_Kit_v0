'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { IntegrationFormSchema, type IntegrationFormData, ProfileUpdateSchema, type ProfileUpdateFormData } from '@/lib/validation'

export async function upsertIntegration(data: IntegrationFormData) {
  try {
    // Validation
    const validatedData = IntegrationFormSchema.parse(data)
    
    // Get current user
    const user = await getUser()
    if (!user) {
      return { success: false, error: 'Kullanıcı bulunamadı' }
    }

    const supabase = createClient()

    // Upsert integration (insert or update on conflict)
    const { error } = await supabase
      .from('users_integrations')
      .upsert(
        {
          user_id: user.id,
          fb_page_id: validatedData.fb_page_id,
          fb_access_token: validatedData.fb_access_token,
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('Integration upsert error:', error)
      return { success: false, error: 'Entegrasyon bilgileri kaydedilemedi' }
    }

    // Revalidate the profile page
    revalidatePath('/dashboard/profile')

    return { success: true }
  } catch (error) {
    console.error('Upsert integration error:', error)
    return { success: false, error: 'Geçersiz veri formatı' }
  }
}

export async function updateProfile(data: ProfileUpdateFormData) {
  try {
    // Validation
    const validatedData = ProfileUpdateSchema.parse(data)
    
    // Get current user
    const user = await getUser()
    if (!user) {
      return { success: false, error: 'Kullanıcı bulunamadı' }
    }

    const supabase = createClient()

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: validatedData.full_name,
        phone: validatedData.phone,
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Profile update error:', error)
      return { success: false, error: 'Profil bilgileri güncellenemedi' }
    }

    // Revalidate the profile page
    revalidatePath('/dashboard/profile')

    return { success: true }
  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Geçersiz veri formatı' }
  }
}