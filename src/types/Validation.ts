export type ValidationTargetType = "model" | "scenario" | "data" | "regional_context";
export type ValidationStatus = "passed" | "partial" | "failed" | "not_tested";
export type ValidationSeverity = "info" | "warning" | "error";

export interface ValidationRecord {
  validation_id: string;
  target_type: ValidationTargetType;
  target_id: string;
  country: string;
  year: number | null;
  test_type: string;
  input_state: string;
  expected_behavior: string;
  actual_behavior: string;
  status: ValidationStatus;
  severity: ValidationSeverity;
  notes: string;
  reviewed_at: string;
}

export interface GoldenTestCase {
  case_id: string;
  target_type: "model" | "scenario";
  country: string;
  target_id: string;
  known_input: string;
  expected_output: number | null;
  actual_output: number | null;
  expected_status: "numeric" | "unavailable";
  actual_status: "numeric" | "unavailable";
  validation_status: "passed_numeric" | "passed_gate" | "failed";
  tolerance: number;
  status: "passed" | "failed";
  formula_version: string;
}
