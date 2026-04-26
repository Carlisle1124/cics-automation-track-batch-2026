const http = require('http');
const { runHoldCleanup } = require('./jobs/holdCleanup');
const { runExtensionNotifier } = require('./jobs/extensionNotifier');
const { runAutoCancellation } = require('./jobs/autoCancellation');
const { expireHolds, simulateEndingSoon, simulateNoShow, nukeReservations } = require('./routes/qa');

const GET_ROUTES = {
	'/debug/hold-cleanup': { label: 'Hold Cleanup', fn: runHoldCleanup },
	'/debug/extension-notifier': { label: 'Extension Notifier', fn: runExtensionNotifier },
	'/debug/auto-cancel': { label: 'Auto Cancellation', fn: runAutoCancellation },
};

const POST_ROUTES = {
	'/debug/qa/expire-holds': { label: 'Expire Holds', fn: () => expireHolds() },
	'/debug/qa/simulate-ending-soon': { label: 'Simulate Ending Soon', fn: (b) => simulateEndingSoon(b) },
	'/debug/qa/simulate-no-show': { label: 'Simulate No-Show', fn: (b) => simulateNoShow(b) },
	'/debug/qa/nuke-reservations': { label: 'Nuke Reservations', fn: (b) => nukeReservations(b) },
};

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

function startDevServer(port = 3001) {
	const server = http.createServer(async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		const url = req.url.split('?')[0];

		if (url === '/debug/status') {
			res.writeHead(200);
			res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
			return;
		}

		if (req.method === 'GET') {
			const route = GET_ROUTES[url];
			if (!route) {
				res.writeHead(404);
				res.end(JSON.stringify({ ok: false, error: 'Unknown debug route' }));
				return;
			}
			const start = Date.now();
			try {
				await route.fn();
				res.writeHead(200);
				res.end(JSON.stringify({ ok: true, job: route.label, ms: Date.now() - start }));
			} catch (err) {
				res.writeHead(500);
				res.end(JSON.stringify({ ok: false, job: route.label, error: err.message }));
			}
			return;
		}

		if (req.method === 'POST') {
			const route = POST_ROUTES[url];
			if (!route) {
				res.writeHead(404);
				res.end(JSON.stringify({ ok: false, error: 'Unknown debug route' }));
				return;
			}
			const start = Date.now();
			try {
				const body = await readBody(req);
				const result = await route.fn(body);
				res.writeHead(200);
				res.end(JSON.stringify({ ok: true, job: route.label, ms: Date.now() - start, ...result }));
			} catch (err) {
				res.writeHead(500);
				res.end(JSON.stringify({ ok: false, job: route.label, error: err.message }));
			}
			return;
		}

		res.writeHead(405);
		res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
	});

	server.listen(port, () => {
		console.log(`[dev-server] Debug server → http://localhost:${port}/debug/status`);
	});
}

module.exports = { startDevServer };
