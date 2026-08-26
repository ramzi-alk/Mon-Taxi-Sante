// Auto-generated via the Supabase MCP server (mcp__Supabase__generate_typescript_types)
// from the live project schema. Regenerate the same way after any migration.

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
      admin_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_grants: {
        Row: {
          admin_role: string
          granted_at: string
          granted_by: string | null
          profile_id: string
        }
        Insert: {
          admin_role?: string
          granted_at?: string
          granted_by?: string | null
          profile_id: string
        }
        Update: {
          admin_role?: string
          granted_at?: string
          granted_by?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_login_attempts: {
        Row: {
          email: string
          failed_count: number
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          email: string
          failed_count?: number
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          email?: string
          failed_count?: number
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          read_by: string | null
          target_id: string | null
          target_table: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          read_by?: string | null
          target_id?: string | null
          target_table?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          read_by?: string | null
          target_id?: string | null
          target_table?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_driver_refusals: {
        Row: {
          booking_id: string
          created_at: string
          driver_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_driver_refusals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_driver_refusals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_active_for_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_driver_refusals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_pool_for_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_driver_refusals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_lookup_attempts: {
        Row: {
          failed_count: number
          locked_until: string | null
          reference_code: string
          updated_at: string
        }
        Insert: {
          failed_count?: number
          locked_until?: string | null
          reference_code: string
          updated_at?: string
        }
        Update: {
          failed_count?: number
          locked_until?: string | null
          reference_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_ratings: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          rater_role: Database["public"]["Enums"]["booking_rating_role"]
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          rater_role: Database["public"]["Enums"]["booking_rating_role"]
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          rater_role?: Database["public"]["Enums"]["booking_rating_role"]
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_active_for_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_pool_for_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_ratings_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reminder_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          response: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at: string
          id?: string
          response?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          response?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminder_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reminder_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_active_for_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reminder_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_pool_for_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accepted_at: string | null
          booker_email: string | null
          booker_full_name: string | null
          booker_phone: string | null
          booking_for_other: boolean
          cancellation_reason: string | null
          completed_at: string | null
          consent_accepted_at: string | null
          cpam_status: Database["public"]["Enums"]["cpam_status"]
          created_at: string
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_price: number | null
          expired_notified_at: string | null
          id: string
          is_hospitalization: boolean
          medical_notes: string | null
          mutual_name: string | null
          passenger_count: number
          patient_birth_date: string | null
          patient_email: string | null
          patient_full_name: string
          patient_id: string
          patient_phone: string
          picked_up_at: string | null
          pickup_address: string
          pickup_datetime: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_municipality: string | null
          pmt_declared: boolean
          pmt_file_url: string | null
          priority_driver_id: string | null
          priority_expires_at: string | null
          reference_code: string
          reminder_confirmed_at: string | null
          reminder_sent_at: string | null
          requires_oxygen: boolean
          requires_stretcher: boolean
          requires_wheelchair: boolean
          return_datetime: string | null
          series_id: string | null
          series_index: number | null
          series_total: number | null
          status: Database["public"]["Enums"]["booking_status"]
          trip_type: Database["public"]["Enums"]["trip_type"]
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
        }
        Insert: {
          accepted_at?: string | null
          booker_email?: string | null
          booker_full_name?: string | null
          booker_phone?: string | null
          booking_for_other?: boolean
          cancellation_reason?: string | null
          completed_at?: string | null
          consent_accepted_at?: string | null
          cpam_status?: Database["public"]["Enums"]["cpam_status"]
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_price?: number | null
          expired_notified_at?: string | null
          id?: string
          is_hospitalization?: boolean
          medical_notes?: string | null
          mutual_name?: string | null
          passenger_count?: number
          patient_birth_date?: string | null
          patient_email?: string | null
          patient_full_name: string
          patient_id: string
          patient_phone: string
          picked_up_at?: string | null
          pickup_address: string
          pickup_datetime: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_municipality?: string | null
          pmt_declared?: boolean
          pmt_file_url?: string | null
          priority_driver_id?: string | null
          priority_expires_at?: string | null
          reference_code: string
          reminder_confirmed_at?: string | null
          reminder_sent_at?: string | null
          requires_oxygen?: boolean
          requires_stretcher?: boolean
          requires_wheelchair?: boolean
          return_datetime?: string | null
          series_id?: string | null
          series_index?: number | null
          series_total?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["booking_vehicle_type"]
        }
        Update: {
          accepted_at?: string | null
          booker_email?: string | null
          booker_full_name?: string | null
          booker_phone?: string | null
          booking_for_other?: boolean
          cancellation_reason?: string | null
          completed_at?: string | null
          consent_accepted_at?: string | null
          cpam_status?: Database["public"]["Enums"]["cpam_status"]
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_price?: number | null
          expired_notified_at?: string | null
          id?: string
          is_hospitalization?: boolean
          medical_notes?: string | null
          mutual_name?: string | null
          passenger_count?: number
          patient_birth_date?: string | null
          patient_email?: string | null
          patient_full_name?: string
          patient_id?: string
          patient_phone?: string
          picked_up_at?: string | null
          pickup_address?: string
          pickup_datetime?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_municipality?: string | null
          pmt_declared?: boolean
          pmt_file_url?: string | null
          priority_driver_id?: string | null
          priority_expires_at?: string | null
          reference_code?: string
          reminder_confirmed_at?: string | null
          reminder_sent_at?: string | null
          requires_oxygen?: boolean
          requires_stretcher?: boolean
          requires_wheelchair?: boolean
          return_datetime?: string | null
          series_id?: string | null
          series_index?: number | null
          series_total?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["booking_vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_priority_driver_id_fkey"
            columns: ["priority_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_button_clicks: {
        Row: {
          created_at: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      driver_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          driver_id: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          driver_id: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          driver_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_push_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_subscriptions: {
        Row: {
          amount_eur: number
          created_at: string
          driver_id: string
          ended_at: string | null
          id: string
          plan: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id: string | null
          stripe_sub_id: string | null
        }
        Insert: {
          amount_eur: number
          created_at?: string
          driver_id: string
          ended_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_sub_id?: string | null
        }
        Update: {
          amount_eur?: number
          created_at?: string
          driver_id?: string
          ended_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_sub_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_details"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers_details: {
        Row: {
          acceptance_radius_km: number | null
          approved_at: string | null
          approved_by: string | null
          availability: Database["public"]["Enums"]["driver_availability"]
          availability_changed_at: string
          company_name: string | null
          convention_cpam: boolean
          convention_number: string | null
          cpam_certificate_url: string | null
          created_at: string
          driving_licence_url: string | null
          id: string
          insurance_url: string | null
          last_heartbeat_at: string | null
          oxygen_equipped: boolean
          parking_lat: number | null
          parking_lng: number | null
          parking_municipality: string | null
          pmr_equipped: boolean
          pool_suspended_until: string | null
          profile_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          siret: string
          stretcher_equipped: boolean
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          suspicious_cancellation_count: number
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_registration: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_year: number | null
        }
        Insert: {
          acceptance_radius_km?: number | null
          approved_at?: string | null
          approved_by?: string | null
          availability?: Database["public"]["Enums"]["driver_availability"]
          availability_changed_at?: string
          company_name?: string | null
          convention_cpam?: boolean
          convention_number?: string | null
          cpam_certificate_url?: string | null
          created_at?: string
          driving_licence_url?: string | null
          id?: string
          insurance_url?: string | null
          last_heartbeat_at?: string | null
          oxygen_equipped?: boolean
          parking_lat?: number | null
          parking_lng?: number | null
          parking_municipality?: string | null
          pmr_equipped?: boolean
          pool_suspended_until?: string | null
          profile_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          siret: string
          stretcher_equipped?: boolean
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          suspicious_cancellation_count?: number
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_registration: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_year?: number | null
        }
        Update: {
          acceptance_radius_km?: number | null
          approved_at?: string | null
          approved_by?: string | null
          availability?: Database["public"]["Enums"]["driver_availability"]
          availability_changed_at?: string
          company_name?: string | null
          convention_cpam?: boolean
          convention_number?: string | null
          cpam_certificate_url?: string | null
          created_at?: string
          driving_licence_url?: string | null
          id?: string
          insurance_url?: string | null
          last_heartbeat_at?: string | null
          oxygen_equipped?: boolean
          parking_lat?: number | null
          parking_lng?: number | null
          parking_municipality?: string | null
          pmr_equipped?: boolean
          pool_suspended_until?: string | null
          profile_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          siret?: string
          stretcher_equipped?: boolean
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          suspicious_cancellation_count?: number
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_registration?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_details_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_details_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      bookings_active_for_driver: {
        Row: {
          created_at: string | null
          distance_km: number | null
          distance_to_driver_km: number | null
          driver_id: string | null
          driver_rating_given: number | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_price: number | null
          id: string | null
          is_hospitalization: boolean | null
          passenger_count: number | null
          patient_full_name: string | null
          patient_phone: string | null
          patient_rating_avg: number | null
          patient_rating_received: number | null
          pickup_address: string | null
          pickup_datetime: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pmt_declared: boolean | null
          requires_oxygen: boolean | null
          requires_stretcher: boolean | null
          requires_wheelchair: boolean | null
          return_datetime: string | null
          series_id: string | null
          series_index: number | null
          series_total: number | null
          status: Database["public"]["Enums"]["booking_status"] | null
          trip_type: Database["public"]["Enums"]["trip_type"] | null
          vehicle_type:
            | Database["public"]["Enums"]["booking_vehicle_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_pool_for_drivers: {
        Row: {
          created_at: string | null
          distance_km: number | null
          distance_to_driver_km: number | null
          driver_id: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_price: number | null
          id: string | null
          is_hospitalization: boolean | null
          passenger_count: number | null
          patient_first_name: string | null
          patient_phone: string | null
          patient_rating_avg: number | null
          pickup_address: string | null
          pickup_datetime: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pmt_declared: boolean | null
          priority_driver_id: string | null
          priority_expires_at: string | null
          requires_oxygen: boolean | null
          requires_stretcher: boolean | null
          requires_wheelchair: boolean | null
          return_datetime: string | null
          series_id: string | null
          series_index: number | null
          series_total: number | null
          status: Database["public"]["Enums"]["booking_status"] | null
          trip_type: Database["public"]["Enums"]["trip_type"] | null
          vehicle_type:
            | Database["public"]["Enums"]["booking_vehicle_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_priority_driver_id_fkey"
            columns: ["priority_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      a_majoration_horaire: { Args: { p_datetime: string }; Returns: boolean }
      accept_ride: { Args: { p_booking_id: string }; Returns: undefined }
      accept_series: { Args: { p_booking_id: string }; Returns: undefined }
      admin_set_driver_suspension: {
        Args: { p_driver_profile_id: string; p_until: string }
        Returns: undefined
      }
      assert_lookup_not_locked: {
        Args: { p_reference_code: string }
        Returns: undefined
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      cancel_booking_by_reference: {
        Args: { p_phone: string; p_reason?: string; p_reference_code: string }
        Returns: string
      }
      cancel_ride_by_driver: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      cancel_series: { Args: { p_booking_id: string }; Returns: undefined }
      cancel_via_reminder: { Args: { p_token: string }; Returns: string }
      complete_ride: { Args: { p_booking_id: string }; Returns: undefined }
      compute_booking_price: {
        Args: {
          p_departement_override?: string
          p_distance_km: number
          p_dropoff_address?: string
          p_is_hospitalization?: boolean
          p_pickup_address?: string
          p_pickup_datetime?: string
          p_requires_wheelchair: boolean
          p_trip_type: Database["public"]["Enums"]["trip_type"]
          p_vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
        }
        Returns: number
      }
      confirm_reminder: { Args: { p_token: string }; Returns: undefined }
      departement_depuis_adresse: {
        Args: { p_address: string }
        Returns: string
      }
      driver_average_rating: { Args: { p_driver_id: string }; Returns: number }
      driver_matches_booking: {
        Args: {
          p_booking_vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
          p_driver_vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          p_oxygen_equipped: boolean
          p_pmr_equipped: boolean
          p_requires_oxygen: boolean
          p_requires_stretcher: boolean
          p_requires_wheelchair: boolean
          p_stretcher_equipped: boolean
        }
        Returns: boolean
      }
      est_grande_ville: { Args: { p_address: string }; Returns: boolean }
      est_jour_ferie_fr: { Args: { p_date: string }; Returns: boolean }
      expire_overdue_bookings: { Args: never; Returns: undefined }
      generate_booking_reference_code: { Args: never; Returns: string }
      get_admin_call_click_stats: { Args: never; Returns: Json }
      get_admin_driver_directory: {
        Args: never
        Returns: {
          approved_at: string
          availability: Database["public"]["Enums"]["driver_availability"]
          average_rating: number
          completed_rides: number
          email: string
          full_name: string
          phone: string
          pool_suspended_until: string
          profile_id: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          suspicious_cancellation_count: number
          vehicle_registration: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }[]
      }
      get_admin_operational_kpis: { Args: { p_days: number }; Returns: Json }
      get_booking_status_counts: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      get_my_bookings: {
        Args: never
        Returns: {
          cpam_status: Database["public"]["Enums"]["cpam_status"]
          created_at: string
          driver_full_name: string
          driver_phone: string
          driver_rating_avg: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          estimated_price: number
          id: string
          medical_notes: string
          mutual_name: string
          passenger_count: number
          patient_birth_date: string
          patient_email: string
          patient_full_name: string
          patient_phone: string
          patient_rating_given: number
          pickup_address: string
          pickup_datetime: string
          pickup_lat: number
          pickup_lng: number
          pickup_municipality: string
          reference_code: string
          requires_oxygen: boolean
          requires_stretcher: boolean
          requires_wheelchair: boolean
          return_datetime: string
          series_id: string
          series_index: number
          series_total: number
          status: Database["public"]["Enums"]["booking_status"]
          trip_type: Database["public"]["Enums"]["trip_type"]
          vehicle_brand: string
          vehicle_model: string
          vehicle_registration: string
          vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
        }[]
      }
      get_my_driver_stats: {
        Args: never
        Returns: {
          average_rating: number
          earnings_today: number
          rides_completed: number
          rides_today: number
          total_earnings: number
          total_km: number
        }[]
      }
      haversine_km: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_driver: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      lookup_booking_by_reference: {
        Args: { p_phone: string; p_reference_code: string }
        Returns: {
          cpam_status: Database["public"]["Enums"]["cpam_status"]
          created_at: string
          driver_full_name: string
          driver_phone: string
          driver_rating_avg: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          estimated_price: number
          id: string
          medical_notes: string
          mutual_name: string
          passenger_count: number
          patient_birth_date: string
          patient_email: string
          patient_full_name: string
          patient_phone: string
          patient_rating_given: number
          pickup_address: string
          pickup_datetime: string
          pickup_lat: number
          pickup_lng: number
          pickup_municipality: string
          reference_code: string
          requires_oxygen: boolean
          requires_stretcher: boolean
          requires_wheelchair: boolean
          return_datetime: string
          series_id: string
          series_index: number
          series_total: number
          status: Database["public"]["Enums"]["booking_status"]
          trip_type: Database["public"]["Enums"]["trip_type"]
          vehicle_brand: string
          vehicle_model: string
          vehicle_registration: string
          vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
        }[]
      }
      paques_date: { Args: { p_annee: number }; Returns: string }
      patient_average_rating: {
        Args: { p_patient_id: string }
        Returns: number
      }
      pickup_address_revealed: {
        Args: {
          p_pickup_datetime: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: boolean
      }
      publish_booking: { Args: { p_booking_id: string }; Returns: undefined }
      rate_booking_as_driver: {
        Args: { p_booking_id: string; p_comment?: string; p_rating: number }
        Returns: undefined
      }
      rate_booking_as_patient: {
        Args: { p_booking_id: string; p_comment?: string; p_rating: number }
        Returns: undefined
      }
      rate_booking_as_patient_by_reference: {
        Args: {
          p_comment?: string
          p_phone: string
          p_rating: number
          p_reference_code: string
        }
        Returns: string
      }
      record_lookup_result: {
        Args: { p_found: boolean; p_reference_code: string }
        Returns: undefined
      }
      refuse_ride: { Args: { p_booking_id: string }; Returns: undefined }
      resolve_reminder_token: {
        Args: { p_token: string }
        Returns: {
          booking_id: string
          dropoff_address: string
          pickup_address: string
          pickup_datetime: string
          reference_code: string
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_ride: { Args: { p_booking_id: string }; Returns: undefined }
      tarif_km_departement: { Args: { p_code: string }; Returns: number }
      track_call_button_click: { Args: { p_source: string }; Returns: undefined }
      update_booking: {
        Args: {
          p_booking_id: string
          p_cpam_status: Database["public"]["Enums"]["cpam_status"]
          p_distance_km?: number
          p_dropoff_address: string
          p_dropoff_lat: number
          p_dropoff_lng: number
          p_medical_notes: string
          p_mutual_name: string
          p_passenger_count: number
          p_pickup_address: string
          p_pickup_datetime: string
          p_pickup_lat: number
          p_pickup_lng: number
          p_pickup_municipality?: string
          p_requires_oxygen: boolean
          p_requires_stretcher: boolean
          p_requires_wheelchair: boolean
          p_return_datetime: string
          p_trip_type: Database["public"]["Enums"]["trip_type"]
          p_vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
        }
        Returns: undefined
      }
      update_booking_by_reference: {
        Args: {
          p_cpam_status: Database["public"]["Enums"]["cpam_status"]
          p_distance_km?: number
          p_dropoff_address: string
          p_dropoff_lat: number
          p_dropoff_lng: number
          p_medical_notes: string
          p_mutual_name: string
          p_passenger_count: number
          p_phone: string
          p_pickup_address: string
          p_pickup_datetime: string
          p_pickup_lat: number
          p_pickup_lng: number
          p_pickup_municipality?: string
          p_reference_code: string
          p_requires_oxygen: boolean
          p_requires_stretcher: boolean
          p_requires_wheelchair: boolean
          p_return_datetime: string
          p_trip_type: Database["public"]["Enums"]["trip_type"]
          p_vehicle_type: Database["public"]["Enums"]["booking_vehicle_type"]
        }
        Returns: string
      }
      update_driver_heartbeat: { Args: never; Returns: undefined }
    }
    Enums: {
      booking_rating_role: "patient" | "driver"
      booking_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "available"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "expired"
      booking_vehicle_type: "taxi" | "vsl" | "pmr" | "ambulance"
      cpam_status: "ald" | "cmu" | "css" | "standard" | "none"
      driver_availability: "online" | "paused" | "offline"
      subscription_status: "trial" | "active" | "past_due" | "cancelled"
      trip_type: "aller_simple" | "aller_retour" | "multiple"
      user_role: "patient" | "driver" | "admin"
      vehicle_type: "taxi" | "vsl" | "ambulance"
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
      booking_rating_role: ["patient", "driver"],
      booking_status: [
        "draft",
        "pending",
        "confirmed",
        "available",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "expired",
      ],
      booking_vehicle_type: ["taxi", "vsl", "pmr", "ambulance"],
      cpam_status: ["ald", "cmu", "css", "standard", "none"],
      driver_availability: ["online", "paused", "offline"],
      subscription_status: ["trial", "active", "past_due", "cancelled"],
      trip_type: ["aller_simple", "aller_retour", "multiple"],
      user_role: ["patient", "driver", "admin"],
      vehicle_type: ["taxi", "vsl", "ambulance"],
    },
  },
} as const
