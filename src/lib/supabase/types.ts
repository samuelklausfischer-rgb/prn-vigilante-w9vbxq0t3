// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      analytics_daily: {
        Row: {
          avg_retry_count: number | null
          avg_time_to_delivery_minutes: number | null
          cancelada: number
          created_at: string
          data: string
          falha: number
          id: number
          instances_used: number
          por_procedimento: Json
          sucesso: number
          total_enviadas: number
          updated_at: string
        }
        Insert: {
          avg_retry_count?: number | null
          avg_time_to_delivery_minutes?: number | null
          cancelada?: number
          created_at?: string
          data: string
          falha?: number
          id?: number
          instances_used?: number
          por_procedimento?: Json
          sucesso?: number
          total_enviadas?: number
          updated_at?: string
        }
        Update: {
          avg_retry_count?: number | null
          avg_time_to_delivery_minutes?: number | null
          cancelada?: number
          created_at?: string
          data?: string
          falha?: number
          id?: number
          instances_used?: number
          por_procedimento?: Json
          sucesso?: number
          total_enviadas?: number
          updated_at?: string
        }
        Relationships: []
      }
      automation_runtime_control: {
        Row: {
          active_worker_id: string | null
          id: number
          lease_expires_at: string | null
          updated_at: string
        }
        Insert: {
          active_worker_id?: string | null
          id: number
          lease_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          active_worker_id?: string | null
          id?: number
          lease_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      journey_events: {
        Row: {
          event_at: string
          event_type: string
          id: string
          journey_id: string
          message_id: string | null
          payload: Json | null
          source: Database['public']['Enums']['event_source']
        }
        Insert: {
          event_at?: string
          event_type: string
          id?: string
          journey_id: string
          message_id?: string | null
          payload?: Json | null
          source: Database['public']['Enums']['event_source']
        }
        Update: {
          event_at?: string
          event_type?: string
          id?: string
          journey_id?: string
          message_id?: string | null
          payload?: Json | null
          source?: Database['public']['Enums']['event_source']
        }
        Relationships: [
          {
            foreignKeyName: 'journey_events_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'patient_journeys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journey_events_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'strategic_followup_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'journey_events_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'vacancy_candidates_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'journey_events_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'journey_messages'
            referencedColumns: ['id']
          },
        ]
      }
      journey_messages: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          direction: Database['public']['Enums']['message_direction']
          failed_at: string | null
          id: string
          instance_id: string | null
          journey_id: string
          message_body: string | null
          message_kind: Database['public']['Enums']['message_kind']
          parent_message_id: string | null
          phone_number: string
          provider_chat_id: string | null
          provider_message_id: string | null
          provider_name: string
          queue_message_id: string | null
          read_at: string | null
          replied_at: string | null
          status: Database['public']['Enums']['message_status']
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          direction: Database['public']['Enums']['message_direction']
          failed_at?: string | null
          id?: string
          instance_id?: string | null
          journey_id: string
          message_body?: string | null
          message_kind?: Database['public']['Enums']['message_kind']
          parent_message_id?: string | null
          phone_number: string
          provider_chat_id?: string | null
          provider_message_id?: string | null
          provider_name?: string
          queue_message_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: Database['public']['Enums']['message_status']
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: Database['public']['Enums']['message_direction']
          failed_at?: string | null
          id?: string
          instance_id?: string | null
          journey_id?: string
          message_body?: string | null
          message_kind?: Database['public']['Enums']['message_kind']
          parent_message_id?: string | null
          phone_number?: string
          provider_chat_id?: string | null
          provider_message_id?: string | null
          provider_name?: string
          queue_message_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: Database['public']['Enums']['message_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'journey_messages_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journey_messages_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'patient_journeys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journey_messages_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'strategic_followup_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'journey_messages_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'vacancy_candidates_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'journey_messages_parent_message_id_fkey'
            columns: ['parent_message_id']
            isOneToOne: false
            referencedRelation: 'journey_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journey_messages_queue_message_id_fkey'
            columns: ['queue_message_id']
            isOneToOne: false
            referencedRelation: 'expired_locks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journey_messages_queue_message_id_fkey'
            columns: ['queue_message_id']
            isOneToOne: false
            referencedRelation: 'patients_queue'
            referencedColumns: ['id']
          },
        ]
      }
      message_blocks: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          id: string
          patient_id: string | null
          permanent: boolean | null
          phone_number: string
          reason: string
          source: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          patient_id?: string | null
          permanent?: boolean | null
          phone_number: string
          reason: string
          source?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          patient_id?: string | null
          permanent?: boolean | null
          phone_number?: string
          reason?: string
          source?: string | null
        }
        Relationships: []
      }
      message_events: {
        Row: {
          event_at: string
          event_type: string
          id: string
          instance_id: string | null
          message_id: string | null
          raw_payload: Json | null
          to_phone: string | null
        }
        Insert: {
          event_at?: string
          event_type: string
          id?: string
          instance_id?: string | null
          message_id?: string | null
          raw_payload?: Json | null
          to_phone?: string | null
        }
        Update: {
          event_at?: string
          event_type?: string
          id?: string
          instance_id?: string | null
          message_id?: string | null
          raw_payload?: Json | null
          to_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'message_events_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_events_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'expired_locks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_events_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'patients_queue'
            referencedColumns: ['id']
          },
        ]
      }
      message_logs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          id: string
          instance_id: string | null
          message_id: string | null
          patient_hash: string | null
          phone_masked: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          message_id?: string | null
          patient_hash?: string | null
          phone_masked?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          message_id?: string | null
          patient_hash?: string | null
          phone_masked?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_logs_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_instances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_logs_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'expired_locks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_logs_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'patients_queue'
            referencedColumns: ['id']
          },
        ]
      }
      message_qualifications: {
        Row: {
          classification: Database['public']['Enums']['classification']
          confidence: number
          created_at: string
          id: string
          journey_id: string
          message_id: string
          model_name: string | null
          needs_manual_review: boolean
          raw_output: Json | null
          recommended_action: Database['public']['Enums']['recommended_action']
          summary: string | null
          vacancy_reason: string | null
          vacancy_signal: boolean
        }
        Insert: {
          classification: Database['public']['Enums']['classification']
          confidence: number
          created_at?: string
          id?: string
          journey_id: string
          message_id: string
          model_name?: string | null
          needs_manual_review?: boolean
          raw_output?: Json | null
          recommended_action: Database['public']['Enums']['recommended_action']
          summary?: string | null
          vacancy_reason?: string | null
          vacancy_signal?: boolean
        }
        Update: {
          classification?: Database['public']['Enums']['classification']
          confidence?: number
          created_at?: string
          id?: string
          journey_id?: string
          message_id?: string
          model_name?: string | null
          needs_manual_review?: boolean
          raw_output?: Json | null
          recommended_action?: Database['public']['Enums']['recommended_action']
          summary?: string | null
          vacancy_reason?: string | null
          vacancy_signal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'message_qualifications_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'patient_journeys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_qualifications_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'strategic_followup_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'message_qualifications_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'vacancy_candidates_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'message_qualifications_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'journey_messages'
            referencedColumns: ['id']
          },
        ]
      }
      patient_consent: {
        Row: {
          consent_granted_at: string | null
          consent_revoked_at: string | null
          consent_source: string
          consent_status: string
          consent_version: string | null
          created_at: string | null
          id: string
          patient_id: string | null
          privacy_policy_version: string | null
        }
        Insert: {
          consent_granted_at?: string | null
          consent_revoked_at?: string | null
          consent_source: string
          consent_status: string
          consent_version?: string | null
          created_at?: string | null
          id?: string
          patient_id?: string | null
          privacy_policy_version?: string | null
        }
        Update: {
          consent_granted_at?: string | null
          consent_revoked_at?: string | null
          consent_source?: string
          consent_status?: string
          consent_version?: string | null
          created_at?: string | null
          id?: string
          patient_id?: string | null
          privacy_policy_version?: string | null
        }
        Relationships: []
      }
      patient_journeys: {
        Row: {
          canonical_phone: string
          confirmed_at: string | null
          created_at: string
          data_exame: string | null
          horario_final: string | null
          horario_inicio: string | null
          id: string
          journey_status: Database['public']['Enums']['journey_status']
          last_event_at: string | null
          last_message_id: string | null
          manual_note: string | null
          manual_priority: Database['public']['Enums']['manual_priority'] | null
          needs_manual_action: boolean
          origin_queue_id: string | null
          patient_name: string
          pending_at: string | null
          primary_phone: string
          procedimentos: string | null
          secondary_phone: string | null
          tertiary_phone: string | null
          updated_at: string
        }
        Insert: {
          canonical_phone: string
          confirmed_at?: string | null
          created_at?: string
          data_exame?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          id?: string
          journey_status?: Database['public']['Enums']['journey_status']
          last_event_at?: string | null
          last_message_id?: string | null
          manual_note?: string | null
          manual_priority?: Database['public']['Enums']['manual_priority'] | null
          needs_manual_action?: boolean
          origin_queue_id?: string | null
          patient_name: string
          pending_at?: string | null
          primary_phone: string
          procedimentos?: string | null
          secondary_phone?: string | null
          tertiary_phone?: string | null
          updated_at?: string
        }
        Update: {
          canonical_phone?: string
          confirmed_at?: string | null
          created_at?: string
          data_exame?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          id?: string
          journey_status?: Database['public']['Enums']['journey_status']
          last_event_at?: string | null
          last_message_id?: string | null
          manual_note?: string | null
          manual_priority?: Database['public']['Enums']['manual_priority'] | null
          needs_manual_action?: boolean
          origin_queue_id?: string | null
          patient_name?: string
          pending_at?: string | null
          primary_phone?: string
          procedimentos?: string | null
          secondary_phone?: string | null
          tertiary_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_journeys_origin_queue_id_fkey'
            columns: ['origin_queue_id']
            isOneToOne: false
            referencedRelation: 'expired_locks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_journeys_origin_queue_id_fkey'
            columns: ['origin_queue_id']
            isOneToOne: false
            referencedRelation: 'patients_queue'
            referencedColumns: ['id']
          },
        ]
      }
      patients_queue: {
        Row: {
          accepted_at: string | null
          attempt_count: number | null
          back_to_queue_count: number | null
          canonical_phone: string | null
          created_at: string
          current_outcome: string | null
          data_exame: string | null
          Data_nascimento: string | null
          dedupe_hash: string | null
          dedupe_kind: string | null
          delivered_at: string | null
          followup_due_at: string | null
          followup_sent_at: string | null
          horario_final: string | null
          horario_inicio: string | null
          id: string
          index_for_dedupe_hash: string | null
          is_approved: boolean
          is_landline: boolean
          journey_id: string | null
          last_contact_phone: string | null
          last_delivery_status: string
          last_phone_used: string | null
          locked_at: string | null
          locked_by: string | null
          locked_instance_id: string | null
          message_body: string
          needs_second_call: boolean
          notes: string | null
          origin_queue_id: string | null
          patient_name: string
          phone_2: string | null
          phone_2_whatsapp_checked_at: string | null
          phone_2_whatsapp_valid: boolean | null
          phone_3: string | null
          phone_3_whatsapp_checked_at: string | null
          phone_3_whatsapp_valid: boolean | null
          phone_attempt_index: number | null
          phone_number: string
          procedimentos: string | null
          provider_chat_id: string | null
          provider_message_id: string | null
          queue_order: number | null
          read_at: string | null
          replied_at: string | null
          resolved_at: string | null
          retry_phone2_sent_at: string | null
          retry_phone3_sent_at: string | null
          second_call_reason: string | null
          send_accepted_at: string | null
          send_after: string
          status: Database['public']['Enums']['queue_status']
          time_proce: string | null
          updated_at: string
          whatsapp_checked_at: string | null
          whatsapp_valid: boolean | null
          whatsapp_validated_format: string | null
        }
        Insert: {
          accepted_at?: string | null
          attempt_count?: number | null
          back_to_queue_count?: number | null
          canonical_phone?: string | null
          created_at?: string
          current_outcome?: string | null
          data_exame?: string | null
          Data_nascimento?: string | null
          dedupe_hash?: string | null
          dedupe_kind?: string | null
          delivered_at?: string | null
          followup_due_at?: string | null
          followup_sent_at?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          id?: string
          index_for_dedupe_hash?: string | null
          is_approved?: boolean
          is_landline?: boolean
          journey_id?: string | null
          last_contact_phone?: string | null
          last_delivery_status?: string
          last_phone_used?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_instance_id?: string | null
          message_body: string
          needs_second_call?: boolean
          notes?: string | null
          origin_queue_id?: string | null
          patient_name: string
          phone_2?: string | null
          phone_2_whatsapp_checked_at?: string | null
          phone_2_whatsapp_valid?: boolean | null
          phone_3?: string | null
          phone_3_whatsapp_checked_at?: string | null
          phone_3_whatsapp_valid?: boolean | null
          phone_attempt_index?: number | null
          phone_number: string
          procedimentos?: string | null
          provider_chat_id?: string | null
          provider_message_id?: string | null
          queue_order?: number | null
          read_at?: string | null
          replied_at?: string | null
          resolved_at?: string | null
          retry_phone2_sent_at?: string | null
          retry_phone3_sent_at?: string | null
          second_call_reason?: string | null
          send_accepted_at?: string | null
          send_after?: string
          status?: Database['public']['Enums']['queue_status']
          time_proce?: string | null
          updated_at?: string
          whatsapp_checked_at?: string | null
          whatsapp_valid?: boolean | null
          whatsapp_validated_format?: string | null
        }
        Update: {
          accepted_at?: string | null
          attempt_count?: number | null
          back_to_queue_count?: number | null
          canonical_phone?: string | null
          created_at?: string
          current_outcome?: string | null
          data_exame?: string | null
          Data_nascimento?: string | null
          dedupe_hash?: string | null
          dedupe_kind?: string | null
          delivered_at?: string | null
          followup_due_at?: string | null
          followup_sent_at?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          id?: string
          index_for_dedupe_hash?: string | null
          is_approved?: boolean
          is_landline?: boolean
          journey_id?: string | null
          last_contact_phone?: string | null
          last_delivery_status?: string
          last_phone_used?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_instance_id?: string | null
          message_body?: string
          needs_second_call?: boolean
          notes?: string | null
          origin_queue_id?: string | null
          patient_name?: string
          phone_2?: string | null
          phone_2_whatsapp_checked_at?: string | null
          phone_2_whatsapp_valid?: boolean | null
          phone_3?: string | null
          phone_3_whatsapp_checked_at?: string | null
          phone_3_whatsapp_valid?: boolean | null
          phone_attempt_index?: number | null
          phone_number?: string
          procedimentos?: string | null
          provider_chat_id?: string | null
          provider_message_id?: string | null
          queue_order?: number | null
          read_at?: string | null
          replied_at?: string | null
          resolved_at?: string | null
          retry_phone2_sent_at?: string | null
          retry_phone3_sent_at?: string | null
          second_call_reason?: string | null
          send_accepted_at?: string | null
          send_after?: string
          status?: Database['public']['Enums']['queue_status']
          time_proce?: string | null
          updated_at?: string
          whatsapp_checked_at?: string | null
          whatsapp_valid?: boolean | null
          whatsapp_validated_format?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'patients_queue_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'patient_journeys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patients_queue_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'strategic_followup_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'patients_queue_journey_id_fkey'
            columns: ['journey_id']
            isOneToOne: false
            referencedRelation: 'vacancy_candidates_overview'
            referencedColumns: ['journey_id']
          },
          {
            foreignKeyName: 'patients_queue_origin_queue_id_fkey'
            columns: ['origin_queue_id']
            isOneToOne: false
            referencedRelation: 'expired_locks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patients_queue_origin_queue_id_fkey'
            columns: ['origin_queue_id']
            isOneToOne: false
            referencedRelation: 'patients_queue'
            referencedColumns: ['id']
          },
        ]
      }
      patients_queue_archive: {
        Row: {
          archived_at: string
          archived_by: string | null
          archived_reason: string | null
          attempt_count: number | null
          canonical_phone: string | null
          created_at: string
          data_exame: string | null
          data_nascimento: string | null
          dedupe_hash: string | null
          dedupe_kind: string | null
          delivered_at: string | null
          followup_sent_at: string | null
          horario_final: string | null
          horario_inicio: string | null
          id: string
          is_approved: boolean
          is_landline: boolean | null
          last_contact_phone: string | null
          last_delivery_status: string | null
          locked_at: string | null
          locked_by: string | null
          message_body: string
          needs_second_call: boolean | null
          notes: string | null
          origin_queue_id: string | null
          patient_name: string
          phone_2: string | null
          phone_3: string | null
          phone_number: string
          procedimentos: string | null
          queue_order: number | null
          read_at: string | null
          replied_at: string | null
          retry_phone2_sent_at: string | null
          second_call_reason: string | null
          send_accepted_at: string | null
          send_after: string
          status: string
          time_proce: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          archived_reason?: string | null
          attempt_count?: number | null
          canonical_phone?: string | null
          created_at: string
          data_exame?: string | null
          data_nascimento?: string | null
          dedupe_hash?: string | null
          dedupe_kind?: string | null
          delivered_at?: string | null
          followup_sent_at?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          id: string
          is_approved: boolean
          is_landline?: boolean | null
          last_contact_phone?: string | null
          last_delivery_status?: string | null
          locked_at?: string | null
          locked_by?: string | null
          message_body: string
          needs_second_call?: boolean | null
          notes?: string | null
          origin_queue_id?: string | null
          patient_name: string
          phone_2?: string | null
          phone_3?: string | null
          phone_number: string
          procedimentos?: string | null
          queue_order?: number | null
          read_at?: string | null
          replied_at?: string | null
          retry_phone2_sent_at?: string | null
          second_call_reason?: string | null
          send_accepted_at?: string | null
          send_after: string
          status: string
          time_proce?: string | null
          updated_at: string
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          archived_reason?: string | null
          attempt_count?: number | null
          canonical_phone?: string | null
          created_at?: string
          data_exame?: string | null
          data_nascimento?: string | null
          dedupe_hash?: string | null
          dedupe_kind?: string | null
          delivered_at?: string | null
          followup_sent_at?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          id?: string
          is_approved?: boolean
          is_landline?: boolean | null
          last_contact_phone?: string | null
          last_delivery_status?: string | null
          locked_at?: string | null
          locked_by?: string | null
          message_body?: string
          needs_second_call?: boolean | null
          notes?: string | null
          origin_queue_id?: string | null
          patient_name?: string
          phone_2?: string | null
          phone_3?: string | null
          phone_number?: string
          procedimentos?: string | null
          queue_order?: number | null
          read_at?: string | null
          replied_at?: string | null
          retry_phone2_sent_at?: string | null
          second_call_reason?: string | null
          send_accepted_at?: string | null
          send_after?: string
          status?: string
          time_proce?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          id: number
          is_paused: boolean
          safe_cadence_delay: number
          updated_at: string
        }
        Insert: {
          id: number
          is_paused?: boolean
          safe_cadence_delay?: number
          updated_at?: string
        }
        Update: {
          id?: number
          is_paused?: boolean
          safe_cadence_delay?: number
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events_raw: {
        Row: {
          dedupe_hash: string | null
          event_type: string
          headers: Json | null
          id: string
          instance_external_id: string | null
          payload: Json
          processed_at: string | null
          processing_error: string | null
          processing_status: Database['public']['Enums']['processing_status']
          provider_event_id: string | null
          provider_message_id: string | null
          provider_name: string
          received_at: string
        }
        Insert: {
          dedupe_hash?: string | null
          event_type: string
          headers?: Json | null
          id?: string
          instance_external_id?: string | null
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: Database['public']['Enums']['processing_status']
          provider_event_id?: string | null
          provider_message_id?: string | null
          provider_name: string
          received_at?: string
        }
        Update: {
          dedupe_hash?: string | null
          event_type?: string
          headers?: Json | null
          id?: string
          instance_external_id?: string | null
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: Database['public']['Enums']['processing_status']
          provider_event_id?: string | null
          provider_message_id?: string | null
          provider_name?: string
          received_at?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          chats_count: number | null
          connected_at: string | null
          created_at: string
          id: string
          instance_name: string | null
          last_message_at: string | null
          messages_received: number | null
          messages_sent_count: number | null
          phone_number: string | null
          profile_pic_url: string | null
          rotation_index: number | null
          slot_id: number
          status: string
          updated_at: string
        }
        Insert: {
          chats_count?: number | null
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          last_message_at?: string | null
          messages_received?: number | null
          messages_sent_count?: number | null
          phone_number?: string | null
          profile_pic_url?: string | null
          rotation_index?: number | null
          slot_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          chats_count?: number | null
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          last_message_at?: string | null
          messages_received?: number | null
          messages_sent_count?: number | null
          phone_number?: string | null
          profile_pic_url?: string | null
          rotation_index?: number | null
          slot_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      worker_heartbeats: {
        Row: {
          cpu_usage_percent: number | null
          current_job_id: string | null
          current_job_started_at: string | null
          ip_address: unknown
          last_heartbeat: string | null
          memory_usage_mb: number | null
          messages_failed: number | null
          messages_processed: number | null
          started_at: string | null
          worker_id: string
          worker_name: string
        }
        Insert: {
          cpu_usage_percent?: number | null
          current_job_id?: string | null
          current_job_started_at?: string | null
          ip_address?: unknown
          last_heartbeat?: string | null
          memory_usage_mb?: number | null
          messages_failed?: number | null
          messages_processed?: number | null
          started_at?: string | null
          worker_id: string
          worker_name: string
        }
        Update: {
          cpu_usage_percent?: number | null
          current_job_id?: string | null
          current_job_started_at?: string | null
          ip_address?: unknown
          last_heartbeat?: string | null
          memory_usage_mb?: number | null
          messages_failed?: number | null
          messages_processed?: number | null
          started_at?: string | null
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_realtime_metrics: {
        Row: {
          active_workers: number | null
          blocked_numbers: number | null
          connected_instances: number | null
          metrics_timestamp: string | null
          queue_pending: number | null
          queue_sending: number | null
          sent_5m: number | null
        }
        Relationships: []
      }
      expired_locks: {
        Row: {
          id: string | null
          lock_age_minutes: number | null
          locked_at: string | null
          locked_by: string | null
          patient_name: string | null
        }
        Insert: {
          id?: string | null
          lock_age_minutes?: never
          locked_at?: string | null
          locked_by?: string | null
          patient_name?: string | null
        }
        Update: {
          id?: string | null
          lock_age_minutes?: never
          locked_at?: string | null
          locked_by?: string | null
          patient_name?: string | null
        }
        Relationships: []
      }
      journey_timeline_view: {
        Row: {
          event_at: string | null
          event_type: string | null
          journey_id: string | null
          message_kind: Database['public']['Enums']['message_kind'] | null
          message_status: Database['public']['Enums']['message_status'] | null
          raw_excerpt: string | null
          source: Database['public']['Enums']['event_source'] | null
          summary: string | null
        }
        Relationships: []
      }
      message_failure_insights: {
        Row: {
          affected_instances: number | null
          error_message: string | null
          last_failure_at: string | null
          total_failures: number | null
        }
        Relationships: []
      }
      strategic_followup_overview: {
        Row: {
          canonical_phone: string | null
          data_exame: string | null
          followup_due: boolean | null
          followup_sent: boolean | null
          has_reply: boolean | null
          horario_final: string | null
          horario_inicio: string | null
          journey_id: string | null
          journey_status: Database['public']['Enums']['journey_status'] | null
          last_event_at: string | null
          last_event_type: string | null
          last_message_kind: Database['public']['Enums']['message_kind'] | null
          last_message_status: Database['public']['Enums']['message_status'] | null
          latest_classification: Database['public']['Enums']['classification'] | null
          latest_summary: string | null
          manual_priority: Database['public']['Enums']['manual_priority'] | null
          minutes_since_last_touch: number | null
          needs_manual_action: boolean | null
          patient_name: string | null
          procedimentos: string | null
          vacancy_signal: boolean | null
        }
        Insert: {
          canonical_phone?: string | null
          data_exame?: string | null
          followup_due?: never
          followup_sent?: never
          has_reply?: never
          horario_final?: string | null
          horario_inicio?: string | null
          journey_id?: string | null
          journey_status?: Database['public']['Enums']['journey_status'] | null
          last_event_at?: string | null
          last_event_type?: never
          last_message_kind?: never
          last_message_status?: never
          latest_classification?: never
          latest_summary?: never
          manual_priority?: Database['public']['Enums']['manual_priority'] | null
          minutes_since_last_touch?: never
          needs_manual_action?: boolean | null
          patient_name?: string | null
          procedimentos?: string | null
          vacancy_signal?: never
        }
        Update: {
          canonical_phone?: string | null
          data_exame?: string | null
          followup_due?: never
          followup_sent?: never
          has_reply?: never
          horario_final?: string | null
          horario_inicio?: string | null
          journey_id?: string | null
          journey_status?: Database['public']['Enums']['journey_status'] | null
          last_event_at?: string | null
          last_event_type?: never
          last_message_kind?: never
          last_message_status?: never
          latest_classification?: never
          latest_summary?: never
          manual_priority?: Database['public']['Enums']['manual_priority'] | null
          minutes_since_last_touch?: never
          needs_manual_action?: boolean | null
          patient_name?: string | null
          procedimentos?: string | null
          vacancy_signal?: never
        }
        Relationships: []
      }
      vacancy_candidates_overview: {
        Row: {
          data_exame: string | null
          horario_final: string | null
          horario_inicio: string | null
          journey_id: string | null
          latest_classification: Database['public']['Enums']['classification'] | null
          latest_patient_message: string | null
          manual_priority: Database['public']['Enums']['manual_priority'] | null
          needs_manual_action: boolean | null
          patient_name: string | null
          priority_score: number | null
          procedimentos: string | null
          vacancy_reason: string | null
        }
        Insert: {
          data_exame?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          journey_id?: string | null
          latest_classification?: never
          latest_patient_message?: never
          manual_priority?: Database['public']['Enums']['manual_priority'] | null
          needs_manual_action?: boolean | null
          patient_name?: string | null
          priority_score?: never
          procedimentos?: string | null
          vacancy_reason?: never
        }
        Update: {
          data_exame?: string | null
          horario_final?: string | null
          horario_inicio?: string | null
          journey_id?: string | null
          latest_classification?: never
          latest_patient_message?: never
          manual_priority?: Database['public']['Enums']['manual_priority'] | null
          needs_manual_action?: boolean | null
          patient_name?: string | null
          priority_score?: never
          procedimentos?: string | null
          vacancy_reason?: never
        }
        Relationships: []
      }
      worker_status_summary: {
        Row: {
          current_job_id: string | null
          current_job_started_at: string | null
          last_heartbeat: string | null
          messages_failed: number | null
          messages_processed: number | null
          minutes_since_heartbeat: number | null
          started_at: string | null
          status: string | null
          worker_id: string | null
          worker_name: string | null
        }
        Insert: {
          current_job_id?: string | null
          current_job_started_at?: string | null
          last_heartbeat?: string | null
          messages_failed?: number | null
          messages_processed?: number | null
          minutes_since_heartbeat?: never
          started_at?: string | null
          status?: never
          worker_id?: string | null
          worker_name?: string | null
        }
        Update: {
          current_job_id?: string | null
          current_job_started_at?: string | null
          last_heartbeat?: string | null
          messages_failed?: number | null
          messages_processed?: number | null
          minutes_since_heartbeat?: never
          started_at?: string | null
          status?: never
          worker_id?: string | null
          worker_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acquire_worker_lease: {
        Args: { p_lease_seconds?: number; p_worker_id: string }
        Returns: boolean
      }
      archive_by_data_exame: {
        Args: {
          archive_reason?: string
          archived_by?: string
          data_fim: string
          data_inicio: string
        }
        Returns: {
          archived_count: number
          blocked_count: number
          message: string
          success: boolean
        }[]
      }
      archive_selected_patients: {
        Args: {
          archive_reason?: string
          archived_by?: string
          patient_ids: string[]
        }
        Returns: {
          archived_count: number
          blocked_count: number
          message: string
          success: boolean
        }[]
      }
      claim_next_message: {
        Args: { p_max_attempts?: number; p_worker_id: string }
        Returns: {
          attempt_count: number
          id: string
          instance_id: string
          instance_name: string
          journey_id: string
          last_phone_used: string
          locked_instance_id: string
          message_body: string
          patient_name: string
          phone_2: string
          phone_3: string
          phone_attempt_index: number
          phone_number: string
          provider_chat_id: string
          provider_message_id: string
        }[]
      }
      cleanup_stale_heartbeats: {
        Args: { p_stale_after_minutes?: number }
        Returns: {
          current_job_id: string
          worker_id: string
        }[]
      }
      enqueue_patient:
        | {
            Args: {
              p_attempt_count?: number
              p_canonical_phone?: string
              p_data_exame?: string
              p_data_nascimento?: string
              p_dedupe_hash?: string
              p_dedupe_kind?: string
              p_horario_final?: string
              p_horario_inicio?: string
              p_is_approved?: boolean
              p_message_body: string
              p_notes?: string
              p_origin_queue_id?: string
              p_patient_name: string
              p_phone_2?: string
              p_phone_3?: string
              p_phone_number: string
              p_procedimentos?: string
              p_send_after?: string
              p_status?: string
              p_time_proce?: string
            }
            Returns: {
              error_message: string
              id: string
              status: string
            }[]
          }
        | {
            Args: {
              p_attempt_count: number
              p_canonical_phone: string
              p_data_exame: string
              p_data_nascimento: string
              p_dedupe_hash: string
              p_dedupe_kind: string
              p_horario_final: string
              p_horario_inicio: string
              p_is_approved: boolean
              p_last_phone_used: string
              p_message_body: string
              p_notes: string
              p_origin_queue_id: string
              p_patient_name: string
              p_phone_2: string
              p_phone_2_whatsapp_valid: boolean
              p_phone_3: string
              p_phone_3_whatsapp_valid: boolean
              p_phone_attempt_index: number
              p_phone_number: string
              p_procedimentos: string
              p_send_after: string
              p_status: string
              p_time_proce: string
            }
            Returns: {
              error_message: string
              id: string
              status: string
            }[]
          }
        | {
            Args: {
              p_attempt_count?: number
              p_canonical_phone?: string
              p_data_exame?: string
              p_data_nascimento?: string
              p_dedupe_hash?: string
              p_dedupe_kind?: string
              p_horario_final?: string
              p_horario_inicio?: string
              p_is_approved: boolean
              p_last_phone_used?: string
              p_locked_instance_id?: string
              p_message_body: string
              p_notes: string
              p_origin_queue_id?: string
              p_patient_name: string
              p_phone_2?: string
              p_phone_2_whatsapp_valid?: boolean
              p_phone_3?: string
              p_phone_3_whatsapp_valid?: boolean
              p_phone_attempt_index?: number
              p_phone_number: string
              p_procedimentos?: string
              p_send_after: string
              p_status: string
              p_time_proce?: string
            }
            Returns: {
              error_message: string
              id: string
              status: string
            }[]
          }
      normalize_phone_for_journey: {
        Args: { raw_phone: string }
        Returns: string
      }
      preview_archive_by_data_exame: {
        Args: { data_fim: string; data_inicio: string }
        Returns: {
          blocked_sending: number
          data_exame_range: Json
          message: string
          status_breakdown: Json
          total_to_archive: number
        }[]
      }
      release_expired_locks: {
        Args: { p_lock_timeout_minutes?: number }
        Returns: {
          released_id: string
          was_failed: boolean
        }[]
      }
      release_worker_lease: { Args: { p_worker_id: string }; Returns: boolean }
      update_analytics_daily_procedures: {
        Args: { target_date?: string }
        Returns: undefined
      }
    }
    Enums: {
      classification:
        | 'confirmado_positivo'
        | 'quer_remarcar'
        | 'nao_pode_comparecer'
        | 'cancelado'
        | 'duvida'
        | 'ambigua'
        | 'sem_resposta_util'
      event_source: 'worker' | 'webhook' | 'polling' | 'ai' | 'manual'
      journey_status:
        | 'queued'
        | 'contacting'
        | 'delivered_waiting_reply'
        | 'followup_due'
        | 'followup_sent'
        | 'confirmed'
        | 'pending_manual'
        | 'cancelled'
        | 'archived'
      manual_priority: 'low' | 'medium' | 'high' | 'urgent'
      message_direction: 'outbound' | 'inbound'
      message_kind: 'original' | 'retry_phone2' | 'followup_confirm' | 'patient_reply'
      message_status:
        | 'queued'
        | 'sending'
        | 'accepted'
        | 'delivered'
        | 'read'
        | 'replied'
        | 'failed'
        | 'cancelled'
      processing_status: 'pending' | 'processing' | 'processed' | 'failed' | 'ignored'
      queue_status: 'queued' | 'sending' | 'delivered' | 'failed' | 'cancelled'
      recommended_action:
        | 'close_as_confirmed'
        | 'move_to_pending'
        | 'flag_vacancy'
        | 'manual_review'
        | 'ignore'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      classification: [
        'confirmado_positivo',
        'quer_remarcar',
        'nao_pode_comparecer',
        'cancelado',
        'duvida',
        'ambigua',
        'sem_resposta_util',
      ],
      event_source: ['worker', 'webhook', 'polling', 'ai', 'manual'],
      journey_status: [
        'queued',
        'contacting',
        'delivered_waiting_reply',
        'followup_due',
        'followup_sent',
        'confirmed',
        'pending_manual',
        'cancelled',
        'archived',
      ],
      manual_priority: ['low', 'medium', 'high', 'urgent'],
      message_direction: ['outbound', 'inbound'],
      message_kind: ['original', 'retry_phone2', 'followup_confirm', 'patient_reply'],
      message_status: [
        'queued',
        'sending',
        'accepted',
        'delivered',
        'read',
        'replied',
        'failed',
        'cancelled',
      ],
      processing_status: ['pending', 'processing', 'processed', 'failed', 'ignored'],
      queue_status: ['queued', 'sending', 'delivered', 'failed', 'cancelled'],
      recommended_action: [
        'close_as_confirmed',
        'move_to_pending',
        'flag_vacancy',
        'manual_review',
        'ignore',
      ],
    },
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: analytics_daily
//   id: bigint (not null)
//   data: date (not null)
//   total_enviadas: integer (not null, default: 0)
//   sucesso: integer (not null, default: 0)
//   falha: integer (not null, default: 0)
//   cancelada: integer (not null, default: 0)
//   por_procedimento: jsonb (not null, default: '{}'::jsonb)
//   avg_time_to_delivery_minutes: numeric (nullable)
//   avg_retry_count: numeric (nullable)
//   instances_used: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: automation_runtime_control
//   id: integer (not null)
//   active_worker_id: text (nullable)
//   lease_expires_at: timestamp with time zone (nullable)
//   updated_at: timestamp with time zone (not null, default: now())
// Table: dashboard_realtime_metrics
//   queue_pending: bigint (nullable)
//   queue_sending: bigint (nullable)
//   sent_5m: bigint (nullable)
//   connected_instances: bigint (nullable)
//   active_workers: bigint (nullable)
//   blocked_numbers: bigint (nullable)
//   metrics_timestamp: timestamp with time zone (nullable)
// Table: expired_locks
//   id: uuid (nullable)
//   patient_name: text (nullable)
//   locked_by: text (nullable)
//   locked_at: timestamp with time zone (nullable)
//   lock_age_minutes: numeric (nullable)
// Table: journey_events
//   id: uuid (not null, default: gen_random_uuid())
//   journey_id: uuid (not null)
//   message_id: uuid (nullable)
//   event_type: text (not null)
//   event_at: timestamp with time zone (not null, default: now())
//   source: event_source (not null)
//   payload: jsonb (nullable)
// Table: journey_messages
//   id: uuid (not null, default: gen_random_uuid())
//   journey_id: uuid (not null)
//   parent_message_id: uuid (nullable)
//   queue_message_id: uuid (nullable)
//   direction: message_direction (not null)
//   message_kind: message_kind (not null, default: 'original'::message_kind)
//   provider_name: text (not null, default: 'evolution'::text)
//   provider_message_id: text (nullable)
//   provider_chat_id: text (nullable)
//   instance_id: uuid (nullable)
//   phone_number: text (not null)
//   message_body: text (nullable)
//   status: message_status (not null, default: 'queued'::message_status)
//   accepted_at: timestamp with time zone (nullable)
//   delivered_at: timestamp with time zone (nullable)
//   read_at: timestamp with time zone (nullable)
//   replied_at: timestamp with time zone (nullable)
//   failed_at: timestamp with time zone (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: journey_timeline_view
//   journey_id: uuid (nullable)
//   event_at: timestamp with time zone (nullable)
//   event_type: text (nullable)
//   source: event_source (nullable)
//   message_kind: message_kind (nullable)
//   message_status: message_status (nullable)
//   summary: text (nullable)
//   raw_excerpt: text (nullable)
// Table: message_blocks
//   id: uuid (not null, default: gen_random_uuid())
//   patient_id: uuid (nullable)
//   phone_number: text (not null)
//   blocked_at: timestamp with time zone (nullable, default: now())
//   reason: text (not null)
//   source: text (nullable)
//   permanent: boolean (nullable, default: true)
//   expires_at: timestamp with time zone (nullable)
//   blocked_by: text (nullable)
// Table: message_events
//   id: uuid (not null, default: gen_random_uuid())
//   message_id: uuid (nullable)
//   instance_id: uuid (nullable)
//   to_phone: text (nullable)
//   event_type: text (not null)
//   event_at: timestamp with time zone (not null, default: now())
//   raw_payload: jsonb (nullable)
// Table: message_failure_insights
//   total_failures: bigint (nullable)
//   error_message: text (nullable)
//   affected_instances: bigint (nullable)
//   last_failure_at: timestamp with time zone (nullable)
// Table: message_logs
//   id: uuid (not null, default: gen_random_uuid())
//   message_id: uuid (nullable)
//   instance_id: uuid (nullable)
//   sent_at: timestamp with time zone (nullable, default: now())
//   status: text (not null)
//   error_message: text (nullable)
//   retry_count: integer (nullable, default: 0)
//   phone_masked: text (nullable)
//   patient_hash: text (nullable)
//   duration_ms: integer (nullable)
// Table: message_qualifications
//   id: uuid (not null, default: gen_random_uuid())
//   journey_id: uuid (not null)
//   message_id: uuid (not null)
//   classification: classification (not null)
//   confidence: numeric (not null)
//   summary: text (nullable)
//   recommended_action: recommended_action (not null)
//   vacancy_signal: boolean (not null, default: false)
//   vacancy_reason: text (nullable)
//   needs_manual_review: boolean (not null, default: false)
//   model_name: text (nullable)
//   raw_output: jsonb (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: patient_consent
//   id: uuid (not null, default: gen_random_uuid())
//   patient_id: uuid (nullable)
//   consent_status: text (not null)
//   consent_granted_at: timestamp with time zone (nullable)
//   consent_revoked_at: timestamp with time zone (nullable)
//   consent_source: text (not null)
//   consent_version: text (nullable, default: '1.0'::text)
//   privacy_policy_version: text (nullable, default: '1.0'::text)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: patient_journeys
//   id: uuid (not null, default: gen_random_uuid())
//   origin_queue_id: uuid (nullable)
//   patient_name: text (not null)
//   canonical_phone: text (not null)
//   primary_phone: text (not null)
//   secondary_phone: text (nullable)
//   tertiary_phone: text (nullable)
//   data_exame: date (nullable)
//   procedimentos: text (nullable)
//   horario_inicio: time without time zone (nullable)
//   horario_final: time without time zone (nullable)
//   journey_status: journey_status (not null, default: 'queued'::journey_status)
//   last_message_id: uuid (nullable)
//   last_event_at: timestamp with time zone (nullable)
//   confirmed_at: timestamp with time zone (nullable)
//   pending_at: timestamp with time zone (nullable)
//   needs_manual_action: boolean (not null, default: false)
//   manual_priority: manual_priority (nullable)
//   manual_note: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: patients_queue
//   id: uuid (not null, default: gen_random_uuid())
//   patient_name: text (not null)
//   phone_number: text (not null)
//   message_body: text (not null)
//   status: queue_status (not null, default: 'queued'::queue_status)
//   is_approved: boolean (not null, default: false)
//   send_after: timestamp with time zone (not null, default: now())
//   notes: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   queue_order: integer (nullable)
//   Data_nascimento: text (nullable)
//   procedimentos: text (nullable)
//   time_proce: text (nullable)
//   horario_inicio: time without time zone (nullable)
//   horario_final: time without time zone (nullable)
//   locked_by: text (nullable)
//   locked_at: timestamp with time zone (nullable)
//   attempt_count: integer (nullable, default: 0)
//   phone_2: text (nullable)
//   phone_3: text (nullable)
//   data_exame: text (nullable)
//   send_accepted_at: timestamp with time zone (nullable)
//   delivered_at: timestamp with time zone (nullable)
//   read_at: timestamp with time zone (nullable)
//   replied_at: timestamp with time zone (nullable)
//   last_delivery_status: text (not null, default: 'pending'::text)
//   last_contact_phone: text (nullable)
//   needs_second_call: boolean (not null, default: false)
//   second_call_reason: text (nullable)
//   retry_phone2_sent_at: timestamp with time zone (nullable)
//   followup_sent_at: timestamp with time zone (nullable)
//   is_landline: boolean (not null, default: false)
//   dedupe_hash: text (nullable)
//   dedupe_kind: text (nullable, default: 'original'::text)
//   index_for_dedupe_hash: text (nullable)
//   canonical_phone: text (nullable)
//   origin_queue_id: uuid (nullable)
//   back_to_queue_count: integer (nullable, default: 0)
//   journey_id: uuid (nullable)
//   provider_message_id: text (nullable)
//   provider_chat_id: text (nullable)
//   accepted_at: timestamp with time zone (nullable)
//   followup_due_at: timestamp with time zone (nullable)
//   resolved_at: timestamp with time zone (nullable)
//   current_outcome: text (nullable)
//   phone_attempt_index: integer (nullable, default: 1)
//   last_phone_used: text (nullable)
//   phone_2_whatsapp_valid: boolean (nullable)
//   phone_3_whatsapp_valid: boolean (nullable)
//   phone_2_whatsapp_checked_at: timestamp with time zone (nullable)
//   phone_3_whatsapp_checked_at: timestamp with time zone (nullable)
//   locked_instance_id: text (nullable)
//   retry_phone3_sent_at: timestamp with time zone (nullable)
//   whatsapp_checked_at: timestamp with time zone (nullable)
//   whatsapp_valid: boolean (nullable)
//   whatsapp_validated_format: text (nullable)
// Table: patients_queue_archive
//   id: uuid (not null)
//   patient_name: text (not null)
//   phone_number: text (not null)
//   message_body: text (not null)
//   status: text (not null)
//   is_approved: boolean (not null)
//   send_after: timestamp with time zone (not null)
//   queue_order: integer (nullable)
//   notes: text (nullable)
//   created_at: timestamp with time zone (not null)
//   updated_at: timestamp with time zone (not null)
//   data_exame: text (nullable)
//   data_nascimento: text (nullable)
//   procedimentos: text (nullable)
//   time_proce: text (nullable)
//   horario_inicio: time without time zone (nullable)
//   horario_final: time without time zone (nullable)
//   phone_2: text (nullable)
//   phone_3: text (nullable)
//   is_landline: boolean (nullable)
//   locked_by: text (nullable)
//   locked_at: timestamp with time zone (nullable)
//   attempt_count: integer (nullable)
//   send_accepted_at: timestamp with time zone (nullable)
//   delivered_at: timestamp with time zone (nullable)
//   read_at: timestamp with time zone (nullable)
//   replied_at: timestamp with time zone (nullable)
//   last_delivery_status: text (nullable)
//   needs_second_call: boolean (nullable)
//   second_call_reason: text (nullable)
//   retry_phone2_sent_at: timestamp with time zone (nullable)
//   followup_sent_at: timestamp with time zone (nullable)
//   last_contact_phone: text (nullable)
//   dedupe_kind: text (nullable)
//   canonical_phone: text (nullable)
//   origin_queue_id: uuid (nullable)
//   dedupe_hash: text (nullable)
//   archived_at: timestamp with time zone (not null, default: now())
//   archived_reason: text (nullable)
//   archived_by: text (nullable)
// Table: strategic_followup_overview
//   journey_id: uuid (nullable)
//   patient_name: text (nullable)
//   canonical_phone: text (nullable)
//   data_exame: date (nullable)
//   procedimentos: text (nullable)
//   horario_inicio: time without time zone (nullable)
//   horario_final: time without time zone (nullable)
//   journey_status: journey_status (nullable)
//   last_message_kind: message_kind (nullable)
//   last_message_status: message_status (nullable)
//   last_event_type: text (nullable)
//   last_event_at: timestamp with time zone (nullable)
//   minutes_since_last_touch: numeric (nullable)
//   followup_due: boolean (nullable)
//   followup_sent: boolean (nullable)
//   has_reply: boolean (nullable)
//   latest_classification: classification (nullable)
//   latest_summary: text (nullable)
//   needs_manual_action: boolean (nullable)
//   vacancy_signal: boolean (nullable)
//   manual_priority: manual_priority (nullable)
// Table: system_config
//   id: integer (not null)
//   is_paused: boolean (not null, default: false)
//   safe_cadence_delay: integer (not null, default: 30)
//   updated_at: timestamp with time zone (not null, default: now())
// Table: vacancy_candidates_overview
//   journey_id: uuid (nullable)
//   patient_name: text (nullable)
//   data_exame: date (nullable)
//   horario_inicio: time without time zone (nullable)
//   horario_final: time without time zone (nullable)
//   procedimentos: text (nullable)
//   vacancy_reason: text (nullable)
//   latest_classification: classification (nullable)
//   latest_patient_message: text (nullable)
//   priority_score: integer (nullable)
//   needs_manual_action: boolean (nullable)
//   manual_priority: manual_priority (nullable)
// Table: webhook_events_raw
//   id: uuid (not null, default: gen_random_uuid())
//   provider_name: text (not null)
//   provider_event_id: text (nullable)
//   provider_message_id: text (nullable)
//   event_type: text (not null)
//   instance_external_id: text (nullable)
//   payload: jsonb (not null)
//   headers: jsonb (nullable)
//   received_at: timestamp with time zone (not null, default: now())
//   processed_at: timestamp with time zone (nullable)
//   processing_status: processing_status (not null, default: 'pending'::processing_status)
//   processing_error: text (nullable)
//   dedupe_hash: text (nullable)
// Table: whatsapp_instances
//   id: uuid (not null, default: gen_random_uuid())
//   slot_id: integer (not null)
//   instance_name: text (nullable)
//   phone_number: text (nullable)
//   status: text (not null, default: 'empty'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   connected_at: timestamp with time zone (nullable)
//   messages_received: integer (nullable, default: 0)
//   chats_count: integer (nullable, default: 0)
//   profile_pic_url: text (nullable)
//   last_message_at: timestamp with time zone (nullable)
//   messages_sent_count: integer (nullable, default: 0)
//   rotation_index: integer (nullable, default: 0)
// Table: worker_heartbeats
//   worker_id: text (not null)
//   worker_name: text (not null)
//   started_at: timestamp with time zone (nullable, default: now())
//   last_heartbeat: timestamp with time zone (nullable, default: now())
//   current_job_id: uuid (nullable)
//   current_job_started_at: timestamp with time zone (nullable)
//   messages_processed: integer (nullable, default: 0)
//   messages_failed: integer (nullable, default: 0)
//   memory_usage_mb: integer (nullable)
//   cpu_usage_percent: numeric (nullable)
//   ip_address: inet (nullable)
// Table: worker_status_summary
//   worker_id: text (nullable)
//   worker_name: text (nullable)
//   started_at: timestamp with time zone (nullable)
//   last_heartbeat: timestamp with time zone (nullable)
//   minutes_since_heartbeat: numeric (nullable)
//   current_job_id: uuid (nullable)
//   current_job_started_at: timestamp with time zone (nullable)
//   messages_processed: integer (nullable)
//   messages_failed: integer (nullable)
//   status: text (nullable)

// --- CONSTRAINTS ---
// Table: analytics_daily
//   UNIQUE analytics_daily_data_key: UNIQUE (data)
//   PRIMARY KEY analytics_daily_pkey: PRIMARY KEY (id)
// Table: automation_runtime_control
//   CHECK automation_runtime_control_id_check: CHECK ((id = 1))
//   PRIMARY KEY automation_runtime_control_pkey: PRIMARY KEY (id)
// Table: journey_events
//   FOREIGN KEY journey_events_journey_id_fkey: FOREIGN KEY (journey_id) REFERENCES patient_journeys(id) ON DELETE CASCADE
//   FOREIGN KEY journey_events_message_id_fkey: FOREIGN KEY (message_id) REFERENCES journey_messages(id) ON DELETE SET NULL
//   PRIMARY KEY journey_events_pkey: PRIMARY KEY (id)
// Table: journey_messages
//   FOREIGN KEY journey_messages_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL
//   FOREIGN KEY journey_messages_journey_id_fkey: FOREIGN KEY (journey_id) REFERENCES patient_journeys(id) ON DELETE CASCADE
//   FOREIGN KEY journey_messages_parent_message_id_fkey: FOREIGN KEY (parent_message_id) REFERENCES journey_messages(id) ON DELETE SET NULL
//   PRIMARY KEY journey_messages_pkey: PRIMARY KEY (id)
//   FOREIGN KEY journey_messages_queue_message_id_fkey: FOREIGN KEY (queue_message_id) REFERENCES patients_queue(id) ON DELETE SET NULL
// Table: message_blocks
//   UNIQUE message_blocks_phone_number_key: UNIQUE (phone_number)
//   PRIMARY KEY message_blocks_pkey: PRIMARY KEY (id)
//   CHECK message_blocks_reason_check: CHECK ((reason = ANY (ARRAY['opt_out'::text, 'failed_payment'::text, 'complaint'::text])))
// Table: message_events
//   FOREIGN KEY message_events_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL
//   FOREIGN KEY message_events_message_id_fkey: FOREIGN KEY (message_id) REFERENCES patients_queue(id) ON DELETE CASCADE
//   PRIMARY KEY message_events_pkey: PRIMARY KEY (id)
// Table: message_logs
//   FOREIGN KEY message_logs_instance_id_fkey: FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL
//   FOREIGN KEY message_logs_message_id_fkey: FOREIGN KEY (message_id) REFERENCES patients_queue(id) ON DELETE CASCADE
//   PRIMARY KEY message_logs_pkey: PRIMARY KEY (id)
//   CHECK message_logs_status_check: CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'failed'::text])))
// Table: message_qualifications
//   CHECK message_qualifications_confidence_check: CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
//   FOREIGN KEY message_qualifications_journey_id_fkey: FOREIGN KEY (journey_id) REFERENCES patient_journeys(id) ON DELETE CASCADE
//   FOREIGN KEY message_qualifications_message_id_fkey: FOREIGN KEY (message_id) REFERENCES journey_messages(id) ON DELETE CASCADE
//   PRIMARY KEY message_qualifications_pkey: PRIMARY KEY (id)
// Table: patient_consent
//   CHECK patient_consent_consent_status_check: CHECK ((consent_status = ANY (ARRAY['granted'::text, 'denied'::text, 'pending'::text, 'revoked'::text, 'expired'::text])))
//   PRIMARY KEY patient_consent_pkey: PRIMARY KEY (id)
// Table: patient_journeys
//   FOREIGN KEY patient_journeys_origin_queue_id_fkey: FOREIGN KEY (origin_queue_id) REFERENCES patients_queue(id) ON DELETE SET NULL
//   PRIMARY KEY patient_journeys_pkey: PRIMARY KEY (id)
// Table: patients_queue
//   FOREIGN KEY patients_queue_journey_id_fkey: FOREIGN KEY (journey_id) REFERENCES patient_journeys(id) ON DELETE SET NULL
//   FOREIGN KEY patients_queue_origin_queue_id_fkey: FOREIGN KEY (origin_queue_id) REFERENCES patients_queue(id)
//   CHECK patients_queue_phone_attempt_index_check: CHECK ((phone_attempt_index = ANY (ARRAY[1, 2, 3])))
//   PRIMARY KEY patients_queue_pkey: PRIMARY KEY (id)
// Table: patients_queue_archive
//   PRIMARY KEY patients_queue_archive_pkey: PRIMARY KEY (id)
// Table: system_config
//   CHECK system_config_id_check: CHECK ((id = 1))
//   PRIMARY KEY system_config_pkey: PRIMARY KEY (id)
// Table: webhook_events_raw
//   PRIMARY KEY webhook_events_raw_pkey: PRIMARY KEY (id)
// Table: whatsapp_instances
//   PRIMARY KEY whatsapp_instances_pkey: PRIMARY KEY (id)
//   UNIQUE whatsapp_instances_slot_id_key: UNIQUE (slot_id)
// Table: worker_heartbeats
//   PRIMARY KEY worker_heartbeats_pkey: PRIMARY KEY (worker_id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: analytics_daily
//   Policy "Allow authenticated read analytics_daily" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Allow authenticated write analytics_daily" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: automation_runtime_control
//   Policy "Allow authenticated operations on automation_runtime_control" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: message_blocks
//   Policy "Allow authenticated operations on message_blocks" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: message_events
//   Policy "Allow authenticated operations on message_events" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: message_logs
//   Policy "Allow authenticated operations on message_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: patient_consent
//   Policy "Allow authenticated operations on patient_consent" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: patients_queue
//   Policy "Allow all authenticated operations on patients_queue" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: patients_queue_archive
//   Policy "Allow authenticated operations on patients_queue_archive" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: system_config
//   Policy "Allow all authenticated operations on system_config" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: whatsapp_instances
//   Policy "Allow all authenticated operations on whatsapp_instances" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: worker_heartbeats
//   Policy "Allow authenticated operations on worker_heartbeats" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true

// --- WARNING: TABLES WITH RLS ENABLED BUT NO POLICIES ---
// These tables have Row Level Security enabled but NO policies defined.
// This means ALL queries (SELECT, INSERT, UPDATE, DELETE) will return ZERO rows
// for non-superuser roles (including the anon and authenticated roles used by the app).
// You MUST create RLS policies for these tables to allow data access.
//   - journey_events
//   - journey_messages
//   - message_qualifications
//   - patient_journeys
//   - webhook_events_raw

// --- DATABASE FUNCTIONS ---
// FUNCTION acquire_worker_lease(text, integer)
//   CREATE OR REPLACE FUNCTION public.acquire_worker_lease(p_worker_id text, p_lease_seconds integer DEFAULT 90)
//    RETURNS boolean
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_updated INTEGER;
//   BEGIN
//     UPDATE public.automation_runtime_control
//     SET active_worker_id = p_worker_id,
//         lease_expires_at = NOW() + make_interval(secs => GREATEST(p_lease_seconds, 30)),
//         updated_at = NOW()
//     WHERE id = 1
//       AND (
//         active_worker_id IS NULL
//         OR active_worker_id = p_worker_id
//         OR lease_expires_at IS NULL
//         OR lease_expires_at < NOW()
//       );
//
//     GET DIAGNOSTICS v_updated = ROW_COUNT;
//     RETURN v_updated > 0;
//   END;
//   $function$
//
// FUNCTION archive_by_data_exame(date, date, text, text)
//   CREATE OR REPLACE FUNCTION public.archive_by_data_exame(data_inicio date, data_fim date, archive_reason text DEFAULT 'manual_range'::text, archived_by text DEFAULT 'dashboard'::text)
//    RETURNS TABLE(archived_count integer, blocked_count integer, success boolean, message text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   DECLARE
//     v_archived INTEGER;
//     v_blocked INTEGER;
//   BEGIN
//     IF data_inicio IS NULL OR data_fim IS NULL THEN
//       RETURN QUERY SELECT 0, 0, false, 'Informe data inicial e final';
//       RETURN;
//     END IF;
//
//     IF data_inicio > data_fim THEN
//       RETURN QUERY SELECT 0, 0, false, 'Data inicial maior que data final';
//       RETURN;
//     END IF;
//
//     SELECT COUNT(*) FILTER (WHERE status = 'sending' OR locked_by IS NOT NULL)
//     INTO v_blocked
//     FROM public.patients_queue
//     WHERE NULLIF(data_exame, '') IS NOT NULL
//       AND data_exame::date BETWEEN data_inicio AND data_fim;
//
//     WITH candidates AS (
//       SELECT *
//       FROM public.patients_queue
//       WHERE NULLIF(data_exame, '') IS NOT NULL
//         AND data_exame::date BETWEEN data_inicio AND data_fim
//         AND NOT (status = 'sending' OR locked_by IS NOT NULL)
//     ),
//     inserted AS (
//       INSERT INTO public.patients_queue_archive (
//         id,
//         patient_name,
//         phone_number,
//         message_body,
//         status,
//         is_approved,
//         send_after,
//         queue_order,
//         notes,
//         created_at,
//         updated_at,
//         data_exame,
//         Data_nascimento,
//         procedimentos,
//         time_proce,
//         horario_inicio,
//         horario_final,
//         phone_2,
//         phone_3,
//         is_landline,
//         locked_by,
//         locked_at,
//         attempt_count,
//         send_accepted_at,
//         delivered_at,
//         read_at,
//         replied_at,
//         last_delivery_status,
//         needs_second_call,
//         second_call_reason,
//         retry_phone2_sent_at,
//         followup_sent_at,
//         last_contact_phone,
//         dedupe_kind,
//         canonical_phone,
//         origin_queue_id,
//         dedupe_hash,
//         archived_at,
//         archived_reason,
//         archived_by
//       )
//       SELECT
//         id,
//         patient_name,
//         phone_number,
//         message_body,
//         status::text,
//         is_approved,
//         send_after,
//         queue_order,
//         notes,
//         created_at,
//         updated_at,
//         data_exame,
//         Data_nascimento,
//         procedimentos,
//         time_proce,
//         horario_inicio,
//         horario_final,
//         phone_2,
//         phone_3,
//         is_landline,
//         locked_by,
//         locked_at,
//         attempt_count,
//         send_accepted_at,
//         delivered_at,
//         read_at,
//         replied_at,
//         last_delivery_status,
//         needs_second_call,
//         second_call_reason,
//         retry_phone2_sent_at,
//         followup_sent_at,
//         last_contact_phone,
//         dedupe_kind,
//         canonical_phone,
//         origin_queue_id,
//         dedupe_hash,
//         NOW(),
//         archive_reason,
//         archived_by
//       FROM candidates
//       ON CONFLICT (id) DO NOTHING
//       RETURNING id
//     ),
//     deleted AS (
//       DELETE FROM public.patients_queue pq
//       USING inserted
//       WHERE pq.id = inserted.id
//       RETURNING pq.id
//     )
//     SELECT COUNT(*)::int INTO v_archived FROM deleted;
//
//     RETURN QUERY
//     SELECT
//       COALESCE(v_archived, 0),
//       COALESCE(v_blocked, 0),
//       true,
//       CASE
//         WHEN COALESCE(v_archived, 0) = 0 AND COALESCE(v_blocked, 0) > 0 THEN 'Nenhum paciente arquivado porque todos estavam em processamento'
//         WHEN COALESCE(v_archived, 0) = 0 THEN 'Nenhum paciente elegivel para arquivamento no periodo'
//         ELSE 'Arquivamento concluido com sucesso'
//       END;
//   END;
//   $function$
//
// FUNCTION archive_selected_patients(uuid[], text, text)
//   CREATE OR REPLACE FUNCTION public.archive_selected_patients(patient_ids uuid[], archive_reason text DEFAULT 'manual_selection'::text, archived_by text DEFAULT 'dashboard'::text)
//    RETURNS TABLE(archived_count integer, blocked_count integer, success boolean, message text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   DECLARE
//     v_archived INTEGER;
//     v_blocked INTEGER;
//   BEGIN
//     IF patient_ids IS NULL OR COALESCE(array_length(patient_ids, 1), 0) = 0 THEN
//       RETURN QUERY SELECT 0, 0, false, 'Nenhum paciente selecionado';
//       RETURN;
//     END IF;
//
//     SELECT COUNT(*) FILTER (WHERE status = 'sending' OR locked_by IS NOT NULL)
//     INTO v_blocked
//     FROM public.patients_queue
//     WHERE id = ANY(patient_ids);
//
//     WITH candidates AS (
//       SELECT *
//       FROM public.patients_queue
//       WHERE id = ANY(patient_ids)
//         AND NOT (status = 'sending' OR locked_by IS NOT NULL)
//     ),
//     inserted AS (
//       INSERT INTO public.patients_queue_archive (
//         id, patient_name, phone_number, message_body, status, is_approved,
//         send_after, queue_order, notes, created_at, updated_at, data_exame,
//         Data_nascimento, procedimentos, time_proce, horario_inicio, horario_final,
//         phone_2, phone_3, is_landline, locked_by, locked_at, attempt_count,
//         send_accepted_at, delivered_at, read_at, replied_at, last_delivery_status,
//         needs_second_call, second_call_reason, retry_phone2_sent_at, followup_sent_at,
//         last_contact_phone, dedupe_kind, canonical_phone, origin_queue_id, dedupe_hash,
//         archived_at, archived_reason, archived_by
//       )
//       SELECT
//         id, patient_name, phone_number, message_body, status::text, is_approved,
//         send_after, queue_order, notes, created_at, updated_at, data_exame,
//         Data_nascimento, procedimentos, time_proce, horario_inicio, horario_final,
//         phone_2, phone_3, is_landline, locked_by, locked_at, attempt_count,
//         send_accepted_at, delivered_at, read_at, replied_at, last_delivery_status,
//         needs_second_call, second_call_reason, retry_phone2_sent_at, followup_sent_at,
//         last_contact_phone, dedupe_kind, canonical_phone, origin_queue_id, dedupe_hash,
//         NOW(), archive_reason, archived_by
//       FROM candidates
//       ON CONFLICT (id) DO NOTHING
//       RETURNING id
//     ),
//     deleted AS (
//       DELETE FROM public.patients_queue pq
//       USING inserted
//       WHERE pq.id = inserted.id
//       RETURNING pq.id
//     )
//     SELECT COUNT(*)::int INTO v_archived FROM deleted;
//
//     RETURN QUERY
//     SELECT
//       COALESCE(v_archived, 0),
//       COALESCE(v_blocked, 0),
//       true,
//       CASE
//         WHEN COALESCE(v_archived, 0) = 0 AND COALESCE(v_blocked, 0) > 0 THEN 'Nenhum paciente arquivado porque todos estavam em processamento'
//         WHEN COALESCE(v_archived, 0) = 0 THEN 'Nenhum paciente elegivel para arquivamento na selecao'
//         ELSE 'Arquivamento da selecao concluido com sucesso'
//       END;
//   END;
//   $function$
//
// FUNCTION claim_next_message(text, integer)
//   CREATE OR REPLACE FUNCTION public.claim_next_message(p_worker_id text, p_max_attempts integer DEFAULT 3)
//    RETURNS TABLE(id uuid, patient_name text, phone_number text, message_body text, instance_id uuid, instance_name text, attempt_count integer, journey_id uuid, provider_message_id text, provider_chat_id text, locked_instance_id text, phone_attempt_index integer, phone_2 text, phone_3 text, last_phone_used text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_instance_id UUID;
//     v_instance_name TEXT;
//   BEGIN
//     SELECT wi.id, wi.instance_name
//     INTO v_instance_id, v_instance_name
//     FROM public.whatsapp_instances wi
//     WHERE wi.status = 'connected'
//     ORDER BY wi.rotation_index ASC NULLS FIRST
//     FOR UPDATE OF wi SKIP LOCKED
//     LIMIT 1;
//
//     IF v_instance_id IS NULL THEN
//       RETURN;
//     END IF;
//
//     RETURN QUERY
//     WITH next_msg AS (
//       SELECT pq.id
//       FROM public.patients_queue pq
//       WHERE pq.status = 'queued'
//       AND pq.is_approved = true
//       AND pq.locked_by IS NULL
//       AND pq.attempt_count < p_max_attempts
//       ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
//       FOR UPDATE SKIP LOCKED
//       LIMIT 1
//     )
//     UPDATE public.patients_queue
//     SET
//       status = 'sending',
//       locked_by = p_worker_id,
//       locked_at = NOW(),
//       attempt_count = public.patients_queue.attempt_count + 1,
//       updated_at = NOW()
//     FROM next_msg
//     WHERE public.patients_queue.id = next_msg.id
//     RETURNING
//       public.patients_queue.id,
//       public.patients_queue.patient_name,
//       public.patients_queue.phone_number,
//       public.patients_queue.message_body,
//       v_instance_id,
//       v_instance_name,
//       public.patients_queue.attempt_count,
//       public.patients_queue.journey_id,
//       public.patients_queue.provider_message_id,
//       public.patients_queue.provider_chat_id,
//       public.patients_queue.locked_instance_id,
//       public.patients_queue.phone_attempt_index,
//       public.patients_queue.phone_2,
//       public.patients_queue.phone_3,
//       public.patients_queue.last_phone_used;
//   END;
//   $function$
//
// FUNCTION cleanup_stale_heartbeats(integer)
//   CREATE OR REPLACE FUNCTION public.cleanup_stale_heartbeats(p_stale_after_minutes integer DEFAULT 10)
//    RETURNS TABLE(worker_id text, current_job_id uuid)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     DELETE FROM public.worker_heartbeats wh
//     WHERE wh.last_heartbeat < NOW() - make_interval(mins => GREATEST(p_stale_after_minutes, 1))
//     RETURNING wh.worker_id, wh.current_job_id;
//   END;
//   $function$
//
// FUNCTION enqueue_patient(text, text, text, text, boolean, timestamp with time zone, text, integer, text, uuid, text, text, text, text, text, text, text, text, text, text, integer, text, boolean, boolean)
//   CREATE OR REPLACE FUNCTION public.enqueue_patient(p_patient_name text, p_phone_number text, p_message_body text, p_status text, p_is_approved boolean, p_send_after timestamp with time zone, p_notes text, p_attempt_count integer, p_dedupe_kind text, p_origin_queue_id uuid, p_canonical_phone text, p_dedupe_hash text, p_data_exame text, p_horario_inicio text, p_procedimentos text, p_phone_2 text, p_phone_3 text, p_data_nascimento text, p_horario_final text, p_time_proce text, p_phone_attempt_index integer, p_last_phone_used text, p_phone_2_whatsapp_valid boolean, p_phone_3_whatsapp_valid boolean)
//    RETURNS TABLE(id uuid, status text, error_message text)
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_canonical_phone TEXT;
//     v_dedupe_hash TEXT;
//     v_new_id UUID;
//   BEGIN
//     IF p_canonical_phone IS NULL THEN
//       v_canonical_phone := REGEXP_REPLACE(p_phone_number, '[^0-9]', '', 'g');
//       IF NOT v_canonical_phone LIKE '55%' AND LENGTH(v_canonical_phone) <= 11 THEN
//         v_canonical_phone := '55' || v_canonical_phone;
//       END IF;
//     ELSE
//       v_canonical_phone := p_canonical_phone;
//     END IF;
//
//     IF p_dedupe_hash IS NULL AND p_dedupe_kind = 'original' THEN
//       v_dedupe_hash := MD5(
//         v_canonical_phone || '|' ||
//         COALESCE(p_data_exame, '') || '|' ||
//         COALESCE(p_horario_inicio, '') || '|' ||
//         COALESCE(p_procedimentos, '')
//       );
//     ELSE
//       v_dedupe_hash := p_dedupe_hash;
//     END IF;
//
//     IF p_dedupe_kind = 'original' THEN
//       IF EXISTS (
//         SELECT 1
//         FROM public.patients_queue pq
//         WHERE pq.canonical_phone = v_canonical_phone
//           AND pq.data_exame = p_data_exame
//           AND pq.horario_inicio = p_horario_inicio::time
//           AND COALESCE(pq.procedimentos, '') = COALESCE(p_procedimentos, '')
//           AND pq.status IN ('queued', 'sending', 'delivered')
//           AND pq.dedupe_kind = 'original'
//       ) THEN
//         RETURN QUERY SELECT NULL::UUID, 'duplicate_original'::TEXT, 'Mensagem original duplicada'::TEXT;
//         RETURN;
//       END IF;
//     END IF;
//
//     IF p_dedupe_kind IN ('retry_phone2', 'followup_confirm', 'retry_phone3') AND p_origin_queue_id IS NOT NULL THEN
//       IF EXISTS (
//         SELECT 1
//         FROM public.patients_queue pq
//         WHERE pq.origin_queue_id = p_origin_queue_id
//           AND pq.dedupe_kind = p_dedupe_kind
//       ) THEN
//         RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Segunda chamada duplicada'::TEXT;
//         RETURN;
//       END IF;
//     END IF;
//
//     IF EXISTS (
//       SELECT 1
//       FROM public.patients_queue pq
//       WHERE pq.canonical_phone = v_canonical_phone
//         AND pq.created_at > NOW() - INTERVAL '2 hours'
//         AND pq.status IN ('queued', 'sending', 'delivered')
//     ) THEN
//       RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Mensagem muito recente para o mesmo telefone'::TEXT;
//       RETURN;
//     END IF;
//
//     INSERT INTO public.patients_queue (
//       patient_name,
//       phone_number,
//       message_body,
//       status,
//       is_approved,
//       send_after,
//       notes,
//       attempt_count,
//       dedupe_kind,
//       origin_queue_id,
//       canonical_phone,
//       dedupe_hash,
//       data_exame,
//       horario_inicio,
//       procedimentos,
//       phone_2,
//       phone_3,
//       "Data_nascimento",
//       horario_final,
//       time_proce,
//       phone_attempt_index,
//       last_phone_used,
//       phone_2_whatsapp_valid,
//       phone_3_whatsapp_valid,
//       queue_order,
//       created_at,
//       updated_at
//     ) VALUES (
//       p_patient_name,
//       p_phone_number,
//       p_message_body,
//       p_status::queue_status,
//       p_is_approved,
//       p_send_after,
//       p_notes,
//       p_attempt_count,
//       p_dedupe_kind,
//       p_origin_queue_id,
//       v_canonical_phone,
//       v_dedupe_hash,
//       p_data_exame,
//       p_horario_inicio::time,
//       p_procedimentos,
//       p_phone_2,
//       p_phone_3,
//       p_data_nascimento,
//       CASE WHEN p_horario_final IS NULL OR p_horario_final = '' THEN NULL ELSE p_horario_final::time END,
//       p_time_proce,
//       p_phone_attempt_index,
//       p_last_phone_used,
//       p_phone_2_whatsapp_valid,
//       p_phone_3_whatsapp_valid,
//       COALESCE(
//         (SELECT COALESCE(MAX(pq.queue_order), 0) + 1 FROM public.patients_queue pq WHERE pq.status = 'queued'),
//         1
//       ),
//       NOW(),
//       NOW()
//     ) RETURNING patients_queue.id INTO v_new_id;
//
//     RETURN QUERY SELECT v_new_id, 'success'::TEXT, NULL::TEXT;
//   END;
//   $function$
//
// FUNCTION enqueue_patient(text, text, text, text, boolean, timestamp without time zone, text, integer, text, uuid, text, text, text, text, text, text, text, text, text, text, text, integer, text, boolean, boolean)
//   CREATE OR REPLACE FUNCTION public.enqueue_patient(p_patient_name text, p_phone_number text, p_message_body text, p_status text, p_is_approved boolean, p_send_after timestamp without time zone, p_notes text, p_attempt_count integer DEFAULT 0, p_dedupe_kind text DEFAULT 'original'::text, p_origin_queue_id uuid DEFAULT NULL::uuid, p_canonical_phone text DEFAULT NULL::text, p_data_nascimento text DEFAULT NULL::text, p_data_exame text DEFAULT NULL::text, p_procedimentos text DEFAULT NULL::text, p_horario_inicio text DEFAULT NULL::text, p_horario_final text DEFAULT NULL::text, p_time_proce text DEFAULT NULL::text, p_phone_2 text DEFAULT NULL::text, p_phone_3 text DEFAULT NULL::text, p_dedupe_hash text DEFAULT NULL::text, p_locked_instance_id text DEFAULT NULL::text, p_phone_attempt_index integer DEFAULT 0, p_last_phone_used text DEFAULT NULL::text, p_phone_2_whatsapp_valid boolean DEFAULT NULL::boolean, p_phone_3_whatsapp_valid boolean DEFAULT NULL::boolean)
//    RETURNS TABLE(id uuid, status text, error_message text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_canonical_phone TEXT;
//     v_dedupe_hash TEXT;
//     v_new_id UUID;
//   BEGIN
//     IF p_canonical_phone IS NULL THEN
//       v_canonical_phone := REGEXP_REPLACE(p_phone_number, '[^0-9]', '', 'g');
//       IF NOT v_canonical_phone LIKE '55%' AND LENGTH(v_canonical_phone) <= 11 THEN
//         v_canonical_phone := '55' || v_canonical_phone;
//       END IF;
//     ELSE
//       v_canonical_phone := p_canonical_phone;
//     END IF;
//
//     IF p_dedupe_hash IS NULL AND p_dedupe_kind = 'original' THEN
//       v_dedupe_hash := MD5(
//         v_canonical_phone || '|' ||
//         COALESCE(p_data_exame, '') || '|' ||
//         COALESCE(p_horario_inicio, '') || '|' ||
//         COALESCE(p_procedimentos, '')
//       );
//     ELSE
//       v_dedupe_hash := p_dedupe_hash;
//     END IF;
//
//     IF p_dedupe_kind = 'original' THEN
//       IF EXISTS (
//         SELECT 1
//         FROM public.patients_queue pq
//         WHERE pq.canonical_phone = v_canonical_phone
//         AND pq.data_exame = p_data_exame
//         AND pq.horario_inicio = p_horario_inicio::time
//         AND COALESCE(pq.procedimentos, '') = COALESCE(p_procedimentos, '')
//         AND pq.status IN ('queued', 'sending', 'delivered')
//         AND pq.dedupe_kind = 'original'
//       ) THEN
//         RETURN QUERY SELECT NULL::UUID, 'duplicate_original'::TEXT, 'Mensagem original duplicada'::TEXT;
//         RETURN;
//       END IF;
//     END IF;
//
//     IF p_dedupe_kind IN ('retry_phone2', 'retry_phone3', 'followup_confirm') AND p_origin_queue_id IS NOT NULL THEN
//       IF EXISTS (
//         SELECT 1
//         FROM public.patients_queue pq
//         WHERE pq.origin_queue_id = p_origin_queue_id
//         AND pq.dedupe_kind = p_dedupe_kind
//       ) THEN
//         RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Segunda chamada duplicada'::TEXT;
//         RETURN;
//       END IF;
//     END IF;
//
//     IF EXISTS (
//       SELECT 1
//       FROM public.patients_queue pq
//       WHERE pq.canonical_phone = v_canonical_phone
//       AND pq.created_at > NOW() - INTERVAL '2 hours'
//       AND pq.status IN ('queued', 'sending', 'delivered')
//     ) THEN
//       RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Mensagem muito recente para o mesmo telefone'::TEXT;
//       RETURN;
//     END IF;
//
//     INSERT INTO public.patients_queue (
//       patient_name,
//       phone_number,
//       message_body,
//       status,
//       is_approved,
//       send_after,
//       notes,
//       attempt_count,
//       dedupe_kind,
//       origin_queue_id,
//       canonical_phone,
//       dedupe_hash,
//       data_exame,
//       horario_inicio,
//       procedimentos,
//       phone_2,
//       phone_3,
//       "Data_nascimento",
//       horario_final,
//       time_proce,
//       locked_instance_id,
//       phone_attempt_index,
//       last_phone_used,
//       phone_2_whatsapp_valid,
//       phone_3_whatsapp_valid,
//       queue_order,
//       created_at,
//       updated_at
//     ) VALUES (
//       p_patient_name,
//       p_phone_number,
//       p_message_body,
//       p_status::queue_status,
//       p_is_approved,
//       p_send_after,
//       p_notes,
//       p_attempt_count,
//       p_dedupe_kind,
//       p_origin_queue_id,
//       v_canonical_phone,
//       v_dedupe_hash,
//       p_data_exame,
//       p_horario_inicio::time,
//       p_procedimentos,
//       p_phone_2,
//       p_phone_3,
//       p_data_nascimento,
//       CASE WHEN p_horario_final IS NULL OR p_horario_final = '' THEN NULL ELSE p_horario_final::time END,
//       p_time_proce,
//       p_locked_instance_id,
//       p_phone_attempt_index,
//       p_last_phone_used,
//       p_phone_2_whatsapp_valid,
//       p_phone_3_whatsapp_valid,
//       COALESCE(
//         (SELECT COALESCE(MAX(pq.queue_order), 0) + 1 FROM public.patients_queue pq WHERE pq.status = 'queued'),
//         1
//       ),
//       NOW(),
//       NOW()
//     ) RETURNING patients_queue.id INTO v_new_id;
//
//     RETURN QUERY SELECT v_new_id, 'success'::TEXT, NULL::TEXT;
//   END;
//   $function$
//
// FUNCTION enqueue_patient(text, text, text, text, boolean, timestamp with time zone, text, integer, text, uuid, text, text, text, text, text, text, text, text, text, text)
//   CREATE OR REPLACE FUNCTION public.enqueue_patient(p_patient_name text, p_phone_number text, p_message_body text, p_status text DEFAULT 'queued'::text, p_is_approved boolean DEFAULT true, p_send_after timestamp with time zone DEFAULT now(), p_notes text DEFAULT NULL::text, p_attempt_count integer DEFAULT 0, p_dedupe_kind text DEFAULT 'original'::text, p_origin_queue_id uuid DEFAULT NULL::uuid, p_canonical_phone text DEFAULT NULL::text, p_dedupe_hash text DEFAULT NULL::text, p_data_exame text DEFAULT NULL::text, p_horario_inicio text DEFAULT NULL::text, p_procedimentos text DEFAULT NULL::text, p_phone_2 text DEFAULT NULL::text, p_phone_3 text DEFAULT NULL::text, p_data_nascimento text DEFAULT NULL::text, p_horario_final text DEFAULT NULL::text, p_time_proce text DEFAULT NULL::text)
//    RETURNS TABLE(id uuid, status text, error_message text)
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_canonical_phone TEXT;
//     v_dedupe_hash TEXT;
//     v_new_id UUID;
//   BEGIN
//     IF p_canonical_phone IS NULL THEN
//       v_canonical_phone := REGEXP_REPLACE(p_phone_number, '[^0-9]', '', 'g');
//       IF NOT v_canonical_phone LIKE '55%' AND LENGTH(v_canonical_phone) <= 11 THEN
//         v_canonical_phone := '55' || v_canonical_phone;
//       END IF;
//     ELSE
//       v_canonical_phone := p_canonical_phone;
//     END IF;
//
//     IF p_dedupe_hash IS NULL AND p_dedupe_kind = 'original' THEN
//       v_dedupe_hash := MD5(
//         v_canonical_phone || '|' ||
//         COALESCE(p_data_exame, '') || '|' ||
//         COALESCE(p_horario_inicio, '') || '|' ||
//         COALESCE(p_procedimentos, '')
//       );
//     ELSE
//       v_dedupe_hash := p_dedupe_hash;
//     END IF;
//
//     IF p_dedupe_kind = 'original' THEN
//       IF EXISTS (
//         SELECT 1
//         FROM public.patients_queue pq
//         WHERE pq.canonical_phone = v_canonical_phone
//           AND pq.data_exame = p_data_exame
//           AND pq.horario_inicio = p_horario_inicio::time
//           AND COALESCE(pq.procedimentos, '') = COALESCE(p_procedimentos, '')
//           AND pq.status IN ('queued', 'sending', 'delivered')
//           AND pq.dedupe_kind = 'original'
//       ) THEN
//         RETURN QUERY SELECT NULL::UUID, 'duplicate_original'::TEXT, 'Mensagem original duplicada'::TEXT;
//         RETURN;
//       END IF;
//     END IF;
//
//     IF p_dedupe_kind IN ('retry_phone2', 'followup_confirm') AND p_origin_queue_id IS NOT NULL THEN
//       IF EXISTS (
//         SELECT 1
//         FROM public.patients_queue pq
//         WHERE pq.origin_queue_id = p_origin_queue_id
//           AND pq.dedupe_kind = p_dedupe_kind
//       ) THEN
//         RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Segunda chamada duplicada'::TEXT;
//         RETURN;
//       END IF;
//     END IF;
//
//     IF EXISTS (
//       SELECT 1
//       FROM public.patients_queue pq
//       WHERE pq.canonical_phone = v_canonical_phone
//         AND pq.created_at > NOW() - INTERVAL '2 hours'
//         AND pq.status IN ('queued', 'sending', 'delivered')
//     ) THEN
//       RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Mensagem muito recente para o mesmo telefone'::TEXT;
//       RETURN;
//     END IF;
//
//     INSERT INTO public.patients_queue (
//       patient_name,
//       phone_number,
//       message_body,
//       status,
//       is_approved,
//       send_after,
//       notes,
//       attempt_count,
//       dedupe_kind,
//       origin_queue_id,
//       canonical_phone,
//       dedupe_hash,
//       data_exame,
//       horario_inicio,
//       procedimentos,
//       phone_2,
//       phone_3,
//       "Data_nascimento",
//       horario_final,
//       time_proce,
//       queue_order,
//       created_at,
//       updated_at
//     ) VALUES (
//       p_patient_name,
//       p_phone_number,
//       p_message_body,
//       p_status::queue_status,
//       p_is_approved,
//       p_send_after,
//       p_notes,
//       p_attempt_count,
//       p_dedupe_kind,
//       p_origin_queue_id,
//       v_canonical_phone,
//       v_dedupe_hash,
//       p_data_exame,
//       p_horario_inicio::time,
//       p_procedimentos,
//       p_phone_2,
//       p_phone_3,
//       p_data_nascimento,
//       CASE WHEN p_horario_final IS NULL OR p_horario_final = '' THEN NULL ELSE p_horario_final::time END,
//       p_time_proce,
//       COALESCE(
//         (SELECT COALESCE(MAX(pq.queue_order), 0) + 1 FROM public.patients_queue pq WHERE pq.status = 'queued'),
//         1
//       ),
//       NOW(),
//       NOW()
//     ) RETURNING patients_queue.id INTO v_new_id;
//
//     RETURN QUERY SELECT v_new_id, 'success'::TEXT, NULL::TEXT;
//   END;
//   $function$
//
// FUNCTION log_patient_status_change()
//   CREATE OR REPLACE FUNCTION public.log_patient_status_change()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF OLD.status IS DISTINCT FROM NEW.status THEN
//       INSERT INTO public.message_events (
//         message_id,
//         to_phone,
//         event_type,
//         event_at,
//         raw_payload
//       ) VALUES (
//         NEW.id,
//         NEW.phone_number,
//         'status_' || NEW.status::text,
//         COALESCE(NEW.delivered_at, NEW.updated_at, NOW()),
//         jsonb_build_object(
//           'old_status', OLD.status,
//           'new_status', NEW.status,
//           'attempt_count', COALESCE(NEW.attempt_count, 0),
//           'procedimentos', NEW.procedimentos,
//           'data_exame', NEW.data_exame,
//           'is_landline', NEW.is_landline,
//           'updated_at', NEW.updated_at
//         )
//       );
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION normalize_phone_for_journey(text)
//   CREATE OR REPLACE FUNCTION public.normalize_phone_for_journey(raw_phone text)
//    RETURNS text
//    LANGUAGE plpgsql
//    IMMUTABLE
//   AS $function$
//   BEGIN
//     RETURN REGEXP_REPLACE(
//       REGEXP_REPLACE(raw_phone, '[^0-9]', '', 'g'),
//       '^55(\d{2})',
//       '+55\1'
//     );
//   END;
//   $function$
//
// FUNCTION preview_archive_by_data_exame(date, date)
//   CREATE OR REPLACE FUNCTION public.preview_archive_by_data_exame(data_inicio date, data_fim date)
//    RETURNS TABLE(total_to_archive integer, blocked_sending integer, status_breakdown jsonb, data_exame_range jsonb, message text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   DECLARE
//     v_total INTEGER;
//     v_blocked INTEGER;
//     v_breakdown JSONB;
//   BEGIN
//     IF data_inicio IS NULL OR data_fim IS NULL THEN
//       RETURN QUERY SELECT 0, 0, '{}'::jsonb, '{}'::jsonb, 'Informe data inicial e final';
//       RETURN;
//     END IF;
//
//     IF data_inicio > data_fim THEN
//       RETURN QUERY SELECT 0, 0, '{}'::jsonb, '{}'::jsonb, 'Data inicial maior que data final';
//       RETURN;
//     END IF;
//
//     SELECT
//       COUNT(*),
//       COUNT(*) FILTER (WHERE status = 'sending' OR locked_by IS NOT NULL)
//     INTO v_total, v_blocked
//     FROM public.patients_queue
//     WHERE NULLIF(data_exame, '') IS NOT NULL
//       AND data_exame::date BETWEEN data_inicio AND data_fim;
//
//     SELECT COALESCE(jsonb_object_agg(status, total), '{}'::jsonb)
//     INTO v_breakdown
//     FROM (
//       SELECT status::text AS status, COUNT(*)::int AS total
//       FROM public.patients_queue
//       WHERE NULLIF(data_exame, '') IS NOT NULL
//         AND data_exame::date BETWEEN data_inicio AND data_fim
//       GROUP BY status
//     ) grouped;
//
//     RETURN QUERY
//     SELECT
//       COALESCE(v_total, 0),
//       COALESCE(v_blocked, 0),
//       COALESCE(v_breakdown, '{}'::jsonb),
//       jsonb_build_object('from', data_inicio::text, 'to', data_fim::text),
//       CASE
//         WHEN COALESCE(v_total, 0) = 0 THEN 'Nenhum paciente encontrado no periodo'
//         ELSE 'Preview carregado com sucesso'
//       END;
//   END;
//   $function$
//
// FUNCTION release_expired_locks(integer)
//   CREATE OR REPLACE FUNCTION public.release_expired_locks(p_lock_timeout_minutes integer DEFAULT 5)
//    RETURNS TABLE(released_id uuid, was_failed boolean)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     WITH expired AS (
//       SELECT pq.id, pq.attempt_count
//       FROM public.patients_queue pq
//       WHERE pq.locked_by IS NOT NULL
//         AND pq.status = 'sending'
//         AND pq.locked_at < NOW() - (p_lock_timeout_minutes || ' minutes')::INTERVAL
//       FOR UPDATE SKIP LOCKED
//     )
//     UPDATE public.patients_queue
//     SET
//       status = CASE
//         WHEN expired.attempt_count >= 2 THEN 'failed'::queue_status
//         ELSE 'queued'::queue_status
//       END,
//       locked_by = NULL,
//       locked_at = NULL,
//       updated_at = NOW()
//     FROM expired
//     WHERE public.patients_queue.id = expired.id
//     RETURNING
//       public.patients_queue.id,
//       CASE WHEN expired.attempt_count >= 2 THEN true ELSE false END as was_failed;
//   END;
//   $function$
//
// FUNCTION release_worker_lease(text)
//   CREATE OR REPLACE FUNCTION public.release_worker_lease(p_worker_id text)
//    RETURNS boolean
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_updated INTEGER;
//   BEGIN
//     UPDATE public.automation_runtime_control
//     SET active_worker_id = NULL,
//         lease_expires_at = NULL,
//         updated_at = NOW()
//     WHERE id = 1
//       AND active_worker_id = p_worker_id;
//
//     GET DIAGNOSTICS v_updated = ROW_COUNT;
//     RETURN v_updated > 0;
//   END;
//   $function$
//
// FUNCTION rls_auto_enable()
//   CREATE OR REPLACE FUNCTION public.rls_auto_enable()
//    RETURNS event_trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'pg_catalog'
//   AS $function$
//   DECLARE
//     cmd record;
//   BEGIN
//     FOR cmd IN
//       SELECT *
//       FROM pg_event_trigger_ddl_commands()
//       WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
//         AND object_type IN ('table','partitioned table')
//     LOOP
//        IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
//         BEGIN
//           EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
//           RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
//         EXCEPTION
//           WHEN OTHERS THEN
//             RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
//         END;
//        ELSE
//           RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
//        END IF;
//     END LOOP;
//   END;
//   $function$
//
// FUNCTION set_timestamp_updated_at()
//   CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.updated_at = NOW();
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION update_analytics_daily_from_event()
//   CREATE OR REPLACE FUNCTION public.update_analytics_daily_from_event()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_data DATE;
//   BEGIN
//     v_data := (NEW.event_at AT TIME ZONE 'America/Cuiaba')::date;
//
//     INSERT INTO public.analytics_daily (data)
//     VALUES (v_data)
//     ON CONFLICT (data) DO NOTHING;
//
//     UPDATE public.analytics_daily
//     SET
//       total_enviadas = total_enviadas + CASE WHEN NEW.event_type = 'status_sending' THEN 1 ELSE 0 END,
//       sucesso = sucesso + CASE WHEN NEW.event_type = 'status_delivered' THEN 1 ELSE 0 END,
//       falha = falha + CASE WHEN NEW.event_type = 'status_failed' THEN 1 ELSE 0 END,
//       cancelada = cancelada + CASE WHEN NEW.event_type = 'status_cancelled' THEN 1 ELSE 0 END,
//       updated_at = NOW()
//     WHERE data = v_data;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION update_analytics_daily_procedures(date)
//   CREATE OR REPLACE FUNCTION public.update_analytics_daily_procedures(target_date date DEFAULT CURRENT_DATE)
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_payload JSONB;
//   BEGIN
//     SELECT COALESCE(
//       jsonb_object_agg(
//         grouped.procedimento,
//         jsonb_build_object(
//           'enviadas', grouped.total_enviadas,
//           'sucesso', grouped.sucesso,
//           'falha', grouped.falha
//         )
//       ),
//       '{}'::jsonb
//     )
//     INTO v_payload
//     FROM (
//       SELECT
//         LOWER(TRIM(COALESCE(NULLIF(procedimentos, ''), 'nao_informado'))) AS procedimento,
//         COUNT(*) FILTER (WHERE status IN ('sending', 'delivered', 'failed', 'cancelled')) AS total_enviadas,
//         COUNT(*) FILTER (WHERE status = 'delivered') AS sucesso,
//         COUNT(*) FILTER (WHERE status = 'failed') AS falha
//       FROM public.patients_queue
//       WHERE (updated_at AT TIME ZONE 'America/Cuiaba')::date = target_date
//       GROUP BY 1
//     ) grouped;
//
//     INSERT INTO public.analytics_daily (data, por_procedimento)
//     VALUES (target_date, COALESCE(v_payload, '{}'::jsonb))
//     ON CONFLICT (data) DO UPDATE SET
//       por_procedimento = EXCLUDED.por_procedimento,
//       updated_at = NOW();
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: analytics_daily
//   trigger_analytics_daily_updated_at: CREATE TRIGGER trigger_analytics_daily_updated_at BEFORE UPDATE ON public.analytics_daily FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at()
// Table: journey_messages
//   trigger_journey_messages_updated_at: CREATE TRIGGER trigger_journey_messages_updated_at BEFORE UPDATE ON public.journey_messages FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at()
// Table: message_events
//   trigger_update_analytics_daily: CREATE TRIGGER trigger_update_analytics_daily AFTER INSERT ON public.message_events FOR EACH ROW WHEN ((new.event_type ~~ 'status_%'::text)) EXECUTE FUNCTION update_analytics_daily_from_event()
// Table: patient_journeys
//   trigger_patient_journeys_updated_at: CREATE TRIGGER trigger_patient_journeys_updated_at BEFORE UPDATE ON public.patient_journeys FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at()
// Table: patients_queue
//   trigger_patient_status_change: CREATE TRIGGER trigger_patient_status_change AFTER UPDATE OF status ON public.patients_queue FOR EACH ROW EXECUTE FUNCTION log_patient_status_change()

// --- INDEXES ---
// Table: analytics_daily
//   CREATE UNIQUE INDEX analytics_daily_data_key ON public.analytics_daily USING btree (data)
//   CREATE INDEX idx_analytics_daily_data_desc ON public.analytics_daily USING btree (data DESC)
// Table: journey_events
//   CREATE INDEX idx_journey_events_event_at ON public.journey_events USING btree (event_at DESC)
//   CREATE INDEX idx_journey_events_event_type ON public.journey_events USING btree (event_type)
//   CREATE INDEX idx_journey_events_journey_id ON public.journey_events USING btree (journey_id)
//   CREATE INDEX idx_journey_events_message_id ON public.journey_events USING btree (message_id) WHERE (message_id IS NOT NULL)
//   CREATE INDEX idx_journey_events_source ON public.journey_events USING btree (source)
// Table: journey_messages
//   CREATE INDEX idx_journey_messages_instance_id ON public.journey_messages USING btree (instance_id) WHERE (instance_id IS NOT NULL)
//   CREATE INDEX idx_journey_messages_journey_id ON public.journey_messages USING btree (journey_id)
//   CREATE INDEX idx_journey_messages_parent_message_id ON public.journey_messages USING btree (parent_message_id)
//   CREATE INDEX idx_journey_messages_phone_number ON public.journey_messages USING btree (phone_number)
//   CREATE INDEX idx_journey_messages_provider_chat_id ON public.journey_messages USING btree (provider_chat_id) WHERE (provider_chat_id IS NOT NULL)
//   CREATE INDEX idx_journey_messages_provider_message_id ON public.journey_messages USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL)
//   CREATE INDEX idx_journey_messages_queue_message_id ON public.journey_messages USING btree (queue_message_id)
//   CREATE INDEX idx_journey_messages_status ON public.journey_messages USING btree (status)
// Table: message_blocks
//   CREATE INDEX idx_message_blocks_lookup ON public.message_blocks USING btree (phone_number, permanent, expires_at)
//   CREATE UNIQUE INDEX message_blocks_phone_number_key ON public.message_blocks USING btree (phone_number)
// Table: message_events
//   CREATE INDEX idx_message_events_daily ON public.message_events USING btree ((((event_at AT TIME ZONE 'America/Cuiaba'::text))::date), event_type)
//   CREATE INDEX idx_message_events_event_type ON public.message_events USING btree (event_type, event_at DESC)
//   CREATE INDEX idx_message_events_instance_id ON public.message_events USING btree (instance_id)
//   CREATE INDEX idx_message_events_message_id ON public.message_events USING btree (message_id)
//   CREATE INDEX idx_message_events_message_id_event_type ON public.message_events USING btree (message_id, event_type)
//   CREATE INDEX message_events_event_at_idx ON public.message_events USING btree (event_at)
//   CREATE INDEX message_events_event_type_idx ON public.message_events USING btree (event_type)
//   CREATE INDEX message_events_message_id_idx ON public.message_events USING btree (message_id)
// Table: message_logs
//   CREATE INDEX idx_message_logs_message_id ON public.message_logs USING btree (message_id)
// Table: message_qualifications
//   CREATE INDEX idx_message_qualifications_classification ON public.message_qualifications USING btree (classification)
//   CREATE INDEX idx_message_qualifications_journey_id ON public.message_qualifications USING btree (journey_id)
//   CREATE INDEX idx_message_qualifications_message_id ON public.message_qualifications USING btree (message_id)
//   CREATE INDEX idx_message_qualifications_needs_manual_review ON public.message_qualifications USING btree (needs_manual_review) WHERE (needs_manual_review = true)
//   CREATE INDEX idx_message_qualifications_vacancy_signal ON public.message_qualifications USING btree (vacancy_signal) WHERE (vacancy_signal = true)
// Table: patient_consent
//   CREATE INDEX idx_patient_consent_patient_id ON public.patient_consent USING btree (patient_id)
// Table: patient_journeys
//   CREATE INDEX idx_patient_journeys_canonical_phone ON public.patient_journeys USING btree (canonical_phone)
//   CREATE INDEX idx_patient_journeys_data_exame ON public.patient_journeys USING btree (data_exame) WHERE (data_exame IS NOT NULL)
//   CREATE INDEX idx_patient_journeys_journey_status ON public.patient_journeys USING btree (journey_status)
//   CREATE INDEX idx_patient_journeys_last_event_at ON public.patient_journeys USING btree (last_event_at DESC) WHERE (last_event_at IS NOT NULL)
//   CREATE INDEX idx_patient_journeys_needs_manual_action ON public.patient_journeys USING btree (needs_manual_action, manual_priority DESC) WHERE (needs_manual_action = true)
//   CREATE INDEX idx_patient_journeys_origin_queue_id ON public.patient_journeys USING btree (origin_queue_id)
// Table: patients_queue
//   CREATE INDEX idx_patients_queue_canonical_phone ON public.patients_queue USING btree (canonical_phone) WHERE (canonical_phone IS NOT NULL)
//   CREATE INDEX idx_patients_queue_claim ON public.patients_queue USING btree (status, is_approved, send_after, locked_by, attempt_count, queue_order) WHERE (status = ANY (ARRAY['queued'::queue_status, 'failed'::queue_status]))
//   CREATE INDEX idx_patients_queue_dedupe_hash ON public.patients_queue USING btree (dedupe_hash) WHERE (dedupe_hash IS NOT NULL)
//   CREATE INDEX idx_patients_queue_dedupe_hash_created_at ON public.patients_queue USING btree (dedupe_hash, created_at DESC)
//   CREATE INDEX idx_patients_queue_followup_due_at ON public.patients_queue USING btree (followup_due_at) WHERE (followup_due_at IS NOT NULL)
//   CREATE INDEX idx_patients_queue_horario_final ON public.patients_queue USING btree (horario_final) WHERE (horario_final IS NOT NULL)
//   CREATE INDEX idx_patients_queue_horario_inicio ON public.patients_queue USING btree (horario_inicio) WHERE (horario_inicio IS NOT NULL)
//   CREATE INDEX idx_patients_queue_journey_id ON public.patients_queue USING btree (journey_id) WHERE (journey_id IS NOT NULL)
//   CREATE INDEX idx_patients_queue_last_phone_used ON public.patients_queue USING btree (last_phone_used) WHERE (last_phone_used IS NOT NULL)
//   CREATE INDEX idx_patients_queue_locks ON public.patients_queue USING btree (locked_by, locked_at) WHERE (locked_by IS NOT NULL)
//   CREATE INDEX idx_patients_queue_origin_queue_id ON public.patients_queue USING btree (origin_queue_id) WHERE (origin_queue_id IS NOT NULL)
//   CREATE INDEX idx_patients_queue_phone_attempt_index ON public.patients_queue USING btree (phone_attempt_index) WHERE (phone_attempt_index IS NOT NULL)
//   CREATE INDEX idx_patients_queue_phone_status ON public.patients_queue USING btree (phone_number, status)
//   CREATE INDEX idx_patients_queue_provider_message_id ON public.patients_queue USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL)
//   CREATE INDEX idx_patients_queue_resolved_at ON public.patients_queue USING btree (resolved_at) WHERE (resolved_at IS NOT NULL)
//   CREATE INDEX patients_queue_delivery_status_idx ON public.patients_queue USING btree (last_delivery_status)
//   CREATE INDEX patients_queue_needs_second_call_idx ON public.patients_queue USING btree (needs_second_call)
//   CREATE UNIQUE INDEX uq_patients_queue_original_semantic ON public.patients_queue USING btree (canonical_phone, data_exame, horario_inicio, COALESCE(procedimentos, ''::text), dedupe_kind) WHERE ((dedupe_kind = 'original'::text) AND (status = ANY (ARRAY['queued'::queue_status, 'sending'::queue_status, 'delivered'::queue_status])))
//   CREATE UNIQUE INDEX uq_patients_queue_retry_phone2_once ON public.patients_queue USING btree (origin_queue_id, dedupe_kind) WHERE ((origin_queue_id IS NOT NULL) AND (dedupe_kind = ANY (ARRAY['retry_phone2'::text, 'followup_confirm'::text])) AND (status = ANY (ARRAY['queued'::queue_status, 'sending'::queue_status, 'delivered'::queue_status])))
// Table: patients_queue_archive
//   CREATE INDEX idx_patients_queue_archive_archived_at ON public.patients_queue_archive USING btree (archived_at DESC)
//   CREATE INDEX idx_patients_queue_archive_data_exame ON public.patients_queue_archive USING btree (data_exame)
//   CREATE INDEX idx_patients_queue_archive_procedimentos ON public.patients_queue_archive USING btree (procedimentos)
//   CREATE INDEX idx_patients_queue_archive_status ON public.patients_queue_archive USING btree (status)
// Table: webhook_events_raw
//   CREATE UNIQUE INDEX idx_webhook_events_raw_dedupe_hash_unique ON public.webhook_events_raw USING btree (dedupe_hash) WHERE (dedupe_hash IS NOT NULL)
//   CREATE INDEX idx_webhook_events_raw_event_type ON public.webhook_events_raw USING btree (event_type, received_at DESC)
//   CREATE INDEX idx_webhook_events_raw_processing_status ON public.webhook_events_raw USING btree (processing_status)
//   CREATE UNIQUE INDEX idx_webhook_events_raw_provider_event_id_unique ON public.webhook_events_raw USING btree (provider_event_id, provider_name) WHERE (provider_event_id IS NOT NULL)
//   CREATE INDEX idx_webhook_events_raw_provider_message_id ON public.webhook_events_raw USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL)
//   CREATE INDEX idx_webhook_events_raw_received_at ON public.webhook_events_raw USING btree (received_at DESC)
// Table: whatsapp_instances
//   CREATE INDEX idx_whatsapp_instances_rotation ON public.whatsapp_instances USING btree (status, rotation_index) WHERE (status = 'connected'::text)
//   CREATE UNIQUE INDEX whatsapp_instances_slot_id_key ON public.whatsapp_instances USING btree (slot_id)
// Table: worker_heartbeats
//   CREATE INDEX idx_worker_heartbeats_last_heartbeat ON public.worker_heartbeats USING btree (last_heartbeat)
