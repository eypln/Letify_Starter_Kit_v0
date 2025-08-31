export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          full_name: string | null
          phone: string | null
          status: 'pending_admin' | 'approved' | 'denied'
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          full_name?: string | null
          phone?: string | null
          status?: 'pending_admin' | 'approved' | 'denied'
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          full_name?: string | null
          phone?: string | null
          status?: 'pending_admin' | 'approved' | 'denied'
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      users_integrations: {
        Row: {
          id: string
          user_id: string
          fb_page_id: string | null
          fb_access_token: string | null
          fb_app_secret: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fb_page_id?: string | null
          fb_access_token?: string | null
          fb_app_secret?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fb_page_id?: string | null
          fb_access_token?: string | null
          fb_app_secret?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          listing_id: string | null
          kind: 'content' | 'post' | 'video' | 'reels_post'
          status: 'queued' | 'running' | 'done' | 'error'
          progress_int: number | null
          payload: any | null
          result: any | null
          result_url: string | null
          error_msg: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id?: string | null
          kind: 'content' | 'post' | 'video' | 'reels_post'
          status?: 'queued' | 'running' | 'done' | 'error'
          progress_int?: number | null
          payload?: any | null
          result?: any | null
          error_msg?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string | null
          kind?: 'content' | 'post' | 'video' | 'reels_post'
          status?: 'queued' | 'running' | 'done' | 'error'
          progress_int?: number | null
          payload?: any | null
          result?: any | null
          error_msg?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}