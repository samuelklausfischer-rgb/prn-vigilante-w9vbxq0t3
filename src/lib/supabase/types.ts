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
      patients_queue: {
        Row: {
          attempt_count: number | null
          created_at: string
          Data_nascimento: string | null
          id: string
          is_approved: boolean
          locked_at: string | null
          locked_by: string | null
          message_body: string
          notes: string | null
          patient_name: string
          phone_number: string
          procedimentos: string | null
          queue_order: number | null
          send_after: string
          status: Database['public']['Enums']['queue_status']
          time_proce: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          Data_nascimento?: string | null
          id?: string
          is_approved?: boolean
          locked_at?: string | null
          locked_by?: string | null
          message_body: string
          notes?: string | null
          patient_name: string
          phone_number: string
          procedimentos?: string | null
          queue_order?: number | null
          send_after?: string
          status?: Database['public']['Enums']['queue_status']
          time_proce?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          Data_nascimento?: string | null
          id?: string
          is_approved?: boolean
          locked_at?: string | null
          locked_by?: string | null
          message_body?: string
          notes?: string | null
          patient_name?: string
          phone_number?: string
          procedimentos?: string | null
          queue_order?: number | null
          send_after?: string
          status?: Database['public']['Enums']['queue_status']
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
        Relationships: []
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
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
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
      }
      expired_locks: {
        Row: {
          id: string | null
          lock_age_minutes: number | null
          locked_at: string | null
          locked_by: string | null
          patient_name: string | null
        }
      }
      message_failure_insights: {
        Row: {
          affected_instances: number | null
          error_message: string | null
          last_failure_at: string | null
          total_failures: number | null
        }
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
      }
    }
    Functions: {
      claim_next_message: {
        Args: {
          p_max_attempts?: number
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          id: string
          instance_id: string
          instance_name: string
          message_body: string
          patient_name: string
          phone_number: string
        }[]
      }
      release_expired_locks: {
        Args: {
          p_lock_timeout_minutes?: number
        }
        Returns: {
          released_id: string
          was_failed: boolean
        }[]
      }
    }
    Enums: {
      queue_status: 'queued' | 'sending' | 'delivered' | 'failed' | 'cancelled'
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
      queue_status: ['queued', 'sending', 'delivered', 'failed', 'cancelled'],
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
//   Data_nascimento: date (nullable)
//   procedimentos: text (nullable)
//   time_proce: time without time zone (nullable)
// Table: system_config
//   id: integer (not null)
//   is_paused: boolean (not null, default: false)
//   safe_cadence_delay: integer (not null, default: 30)
//   updated_at: timestamp with time zone (not null, default: now())
// Table: whatsapp_instances
//   id: uuid (not null, default: gen_random_uuid())
//   slot_id: integer (not null)
//   instance_name: text (nullable)
//   phone_number: text (nullable)
//   status: text (not null, default: 'empty'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: patients_queue
//   PRIMARY KEY patients_queue_pkey: PRIMARY KEY (id)
// Table: system_config
//   CHECK system_config_id_check: CHECK ((id = 1))
//   PRIMARY KEY system_config_pkey: PRIMARY KEY (id)
// Table: whatsapp_instances
//   PRIMARY KEY whatsapp_instances_pkey: PRIMARY KEY (id)
//   UNIQUE whatsapp_instances_slot_id_key: UNIQUE (slot_id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: patients_queue
//   Policy "Allow all authenticated operations on patients_queue" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: system_config
//   Policy "Allow all authenticated operations on system_config" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: whatsapp_instances
//   Policy "Allow all authenticated operations on whatsapp_instances" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true

// --- DATABASE FUNCTIONS ---
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

// --- INDEXES ---
// Table: whatsapp_instances
//   CREATE UNIQUE INDEX whatsapp_instances_slot_id_key ON public.whatsapp_instances USING btree (slot_id)
