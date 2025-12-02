export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: number;
          user_id: string;
          adding_date: string | null;
          name: string | null;
          people: string | null;
          bedroom: string | null;
          cities: string | null;
          family_sharing: string | null;
          nationalities: string | null;
          jobs: string | null;
          pet: string | null;
          budget: string | null;
          move_in: string | null;
          phone: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          adding_date?: string | null;
          name?: string | null;
          people?: string | null;
          bedroom?: string | null;
          cities?: string | null;
          family_sharing?: string | null;
          nationalities?: string | null;
          jobs?: string | null;
          pet?: string | null;
          budget?: string | null;
          move_in?: string | null;
          phone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          adding_date?: string | null;
          name?: string | null;
          people?: string | null;
          bedroom?: string | null;
          cities?: string | null;
          family_sharing?: string | null;
          nationalities?: string | null;
          jobs?: string | null;
          pet?: string | null;
          budget?: string | null;
          move_in?: string | null;
          phone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      activity: {
        Row: {
          id: number;
          user_id: string;
          type: string;
          data: any | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          type: string;
          data?: any | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          type?: string;
          data?: any | null;
          created_at?: string | null;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          status: 'pending_admin' | 'approved' | 'denied';
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          status?: 'pending_admin' | 'approved' | 'denied';
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          status?: 'pending_admin' | 'approved' | 'denied';
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
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
        listings: {
          Row: {
            id: string;
            listing_id: string | null;
            user_id: string;
            property_url: string | null;
            city: string | null;
            price: number | null;
            bedrooms: number | null;
            bathrooms: number | null;
            property_type: string | null;
            description: string | null;
            title: string | null;
            location: string | null;
            fb_post_url: string | null;
            fb_reels_url: string | null;
            available_date: string | null;
            created_at: string;
          };
          Insert: {
            id?: string;
            listing_id?: string | null;
            user_id: string;
            property_url?: string | null;
            city?: string | null;
            price?: number | null;
            bedrooms?: number | null;
            bathrooms?: number | null;
            property_type?: string | null;
            description?: string | null;
            title?: string | null;
            location?: string | null;
            fb_post_url?: string | null;
            fb_reels_url?: string | null;
            available_date?: string | null;
            created_at?: string;
          };
          Update: {
            id?: string;
            listing_id?: string | null;
            user_id?: string;
            property_url?: string | null;
            city?: string | null;
            price?: number | null;
            bedrooms?: number | null;
            bathrooms?: number | null;
            property_type?: string | null;
            description?: string | null;
            title?: string | null;
            location?: string | null;
            fb_post_url?: string | null;
            fb_reels_url?: string | null;
            available_date?: string | null;
            created_at?: string;
          };
        };
        revenue: {
          Row: {
            id: string;
            user_id: string;
            ref_no: string | null;
            client_name: string | null;
            rent_amount: number;
            landlord_fee: number;
            landlord_discount: boolean;
            client_fee: number;
            client_discount: boolean;
            listing_fee: number;
            has_listing_fee: boolean;
            agent_income: number;
            agent_tax: number;
            vatable: boolean;
            date_rented: string | null;
            date_signed: string | null;
            date_move_in: string | null;
            landlord_paid_date: string | null;
            client_paid_date: string | null;
            collaboration_with: string | null;
            inform_boss_after_both_sides_paid: boolean;
            boss_notified: boolean;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            ref_no?: string | null;
            client_name?: string | null;
            rent_amount: number;
            landlord_fee: number;
            landlord_discount?: boolean;
            client_fee: number;
            client_discount?: boolean;
            listing_fee?: number;
            has_listing_fee?: boolean;
            agent_income: number;
            agent_tax?: number;
            vatable?: boolean;
            date_rented?: string | null;
            date_signed?: string | null;
            date_move_in?: string | null;
            landlord_paid_date?: string | null;
            client_paid_date?: string | null;
            collaboration_with?: string | null;
            inform_boss_after_both_sides_paid?: boolean;
            boss_notified?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            ref_no?: string | null;
            client_name?: string | null;
            rent_amount?: number;
            landlord_fee?: number;
            landlord_discount?: boolean;
            client_fee?: number;
            client_discount?: boolean;
            listing_fee?: number;
            has_listing_fee?: boolean;
            agent_income?: number;
            agent_tax?: number;
            vatable?: boolean;
            date_rented?: string | null;
            date_signed?: string | null;
            date_move_in?: string | null;
            landlord_paid_date?: string | null;
            client_paid_date?: string | null;
            collaboration_with?: string | null;
            inform_boss_after_both_sides_paid?: boolean;
            boss_notified?: boolean;
            created_at?: string;
            updated_at?: string;
          };
        };
        teamwork_clients: {
          Row: {
            id: number;
            user_id: string;
            client_id: number;
            agent_name: string;
            teamwork_date: string;
            people: string | null;
            bedroom: string | null;
            cities: string | null;
            family_sharing: string | null;
            nationalities: string | null;
            jobs: string | null;
            pet: string | null;
            budget: string | null;
            move_in: string | null;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: number;
            user_id: string;
            client_id: number;
            agent_name: string;
            teamwork_date?: string;
            people?: string | null;
            bedroom?: string | null;
            cities?: string | null;
            family_sharing?: string | null;
            nationalities?: string | null;
            jobs?: string | null;
            pet?: string | null;
            budget?: string | null;
            move_in?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: number;
            user_id?: string;
            client_id?: number;
            agent_name?: string;
            teamwork_date?: string;
            people?: string | null;
            bedroom?: string | null;
            cities?: string | null;
            family_sharing?: string | null;
            nationalities?: string | null;
            jobs?: string | null;
            pet?: string | null;
            budget?: string | null;
            move_in?: string | null;
            created_at?: string;
            updated_at?: string;
          };
        };
        teamwork_listings: {
          Row: {
            id: number;
            user_id: string;
            listing_id: string;
            agent_name: string;
            teamwork_date: string;
            city: string | null;
            price: number | null;
            bedroom: number | null;
            bathroom: number | null;
            property_type: string | null;
            description: string | null;
            available_date: string | null;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: number;
            user_id: string;
            listing_id: string;
            agent_name: string;
            teamwork_date?: string;
            city?: string | null;
            price?: number | null;
            bedroom?: number | null;
            bathroom?: number | null;
            property_type?: string | null;
            description?: string | null;
            available_date?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: number;
            user_id?: string;
            listing_id?: string;
            agent_name?: string;
            teamwork_date?: string;
            city?: string | null;
            price?: number | null;
            bedroom?: number | null;
            bathroom?: number | null;
            property_type?: string | null;
            description?: string | null;
            available_date?: string | null;
            created_at?: string;
            updated_at?: string;
          };
        };
        push_subscriptions: {
          Row: {
            id: number;
            user_id: string;
            endpoint: string;
            keys: {
              p256dh: string;
              auth: string;
            };
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: number;
            user_id: string;
            endpoint: string;
            keys: {
              p256dh: string;
              auth: string;
            };
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: number;
            user_id?: string;
            endpoint?: string;
            keys?: {
              p256dh: string;
              auth: string;
            };
            created_at?: string;
            updated_at?: string;
          };
        };
        viewings: {
          Row: {
            id: number;
            user_id: string;
            ref_no: string | null;
            city: string | null;
            viewing_date: string | null;
            viewing_time: string | null;
            client_name: string | null;
            client_mobile_no: string | null;
            result: string | null;
            comments: string | null;
            inform_teamleader: boolean;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: number;
            user_id: string;
            ref_no?: string | null;
            city?: string | null;
            viewing_date?: string | null;
            viewing_time?: string | null;
            client_name?: string | null;
            client_mobile_no?: string | null;
            result?: string | null;
            comments?: string | null;
            inform_teamleader?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: number;
            user_id?: string;
            ref_no?: string | null;
            city?: string | null;
            viewing_date?: string | null;
            viewing_time?: string | null;
            client_name?: string | null;
            client_mobile_no?: string | null;
            result?: string | null;
            comments?: string | null;
            inform_teamleader?: boolean;
            created_at?: string;
            updated_at?: string;
          };
        };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_analytics_event: {
        Args: {
          p_event_type: string
          p_event_category: string
          p_event_data?: Record<string, any>
        }
        Returns: string
      }
      get_analytics_summary: {
        Args: {
          p_user_id: string
          p_days_back?: number
        }
        Returns: {
          total_events: number
          unique_event_types: number
          event_category_distribution: Record<string, any>
          daily_breakdown: Record<string, any>
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export interface AnalyticsEvent {
  id: string
  user_id: string
  event_type: string
  event_category: string
  event_data: Record<string, any>
  created_at: string
}

export interface DetailedMetrics {
  id: string
  user_id: string
  metric_date: string
  metric_type: string
  metric_value: number
  metric_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ExportLog {
  id: string
  user_id: string
  export_type: string
  export_format: string
  export_date_range: string
  export_filters: Record<string, any>
  file_name: string
  file_size_bytes: number | null
  row_count: number | null
  export_duration_ms: number | null
  exported_at: string
}

export interface MonthlySummary {
  id: string
  user_id: string
  month: string
  posts_created: number
  posts_viewed: number
  listings_created: number
  clients_added: number
  viewings_scheduled: number
  viewings_completed: number
  revenue_total: string
  revenue_commission: string
  teamwork_shares: number
  active_clients: number
  active_listings: number
  created_at: string
  updated_at: string
}