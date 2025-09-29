'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { IntegrationFormSchema, type IntegrationFormData, ProfileUpdateSchema, type ProfileUpdateFormData } from '@/lib/validation'
import { logActivity } from '@/lib/activity'

export async function upsertIntegration(data: IntegrationFormData) {
  try {
    // Validation
    const validatedData = IntegrationFormSchema.parse(data)
    
    // Get current user
    const user = await getUser()
    if (!user) {
  return { success: false, error: 'User not found' }
    }

  const supabase = await createClient()

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
  return { success: false, error: 'Integration information could not be saved' }
    }

    // Revalidate the profile page
    revalidatePath('/dashboard/profile')

    return { success: true }
  } catch (error) {
    console.error('Upsert integration error:', error)
  return { success: false, error: 'Invalid data format' }
  }
}

export async function updateProfile(data: ProfileUpdateFormData) {
  try {
    // Validation
    const validatedData = ProfileUpdateSchema.parse(data)
    
    // Get current user
    const user = await getUser()
    if (!user) {
  return { success: false, error: 'User not found' }
    }

  const supabase = await createClient()

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
  return { success: false, error: 'Profile information could not be updated' }
    }

    // Activity log: profile update
    await logActivity(supabase, { user_id: user.id, type: 'profile_update' });

    // Revalidate the profile page
    revalidatePath('/dashboard/profile')

    return { success: true }
  } catch (error) {
    console.error('Update profile error:', error)
  return { success: false, error: 'Invalid data format' }
  }
}