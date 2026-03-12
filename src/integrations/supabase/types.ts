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
      api_rate_limits: {
        Row: {
          call_count: number
          endpoint: string
          id: string
          ip_address: string | null
          user_id: string | null
          window_start: string
        }
        Insert: {
          call_count?: number
          endpoint: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          window_start?: string
        }
        Update: {
          call_count?: number
          endpoint?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          bridge_count: number | null
          completed_at: string | null
          cycle_number: number
          id: string
          pillar_id: string | null
          started_at: string
          status: string | null
          theme: string | null
          user_id: string
        }
        Insert: {
          bridge_count?: number | null
          completed_at?: string | null
          cycle_number?: number
          id?: string
          pillar_id?: string | null
          started_at?: string
          status?: string | null
          theme?: string | null
          user_id: string
        }
        Update: {
          bridge_count?: number | null
          completed_at?: string | null
          cycle_number?: number
          id?: string
          pillar_id?: string | null
          started_at?: string
          status?: string | null
          theme?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      phase_weights: {
        Row: {
          id: string
          phase_id: string
          pillar_id: string
          weight: number
        }
        Insert: {
          id?: string
          phase_id: string
          pillar_id: string
          weight?: number
        }
        Update: {
          id?: string
          phase_id?: string
          pillar_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "phase_weights_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_weights_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          goal: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          timeline_end: string | null
          timeline_start: string | null
          user_id: string
        }
        Insert: {
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          timeline_end?: string | null
          timeline_start?: string | null
          user_id: string
        }
        Update: {
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          timeline_end?: string | null
          timeline_start?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pillars: {
        Row: {
          created_at: string
          current_level: number
          description: string | null
          id: string
          is_active: boolean | null
          last_difficulty_signal: string | null
          name: string
          phase_weight: number | null
          sort_order: number | null
          starting_level: number
          trend: string | null
          user_id: string
          why_it_matters: string | null
        }
        Insert: {
          created_at?: string
          current_level?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_difficulty_signal?: string | null
          name: string
          phase_weight?: number | null
          sort_order?: number | null
          starting_level?: number
          trend?: string | null
          user_id: string
          why_it_matters?: string | null
        }
        Update: {
          created_at?: string
          current_level?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_difficulty_signal?: string | null
          name?: string
          phase_weight?: number | null
          sort_order?: number | null
          starting_level?: number
          trend?: string | null
          user_id?: string
          why_it_matters?: string | null
        }
        Relationships: []
      }
      progress_archive: {
        Row: {
          avg_difficulty: number | null
          avg_value: number | null
          cycle_id: string | null
          id: string
          level_change: string | null
          summary: string | null
        }
        Insert: {
          avg_difficulty?: number | null
          avg_value?: number | null
          cycle_id?: string | null
          id?: string
          level_change?: string | null
          summary?: string | null
        }
        Update: {
          avg_difficulty?: number | null
          avg_value?: number | null
          cycle_id?: string | null
          id?: string
          level_change?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_archive_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_map: {
        Row: {
          cluster_name: string
          cross_pillar_connections: string | null
          difficulty_level: number | null
          id: string
          pillar_id: string
          priority_order: number | null
          status: string | null
          subtopics: string[] | null
        }
        Insert: {
          cluster_name: string
          cross_pillar_connections?: string | null
          difficulty_level?: number | null
          id?: string
          pillar_id: string
          priority_order?: number | null
          status?: string | null
          subtopics?: string[] | null
        }
        Update: {
          cluster_name?: string
          cross_pillar_connections?: string | null
          difficulty_level?: number | null
          id?: string
          pillar_id?: string
          priority_order?: number | null
          status?: string | null
          subtopics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_map_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bridge_prerequisite_for: string | null
          content: string | null
          created_at: string
          cycle_id: string
          difficulty_level: number | null
          feedback_difficulty: string | null
          feedback_given_at: string | null
          feedback_note: string | null
          feedback_value: string | null
          file_path_equivalent: string | null
          id: string
          is_bonus: boolean | null
          is_bridge: boolean | null
          is_pending_feedback: boolean | null
          pillar_id: string | null
          section_number: number
          section_type: string | null
          topic: string | null
        }
        Insert: {
          bridge_prerequisite_for?: string | null
          content?: string | null
          created_at?: string
          cycle_id: string
          difficulty_level?: number | null
          feedback_difficulty?: string | null
          feedback_given_at?: string | null
          feedback_note?: string | null
          feedback_value?: string | null
          file_path_equivalent?: string | null
          id?: string
          is_bonus?: boolean | null
          is_bridge?: boolean | null
          is_pending_feedback?: boolean | null
          pillar_id?: string | null
          section_number?: number
          section_type?: string | null
          topic?: string | null
        }
        Update: {
          bridge_prerequisite_for?: string | null
          content?: string | null
          created_at?: string
          cycle_id?: string
          difficulty_level?: number | null
          feedback_difficulty?: string | null
          feedback_given_at?: string | null
          feedback_note?: string | null
          feedback_value?: string | null
          file_path_equivalent?: string | null
          id?: string
          is_bonus?: boolean | null
          is_bridge?: boolean | null
          is_pending_feedback?: boolean | null
          pillar_id?: string | null
          section_number?: number
          section_type?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          created_at: string
          current_role: string | null
          cycle_length: number | null
          daily_time_commitment: number | null
          id: string
          learning_cadence: string | null
          learning_style: string | null
          long_term_ambition: string | null
          mentor_name: string | null
          name: string | null
          target_role: string | null
          unique_differentiator: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_role?: string | null
          cycle_length?: number | null
          daily_time_commitment?: number | null
          id?: string
          learning_cadence?: string | null
          learning_style?: string | null
          long_term_ambition?: string | null
          mentor_name?: string | null
          name?: string | null
          target_role?: string | null
          unique_differentiator?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_role?: string | null
          cycle_length?: number | null
          daily_time_commitment?: number | null
          id?: string
          learning_cadence?: string | null
          learning_style?: string | null
          long_term_ambition?: string | null
          mentor_name?: string | null
          name?: string | null
          target_role?: string | null
          unique_differentiator?: string | null
          updated_at?: string
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
