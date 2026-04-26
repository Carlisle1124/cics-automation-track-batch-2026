import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import './QADebugPanel.css';

const DEBUG_BASE = 'http://localhost:3001';

function timestamp() {
	const d = new Date();
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function QADebugPanel() {
	const [open, setOpen] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);
	const [running, setRunning] = useState({});
	const [results, setResults] = useState({});
	const [log, setLog] = useState([]);
	const [nukeArmed, setNukeArmed] = useState(false);
	const nukeTimerRef = useRef(null);
	const logRef = useRef(null);

	useEffect(() => {
		getCurrentUser().then(setCurrentUser).catch(() => {});
	}, []);

	useEffect(() => {
		if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
	}, [log]);

	// Disarm nuke after 3 seconds if not confirmed
	useEffect(() => {
		if (!nukeArmed) return;
		nukeTimerRef.current = setTimeout(() => setNukeArmed(false), 3000);
		return () => clearTimeout(nukeTimerRef.current);
	}, [nukeArmed]);

	const addLog = useCallback((msg, type = 'info') => {
		setLog((prev) => [...prev.slice(-49), { time: timestamp(), msg, type }]);
	}, []);

	async function post(key, label, route, body = {}) {
		setRunning((p) => ({ ...p, [key]: true }));
		setResults((p) => ({ ...p, [key]: null }));
		addLog(`${label}…`, 'info');
		try {
			const res = await fetch(`${DEBUG_BASE}${route}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (json.ok) {
				const detail = Object.entries(json)
					.filter(([k]) => !['ok', 'job', 'ms'].includes(k))
					.map(([k, v]) => `${k}=${v}`)
					.join(', ');
				setResults((p) => ({ ...p, [key]: { ok: true, ms: json.ms } }));
				addLog(`${label} OK${detail ? ` — ${detail}` : ''} (${json.ms}ms)`, 'ok');
			} else {
				setResults((p) => ({ ...p, [key]: { ok: false, error: json.error } }));
				addLog(`${label} failed: ${json.error}`, 'err');
			}
		} catch (err) {
			setResults((p) => ({ ...p, [key]: { ok: false, error: err.message } }));
			addLog(`${label} error: ${err.message}`, 'err');
		} finally {
			setRunning((p) => ({ ...p, [key]: false }));
		}
	}

	async function get(key, label, route) {
		setRunning((p) => ({ ...p, [key]: true }));
		setResults((p) => ({ ...p, [key]: null }));
		addLog(`${label}…`, 'info');
		try {
			const res = await fetch(`${DEBUG_BASE}${route}`);
			const json = await res.json();
			if (json.ok) {
				setResults((p) => ({ ...p, [key]: { ok: true, ms: json.ms } }));
				addLog(`${label} OK (${json.ms}ms)`, 'ok');
			} else {
				setResults((p) => ({ ...p, [key]: { ok: false, error: json.error } }));
				addLog(`${label} failed: ${json.error}`, 'err');
			}
		} catch (err) {
			setResults((p) => ({ ...p, [key]: { ok: false, error: err.message } }));
			addLog(`${label} error: ${err.message}`, 'err');
		} finally {
			setRunning((p) => ({ ...p, [key]: false }));
		}
	}

	function handleNuke() {
		if (!nukeArmed) {
			setNukeArmed(true);
			addLog('Nuke armed — click again within 3s to confirm', 'warn');
			return;
		}
		setNukeArmed(false);
		clearTimeout(nukeTimerRef.current);
		post('nuke', 'Nuke My Data', '/debug/qa/nuke-reservations', { userId: currentUser?.id });
	}

	const anyRunning = Object.values(running).some(Boolean);
	const uid = currentUser?.id;

	function badge(key) {
		const r = results[key];
		const isRunning = running[key];
		if (isRunning) return <span className="qa-panel__badge qa-panel__badge--running">…</span>;
		if (!r) return null;
		return (
			<span className={`qa-panel__badge qa-panel__badge--${r.ok ? 'ok' : 'err'}`}>
				{r.ok ? `✓ ${r.ms}ms` : '✗ err'}
			</span>
		);
	}

	return (
		<div className="qa-panel">
			{open && (
				<div className="qa-panel__drawer">
					<div className="qa-panel__header">
						<span className="qa-panel__title">QA Debug Panel</span>
						<span className="qa-panel__subtitle">
							{uid ? `User: ${uid.slice(0, 8)}…` : 'Loading user…'}
						</span>
					</div>

					{/* Time manipulation */}
					<span className="qa-panel__section-label" style={{ padding: '0.6rem 0.75rem 0', display: 'block' }}>
						Time Manipulation
					</span>
					<div className="qa-panel__buttons">
						<button
							className="qa-panel__btn"
							onClick={() => post('expire', 'Fast-Forward Holds', '/debug/qa/expire-holds')}
							disabled={anyRunning}
						>
							<span>Fast-Forward Holds</span>
							{badge('expire')}
						</button>
						<button
							className="qa-panel__btn"
							onClick={() => post('endSoon', 'Simulate: 15 Mins Left', '/debug/qa/simulate-ending-soon', { userId: uid })}
							disabled={anyRunning || !uid}
						>
							<span>Simulate: 15 Mins Left</span>
							{badge('endSoon')}
						</button>
						<button
							className="qa-panel__btn"
							onClick={() => post('noShow', 'Simulate: Grace Period Missed', '/debug/qa/simulate-no-show', { userId: uid })}
							disabled={anyRunning || !uid}
						>
							<span>Simulate: Grace Period Missed</span>
							{badge('noShow')}
						</button>
					</div>

					<hr className="qa-panel__divider" />

					{/* Cron triggers */}
					<span className="qa-panel__section-label" style={{ padding: '0.25rem 0.75rem 0', display: 'block' }}>
						Cron Jobs
					</span>
					<div className="qa-panel__buttons">
						<button
							className="qa-panel__btn"
							onClick={() => get('cleanup', 'Run Cron: Cleanup', '/debug/hold-cleanup')}
							disabled={anyRunning}
						>
							<span>Run Cron: Cleanup</span>
							{badge('cleanup')}
						</button>
						<button
							className="qa-panel__btn"
							onClick={() => get('extensions', 'Run Cron: Extensions', '/debug/extension-notifier')}
							disabled={anyRunning}
						>
							<span>Run Cron: Extensions</span>
							{badge('extensions')}
						</button>
						<button
							className="qa-panel__btn"
							onClick={() => get('autocancel', 'Run Cron: Auto-Cancel', '/debug/auto-cancel')}
							disabled={anyRunning}
						>
							<span>Run Cron: Auto-Cancel</span>
							{badge('autocancel')}
						</button>
					</div>

					<hr className="qa-panel__divider" />

					{/* Danger zone */}
					<div className="qa-panel__buttons">
						<button
							className={`qa-panel__btn qa-panel__btn--danger${nukeArmed ? ' qa-panel__btn--armed' : ''}`}
							onClick={handleNuke}
							disabled={anyRunning || !uid}
						>
							<span>{nukeArmed ? '⚠ Click again to confirm delete' : 'Nuke My Data'}</span>
							{badge('nuke')}
						</button>
					</div>

					{log.length > 0 && (
						<div className="qa-panel__log" ref={logRef}>
							{log.map((entry, i) => (
								<div key={i} className="qa-panel__log-entry">
									<span className="qa-panel__log-time">{entry.time}</span>
									<span className={`qa-panel__log-msg--${entry.type}`}>{entry.msg}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<button
				className="qa-panel__toggle"
				onClick={() => setOpen((o) => !o)}
				aria-label="Toggle QA debug panel"
			>
				<span className="qa-panel__toggle-icon">🧪</span>
				QA
			</button>
		</div>
	);
}
