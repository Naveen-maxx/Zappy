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
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      game_results: {
        Row: {
          host_id: string
          id: string
          played_at: string
          quiz_id: string
          room_id: string
          total_participants: number
          winner_1_avatar_id: number | null
          winner_1_name: string | null
          winner_1_score: number | null
          winner_2_avatar_id: number | null
          winner_2_name: string | null
          winner_2_score: number | null
          winner_3_avatar_id: number | null
          winner_3_name: string | null
          winner_3_score: number | null
        }
        Insert: {
          host_id: string
          id?: string
          played_at?: string
          quiz_id: string
          room_id: string
          total_participants?: number
          winner_1_avatar_id?: number | null
          winner_1_name?: string | null
          winner_1_score?: number | null
          winner_2_avatar_id?: number | null
          winner_2_name?: string | null
          winner_2_score?: number | null
          winner_3_avatar_id?: number | null
          winner_3_name?: string | null
          winner_3_score?: number | null
        }
        Update: {
          host_id?: string
          id?: string
          played_at?: string
          quiz_id?: string
          room_id?: string
          total_participants?: number
          winner_1_avatar_id?: number | null
          winner_1_name?: string | null
          winner_1_score?: number | null
          winner_2_avatar_id?: number | null
          winner_2_name?: string | null
          winner_2_score?: number | null
          winner_3_avatar_id?: number | null
          winner_3_name?: string | null
          winner_3_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          game_mode: string
          host_id: string
          id: string
          is_locked: boolean
          quiz_id: string | null
          room_code: string
          status: string
        }
        Insert: {
          created_at?: string
          game_mode?: string
          host_id: string
          id?: string
          is_locked?: boolean
          quiz_id?: string | null
          room_code: string
          status?: string
        }
        Update: {
          created_at?: string
          game_mode?: string
          host_id?: string
          id?: string
          is_locked?: boolean
          quiz_id?: string | null
          room_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state: {
        Row: {
          chat_enabled: boolean
          correct_answer: number | null
          current_question: Json | null
          current_question_index: number
          discussion_ends_at: string | null
          id: string
          phase: string
          question_started_at: string | null
          room_id: string
          updated_at: string
        }
        Insert: {
          chat_enabled?: boolean
          correct_answer?: number | null
          current_question?: Json | null
          current_question_index?: number
          discussion_ends_at?: string | null
          id?: string
          phase?: string
          question_started_at?: string | null
          room_id: string
          updated_at?: string
        }
        Update: {
          chat_enabled?: boolean
          correct_answer?: number | null
          current_question?: Json | null
          current_question_index?: number
          discussion_ends_at?: string | null
          id?: string
          phase?: string
          question_started_at?: string | null
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          participant_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          participant_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          participant_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_reactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_reactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_answers: {
        Row: {
          answer_index: number
          answered_at: string
          id: string
          is_correct: boolean | null
          participant_id: string
          points_earned: number | null
          question_index: number
          room_id: string
        }
        Insert: {
          answer_index: number
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          participant_id: string
          points_earned?: number | null
          question_index: number
          room_id: string
        }
        Update: {
          answer_index?: number
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          participant_id?: string
          points_earned?: number | null
          question_index?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_answers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      player_titles: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          room_id: string
          title_name: string
          title_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          room_id: string
          title_name: string
          title_type: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          room_id?: string
          title_name?: string
          title_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_titles_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_titles_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          play_count: number
          questions: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          play_count?: number
          questions?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          play_count?: number
          questions?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          avatar_id: number
          avg_response_time_ms: number | null
          current_streak: number
          id: string
          joined_at: string
          max_streak: number
          name: string
          room_id: string
          score: number
          team_id: string | null
          total_answers: number
          total_correct: number
          user_id: string
        }
        Insert: {
          avatar_id?: number
          avg_response_time_ms?: number | null
          current_streak?: number
          id?: string
          joined_at?: string
          max_streak?: number
          name: string
          room_id: string
          score?: number
          team_id?: string | null
          total_answers?: number
          total_correct?: number
          user_id: string
        }
        Update: {
          avatar_id?: number
          avg_response_time_ms?: number | null
          current_streak?: number
          id?: string
          joined_at?: string
          max_streak?: number
          name?: string
          room_id?: string
          score?: number
          team_id?: string | null
          total_answers?: number
          total_correct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat: {
        Row: {
          created_at: string
          id: string
          message: string
          participant_id: string
          room_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          participant_id: string
          room_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          participant_id?: string
          room_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_chat_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_chat_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string
          created_at: string
          id: string
          leader_id: string | null
          name: string
          room_id: string
          score: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          leader_id?: string | null
          name: string
          room_id: string
          score?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          leader_id?: string | null
          name?: string
          room_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_game_state_with_server_time: {
        Args: {
          p_chat_enabled?: boolean
          p_correct_answer?: number
          p_current_question?: Json
          p_current_question_index?: number
          p_discussion_duration_seconds?: number
          p_phase: string
          p_room_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
