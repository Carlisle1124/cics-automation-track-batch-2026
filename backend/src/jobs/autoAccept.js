const { supabaseAdmin } = require('../lib/supabaseAdmin');

async function runAutoAccept() {
	const { data: setting, error: settingError } = await supabaseAdmin
		.from('settings')
		.select('auto_accept_reservations')
		.eq('id', 1)
		.single();

	if (settingError || !setting || !setting.auto_accept_reservations) return;

	const { data: pending, error: fetchError } = await supabaseAdmin
		.from('reservations')
		.select('id')
		.eq('status', 'pending');

	if (fetchError) {
		console.error('[auto-accept] fetch error:', fetchError.message);
		return;
	}

	if (!pending || pending.length === 0) return;

	const ids = pending.map((r) => r.id);

	const { error: updateError } = await supabaseAdmin
		.from('reservations')
		.update({ status: 'approved' })
		.in('id', ids);

	if (updateError) {
		console.error('[auto-accept] update error:', updateError.message);
		return;
	}

	console.log(`[auto-accept] ${new Date().toISOString()} — approved ${ids.length} pending reservation(s).`);
}

module.exports = { runAutoAccept };
