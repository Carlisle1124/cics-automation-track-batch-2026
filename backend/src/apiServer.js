require('dotenv').config();
const http = require('http');
const { supabaseAdmin } = require('./lib/supabaseAdmin');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', (chunk) => { data += chunk; });
		req.on('end', () => {
			try { resolve(data ? JSON.parse(data) : {}); }
			catch { reject(new Error('Invalid JSON body')); }
		});
		req.on('error', reject);
	});
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime12(timeStr) {
	if (!timeStr) return '';
	const [h, m] = timeStr.split(':').map(Number);
	const period = h >= 12 ? 'PM' : 'AM';
	const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${hour}:${pad(m)} ${period}`;
}

function formatDate(dateStr) {
	if (!dateStr) return '';
	const [y, m, d] = dateStr.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function handleRelease(reservationId, res) {
	const { data, error } = await supabaseAdmin
		.from('reservations')
		.delete()
		.eq('id', reservationId)
		.eq('status', 'held')
		.select('id');

	if (error) {
		res.writeHead(500);
		res.end(JSON.stringify({ ok: false, error: error.message }));
		return;
	}

	res.writeHead(data?.length ? 200 : 404);
	res.end(JSON.stringify({ ok: !!data?.length, deleted: data?.length ?? 0 }));
}

async function handleGetAutoAccept(res) {
	const { data, error } = await supabaseAdmin
		.from('settings')
		.select('auto_accept_reservations')
		.eq('id', 1)
		.single();

	if (error) {
		res.writeHead(500);
		res.end(JSON.stringify({ ok: false, error: error.message }));
		return;
	}

	res.writeHead(200);
	res.end(JSON.stringify({ ok: true, enabled: !!data?.auto_accept_reservations }));
}

async function handleSetAutoAccept(enabled, res) {
	const { error: upsertError } = await supabaseAdmin
		.from('settings')
		.update({ auto_accept_reservations: !!enabled })
		.eq('id', 1);

	if (upsertError) {
		console.error('[auto-accept] upsert error:', upsertError.message, upsertError.code);
		res.writeHead(500);
		res.end(JSON.stringify({ ok: false, error: upsertError.message }));
		return;
	}

	let approved = 0;
	if (enabled) {
		const { data: pending } = await supabaseAdmin
			.from('reservations')
			.select('id')
			.eq('status', 'pending');

		if (pending && pending.length > 0) {
			const ids = pending.map((r) => r.id);
			await supabaseAdmin
				.from('reservations')
				.update({ status: 'approved' })
				.in('id', ids);
			approved = ids.length;
			console.log(`[auto-accept] Enabled — immediately approved ${approved} pending reservation(s).`);
		}
	}

	res.writeHead(200);
	res.end(JSON.stringify({ ok: true, approved }));
}

async function handleDecline(reservationId, reason, res) {
	console.log('[decline] START id=%s reason="%s"', reservationId, reason?.slice(0, 40));

	if (!reason?.trim()) {
		res.writeHead(400);
		res.end(JSON.stringify({ ok: false, error: 'Reason is required' }));
		return;
	}

	// Fetch reservation + user in one query
	const { data: reservation, error: fetchError } = await supabaseAdmin
		.from('reservations')
		.select('id, reservation_date, start_time, end_time, status, users!user_id(full_name, email)')
		.eq('id', reservationId)
		.single();

	console.log('[decline] fetch id=%s fetchError=%s', reservation?.id, fetchError?.message);

	if (fetchError || !reservation) {
		res.writeHead(404);
		res.end(JSON.stringify({ ok: false, error: 'Reservation not found' }));
		return;
	}

	// Update status + store reason
	const { error: updateError } = await supabaseAdmin
		.from('reservations')
		.update({ status: 'denied', denial_reason: reason.trim() })
		.eq('id', reservationId);

	console.log('[decline] update updateError=%s', updateError?.message);

	if (updateError) {
		res.writeHead(500);
		res.end(JSON.stringify({ ok: false, error: updateError.message }));
		return;
	}

	const user = reservation.users;
	if (user?.email && process.env.RESEND_API_KEY) {
		const firstName = user.full_name?.split(' ')[0] ?? 'Student';
		const formattedDate = formatDate(reservation.reservation_date);
		const timeRange = `${formatTime12(reservation.start_time)} – ${formatTime12(reservation.end_time)}`;

		await resend.emails.send({
			from: `CICS Learning Commons <${process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'}>`,
			to: user.email,
			subject: 'Your reservation request was not approved',
			html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reservation Request Declined</title></head>
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

            <!-- Badge -->
            <div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:999px;padding:0.35rem 1rem;margin-bottom:1.5rem;">
              <span style="font-size:0.75rem;font-weight:700;color:#991b1b;letter-spacing:0.05em;text-transform:uppercase;">Request Not Approved</span>
            </div>

            <p style="margin:0 0 0.5rem;font-size:1rem;color:#111827;">Hi <strong>${firstName}</strong>,</p>
            <p style="margin:0 0 1.75rem;font-size:0.95rem;color:#4b5563;line-height:1.6;">
              Unfortunately, your reservation request at the <strong style="color:#111827;">CICS Learning Commons</strong> was not approved by staff. Please see the details and reason below.
            </p>

            <!-- Reservation details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:1.5rem;">
              <tr>
                <td style="padding:1.25rem 1.5rem;">
                  <p style="margin:0 0 1rem;font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">Reservation Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#6b7280;font-weight:500;">Date</td>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#111827;font-weight:700;text-align:right;">${formattedDate}</td>
                    </tr>
                    <tr><td colspan="2" style="border-bottom:1px solid #e5e7eb;"></td></tr>
                    <tr>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#6b7280;font-weight:500;">Time</td>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#111827;font-weight:700;text-align:right;">${timeRange}</td>
                    </tr>
                    <tr><td colspan="2" style="border-bottom:1px solid #e5e7eb;"></td></tr>
                    <tr>
                      <td style="padding:0.4rem 0;font-size:0.85rem;color:#6b7280;font-weight:500;">Ref</td>
                      <td style="padding:0.4rem 0;font-size:0.75rem;color:#6b7280;font-family:monospace;text-align:right;">${reservationId.slice(0, 8)}…</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Reason -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:1.75rem;">
              <tr>
                <td style="padding:1rem 1.25rem;">
                  <p style="margin:0 0 0.5rem;font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#991b1b;">Staff Note</p>
                  <p style="margin:0;font-size:0.875rem;color:#7f1d1d;line-height:1.6;">${reason.trim()}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:0.875rem;color:#4b5563;line-height:1.6;">
              If you have questions, please visit the front desk or contact the Learning Commons staff directly.
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
		}).catch((err) => {
			console.error('[api-server] Failed to send denial email:', err.message);
		});
	}

	res.writeHead(200);
	res.end(JSON.stringify({ ok: true }));
}

