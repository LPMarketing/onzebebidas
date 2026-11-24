import { supabase } from './supabase';
import {
  CustomerBeverage,
  BeverageMovement,
  Product,
  AdminDashboardStats,
  BeverageControlType,
  MovementType,
} from '../types';

export const ADMIN_EMAIL = 'pae6069@gmail.com';

// Default initial catalog if products table is empty
export const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'created_at'>[] = [
  { name: "Jack Daniel's Old No. 7", category: 'Whisky', control_type: 'percentage', default_volume: '1000ml', active: true },
  { name: 'Johnnie Walker Black Label', category: 'Whisky', control_type: 'percentage', default_volume: '1000ml', active: true },
  { name: 'Chivas Regal 12 Anos', category: 'Whisky', control_type: 'percentage', default_volume: '1000ml', active: true },
  { name: 'Gin Tanqueray London Dry', category: 'Gin', control_type: 'percentage', default_volume: '750ml', active: true },
  { name: 'Gin Hendrick\'s', category: 'Gin', control_type: 'percentage', default_volume: '750ml', active: true },
  { name: 'Vodka Cîroc Tradicional', category: 'Vodka', control_type: 'percentage', default_volume: '750ml', active: true },
  { name: 'Vodka Absolut Elyx', category: 'Vodka', control_type: 'percentage', default_volume: '1000ml', active: true },
  { name: 'Tequila Don Julio Blanco', category: 'Tequila', control_type: 'percentage', default_volume: '750ml', active: true },
  { name: 'Licor 43 (Cuarenta y Tres)', category: 'Licor', control_type: 'percentage', default_volume: '700ml', active: true },
  { name: 'Champagne Moët & Chandon Brut', category: 'Espumante', control_type: 'units', default_volume: '750ml', active: true },
  { name: 'Red Bull Energy Drink (Lata)', category: 'Energético', control_type: 'units', default_volume: '250ml', active: true },
  { name: 'Água Tônica Schweppes', category: 'Não Alcoólico', control_type: 'units', default_volume: '350ml', active: true },
];

/**
 * Fetch products list
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase Products]: Tabela products não encontrada ou RLS restrito. Utilizando catálogo padrão.', error.message);
      return DEFAULT_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `prod-default-${idx + 1}`,
        created_at: new Date().toISOString(),
      }));
    }

    if (!data || data.length === 0) {
      return DEFAULT_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `prod-default-${idx + 1}`,
        created_at: new Date().toISOString(),
      }));
    }

    return data as Product[];
  } catch (err) {
    console.error('[getProducts Exception]:', err);
    return DEFAULT_PRODUCTS.map((p, idx) => ({
      ...p,
      id: `prod-default-${idx + 1}`,
      created_at: new Date().toISOString(),
    }));
  }
}

/**
 * Create a new product in the catalog
 */
export async function createProduct(product: {
  name: string;
  category: string;
  control_type: BeverageControlType;
  default_volume?: string;
}): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name.trim(),
        category: product.category.trim() || 'Geral',
        control_type: product.control_type,
        default_volume: product.default_volume?.trim() || null,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[createProduct Error]:', error);
      throw error;
    }
    return data as Product;
  } catch (err) {
    console.error('[createProduct Exception]:', err);
    throw err;
  }
}

/**
 * Fetch all active and finished beverages of a client
 */
export async function getCustomerBeverages(clientId: string): Promise<CustomerBeverage[]> {
  try {
    const { data, error } = await supabase
      .from('customer_beverages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getCustomerBeverages Error]:', error.message);
      // Check local storage fallback for client mock session if table not yet deployed
      const local = localStorage.getItem(`onze_beverages_${clientId}`);
      return local ? JSON.parse(local) : [];
    }

    return (data || []) as CustomerBeverage[];
  } catch (err) {
    console.error('[getCustomerBeverages Exception]:', err);
    const local = localStorage.getItem(`onze_beverages_${clientId}`);
    return local ? JSON.parse(local) : [];
  }
}

/**
 * Fetch audit movements history for a specific client
 */
export async function getCustomerBeverageHistory(clientId: string): Promise<BeverageMovement[]> {
  try {
    const allMovs = await getGlobalMovements(200);
    const filtered = allMovs.filter((m) => m.client_id === clientId);
    if (filtered.length > 0) return filtered;

    const { data } = await supabase
      .from('beverage_movements')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    return (data || []) as BeverageMovement[];
  } catch (err) {
    console.error('[getCustomerBeverageHistory Exception]:', err);
    return [];
  }
}

/**
 * Fetch global movements across all clients (Admin view)
 */
