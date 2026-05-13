import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Preference flag stored in localStorage so it survives page refreshes.
// Set to 'false' before login to route the auth token to sessionStorage instead.
export const REMEMBER_ME_KEY = 'cics_remember_me';

const authStorage = {
	getItem: (key) => sessionStorage.getItem(key) ?? localStorage.getItem(key),
	setItem: (key, value) => {
		const remember = localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
		if (remember) {
			localStorage.setItem(key, value);
			sessionStorage.removeItem(key);
		} else {
			sessionStorage.setItem(key, value);
			localStorage.removeItem(key);
		}
	},
	removeItem: (key) => {
		localStorage.removeItem(key);
		sessionStorage.removeItem(key);
	},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: authStorage,
		autoRefreshToken: true,
		persistSession: true,
	},
});
