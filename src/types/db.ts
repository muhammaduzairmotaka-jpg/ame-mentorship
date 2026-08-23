export type UserRole = "admin" | "mentor" | "mentee";

export type AppointmentStatus =
  | "available"
  | "booked"
  | "full"
  | "completed"
  | "cancelled_by_mentee"
  | "cancelled_by_mentor"
  | "rescheduled"
  | "no_show"
  | "waiting_list";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  timezone: string;
}

export interface MentorAvailabilityRule {
  id: string;
  mentor_id: string;
  day_of_week: number; // 0=Sun ... 6=Sat
  start_time: string; // "HH:MM:SS"
  end_time: string;
  session_length_minutes: number;
  break_minutes: number;
  capacity_per_slot: number;
  session_type: "individual" | "group";
  location: string | null;
  is_active: boolean;
}

export interface Session {
  id: string;
  mentor_id: string;
  session_date: string; // "YYYY-MM-DD"
  start_time: string;
  end_time: string;
  session_type: "individual" | "group";
  capacity: number;
  booked_count: number;
  location: string | null;
  meeting_link: string | null;
  status: AppointmentStatus;
  program: string | null;
}

export interface Booking {
  id: string;
  session_id: string;
  mentee_id: string;
  status: AppointmentStatus;
  is_waiting_list: boolean;
  booked_at: string;
  attendance_status: string | null;
}

export interface MenteeDetails {
  profile_id: string;
  assigned_mentor_id: string | null;
  institution: string | null;
  program: string | null;
  employment_status: string;
  employment_readiness_score: number | null;
  requires_follow_up: boolean;
}
