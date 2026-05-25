export interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  distributor: string;
  cost_per_unit: number;
  low_threshold: number;
  warning_threshold: number;
  sku: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface StorageLocation {
  id: number;
  name: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface InventorySession {
  id: number;
  location_id: number;
  location_name?: string;
  notes: string | null;
  counted_at: number;
  created_at: number;
}

export interface InventoryCount {
  id: number;
  session_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  notes: string | null;
  created_at: number;
}

export interface CustomField {
  id: number;
  name: string;
  field_type: 'text' | 'number' | 'dropdown';
  options: string | null;
  sort_order: number;
  created_at: number;
}

export interface ProductCustomValue {
  id: number;
  product_id: number;
  custom_field_id: number;
  value: string | null;
}

export interface CurrentInventoryRow {
  id: number;
  name: string;
  category: string;
  unit: string;
  distributor: string;
  cost_per_unit: number;
  low_threshold: number;
  warning_threshold: number;
  sku: string;
  quantity: number | null;
  counted_at: number | null;
  session_id: number | null;
  location_id: number | null;
  location_name: string | null;
  status: 'good' | 'warning' | 'low' | 'uncounted';
  total_value: number;
}

export interface AppSettings {
  pin_hash?: string;
  inactivity_timeout?: string;
  default_unit?: string;
  default_categories?: string;
  reminder_threshold?: string;
  setup_complete?: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  category: string;
  distributor: string;
  unit: string;
  location_id: number;
  location_name: string;
  current_qty: number | null;
  low_threshold: number;
  warning_threshold: number;
  status: 'low' | 'warning';
  suggested_qty: number;
}

export interface SessionComparison {
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  qty_a: number | null;
  qty_b: number | null;
  delta: number | null;
}

export interface UsageReportRow {
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  total_used: number;
  total_cost: number;
}
