import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'client' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  phone_normalized: string;
  cpf: string;
  cpf_normalized: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  currentUser: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

export type BeverageControlType = 'percentage' | 'units' | 'ml';
export type BeverageStatus = 'active' | 'finished';
export type MovementType = 'ENTRY' | 'CONSUMPTION' | 'ADJUSTMENT';

export interface Product {
  id: string;
  name: string;
  category: string;
  control_type: BeverageControlType;
  default_volume?: string;
  active: boolean;
  created_at: string;
}

export interface CustomerBeverage {
  id: string;
  client_id: string;
  product_id?: string | null;
  product_name: string;
  control_type: BeverageControlType;
  initial_quantity: number;
  current_quantity: number;
  unit: string;
  status: BeverageStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_email?: string | null;
  finished_at?: string | null;
}

export interface BeverageMovement {
  id: string;
  client_id: string;
  client_name?: string;
  client_phone?: string;
  beverage_id: string;
  product_name: string;
  action_type: MovementType;
  previous_quantity: number;
  quantity_moved: number;
  new_quantity: number;
  unit: string;
  performed_by: string;
  performed_by_email?: string;
  notes?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface AdminDashboardStats {
  totalClients: number;
  clientsWithBeverages: number;
  totalActiveItems: number;
  totalMovements: number;
}
