export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          page_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          page_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          page_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_logs: {
        Row: {
          broadcast_id: string
          id: string
          page_id: string
          sent_at: string
          status: string | null
          subscriber_id: string
        }
        Insert: {
          broadcast_id: string
          id?: string
          page_id: string
          sent_at?: string
          status?: string | null
          subscriber_id: string
        }
        Update: {
          broadcast_id?: string
          id?: string
          page_id?: string
          sent_at?: string
          status?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_logs_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_logs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          failed_count: number | null
          id: string
          message_content: Json | null
          name: string
          scheduled_at: string | null
          scheduled_time: string | null
          sent_count: number | null
          status: string | null
          target_pages: string[] | null
          target_all: boolean | null
          is_enabled: boolean | null
          total_recipients: number | null
          user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          failed_count?: number | null
          id?: string
          message_content?: Json | null
          name: string
          scheduled_at?: string | null
          scheduled_time?: string | null
          sent_count?: number | null
          status?: string | null
          target_pages?: string[] | null
          target_all?: boolean | null
          is_enabled?: boolean | null
          total_recipients?: number | null
          user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          failed_count?: number | null
          id?: string
          message_content?: Json | null
          name?: string
          scheduled_at?: string | null
          scheduled_time?: string | null
          sent_count?: number | null
          status?: string | null
          target_pages?: string[] | null
          target_all?: boolean | null
          is_enabled?: boolean | null
          total_recipients?: number | null
          user_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          id: string
          broadcast_id: string
          title: string
          subtitle: string | null
          image_url: string | null
          buttons: Json | null
          text_content: string | null
          message_type: string | null
          is_enabled: boolean | null
          weight: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          broadcast_id: string
          title: string
          subtitle?: string | null
          image_url?: string | null
          buttons?: Json | null
          text_content?: string | null
          message_type?: string | null
          is_enabled?: boolean | null
          weight?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          broadcast_id?: string
          title?: string
          subtitle?: string | null
          image_url?: string | null
          buttons?: Json | null
          text_content?: string | null
          message_type?: string | null
          is_enabled?: boolean | null
          weight?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          }
        ]
      }
      response_messages: {
        Row: {
          id: string
          response_id: string
          title: string
          subtitle: string | null
          image_url: string | null
          buttons: Json | null
          text_content: string | null
          message_type: string | null
          is_enabled: boolean | null
          weight: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          response_id: string
          title: string
          subtitle?: string | null
          image_url?: string | null
          buttons?: Json | null
          text_content?: string | null
          message_type?: string | null
          is_enabled?: boolean | null
          weight?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          response_id?: string
          title?: string
          subtitle?: string | null
          image_url?: string | null
          buttons?: Json | null
          text_content?: string | null
          message_type?: string | null
          is_enabled?: boolean | null
          weight?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "response_messages_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          }
        ]
      }
      flow_logs: {
        Row: {
          flow_number: number
          id: string
          sent_at: string
          status: string | null
          subscriber_id: string
        }
        Insert: {
          flow_number: number
          id?: string
          sent_at?: string
          status?: string | null
          subscriber_id: string
        }
        Update: {
          flow_number?: number
          id?: string
          sent_at?: string
          status?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string
          delay_hours: number | null
          flow_number: number
          id: string
          is_active: boolean | null
          message_content: Json | null
          page_id: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          delay_hours?: number | null
          flow_number: number
          id?: string
          is_active?: boolean | null
          message_content?: Json | null
          page_id: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          delay_hours?: number | null
          flow_number?: number
          id?: string
          is_active?: boolean | null
          message_content?: Json | null
          page_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flows_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          access_token: string | null
          avatar_url: string | null
          created_at: string
          facebook_page_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string
          facebook_page_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string
          facebook_page_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      page_configs: {
        Row: {
          id: string
          page_id: string
          category: string
          name: string
          selected_message_ids: string[] | null
          selection_mode: string | null
          fixed_message_id: string | null
          messages_count: number | null
          delay_hours: number[] | null
          scheduled_time: string | null
          scheduled_date: string | null
          trigger_keywords: string[] | null
          is_enabled: boolean | null
          times_triggered: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          page_id: string
          category: string
          name: string
          selected_message_ids?: string[] | null
          selection_mode?: string | null
          fixed_message_id?: string | null
          messages_count?: number | null
          delay_hours?: number[] | null
          scheduled_time?: string | null
          scheduled_date?: string | null
          trigger_keywords?: string[] | null
          is_enabled?: boolean | null
          times_triggered?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          page_id?: string
          category?: string
          name?: string
          selected_message_ids?: string[] | null
          selection_mode?: string | null
          fixed_message_id?: string | null
          messages_count?: number | null
          delay_hours?: number[] | null
          scheduled_time?: string | null
          scheduled_date?: string | null
          trigger_keywords?: string[] | null
          is_enabled?: boolean | null
          times_triggered?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_configs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          avatar_url: string | null
          facebook_psid: string
          flow_progress: number | null
          flow_total_steps: number | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          page_id: string
          subscribed_at: string
        }
        Insert: {
          avatar_url?: string | null
          facebook_psid: string
          flow_progress?: number | null
          flow_total_steps?: number | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          page_id: string
          subscribed_at?: string
        }
        Update: {
          avatar_url?: string | null
          facebook_psid?: string
          flow_progress?: number | null
          flow_total_steps?: number | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          page_id?: string
          subscribed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          name: string
          type: string | null
          used_by_count: number | null
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          name: string
          type?: string | null
          used_by_count?: number | null
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          name?: string
          type?: string | null
          used_by_count?: number | null
          user_id?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
