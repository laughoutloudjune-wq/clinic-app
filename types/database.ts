export type Sex = "Male" | "Female" | "Other";

export interface Patient {
  id: string;
  hn_number: string;
  name: string;
  age: number;
  sex: Sex;
  height_cm: number;
  created_at: string;
}

export interface PatientInsert {
  id?: string;
  hn_number: string;
  name: string;
  age: number;
  sex: Sex;
  height_cm: number;
  created_at?: string;
}

export interface Scan {
  id: string;
  patient_id: string;
  scan_date: string;
  weight_kg: number;
  bmi: number;
  body_fat_percent: number;
  body_fat_kg: number;
  subcutaneous_fat_total_percent: number;
  subcutaneous_fat_arms_percent: number;
  subcutaneous_fat_trunk_percent: number;
  subcutaneous_fat_legs_percent: number;
  skeletal_muscle_total_percent: number;
  skeletal_muscle_total_kg: number;
  skeletal_muscle_arms_percent: number;
  skeletal_muscle_trunk_percent: number;
  skeletal_muscle_legs_percent: number;
  visceral_fat_level: number;
  resting_metabolism_kcal: number;
  body_age_years: number;
  total_body_water_l: number | null;
  protein_kg: number | null;
  minerals_kg: number | null;
  report_note: string | null;
  created_at: string;
}

export interface ScanInsert {
  id?: string;
  patient_id: string;
  scan_date?: string;
  weight_kg: number;
  bmi: number;
  body_fat_percent: number;
  body_fat_kg: number;
  subcutaneous_fat_total_percent: number;
  subcutaneous_fat_arms_percent: number;
  subcutaneous_fat_trunk_percent: number;
  subcutaneous_fat_legs_percent: number;
  skeletal_muscle_total_percent: number;
  skeletal_muscle_total_kg: number;
  skeletal_muscle_arms_percent: number;
  skeletal_muscle_trunk_percent: number;
  skeletal_muscle_legs_percent: number;
  visceral_fat_level: number;
  resting_metabolism_kcal: number;
  body_age_years: number;
  total_body_water_l?: number | null;
  protein_kg?: number | null;
  minerals_kg?: number | null;
  report_note?: string | null;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: PatientInsert;
        Update: Partial<PatientInsert>;
        Relationships: [];
      };
      scans: {
        Row: Scan;
        Insert: ScanInsert;
        Update: Partial<ScanInsert>;
        Relationships: [
          {
            foreignKeyName: "scans_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
