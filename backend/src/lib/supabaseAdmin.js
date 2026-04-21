const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}

// Service role client bypasses RLS — server-side use only, never expose to clients
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
	auth: { persistSession: false },
});

module.exports = { supabaseAdmin };