export async function getGlobalMovements(limit = 100): Promise<BeverageMovement[]> {
  try {
    const res = await fetch(`/api/admin/movements?limit=${limit}`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.movements) && json.movements.length > 0) {
        return json.movements.map((m: any) => ({
          id: m.id,
          client_id: m.clientId,
          client_name: m.clientName,
          action_type: m.actionType === 'ADD' ? 'ENTRY' : m.actionType === 'RESCUE' ? 'CONSUMPTION' : 'ADJUSTMENT',
          product_name: m.description,
          previous_quantity: 0,
          quantity_moved: 1,
          new_quantity: m.actionType === 'RESCUE' ? 0 : 1,
          unit: 'item',
          performed_by_email: 'Admin',
          reason: m.description,
          notes: m.description,
          created_at: m.createdAt,
        }));
      }
    }
  } catch (apiErr) {
    console.warn('[getGlobalMovements API Notice]:', apiErr);
  }

  try {
    const { data } = await supabase
      .from('beverage_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []) as BeverageMovement[];
  } catch (err) {
    console.error('[getGlobalMovements Exception]:', err);
    return [];
  }
}

/**
 * Fetch real admin dashboard statistics
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const res = await fetch('/api/admin/dashboard-stats');
    if (res.ok) {
      const json = await res.json();
      return {
        totalClients: json.totalClients ?? 0,
        clientsWithBeverages: json.clientsWithBeverages ?? 0,
        totalActiveItems: json.totalActiveItems ?? 0, // BEBIDAS EM GUARDA
        totalMovements: json.totalMovements ?? 0,
      };
    }
  } catch (apiErr) {
    console.warn('[getAdminDashboardStats API Notice]:', apiErr);
  }

  try {
    // 1. Fetch backend clients (which hold beveragePhotoUrl, cpfNormalized, etc.)
    let backendClients: any[] = [];
    try {
      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const json = await res.json();
        backendClients = json.clients || [];
      }
    } catch {}

    const totalClients = backendClients.length;
    const clientsWithBeverages = backendClients.filter((bc) =>
      Boolean(bc.beveragePhotoUrl && bc.beveragePhotoUrl.trim().length > 0)
    ).length;
    const totalActiveItems = clientsWithBeverages; // BEBIDAS EM GUARDA

    const movs = await getGlobalMovements(200);

    return {
      totalClients,
      clientsWithBeverages,
      totalActiveItems,
      totalMovements: movs.length,
    };
  } catch (err) {
    console.error('[getAdminDashboardStats Exception]:', err);
    return {
      totalClients: 0,
      clientsWithBeverages: 0,
      totalActiveItems: 0,
      totalMovements: 0,
    };
  }
}

export const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
};

/**
 * Add a new beverage to a client (Admin action)
 */
export async function addCustomerBeverage(params: {
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  productId?: string;
  productName: string;
  controlType: BeverageControlType;
  quantity: number;
  unit: string;
  notes?: string;
  adminId: string;
  adminEmail: string;
}): Promise<CustomerBeverage> {
  const cleanQty = Number(params.quantity);
  const now = new Date().toISOString();
  const validProductId = isValidUUID(params.productId) ? params.productId : null;

  try {
    const { data: beverage, error: bevError } = await supabase
      .from('customer_beverages')
      .insert({
        client_id: params.clientId,
        product_id: validProductId,
        product_name: params.productName.trim(),
        control_type: params.controlType,
        initial_quantity: cleanQty,
        current_quantity: cleanQty,
        unit: params.unit,
        status: 'active',
        notes: params.notes?.trim() || null,
        created_by: params.adminId,
        created_by_email: params.adminEmail,
      })
      .select()
      .single();

    if (bevError) {
      console.error('[addCustomerBeverage Supabase Insert Error]:', bevError);
      throw new Error(`Erro ao salvar bebida no Supabase: ${bevError.message || bevError.details || 'Falha no banco'}`);
    }

    const createdBev = beverage as CustomerBeverage;

    // Record movement in beverage_movements table
    const { error: movError } = await supabase.from('beverage_movements').insert({
      client_id: params.clientId,
      client_name: params.clientName || '',
      client_phone: params.clientPhone || '',
      beverage_id: createdBev.id,
      product_name: params.productName.trim(),
      action_type: 'ENTRY',
      previous_quantity: 0,
      quantity_moved: cleanQty,
      new_quantity: cleanQty,
      unit: params.unit,
      performed_by: params.adminId,
      performed_by_email: params.adminEmail,
      notes: params.notes?.trim() || 'Entrada inicial de bebida',
      reason: 'Cadastro inicial de item',
    });

    if (movError) {
      console.warn('[addCustomerBeverage Movement Insert Notice]:', movError.message);
    }

    return createdBev;
  } catch (err: any) {
    console.error('[addCustomerBeverage Exception]:', err);
    throw err;
  }
}

/**
 * Register consumption (dar baixa) on a beverage
 */
