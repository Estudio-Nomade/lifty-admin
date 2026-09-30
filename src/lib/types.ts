export type IdentificationStatus = 'pending_pickup' | 'issued' | 'revoked';

export type AdminDistrict = {
  id: string;
  name: string;
  province: string;
  status: string;
};

export type TransitOperator = {
  id: string;
  email: string | null;
  full_name: string | null;
  transit_district_id: string | null;
  district_name: string | null;
  created_at: string;
  banned?: boolean;
};

export type TransitOperatorCreateResult = {
  id: string;
  email: string;
  full_name: string | null;
  transit_district_id: string;
  district_name: string | null;
  created_at: string;
  password: string;
};

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
  documents_pending_review?: boolean;
  missing_doc_types?: string[];
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
  action: 'approve' | 'reject' | 'request_changes';
  status: string;
  message: string;
};

/** Canonical DOC_TYPES — must match backend shared/lib/documents.ts (required set). */
export const DOC_TYPES = [
  'license_front',
  'license_back',
  'registration_front',
  'registration_back',
  'insurance_front',
  'platform_rc_insurance_front',
  'background_check_front',
  'rndg_front',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<string, string> = {
  license_front: 'Licencia (frente)',
  license_back: 'Licencia (dorso)',
  registration_front: 'Cédula / título (frente)',
  registration_back: 'Cédula / título (dorso)',
  insurance_front: 'Seguro del vehículo',
  insurance_back: 'Seguro (dorso)',
  platform_rc_insurance_front: 'Seguro de Responsabilidad Civil',
  background_check_front: 'Antecedentes',
  rndg_front: 'RNDG',
};

export function docLabel(docType: string): string {
  return DOC_LABELS[docType] ?? docType.replace(/_/g, ' ');
}

export type CommissionPhase = {
  id: string;
  name: string;
  day_start: number;
  day_end: number | null;
  base_rate: number;
  daily_increment: number | null;
  cap_rate: number | null;
  updated_at?: string;
};

export type CommissionCurrent = {
  phase: string;
  currentDay: number;
  rate: number;
  start_date?: string;
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

export type DashboardRange = 'today' | '7d' | '30d';

export type DashboardSummary = {
  range: DashboardRange;
  from: string;
  to: string;
  drivers: {
    online_now: number;
    approved: number;
    pending_review: number;
  };
  trips: {
    completed: number;
    in_progress: number;
  };
  money: {
    currency: 'ARS';
    gross_fare: number;
    platform_fee: number;
    driver_earnings: number;
    tips: number;
    avg_ticket: number | null;
    take_rate: number | null;
  };
  commission: {
    phase: string;
    currentDay: number;
    rate: number;
  };
};

export type AdminDriverTrip = {
  id: string;
  status: string;
  created_at: string;
  origin_address: string | null;
  dest_address: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  total_fare: number;
  platform_fee: number;
  driver_earnings: number;
  tip_amount: number;
  payment_method: string | null;
  is_collected: boolean;
  passenger_name?: string | null;
};

export type AdminDriverTripsResponse = {
  items: AdminDriverTrip[];
  total: number;
  limit: number;
  offset: number;
  totals_in_filter: {
    trip_count: number;
    gross_fare: number;
    platform_fee: number;
    driver_earnings: number;
  };
};

export type AdminGlobalTrip = {
  id: string;
  status: string;
  created_at: string;
  origin_address: string | null;
  dest_address: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  total_fare: number;
  platform_fee: number;
  driver_earnings: number;
  tip_amount: number;
  payment_method: string | null;
  is_collected: boolean;
  driver_id: string | null;
  driver_name: string | null;
  driver_document_number: string | null;
  district_id: string | null;
  district_name: string | null;
  passenger_id: string | null;
  passenger_name: string | null;
};

export type AdminTripsListResponse = {
  items: AdminGlobalTrip[];
  total: number;
  limit: number;
  offset: number;
  totals_in_filter: {
    trip_count: number;
    gross_fare: number;
    platform_fee: number;
    driver_earnings: number;
  };
};

export type AdminTripDetail = AdminGlobalTrip & {
  base_fare: number | null;
  distance_fare: number | null;
  time_fare: number | null;
  assigned_at: string | null;
  updated_at: string | null;
};

export function tripStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'Completado',
    rated: 'Calificado',
    cancelled: 'Cancelado',
    cancelled_early: 'Cancelado temprano',
    in_trip: 'En viaje',
    accepted: 'Aceptado',
    en_route: 'En ruta',
    waiting: 'Esperando',
  };
  return map[status] ?? status;
}