function startApiServer(port = process.env.PORT || 3000) {
	const server = http.createServer(async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		const url = req.url.split('?')[0];

		if (url === '/health') {
			res.writeHead(200);
			res.end(JSON.stringify({ ok: true }));
			return;
		}

		if (url === '/api/settings/auto-accept' && req.method === 'GET') {
			try {
				await handleGetAutoAccept(res);
			} catch (err) {
				res.writeHead(500);
				res.end(JSON.stringify({ ok: false, error: err.message }));
			}
			return;
		}

		if (url === '/api/settings/auto-accept' && req.method === 'POST') {
			try {
				const body = await readBody(req);
				await handleSetAutoAccept(!!body.enabled, res);
			} catch (err) {
				res.writeHead(500);
				res.end(JSON.stringify({ ok: false, error: err.message }));
			}
			return;
		}

		const declineMatch = url.match(/^\/api\/reservations\/([^/]+)\/decline$/);
		if (req.method === 'POST' && declineMatch) {
			try {
				const body = await readBody(req);
				await handleDecline(declineMatch[1], body.reason, res);
			} catch (err) {
				res.writeHead(500);
				res.end(JSON.stringify({ ok: false, error: err.message }));
			}
			return;
		}

		const releaseMatch = url.match(/^\/api\/reservations\/([^/]+)\/release$/);
		if (req.method === 'DELETE' && releaseMatch) {
			try {
				await handleRelease(releaseMatch[1], res);
			} catch (err) {
				res.writeHead(500);
				res.end(JSON.stringify({ ok: false, error: err.message }));
			}
			return;
		}

		res.writeHead(404);
		res.end(JSON.stringify({ ok: false, error: 'Not found' }));
	});

	server.listen(port, () => {
		console.log(`[api-server] Listening on port ${port}`);
	});
}

module.exports = { startApiServer };