export async function consumeCustomerBeverage(params: {
  beverage: CustomerBeverage;
  clientName?: string;
  clientPhone?: string;
  consumedAmount: number;
  notes?: string;
  adminId: string;
  adminEmail: string;
}): Promise<CustomerBeverage> {
  const prevQty = Number(params.beverage.current_quantity);
  const consumeQty = Number(params.consumedAmount);
  const newQty = Math.max(0, prevQty - consumeQty);
  const isFinished = newQty <= 0;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('customer_beverages')
      .update({
        current_quantity: newQty,
        status: isFinished ? 'finished' : 'active',
        finished_at: isFinished ? now : null,
        updated_at: now,
      })
      .eq('id', params.beverage.id)
      .select()
      .single();

    if (error) {
      console.error('[consumeCustomerBeverage Supabase Error]:', error);
      throw new Error(`Erro ao registrar baixa no Supabase: ${error.message || error.details}`);
    }

    // Record movement
    const { error: movError } = await supabase.from('beverage_movements').insert({
      client_id: params.beverage.client_id,
      client_name: params.clientName || '',
      client_phone: params.clientPhone || '',
      beverage_id: params.beverage.id,
      product_name: params.beverage.product_name,
      action_type: 'CONSUMPTION',
      previous_quantity: prevQty,
      quantity_moved: consumeQty,
      new_quantity: newQty,
      unit: params.beverage.unit,
      performed_by: params.adminId,
      performed_by_email: params.adminEmail,
      notes: params.notes?.trim() || (isFinished ? 'Baixa total do item (encerrado)' : 'Consumo registrado'),
      reason: 'Consumo do cliente na casa',
    });

    if (movError) {
      console.warn('[consumeCustomerBeverage Movement Insert Notice]:', movError.message);
    }

    return data as CustomerBeverage;
  } catch (err) {
    console.error('[consumeCustomerBeverage Exception]:', err);
    throw err;
  }
}

/**
 * Register administrative adjustment on a beverage
 */
export async function adjustCustomerBeverage(params: {
  beverage: CustomerBeverage;
  clientName?: string;
  clientPhone?: string;
  newQuantity: number;
  reason: string;
  notes?: string;
  adminId: string;
  adminEmail: string;
}): Promise<CustomerBeverage> {
  const prevQty = Number(params.beverage.current_quantity);
  const newQty = Number(params.newQuantity);
  const diff = Math.abs(newQty - prevQty);
  const isFinished = newQty <= 0;
  const now = new Date().toISOString();

  if (!params.reason.trim()) {
    throw new Error('O motivo do ajuste é obrigatório.');
  }

  try {
    const { data, error } = await supabase
      .from('customer_beverages')
      .update({
        current_quantity: newQty,
        status: isFinished ? 'finished' : 'active',
        finished_at: isFinished ? now : null,
        updated_at: now,
      })
      .eq('id', params.beverage.id)
      .select()
      .single();

    if (error) {
      console.error('[adjustCustomerBeverage Supabase Error]:', error);
      throw new Error(`Erro ao registrar ajuste no Supabase: ${error.message || error.details}`);
    }

    // Record movement
    const { error: movError } = await supabase.from('beverage_movements').insert({
      client_id: params.beverage.client_id,
      client_name: params.clientName || '',
      client_phone: params.clientPhone || '',
      beverage_id: params.beverage.id,
      product_name: params.beverage.product_name,
      action_type: 'ADJUSTMENT',
      previous_quantity: prevQty,
      quantity_moved: diff,
      new_quantity: newQty,
      unit: params.beverage.unit,
      performed_by: params.adminId,
      performed_by_email: params.adminEmail,
      notes: params.notes?.trim() || null,
      reason: params.reason.trim(),
    });

    if (movError) {
      console.warn('[adjustCustomerBeverage Movement Insert Notice]:', movError.message);
    }

    return data as CustomerBeverage;
  } catch (err) {
    console.error('[adjustCustomerBeverage Exception]:', err);
    throw err;
  }
}

// ==================== Local Storage Resilience Helpers ====================
function saveLocalBeverage(beverage: CustomerBeverage) {
  try {
    const key = `onze_beverages_${beverage.client_id}`;
    const list: CustomerBeverage[] = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift(beverage);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

function updateLocalBeverage(beverage: CustomerBeverage) {
  try {
    const key = `onze_beverages_${beverage.client_id}`;
    const list: CustomerBeverage[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex((b) => b.id === beverage.id);
    if (idx >= 0) {
      list[idx] = beverage;
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.error(e);
  }
}

function recordLocalMovement(movement: BeverageMovement) {
  try {
    // Client specific
    const key = `onze_history_${movement.client_id}`;
    const list: BeverageMovement[] = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift(movement);
    localStorage.setItem(key, JSON.stringify(list));

    // Global
    const allKey = 'onze_all_movements';
    const allList: BeverageMovement[] = JSON.parse(localStorage.getItem(allKey) || '[]');
    allList.unshift(movement);
    localStorage.setItem(allKey, JSON.stringify(allList.slice(0, 500)));
  } catch (e) {
    console.error(e);
  }
}
