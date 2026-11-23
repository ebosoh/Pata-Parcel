import type { DispatchDriver } from '@/types/database';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'pap_dispatch_drivers_v1';

export async function getDispatchDrivers(): Promise<DispatchDriver[]> {
  // First attempt to query Supabase
  try {
    const { data, error } = await supabase
      .from('dispatch_drivers' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      // Sync to local fallback cache
      saveDriversLocally(data as unknown as DispatchDriver[]);
      return data as unknown as DispatchDriver[];
    }
  } catch (err) {
    // Supabase table not created yet or network failure
  }

  // Fallback to local storage
  return getLocalDrivers();
}

export async function saveDispatchDriver(driver: Omit<DispatchDriver, 'id' | 'created_at'> & { id?: string }): Promise<DispatchDriver> {
  const newRecord: DispatchDriver = {
    id: driver.id || crypto.randomUUID(),
    driver_name: driver.driver_name,
    driver_phone: driver.driver_phone,
    vehicle_plate: driver.vehicle_plate.toUpperCase(),
    sacco_name: driver.sacco_name || null,
    destination: driver.destination || null,
    parcel_id: driver.parcel_id || null,
    created_by: driver.created_by || (await supabase.auth.getUser()).data.user?.id || null,
    created_at: new Date().toISOString(),
  };

  // Attempt to write to Supabase
  try {
    const { data, error } = await supabase
      .from('dispatch_drivers' as any)
      .upsert(newRecord as any)
      .select()
      .maybeSingle();

    if (!error && data) {
      const saved = data as unknown as DispatchDriver;
      updateLocalDriver(saved);
      return saved;
    }
  } catch (err) {
    // Table not created or schema cache issue
  }

  // Save to local storage
  updateLocalDriver(newRecord);
  return newRecord;
}

export async function updateDispatchDriverRecord(id: string, updates: Partial<DispatchDriver>): Promise<void> {
  try {
    await supabase
      .from('dispatch_drivers' as any)
      .update(updates as any)
      .eq('id', id);
  } catch (err) {
    // Ignore if table missing
  }

  const current = getLocalDrivers();
  const next = current.map(d => (d.id === id ? { ...d, ...updates } : d));
  saveDriversLocally(next);
}

export async function deleteDispatchDriverRecord(id: string): Promise<void> {
  try {
    await supabase
      .from('dispatch_drivers' as any)
      .delete()
      .eq('id', id);
  } catch (err) {
    // Ignore if table missing
  }

  const current = getLocalDrivers();
  saveDriversLocally(current.filter(d => d.id !== id));
}

function getLocalDrivers(): DispatchDriver[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read local drivers:', err);
    return [];
  }
}

function saveDriversLocally(drivers: DispatchDriver[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
  } catch (err) {
    console.error('Failed to save local drivers:', err);
  }
}

function updateLocalDriver(driver: DispatchDriver): void {
  const current = getLocalDrivers();
  const index = current.findIndex(d => d.id === driver.id);
  if (index >= 0) {
    current[index] = driver;
  } else {
    current.unshift(driver);
  }
  saveDriversLocally(current);
}
