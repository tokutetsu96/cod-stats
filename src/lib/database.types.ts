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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      game_stats: {
        Row: {
          created_at: string | null
          damage: number
          deaths: number
          defuses: number | null
          first_bloods: number | null
          first_deaths: number | null
          game_id: string
          goals: number | null
          hill_time: number | null
          id: string
          kills: number
          plants: number | null
          player_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          damage?: number
          deaths?: number
          defuses?: number | null
          first_bloods?: number | null
          first_deaths?: number | null
          game_id: string
          goals?: number | null
          hill_time?: number | null
          id?: string
          kills?: number
          plants?: number | null
          player_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          damage?: number
          deaths?: number
          defuses?: number | null
          first_bloods?: number | null
          first_deaths?: number | null
          game_id?: string
          goals?: number | null
          hill_time?: number | null
          id?: string
          kills?: number
          plants?: number | null
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          game_number: number
          hill_times: Json | null
          id: string
          map_id: string | null
          mode: string
          result: string
          score_opponent: number
          score_team: number
          series_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          game_number: number
          hill_times?: Json | null
          id?: string
          map_id?: string | null
          mode: string
          result: string
          score_opponent?: number
          score_team?: number
          series_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          game_number?: number
          hill_times?: Json | null
          id?: string
          map_id?: string | null
          mode?: string
          result?: string
          score_opponent?: number
          score_team?: number
          series_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          created_at: string | null
          hill_count: number | null
          id: string
          mode: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          hill_count?: number | null
          id?: string
          mode: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          hill_count?: number | null
          id?: string
          mode?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maps_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      opponent_game_stats: {
        Row: {
          created_at: string
          damage: number
          deaths: number
          defuses: number | null
          first_bloods: number | null
          first_deaths: number | null
          game_id: string
          goals: number | null
          hill_time: number | null
          id: string
          kills: number
          opponent_player_id: string
          plants: number | null
          team_id: string
        }
        Insert: {
          created_at?: string
          damage?: number
          deaths?: number
          defuses?: number | null
          first_bloods?: number | null
          first_deaths?: number | null
          game_id: string
          goals?: number | null
          hill_time?: number | null
          id?: string
          kills?: number
          opponent_player_id: string
          plants?: number | null
          team_id: string
        }
        Update: {
          created_at?: string
          damage?: number
          deaths?: number
          defuses?: number | null
          first_bloods?: number | null
          first_deaths?: number | null
          game_id?: string
          goals?: number | null
          hill_time?: number | null
          id?: string
          kills?: number
          opponent_player_id?: string
          plants?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponent_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opponent_game_stats_opponent_player_id_fkey"
            columns: ["opponent_player_id"]
            isOneToOne: false
            referencedRelation: "opponent_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opponent_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      opponent_players: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          opponent_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          opponent_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          opponent_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponent_players_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opponent_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      opponents: {
        Row: {
          created_at: string | null
          id: string
          memo: string | null
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          memo?: string | null
          name: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          memo?: string | null
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string | null
          id: string
          role: string
          team_id: string
          username: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          id: string
          role?: string
          team_id: string
          username: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          role?: string
          team_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          created_at: string | null
          id: string
          memo: string | null
          opponent_id: string
          series_date: string
          team_id: string
          type: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          memo?: string | null
          opponent_id: string
          series_date: string
          team_id: string
          type?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          memo?: string | null
          opponent_id?: string
          series_date?: string
          team_id?: string
          type?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          default_roster_size: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          default_roster_size?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          default_roster_size?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_kd_stats: {
        Args: { p_series_ids?: string[] }
        Returns: {
          damage: number
          deaths: number
          defuses: number
          first_bloods: number
          first_deaths: number
          games_count: number
          goals: number
          hill_time: number
          kills: number
          mode: string
          plants: number
          player_id: string
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_team_id: { Args: never; Returns: string }
      get_opponent_match_stats: {
        Args: never
        Returns: {
          mode: string
          opponent_id: string
          total: number
          wins: number
        }[]
      }
      get_team_game_stats: {
        Args: { p_series_ids?: string[] }
        Returns: {
          losses: number
          mode: string
          total: number
          wins: number
        }[]
      }
      get_team_winrate_trend: {
        Args: { p_bucket?: string; p_mode?: string; p_series_ids?: string[] }
        Returns: {
          bucket_start: string
          total: number
          wins: number
        }[]
      }
      save_series_with_games: {
        Args: { p_payload: Json; p_series_id?: string }
        Returns: string
      }
      signup_create_team_with_profile: {
        Args: { p_team_name: string; p_username: string }
        Returns: string
      }
      signup_join_team: {
        Args: { p_team_id: string; p_username: string }
        Returns: undefined
      }
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
