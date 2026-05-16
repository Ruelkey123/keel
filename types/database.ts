export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'owner' | 'manager' | 'dock_staff'
export type BoatStatus = 'available' | 'rented' | 'maintenance' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_out' | 'completed' | 'canceled'
export type PaymentType = 'deposit' | 'rental' | 'refund'
export type MaintenanceType = 'routine' | 'repair' | 'inspection'
export type IncidentStatus = 'open' | 'resolved'
export type NotificationType = 'confirmation' | 'reminder' | 'cancellation'
export type NotificationChannel = 'email' | 'sms'
export type NotificationStatus = 'queued' | 'sent' | 'failed'
export type AiSourceType = 'booking' | 'checkin' | 'incident' | 'maintenance'
export type AiOutputType = 'damage_report' | 'maintenance_reminder' | 'booking_summary' | 'support_summary'
export type CheckinPhase = 'in' | 'out'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  timezone: string
  created_at: string
}

export interface User {
  id: string
  org_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
}

export interface Boat {
  id: string
  org_id: string
  name: string
  make: string | null
  model: string | null
  year: number | null
  length_ft: number | null
  status: BoatStatus
  hourly_rate: number | null
  half_day_rate: number | null
  full_day_rate: number | null
  fuel_capacity: number | null
  fuel_type: string | null
  capacity_persons: number | null
  cover_image_url: string | null
  created_at: string
}

export interface BoatPhoto {
  id: string
  boat_id: string
  url: string
  caption: string | null
  created_at: string
}

export interface Incident {
  id: string
  boat_id: string
  org_id: string
  reported_by: string
  title: string
  description: string | null
  status: IncidentStatus
  photos: string[]
  resolved_at: string | null
  created_at: string
}

export interface MaintenanceLog {
  id: string
  boat_id: string
  logged_by: string
  type: MaintenanceType
  description: string
  resolved_at: string | null
  created_at: string
  status: 'scheduled' | 'in_progress' | 'completed'
  estimated_cost: number | null
  actual_cost: number | null
  estimated_hours: number | null
  actual_hours: number | null
  vendor: string | null
}

export interface Customer {
  id: string
  org_id: string
  full_name: string
  email: string
  phone: string | null
  stripe_customer_id: string | null
  notes: string | null
  created_at: string
}

export interface Booking {
  id: string
  org_id: string
  boat_id: string
  customer_id: string
  created_by: string
  status: BookingStatus
  start_time: string
  end_time: string
  base_price: number
  deposit_amount: number
  total_price: number
  waiver_id: string | null
  waiver_signed: boolean
  waiver_signed_at: string | null
  notes: string | null
  created_at: string
}

export interface AvailabilityBlock {
  id: string
  org_id: string
  boat_id: string
  reason: string | null
  start_time: string
  end_time: string
  created_by: string
  created_at: string
}

export interface Payment {
  id: string
  booking_id: string
  stripe_payment_intent_id: string | null
  type: PaymentType
  amount: number
  status: string
  created_at: string
}

export interface Checkin {
  id: string
  booking_id: string
  checked_in_by: string | null
  checked_out_by: string | null
  fuel_level_in: number | null
  fuel_level_out: number | null
  checkin_notes: string | null
  checkout_notes: string | null
  checklist_data: Json | null
  damage_noted: boolean
  damage_description: string | null
  checked_in_at: string | null
  checked_out_at: string | null
}

export interface CheckinPhoto {
  id: string
  checkin_id: string
  phase: CheckinPhase
  url: string
  created_at: string
}

export interface Waiver {
  id: string
  org_id: string
  name: string
  content_url: string | null
  is_active: boolean
  created_at: string
}

export interface SignedWaiver {
  id: string
  booking_id: string
  customer_id: string
  waiver_id: string
  signature_data: string | null
  signed_pdf_url: string | null
  ip_address: string | null
  signed_at: string
}

export interface Notification {
  id: string
  org_id: string
  booking_id: string | null
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  sent_at: string | null
  created_at: string
}

export interface AiOutput {
  id: string
  org_id: string
  source_type: AiSourceType
  source_id: string
  output_type: AiOutputType
  content: string
  model_used: string
  created_at: string
}

// Join types for common queries
export interface BookingWithRelations extends Booking {
  boat?: Boat
  customer?: Customer
  checkin?: Checkin
}

export interface BoatWithRelations extends Boat {
  photos?: BoatPhoto[]
  maintenance_logs?: MaintenanceLog[]
  incidents?: Incident[]
}
