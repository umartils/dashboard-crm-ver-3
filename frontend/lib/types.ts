export type Filters = {
  segments: string[];
  programs: string[];
  payments: string[];
  jenis_donor: string[];
  program_categories: string[];
  is_valid: string[];
};

export type Current = {
  search: string;
  segment: string[];
  program: string[];
  payment: string[];
  jenis_donor: string[];
  program_categories: string[];
  is_valid: string[];
  last_donation_start: string;
  last_donation_end: string;
  prospect_exclude_start: string;
  prospect_exclude_end: string;
};

export type MultiSelectFilterProps = {
  label: string;
  labelMap?: Record<string, string>;
  paramKey: string;
  options: string[];
  selected: string[];
  align?: "left" | "right";

  onChange: (
    key: string,
    values: string[]
  ) => void;
};

export type Summary = {
  total_donors: number;
  active_donors: number;
  new_donors: number;
  valid_donors: number;
  total_transactions: number; // rename dari today_transactions
  platinum: number;
  favorite_program: string | null;
  segment_distribution: { name: string; value: number }[];
  top_programs: { name: string; value: number }[];
  top_donors: { id_donatur: string; name: string; value: number }[];
  date_range: { start: string; end: string };
};

export type DonorTypeBreakdown = {
  year: number;
  total_donors: number;
  breakdown: { type: string; label: string; count: number; percentage: number }[];
}; 

export type DonorSummary = {
  id_donor: string;
  nama: string;
  no_telp: string | null;
  jumlah_donasi: number;
  total_donasi: number;
  last_donation: number;
  tgl_terakhir: string | null;
  max_donation: number;
  jenis_donor: string | null;
  campaign_terakhir: string | null;
};

export type DonorRFM = {
  id: number;
  id_donor: number;
  nama?: string;
  email?: string;
  hp?: string;
  rfm_segment?: string;
  monetary?: number;
  last_donation?: number;
  frequency?: number;
  recency_days?: number;
  program_favorit?: string;
  payment_favorit?: string;
  last_donation_date?: string;
  jenis_donor?: string;
  program_category?: string;
  tgl_prospek?: string;
  is_valid?: string;
};

export type Blast_Conversion_Summary = {
  total_prospek: number;
  total_konversi: number;
  conversion_rate: number;
  total_donasi: number;
  rate_per_message: number;
  total_biaya: number;
  roas: number;
  rasio_biaya: number;
};

export type SegmentHistoryRow = {
  id: number;
  id_donor?: string | number;
  nama?: string;
  hp?: string;
  email?: string;
  old_segment?: string;
  new_segment?: string;
  changed_at?: string;
};

export type SegmentMatrixCell = {
  old_segment: string | null;
  new_segment: string;
  total: number;
};

export type SegmentLabelHistoryRow = {
  data: any[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  matrix: SegmentMatrixCell[];
  summary: {
    naik: number;
    turun: number;
    tetap: number;
    donor_baru_berkembang: number;
  };
};

export type CRMUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type DonorNon = {
  id_donor: string;
  nama: string;
  hp: string;
  email: string;
  tgl_reg?: string;
  is_valid?: string;
}

export type BlastResultRow = {
  id: number;
  // phone_raw?: string;
  hp?: string;
  status_blast?: string;
  id_donor?: string;
  nama?: string;
  is_matched?: boolean;
  created_at?: string;
  tgl_prospek?: string;
};