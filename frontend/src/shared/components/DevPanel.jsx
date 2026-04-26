import { useCallback, useEffect, useRef, useState } from 'react';
import './DevPanel.css';

const DEBUG_BASE = 'http://localhost:3001';

const JOBS = [
	{ key: 'hold-cleanup', label: 'Hold Cleanup', route: '/debug/hold-cleanup' },
	{ key: 'extension-notifier', label: 'Extension Notifier', route: '/debug/extension-notifier' },
	{ key: 'auto-cancel', label: 'Auto Cancellation', route: '/debug/auto-cancel' },
];

function timestamp() {
	const d = new Date();
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function DevPanel() {
	const [open, setOpen] = useState(false);
	const [serverOnline, setServerOnline] = useState(null);
	const [running, setRunning] = useState({});
	const [results, setResults] = useState({});
	const [log, setLog] = useState([]);
	const logRef = useRef(null);

	const addLog = useCallback((msg, type = 'info') => {
		setLog((prev) => [...prev.slice(-49), { time: timestamp(), msg, type }]);
	}, []);

	const checkServer = useCallback(async () => {
		try {
			const res = await fetch(`${DEBUG_BASE}/debug/status`, { signal: AbortSignal.timeout(2000) });
			setServerOnline(res.ok);
			if (!res.ok) addLog('Debug server returned non-200', 'err');
		} catch {
			setServerOnline(false);
		}
	}, [addLog]);

	useEffect(() => {
		checkServer();
		const interval = setInterval(checkServer, 10000);
		return () => clearInterval(interval);
	}, [checkServer]);

	useEffect(() => {
		if (logRef.current) {
			logRef.current.scrollTop = logRef.current.scrollHeight;
		}
	}, [log]);

	async function runJob(job) {
		setRunning((prev) => ({ ...prev, [job.key]: true }));
		setResults((prev) => ({ ...prev, [job.key]: null }));
		addLog(`Running ${job.label}...`, 'info');
		try {
			const res = await fetch(`${DEBUG_BASE}${job.route}`);
			const json = await res.json();
			if (json.ok) {
				setResults((prev) => ({ ...prev, [job.key]: { ok: true, ms: json.ms } }));
				addLog(`${job.label} OK — ${json.ms}ms`, 'ok');
			} else {
				setResults((prev) => ({ ...prev, [job.key]: { ok: false, error: json.error } }));
				addLog(`${job.label} failed: ${json.error}`, 'err');
			}
		} catch (err) {
			setResults((prev) => ({ ...prev, [job.key]: { ok: false, error: err.message } }));
			addLog(`${job.label} error: ${err.message}`, 'err');
		} finally {
			setRunning((prev) => ({ ...prev, [job.key]: false }));
		}
	}

	const anyRunning = Object.values(running).some(Boolean);

	return (
		<div className="dev-panel">
			{open && (
				<div className="dev-panel__drawer">
					<div className="dev-panel__header">
						<span className="dev-panel__title">Dev Tools</span>
						<span className="dev-panel__status">
							<span className={`dev-panel__status-dot${serverOnline === false ? ' dev-panel__status-dot--offline' : ''}`} />
							{serverOnline === null ? 'checking…' : serverOnline ? 'backend reachable' : 'backend offline'}
						</span>
					</div>

					<div className="dev-panel__jobs">
						{JOBS.map((job) => {
							const result = results[job.key];
							const isRunning = running[job.key];
							return (
								<button
									key={job.key}
									className="dev-panel__job-btn"
									onClick={() => runJob(job)}
									disabled={isRunning || !serverOnline || anyRunning}
								>
									<span className="dev-panel__job-label">
										{isRunning ? `Running ${job.label}…` : `Run ${job.label}`}
									</span>
									{result && (
										<span className={`dev-panel__job-badge dev-panel__job-badge--${result.ok ? 'ok' : 'err'}`}>
											{result.ok ? `✓ ${result.ms}ms` : '✗ error'}
										</span>
									)}
									{isRunning && (
										<span className="dev-panel__job-badge dev-panel__job-badge--running">…</span>
									)}
								</button>
							);
						})}
					</div>

					{log.length > 0 && (
						<div className="dev-panel__log" ref={logRef}>
							{log.map((entry, i) => (
								<div key={i} className="dev-panel__log-entry">
									<span className="dev-panel__log-time">{entry.time}</span>
									<span className={`dev-panel__log-msg--${entry.type}`}>{entry.msg}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<button
				className="dev-panel__toggle"
				onClick={() => setOpen((o) => !o)}
				aria-label="Toggle dev panel"
			>
				<span className={`dev-panel__toggle-dot${serverOnline === false ? ' dev-panel__toggle-dot--offline' : ''}`} />
				DEV
			</button>
		</div>
	);
}
