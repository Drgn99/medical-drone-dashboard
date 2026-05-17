export type DroneStatus =
  | "idle"
  | "preflight"
  | "in_flight"
  | "delivering"
  | "returning"
  | "arrived"
  | "maintenance"
  | "offline";

export type OrderStatus =
  | "pending"
  | "dispatched"
  | "in_flight"
  | "arrived"
  | "delivered"
  | "returning"
  | "returned"
  | "cancelled";

export interface Hospital {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface HospitalStaff {
  id: string;
  hospital_id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  status: "pending" | "active" | "rejected";
  requested_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
}

export interface Drone {
  id: string;
  hospital_id: string;
  name: string;
  status: DroneStatus;
  battery_pct: number | null;
  weight_grams: number | null;
  max_payload_grams: number | null;
  current_lat: number | null;
  current_lng: number | null;
  current_alt: number | null;
  last_seen: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  hospital_id: string;
  created_by: string | null;
  drone_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  payload_description: string | null;
  payload_weight_grams: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string | null;
  status: OrderStatus;
  otp_code: string | null;
  otp_verified_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
  patient_id?: string | null;
}

export interface DroneCommand {
  id: string;
  drone_id: string;
  order_id: string | null;
  command_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  acked_at: string | null;
}

export interface Patient {
  id: string;
  hospital_id: string;
  full_name: string;
  civil_id: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Telemetry {
  id: string;
  drone_id: string;
  order_id: string | null;
  lat: number;
  lng: number;
  alt: number;
  battery_pct: number;
  speed_ms: number | null;
  heading_deg: number | null;
  flight_mode: string | null;
  recorded_at: string;
}
