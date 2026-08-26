import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY presence is guaranteed by
// validateEnv() (config/env.ts), run once at process start in server.ts
// before this module is ever imported.
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
