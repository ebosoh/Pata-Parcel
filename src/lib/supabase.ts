import { supabase as baseClient } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Shared Cloud client, typed with the app's own table definitions.
export const supabase = baseClient as unknown as SupabaseClient<Database>;
