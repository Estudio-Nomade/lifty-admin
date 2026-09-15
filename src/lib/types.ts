export type IdentificationStatus = 'pending_pickup' | 'issued' | 'revoked';

export type PendingDriver = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  document_number?: string | null;
  document_number_last4?: string | null;
  status: string;
  kyc_status: string | null;
  admin_review_status: string;
  identification_status?: IdentificationStatus;
  identification_issued_at?: string | null;
  created_at: string;
  documents_submitted: number;
};

export type RegistryDriver = {
  id: string;
  user_id: string;
  full_name: string | null;
  verified_name: string | null;
  email: string | null;
  phone: string | null;
  document_number: string | null;
  document_number_last4: string | null;
  /** DNI if known, else last4 masked, else short uuid */
  registry_id: string;
  status: string;
  kyc_status: string | null;
  admin_review_status: string;
  identification_status: IdentificationStatus;
  identification_issued_at: string | null;
  identification_phase?: string | null;
  identification_blocks_online?: boolean;
  identification_days_until_pause?: number | null;
  identification_days_since_approval?: number | null;
  identification_pause_at?: string | null;
  approved_at: string | null;
  admin_reviewed_at?: string | null;
  is_online: boolean | null;
  district_id: string | null;
  district_name: string | null;
  district_province: string | null;
  created_at: string;
  total_trips: number | null;
  plate: string | null;
  vehicle_type: string | null;
};

export type DriversListResponse = {
  items: RegistryDriver[];
  total: number;
  limit: number;
  offset: number;
};

export type DriverDocument = {
  id: string;
  doc_type: string;
  file_url: string;
  status: string;
  superseded_at: string | null;
  created_at: string;
};

export type DriverVehicle = {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plate: string | null;
  vehicle_type?: string | null;
  created_at?: string | null;
};

export type DriverDetail = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  kyc_status: string | null;
  verified_name: string | null;
  document_number?: string | null;
  document_number_last4: string | null;
  registry_id?: string;
  admin_review_status: string;
  admin_reviewed_at: string | null;
  admin_review_notes: string | null;
  identification_status: IdentificationStatus;
  identification_issued_at: string | null;
  identification_external_ref: string | null;
  identification_phase?: string | null;
  identification_blocks_online?: boolean;
  identification_days_until_pause?: number | null;
  identification_pause_at?: string | null;
  identification_days_since_approval?: number | null;
  approved_at?: string | null;
  is_online?: boolean | null;
  district_id: string | null;
  district_name?: string | null;
  district_province?: string | null;
  created_at: string;
  total_trips?: number | null;
  vehicles: DriverVehicle[];
  documents: DriverDocument[];
};

export type ReviewResult = {
  driver_id: string;
  action: 'approve' | 'reject';
  status: string;
  message: string;
};

/** Canonical DOC_TYPES — must match backend shared/lib/documents.ts */
export const DOC_TYPES = [
  'license_front',
  'license_back',
  'registration_front',
  'registration_back',
  'insurance_front',
  'insurance_back',
  'background_check_front',
  'rndg_front',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<string, string> = {
  license_front: 'Licencia (frente)',
  license_back: 'Licencia (dorso)',
  registration_front: 'Cédula / título (frente)',
  registration_back: 'Cédula / título (dorso)',
  insurance_front: 'Seguro (frente)',
  insurance_back: 'Seguro (dorso)',
  background_check_front: 'Antecedentes',
  rndg_front: 'RNDG',
};

export function docLabel(docType: string): string {
  return DOC_LABELS[docType] ?? docType.replace(/_/g, ' ');
}

export type CommissionPhase = {
  id: string;
  name: string;
  month_start: number;
  month_end: number | null;
  base_rate: number;
  monthly_increment: number | null;
  cap_rate: number | null;
  updated_at?: string;
};

export type CommissionCurrent = {
  phase: string;
  currentMonth: number;
  rate: number;
};

export type CommissionStartDate = {
  start_date: string;
  /** false when row missing in platform_config (API returns default) */
  configured?: boolean;
};

export type FuelPriceStatus = {
  currentPrice: number;
  lastUpdatedAt: string | null;
  lastUpdatedBy?: string | null;
  daysSinceUpdate?: number | null;
  isStale: boolean;
  source?: string | null;
  notes?: string | null;
};

export type FuelPriceHistoryItem = {
  id?: string;
  price: number;
  updated_by?: string | null;
  source?: string | null;
  notes?: string | null;
  created_at: string;
};

export type FuelPriceSetResult = {
  applied: boolean;
  price?: number;
  warning?: string;
  message?: string;
};
