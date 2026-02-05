export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          color: string;
          icon: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          color?: string;
          icon?: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          deck_id: string;
          user_id: string;
          front_content: string;
          back_content: string;
          card_type: 'basic' | 'cloze';
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          user_id: string;
          front_content: string;
          back_content: string;
          card_type?: 'basic' | 'cloze';
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deck_id?: string;
          user_id?: string;
          front_content?: string;
          back_content?: string;
          card_type?: 'basic' | 'cloze';
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_states: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          ease_factor: number;
          interval: number;
          repetition_count: number;
          learning_state: 'new' | 'learning' | 'review' | 'mature';
          step_index: number;
          next_review_at: string;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          ease_factor?: number;
          interval?: number;
          repetition_count?: number;
          learning_state?: 'new' | 'learning' | 'review' | 'mature';
          step_index?: number;
          next_review_at?: string;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          ease_factor?: number;
          interval?: number;
          repetition_count?: number;
          learning_state?: 'new' | 'learning' | 'review' | 'mature';
          step_index?: number;
          next_review_at?: string;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          new_cards_per_day: number;
          reviews_per_day: number;
          learn_steps: number[];
          graduating_interval: number;
          easy_interval: number;
          starting_ease: number;
          easy_bonus: number;
          interval_modifier: number;
          hard_interval_modifier: number;
          theme: 'light' | 'dark' | 'system';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          new_cards_per_day?: number;
          reviews_per_day?: number;
          learn_steps?: number[];
          graduating_interval?: number;
          easy_interval?: number;
          starting_ease?: number;
          easy_bonus?: number;
          interval_modifier?: number;
          hard_interval_modifier?: number;
          theme?: 'light' | 'dark' | 'system';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          new_cards_per_day?: number;
          reviews_per_day?: number;
          learn_steps?: number[];
          graduating_interval?: number;
          easy_interval?: number;
          starting_ease?: number;
          easy_bonus?: number;
          interval_modifier?: number;
          hard_interval_modifier?: number;
          theme?: 'light' | 'dark' | 'system';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          deck_id: string | null;
          started_at: string;
          ended_at: string | null;
          cards_studied: number;
          cards_correct: number;
          cards_wrong: number;
          duration_seconds: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          deck_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          cards_studied?: number;
          cards_correct?: number;
          cards_wrong?: number;
          duration_seconds?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          deck_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          cards_studied?: number;
          cards_correct?: number;
          cards_wrong?: number;
          duration_seconds?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      card_type: 'basic' | 'cloze';
      learning_state: 'new' | 'learning' | 'review' | 'mature';
      theme_preference: 'light' | 'dark' | 'system';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for Supabase tables
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
