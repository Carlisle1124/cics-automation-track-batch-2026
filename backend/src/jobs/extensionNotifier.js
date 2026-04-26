const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function pad(n) {
	return String(n).padStart(2, '0');
}

function toTimeStr(d) {
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTime12(timeStr) {
	const [h, m] = timeStr.split(':').map(Number);
	const period = h >= 12 ? 'PM' : 'AM';
	const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${hour}:${pad(m)} ${period}`;
}

async function runExtensionNotifier() {
	if (!process.env.RESEND_API_KEY) {
		console.warn('[extension-notifier] RESEND_API_KEY not set — skipping.');
		return;
	}

	const now = new Date();
	const in14 = new Date(now.getTime() + 14 * 60 * 1000);
	const in16 = new Date(now.getTime() + 16 * 60 * 1000);
	const today = now.toISOString().slice(0, 10);

	const { data: expiringSoon, error } = await supabaseAdmin
		.from('reservations')
		.select('id, start_time, end_time, users!user_id(full_name, email)')
		.eq('reservation_date', today)
		.in('status', ['approved', 'checked_in'])
		.gte('end_time', toTimeStr(in14))
		.lte('end_time', toTimeStr(in16));

	if (error) {
		console.error('[extension-notifier] Query error:', error.message);
		return;
	}

	if (!expiringSoon?.length) return;

	// Only notify if total duration < 3 hours (still extensible)
	const eligible = expiringSoon.filter((r) => {
		const [sh, sm] = r.start_time.split(':').map(Number);
		const [eh, em] = r.end_time.split(':').map(Number);
		return (eh * 60 + em) - (sh * 60 + sm) < 180;
	});

	for (const reservation of eligible) {
		const user = reservation.users;
		if (!user?.email) continue;

		const firstName = user.full_name?.split(' ')[0] ?? user.full_name;
		const formattedEnd = formatTime12(reservation.end_time);
		const formattedStart = formatTime12(reservation.start_time);

		try {
			await resend.emails.send({
				from: `CICS Learning Commons <${process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'}>`,
				to: user.email,
				subject: '⏰ Your reservation ends in 15 minutes',
				html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reservation Ending Soon</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:2rem 1rem;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6f0013 0%,#a90f27 50%,#d01b37 100%);border-radius:12px 12px 0 0;padding:2rem 2.5rem;text-align:center;">
            <p style="margin:0 0 0.35rem;font-size:0.7rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.65);">College of Information and Computing Sciences</p>
            <h1 style="margin:0;font-size:1.5rem;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Learning Commons</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:2.25rem 2.5rem;">

            <!-- Alert badge -->
            <div style="display:inline-block;background:#fff3cd;border:1px solid #ffc107;border-radius:999px;padding:0.35rem 1rem;margin-bottom:1.5rem;">
              <span style="font-size:0.75rem;font-weight:700;color:#92400e;letter-spacing:0.05em;text-transform:uppercase;">⏰ Ending in 15 minutes</span>
            </div>

            <p style="margin:0 0 0.5rem;font-size:1rem;color:#111827;">Hi <strong>${firstName}</strong>,</p>
            <p style="margin:0 0 1.75rem;font-size:0.95rem;color:#4b5563;line-height:1.6;">
              Your seat reservation at the <strong style="color:#111827;">CICS Learning Commons</strong> is ending soon. Please start wrapping up or request an extension at the front desk.
            </p>

            <!-- Reservation details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:1.75rem;">
              <tr>
                <td style="padding:1.25rem 1.5rem;">
                  <p style="margin:0 0 1rem;font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">Reservation Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#6b7280;font-weight:500;">Start Time</td>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#111827;font-weight:700;text-align:right;">${formattedStart}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="border-bottom:1px solid #e5e7eb;"></td>
                    </tr>
                    <tr>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#6b7280;font-weight:500;">End Time</td>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#b3172e;font-weight:800;text-align:right;">${formattedEnd}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="border-bottom:1px solid #e5e7eb;"></td>
                    </tr>
                    <tr>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#6b7280;font-weight:500;">Max Extension</td>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#111827;font-weight:700;text-align:right;">3 hours total</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Extension notice -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:1.75rem;">
              <tr>
                <td style="padding:1rem 1.25rem;">
                  <p style="margin:0;font-size:0.85rem;color:#991b1b;line-height:1.6;">
                    <strong>Need more time?</strong> Visit the front desk <em>before</em> your session ends to request an extension. Extensions are subject to availability.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:0.875rem;color:#4b5563;line-height:1.6;">
              Thank you for using the CICS Learning Commons. We hope your session was productive!
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:1.25rem 2.5rem;text-align:center;">
            <p style="margin:0;font-size:0.75rem;color:#9ca3af;">This is an automated message from the CICS Learning Commons Reservation System.</p>
            <p style="margin:0.35rem 0 0;font-size:0.75rem;color:#9ca3af;">Please do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
			});
			console.log(`[extension-notifier] Sent reminder to ${user.email}`);
		} catch (err) {
			console.error(`[extension-notifier] Failed to email ${user.email}:`, err.message);
		}
	}
}

module.exports = { runExtensionNotifier };
