// Shapes returned by the Django/DRF API (subset used by milestone 1).

export interface User {
  id: number;
  email: string;
  phone: string;
  full_name: string;
  is_staff: boolean;
  email_verified: boolean;
  must_reset_password: boolean;
  date_joined: string;
  has_profile: boolean;
  google_linked: boolean;
  has_usable_password: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface Choice {
  value: string | number;
  label: string;
}

export interface Enums {
  gender: Choice[];
  marital_status: Choice[];
  food_habit: Choice[];
  complexion: Choice[];
  subcaste: Choice[];
  region: Choice[];
  profile_for: Choice[];
  profile_status: Choice[];
  paadam: Choice[];
}

export interface Nakshatram {
  id: number;
  order: number;
  name: string;
  lord: string;
}

export interface Raasi {
  id: number;
  order: number;
  name: string;
  english_name: string;
}

export interface EducationLevel {
  id: number;
  name: string;
  category: string;
  sort_order: number;
}

export interface ProfilePhoto {
  id: number;
  image: string;
  is_primary: boolean;
  is_approved: boolean;
  uploaded_at: string;
}

export interface Profile {
  id: number;
  regno: string;
  profile_for: string;
  first_name: string;
  surname: string;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  age: number | null;
  marital_status: string;
  mother_tongue: string;
  height_cm: number | null;
  complexion: string;
  food_habit: string;
  caste: string;
  subcaste: string;
  gothram: string;
  nakshatram: number | null;
  nakshatram_name?: string;
  raasi: number | null;
  raasi_name?: string;
  paadam: number | null;
  time_of_birth: string;
  place_of_birth: string;
  education: number | null;
  education_detail: string;
  occupation: string;
  company: string;
  work_location: string;
  designation: string;
  annual_income_text: string;
  citizenship: string;
  country_living: string;
  native_district: string;
  settled_at: string;
  region: string;
  address?: string;
  father_name: string;
  father_occupation: string;
  mother_name: string;
  mother_occupation: string;
  family_background: string;
  about: string;
  expectations: string;
  contact_phone?: string;
  parent_phone?: string;
  contact_locked?: boolean;
  status: string;
  photos_visible: boolean;
  is_verified: boolean;
  willing_to_relocate_abroad: boolean | null;
  registered_on: string | null;
  expires_on: string | null;
  photos: ProfilePhoto[];
  is_shortlisted?: boolean;
  contact_unlocked?: boolean;
}

export interface ApiError {
  status: number;
  detail: string;
  fields?: Record<string, string[]>;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProfileSummary {
  id: number;
  regno: string;
  full_name: string;
  first_name: string;
  gender: string;
  age: number | null;
  height_cm: number | null;
  marital_status: string;
  subcaste: string;
  gothram: string;
  education_detail: string;
  occupation: string;
  work_location: string;
  region: string;
  country_living: string;
  city_display: string;
  primary_photo: string | null;
  is_verified: boolean;
}

export interface ContactQuota {
  plan: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  unlimited: boolean;
}

export interface InterestTemplate {
  id: number;
  text: string;
}

export interface Interest {
  id: number;
  sender: number;
  receiver: number;
  sender_detail: ProfileSummary;
  receiver_detail: ProfileSummary;
  template: number | null;
  message: string;
  status: "sent" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  responded_at: string | null;
}

export interface MembershipPlan {
  id: number;
  name: string;
  slug: string;
  description: string;
  duration_months: number;
  price_inr: string;
  contact_views: number | null;
  interests_per_day: number | null;
  can_view_photos: boolean;
}

export interface Subscription {
  id: number;
  plan: MembershipPlan;
  status: string;
  started_on: string | null;
  expires_on: string | null;
  is_legacy: boolean;
  created_at: string;
}

export interface MySubscription {
  subscription: Subscription | null;
  contact_quota: ContactQuota;
}

export interface PayUCheckout {
  txnid: string;
  form: Record<string, string> & { action: string };
}

export interface PoruthamCheck {
  key: string;
  label: string;
  ok: boolean | null;
  score: number;
  max: number;
  note: string;
}

export type PoruthamVerdict =
  | "excellent"
  | "acceptable"
  | "poor"
  | "not_recommended"
  | "unknown";

export interface Porutham {
  verdict: PoruthamVerdict;
  summary: string;
  passed: number;
  graded: number;
  score: number;
  max_score: number;
  percent: number | null;
  nadi_dosha: boolean;
  vital_failed: string[];
  checks: PoruthamCheck[];
}

export interface InterestQuota {
  limit: number | null;
  unlimited: boolean;
  sent_today: number;
  remaining: number | null;
}

export interface ModerationSummary {
  unverified_profiles: number;
  suspended_profiles: number;
  pending_photos: number;
  profiles_created_today: number;
}

export interface ModerationProfile {
  id: number;
  regno: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age: number | null;
  subcaste: string;
  region: string;
  marital_status: string;
  occupation: string;
  designation: string;
  work_location: string;
  education_detail: string;
  country_living: string;
  status: string;
  is_verified: boolean;
  plan: string;
  photo_count: number;
  pending_photo_count: number;
  created_at: string;
}

export interface ModerationPhoto {
  id: number;
  image: string;
  is_primary: boolean;
  is_approved: boolean;
  uploaded_at: string;
  profile_id: number;
  regno: string;
  profile_name: string;
}

export interface CompletenessSection {
  key: string;
  label: string;
  step: number;
  weight: number;
  ratio: number;
  done: boolean;
}

export interface Completeness {
  percent: number;
  complete: boolean;
  next: CompletenessSection | null;
  missing: CompletenessSection[];
  sections: CompletenessSection[];
}

export interface MatchInfo {
  score: number;
  reasons: string[];
  porutham_verdict: PoruthamVerdict;
  porutham_percent: number | null;
}

export type SuggestedProfile = ProfileSummary & { match: MatchInfo };
