import { createClient } from '@/lib/supabase/server'

interface CreateJobArgs {
  userId: string
  listingId?: string | null
  kind: 'content' | 'post' | 'video' | 'reels_post'
  payload?: any
}

interface UpdateJobStatusArgs {
  jobId: string
  status: 'queued' | 'running' | 'done' | 'error'
  progress_int?: number
  result?: any
  error_msg?: string
}

/**
 * Create a new job record in the database
 */
export async function createJob(args: CreateJobArgs): Promise<{ id: string }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: args.userId,
      listing_id: args.listingId,
      kind: args.kind,
      payload: args.payload,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Create job error:', error)
    throw new Error('Job oluşturulamadı')
  }

  return { id: data.id }
}

/**
 * Update job status and related fields
 */
export async function updateJobStatus(args: UpdateJobStatusArgs): Promise<void> {
  const supabase = createClient()
  
  const updateData: any = {
    status: args.status,
  }

  if (args.progress_int !== undefined) {
    updateData.progress_int = args.progress_int
  }

  if (args.result !== undefined) {
    updateData.result = args.result
  }

  if (args.error_msg !== undefined) {
    updateData.error_msg = args.error_msg
  }

  const { error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', args.jobId)

  if (error) {
    console.error('Update job status error:', error)
    throw new Error('Job durumu güncellenemedi')
  }
}