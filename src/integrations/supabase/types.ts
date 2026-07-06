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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          department_id: string | null
          doctor_id: string | null
          hospital_id: string
          id: string
          patient_id: string
          reason: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          reason?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          reason?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      aura_interactions: {
        Row: {
          action: string
          created_at: string
          hospital_id: string
          id: string
          input_summary: string | null
          output_summary: string | null
          page_path: string | null
          patient_id: string | null
          status: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          hospital_id: string
          id?: string
          input_summary?: string | null
          output_summary?: string | null
          page_path?: string | null
          patient_id?: string | null
          status?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          hospital_id?: string
          id?: string
          input_summary?: string | null
          output_summary?: string | null
          page_path?: string | null
          patient_id?: string | null
          status?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aura_interactions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_interactions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_interactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_interactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "aura_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      aura_messages: {
        Row: {
          ai_message_id: string | null
          context: Json
          created_at: string
          hospital_id: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          ai_message_id?: string | null
          context?: Json
          created_at?: string
          hospital_id: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          ai_message_id?: string | null
          context?: Json
          created_at?: string
          hospital_id?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aura_messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "aura_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      aura_threads: {
        Row: {
          archived: boolean
          created_at: string
          hospital_id: string
          id: string
          last_message_at: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          hospital_id: string
          id?: string
          last_message_at?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          hospital_id?: string
          id?: string
          last_message_at?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aura_threads_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_threads_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          hospital_id: string
          id: string
          is_group: boolean
          last_message_at: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hospital_id: string
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hospital_id?: string
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          hospital_id: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          hospital_id: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          hospital_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          last_seen_at: string | null
          typing_until: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          last_seen_at?: string | null
          typing_until?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          last_seen_at?: string | null
          typing_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          ai_summary: string | null
          complaint: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          access_key: string
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          hospital_type: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_key: string
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          hospital_type?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_key?: string
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          hospital_type?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      lab_orders: {
        Row: {
          completed_at: string | null
          consultation_id: string | null
          created_at: string
          hospital_id: string
          id: string
          ordered_by: string | null
          patient_id: string
          result_url: string | null
          results: string | null
          started_at: string | null
          status: string
          test_name: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          ordered_by?: string | null
          patient_id: string
          result_url?: string | null
          results?: string | null
          started_at?: string | null
          status?: string
          test_name: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          ordered_by?: string | null
          patient_id?: string
          result_url?: string | null
          results?: string | null
          started_at?: string | null
          status?: string
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          message: string
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          message: string
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          chronic_illnesses: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          hospital_id: string
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          medications: string | null
          patient_code: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          chronic_illnesses?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          hospital_id: string
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          medications?: string | null
          patient_code: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          chronic_illnesses?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          hospital_id?: string
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          medications?: string | null
          patient_code?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          collected_at: string | null
          consultation_id: string | null
          created_at: string
          dosage: string | null
          hospital_id: string
          id: string
          instructions: string | null
          medication: string
          patient_id: string
          prescribed_by: string | null
          ready_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          collected_at?: string | null
          consultation_id?: string | null
          created_at?: string
          dosage?: string | null
          hospital_id: string
          id?: string
          instructions?: string | null
          medication: string
          patient_id: string
          prescribed_by?: string | null
          ready_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          collected_at?: string | null
          consultation_id?: string | null
          created_at?: string
          dosage?: string | null
          hospital_id?: string
          id?: string
          instructions?: string | null
          medication?: string
          patient_id?: string
          prescribed_by?: string | null
          ready_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string
          hospital_id: string
          id: string
          online: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name: string
          hospital_id: string
          id?: string
          online?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string
          hospital_id?: string
          id?: string
          online?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_entries: {
        Row: {
          assigned_doctor: string | null
          checked_in_at: string
          completed_at: string | null
          created_at: string
          department_id: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          assigned_doctor?: string | null
          checked_in_at?: string
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          assigned_doctor?: string | null
          checked_in_at?: string
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          referred_by: string | null
          status: string
          target_department_id: string | null
          target_specialist: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          referred_by?: string | null
          status?: string
          target_department_id?: string | null
          target_specialist?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          referred_by?: string | null
          status?: string
          target_department_id?: string | null
          target_specialist?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          department_id: string | null
          email: string
          expires_at: string
          full_name: string | null
          hospital_id: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          hospital_id: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          hospital_id?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals: {
        Row: {
          blood_pressure: string | null
          created_at: string
          heart_rate: number | null
          height: number | null
          hospital_id: string
          id: string
          notes: string | null
          oxygen_saturation: number | null
          patient_id: string
          recorded_by: string | null
          respiratory_rate: number | null
          temperature: number | null
          urgency: string
          weight: number | null
        }
        Insert: {
          blood_pressure?: string | null
          created_at?: string
          heart_rate?: number | null
          height?: number | null
          hospital_id: string
          id?: string
          notes?: string | null
          oxygen_saturation?: number | null
          patient_id: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          temperature?: number | null
          urgency?: string
          weight?: number | null
        }
        Update: {
          blood_pressure?: string | null
          created_at?: string
          heart_rate?: number | null
          height?: number | null
          hospital_id?: string
          id?: string
          notes?: string | null
          oxygen_saturation?: number | null
          patient_id?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          temperature?: number | null
          urgency?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      hospital_directory: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          hospital_type: string | null
          id: string | null
          name: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          hospital_type?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          hospital_type?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { _full_name: string; _token: string }
        Returns: {
          hospital_id: string
          hospital_name: string
        }[]
      }
      get_my_hospital_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      verify_invitation: {
        Args: { _token: string }
        Returns: {
          department_name: string
          email: string
          expires_at: string
          full_name: string
          hospital_id: string
          hospital_name: string
          invitation_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      verify_workspace: {
        Args: { _workspace_id: string }
        Returns: {
          hospital_id: string
          hospital_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "nurse" | "reception"
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
      app_role: ["admin", "doctor", "nurse", "reception"],
    },
  },
} as const
