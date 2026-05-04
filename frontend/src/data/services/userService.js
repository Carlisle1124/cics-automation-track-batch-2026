import { supabase } from '../supabaseClient';

function normalizeUser(user) {
	if (!user) return user;

	return {
		...user,
		role: user.role || 'student',
		student_id: user.student_id ?? null,
		no_show_count: Number(user.no_show_count ?? 0),
		is_account_suspended: Boolean(user.is_account_suspended),
		suspended_until: user.suspended_until ?? null,
	};
}

export async function getAllUsers() {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) throw new Error(`Failed to fetch users: ${error.message}`);
	return (data ?? []).map(normalizeUser);
}

export async function getUserById(userId) {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('id', userId)
		.single();

	if (error) throw new Error(`Failed to fetch user: ${error.message}`);
	return normalizeUser(data);
}

export async function createUser(userData) {
  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          student_id: userData.student_id ?? null,
        },
      },
    });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("No user returned");

  // ✅ DO NOTHING ELSE HERE
  // Trigger handles public.users

  return {
    id: authData.user.id,
    email: userData.email,
    full_name: userData.full_name,
    role: userData.role ?? "student",
    student_id: userData.student_id ?? null,
    no_show_count: 0,
    is_account_suspended: false,
    suspended_until: null,
  };
}
export async function updateUser(userId, updates) {
	// only allow fields that exist in public.users
	const payload = {
		full_name: updates.full_name,
		role: updates.role,
		student_id: updates.student_id,
		no_show_count: updates.no_show_count,
		is_account_suspended: updates.is_account_suspended,
		suspended_until: 
			updates.suspended_until === '' ? null : updates.suspended_until,
	};

	const { data, error } = await supabase
		.from('users')
		.update(payload)
		.eq('id', userId)
		.select('*')
		.single();

	if (error) throw new Error(`Failed to update user: ${error.message}`);

	return normalizeUser(data);
}

export async function deleteUser(userId) {
	const { error } = await supabase.from('users').delete().eq('id', userId);
	if (error) throw new Error(`Failed to delete user: ${error.message}`);
	return { id: userId };
}
