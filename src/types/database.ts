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
  | "returned"
  | "cancelled";

export interface Hospital {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface HospitalStaff {
  id: string;
  hospital_id: string;
  user_id: string;
  name: string | null;
  role: string;
  created_at: string;
}

export interface Drone {
  id: string;
  hospital_id: string;
  name: string;
  status: DroneStatus;
  battery: number | null;
  lat: number | null;
  lng: number | null;
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
  payload_weight: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string | null;
  status: OrderStatus;
  otp_code: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface DroneCommand {
  id: string;
  drone_id: string;
  order_id: string | null;
  command_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
}
