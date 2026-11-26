export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin";
export type QuestionStatus = "pending" | "approved" | "rejected";
export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type IngestionStatus = "processing" | "completed" | "failed";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ingestion_jobs: {
        Row: {
          id: string;
          file_name: string;
          total_rows: number;
          processed_rows: number;
          failed_rows: number;
          status: IngestionStatus;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          total_rows?: number;
          processed_rows?: number;
          failed_rows?: number;
          status?: IngestionStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          total_rows?: number;
          processed_rows?: number;
          failed_rows?: number;
          status?: IngestionStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      questions: {
        Row: {
          id: string;
          question: string;
          model_answer: string | null;
          role_id: string | null;
          topic: string | null;
          difficulty: DifficultyLevel | null;
          embedding: string | null;
          status: QuestionStatus;
          source_file: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          model_answer?: string | null;
          role_id?: string | null;
          topic?: string | null;
          difficulty?: DifficultyLevel | null;
          embedding?: string | null;
          status?: QuestionStatus;
          source_file?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          model_answer?: string | null;
          role_id?: string | null;
          topic?: string | null;
          difficulty?: DifficultyLevel | null;
          embedding?: string | null;
          status?: QuestionStatus;
          source_file?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          file_path: string;
          extracted_text: string | null;
          target_role_id: string | null;
          ats_score: number | null;
          ats_report: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_path: string;
          extracted_text?: string | null;
          target_role_id?: string | null;
          ats_score?: number | null;
          ats_report?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_path?: string;
          extracted_text?: string | null;
          target_role_id?: string | null;
          ats_score?: number | null;
          ats_report?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resumes_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }
        ];
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          difficulty: DifficultyLevel;
          resume_id: string | null;
          target_count: number;
          status: SessionStatus;
          summary: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          difficulty: DifficultyLevel;
          resume_id?: string | null;
          target_count: number;
          status?: SessionStatus;
          summary?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          difficulty?: DifficultyLevel;
          resume_id?: string | null;
          target_count?: number;
          status?: SessionStatus;
          summary?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_sessions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_sessions_resume_id_fkey";
            columns: ["resume_id"];
            isOneToOne: false;
            referencedRelation: "resumes";
            referencedColumns: ["id"];
          }
        ];
      };
      session_turns: {
        Row: {
          id: string;
          session_id: string;
          question: string;
          user_answer: string | null;
          evaluation: Json | null;
          score: number | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question: string;
          user_answer?: string | null;
          evaluation?: Json | null;
          score?: number | null;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question?: string;
          user_answer?: string | null;
          evaluation?: Json | null;
          score?: number | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_turns_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      match_questions: {
        Args: {
          query_embedding: string;
          match_role_id?: string | null;
          match_difficulty?: string | null;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          id: string;
          question: string;
          model_answer: string | null;
          role_id: string | null;
          topic: string | null;
          difficulty: DifficultyLevel | null;
          similarity: number;
        }[];
      };
      find_duplicate_question: {
        Args: {
          query_embedding: string;
          similarity_threshold?: number;
        };
        Returns: {
          id: string;
          question: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
