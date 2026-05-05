import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { supabase } from '../../data/supabaseClient';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import '../../features/reservations/components/ReservationsTable.css';
import './PendingRequests.css';

const PAGE_SIZE = 10;
const RESOLVED_PAGE_SIZE = 10;

const CARD_DATE_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const FULL_DATE_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime12(timeStr) {
	if (!timeStr) return '';
	const [h, m] = timeStr.split(':').map(Number);
	const period = h >= 12 ? 'PM' : 'AM';
	const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${hour}:${pad(m)} ${period}`;
}

function parseDate(dateValue) {
	if (!dateValue) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue));
	if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	const d = new Date(dateValue);
	if (Number.isNaN(d.getTime())) return null;
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(dateValue) {
	const d = parseDate(dateValue);
	return d ? CARD_DATE_FMT.format(d) : String(dateValue ?? '');
}

function formatFullDate(dateValue) {
	const d = parseDate(dateValue);
	return d ? FULL_DATE_FMT.format(d) : String(dateValue ?? '');
}

function getRelativeMeta(dateValue) {
	const d = parseDate(dateValue);
	if (!d) return { label: 'Date unavailable', tone: 'neutral' };
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const diff = Math.round((d - todayStart) / 86400000);
	if (diff === 0) return { label: 'Today', tone: 'today' };
	if (diff === 1) return { label: 'Tomorrow', tone: 'tomorrow' };
	if (diff > 1) return { label: `In ${diff} days`, tone: 'future' };
	if (diff === -1) return { label: 'Yesterday', tone: 'past' };
	return { label: `${Math.abs(diff)} days ago`, tone: 'past' };
}

function getTodayStr() {
	return new Date().toISOString().slice(0, 10);
}

function getWeekBounds() {
	const today = new Date();
	const dow = today.getDay();
	const daysFromMonday = dow === 0 ? 6 : dow - 1;
	const monday = new Date(today);
	monday.setDate(monday.getDate() - daysFromMonday);
	monday.setHours(0, 0, 0, 0);
	const sunday = new Date(monday);
	sunday.setDate(sunday.getDate() + 6);
	return {
		mondayStr: monday.toISOString().slice(0, 10),
		sundayStr: sunday.toISOString().slice(0, 10),
	};
}

function enrichRow(r, usersMap) {
	const user = usersMap[r.user_id];
	return {
		id: r.id,
		userId: r.user_id,
		user_name: user?.full_name || 'Unknown',
		user_email: user?.email || '',
		reservation_date: r.reservation_date,
		start_time: r.start_time,
		end_time: r.end_time,
		status: r.status,
		created_at: r.created_at,
	};
}

const STATUS_LABELS = {
	approved: 'Approved',
	denied: 'Denied',
	no_show: 'No Show',
	auto_cancelled: 'Auto Cancelled',
	completed: 'Completed',
	checked_in: 'Checked In',
	cancelled_by_user: 'Cancelled',
	pending: 'Pending',
	held: 'Held',
};

function formatStatus(status) {
	return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

const RESOLVED_HEADERS = ['Request ID', 'Student', 'Date', 'Time Slot', 'Status'];

export default function PendingRequests() {
	const [allPending, setAllPending] = useState([]);
	const [recentlyResolved, setRecentlyResolved] = useState([]);
	const [isPageLoading, setIsPageLoading] = useState(true);

	const [searchQuery, setSearchQuery] = useState('');
	const [filterTab, setFilterTab] = useState('all');
	const [currentPage, setCurrentPage] = useState(1);
	const [resolvedPage, setResolvedPage] = useState(1);

	const [acceptedIds, setAcceptedIds] = useState(new Set());
	const [dismissingIds, setDismissingIds] = useState(new Set());

	const [autoAccept, setAutoAccept] = useState(false);
	const [autoAcceptLoading, setAutoAcceptLoading] = useState(false);

	const [denyModal, setDenyModal] = useState(null);
	const [denyReason, setDenyReason] = useState('');
	const [denySubmitting, setDenySubmitting] = useState(false);
	const [denyError, setDenyError] = useState('');

	useEffect(() => {
		const prevTitle = document.title;
		document.title = 'Pending Requests - UST CICS Learning Common Room';
		let active = true;

		async function loadData() {
			try {
				const [pendingResult, resolvedResult] = await Promise.all([
					supabase
						.from('reservations')
						.select('id, user_id, reservation_date, start_time, end_time, status, created_at')
						.eq('status', 'pending')
						.order('created_at', { ascending: false }),
					supabase
						.from('reservations')
						.select('id, user_id, reservation_date, start_time, end_time, status, created_at')
						.in('status', ['approved', 'denied', 'auto_cancelled', 'no_show', 'completed'])
						.order('created_at', { ascending: false })
						.limit(100),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;

				const allRows = [
					...(pendingResult.data ?? []),
					...(resolvedResult.data ?? []),
				];

				// Collect unique user IDs, then fetch their profiles in one query
				const userIds = [...new Set(allRows.map((r) => r.user_id).filter(Boolean))];
				const usersMap = {};
				if (userIds.length > 0) {
					const { data: usersData, error: usersError } = await supabase
						.from('users')
						.select('id, full_name, email')
						.in('id', userIds);
					if (usersError) console.error('[PendingRequests] users fetch:', usersError.message);
					(usersData ?? []).forEach((u) => { usersMap[u.id] = u; });
				}

				if (pendingResult.data) setAllPending(pendingResult.data.map((r) => enrichRow(r, usersMap)));
				if (resolvedResult.data) setRecentlyResolved(resolvedResult.data.map((r) => enrichRow(r, usersMap)));
			} finally {
				if (active) setIsPageLoading(false);
			}
		}

		loadData();
		return () => {
			active = false;
			document.title = prevTitle;
		};
	}, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, filterTab]);

	useEffect(() => {
		if (!denyModal) return;
		const handler = (e) => { if (e.key === 'Escape') setDenyModal(null); };
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [denyModal]);

	// Fetch auto-accept state from backend on mount
	useEffect(() => {
		const backendUrl = import.meta.env.VITE_BACKEND_URL;
		fetch(`${backendUrl}/api/settings/auto-accept`)
			.then((r) => r.json())
			.then((body) => { if (body.ok) setAutoAccept(body.enabled); })
			.catch(() => {});
	}, []);

	// Real-time: remove cards when backend approves/denies them
	const quietRefresh = useCallback(async () => {
		const [pendingResult, resolvedResult] = await Promise.all([
			supabase
				.from('reservations')
				.select('id, user_id, reservation_date, start_time, end_time, status, created_at')
				.eq('status', 'pending')
				.order('created_at', { ascending: false }),
			supabase
				.from('reservations')
				.select('id, user_id, reservation_date, start_time, end_time, status, created_at')
				.in('status', ['approved', 'denied', 'auto_cancelled', 'no_show', 'completed'])
				.order('created_at', { ascending: false })
				.limit(100),
		]);

		const allRows = [...(pendingResult.data ?? []), ...(resolvedResult.data ?? [])];
		const userIds = [...new Set(allRows.map((r) => r.user_id).filter(Boolean))];
		const usersMap = {};
		if (userIds.length > 0) {
			const { data: usersData } = await supabase
				.from('users').select('id, full_name, email').in('id', userIds);
			(usersData ?? []).forEach((u) => { usersMap[u.id] = u; });
		}
		if (pendingResult.data) setAllPending(pendingResult.data.map((r) => enrichRow(r, usersMap)));
		if (resolvedResult.data) setRecentlyResolved(resolvedResult.data.map((r) => enrichRow(r, usersMap)));
	}, []);

	useEffect(() => {
		const channel = supabase
			.channel('pending-requests-live')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
				quietRefresh();
			})
			.subscribe();
		return () => supabase.removeChannel(channel);
	}, [quietRefresh]);

	const todayStr = getTodayStr();
	const { mondayStr, sundayStr } = getWeekBounds();

	const countAll = allPending.length;
	const countToday = allPending.filter((r) => r.reservation_date === todayStr).length;
	const countThisWeek = allPending.filter(
		(r) => r.reservation_date >= mondayStr && r.reservation_date <= sundayStr
	).length;

	const searchLower = searchQuery.trim().toLowerCase();
	const filteredPending = allPending.filter((r) => {
		if (filterTab === 'today' && r.reservation_date !== todayStr) return false;
		if (filterTab === 'this_week' && (r.reservation_date < mondayStr || r.reservation_date > sundayStr)) return false;
		if (searchLower && !r.user_name.toLowerCase().includes(searchLower)) return false;
		return true;
	});

	const totalPages = Math.max(1, Math.ceil(filteredPending.length / PAGE_SIZE));
	const safePage = Math.min(currentPage, totalPages);
	const pageItems = filteredPending.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

	const resolvedTotalPages = Math.max(1, Math.ceil(recentlyResolved.length / RESOLVED_PAGE_SIZE));
	const safeResolvedPage = Math.min(resolvedPage, resolvedTotalPages);
	const resolvedItems = recentlyResolved.slice(
		(safeResolvedPage - 1) * RESOLVED_PAGE_SIZE,
		safeResolvedPage * RESOLVED_PAGE_SIZE
	);

	async function handleApprove(reservation) {
		setAcceptedIds((prev) => new Set([...prev, reservation.id]));

		const { error } = await supabase
			.from('reservations')
			.update({ status: 'approved' })
			.eq('id', reservation.id)
			.eq('status', 'pending');

		if (error) {
			setAcceptedIds((prev) => { const n = new Set(prev); n.delete(reservation.id); return n; });
			console.error('[PendingRequests] Approve failed:', error.message);
			return;
		}

		setTimeout(() => {
			setDismissingIds((prev) => new Set([...prev, reservation.id]));
			setTimeout(() => {
				setAllPending((prev) => prev.filter((r) => r.id !== reservation.id));
				setAcceptedIds((prev) => { const n = new Set(prev); n.delete(reservation.id); return n; });
				setDismissingIds((prev) => { const n = new Set(prev); n.delete(reservation.id); return n; });
				setRecentlyResolved((prev) => [{ ...reservation, status: 'approved' }, ...prev]);
			}, 420);
		}, 1500);
	}

	async function handleDenySubmit() {
		if (!denyReason.trim()) {
			setDenyError('Please provide a reason for declining.');
			return;
		}
		setDenySubmitting(true);
		setDenyError('');

		const reservation = denyModal;
		const backendUrl = import.meta.env.VITE_BACKEND_URL;

		try {
			const response = await fetch(`${backendUrl}/api/reservations/${reservation.id}/decline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: denyReason.trim() }),
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.error || `Server error ${response.status}`);
			}

			setDenyModal(null);
			setDenyReason('');
			setDismissingIds((prev) => new Set([...prev, reservation.id]));

			setTimeout(() => {
				setAllPending((prev) => prev.filter((r) => r.id !== reservation.id));
				setDismissingIds((prev) => { const n = new Set(prev); n.delete(reservation.id); return n; });
				setRecentlyResolved((prev) => [{ ...reservation, status: 'denied' }, ...prev]);
			}, 420);
		} catch (err) {
			setDenyError(err.message);
		} finally {
			setDenySubmitting(false);
		}
	}

	return (
		<section
			className={`dashboard-page pending-requests-page ${
				isPageLoading
					? 'pending-requests-page--content-hidden'
					: 'pending-requests-page--content-visible'
			}`}
		>
			<PageHeader
				className="page-header--sticky"
				title="Pending Requests"
				subtitle="Approve or decline requests submitted by students."
			/>

			<div className={`pending-requests__cards-shell${autoAccept ? ' pending-requests__cards-shell--auto-active' : ''}`}>
				<div className="pending-requests__section-header">
					<div className="pending-requests__section-copy">
						<div className="pending-requests__section-label">
							Pending Queue
							{autoAccept && (
								<span className="pending-requests__auto-badge">
									<span className="pending-requests__auto-badge-dot" />
									Auto-Accepting
								</span>
							)}
						</div>
						<div className="pending-requests__section-description">
							Review, approve, or decline requests submitted by students.
						</div>
					</div>
					<div className="pending-requests__section-controls">
						<div className="pending-requests__section-count">
							{filteredPending.length} request{filteredPending.length === 1 ? '' : 's'} pending
						</div>
						<label className={`pending-requests__auto-toggle${autoAcceptLoading ? ' pending-requests__auto-toggle--loading' : ''}`} aria-label="Toggle auto-accept">
							<span className="pending-requests__auto-toggle-label">
								Auto-Accept
							</span>
							<span className={`pending-requests__auto-toggle-track${autoAccept ? ' pending-requests__auto-toggle-track--on' : ''}`}>
								<input
									type="checkbox"
									className="pending-requests__auto-toggle-input"
									checked={autoAccept}
									disabled={autoAcceptLoading}
									onChange={async (e) => {
										const next = e.target.checked;
										setAutoAcceptLoading(true);
										try {
											const backendUrl = import.meta.env.VITE_BACKEND_URL;
											const res = await fetch(`${backendUrl}/api/settings/auto-accept`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ enabled: next }),
											});
											const body = await res.json();
											if (body.ok) setAutoAccept(next);
										} catch (err) {
											console.error('[PendingRequests] auto-accept toggle failed:', err.message);
										} finally {
											setAutoAcceptLoading(false);
										}
									}}
									aria-label="Auto-accept pending requests"
								/>
								<span className="pending-requests__auto-toggle-thumb" />
							</span>
						</label>
					</div>
				</div>

				<div className="pending-requests__toolbar">
					<div className="pending-requests__search-wrap">
						<MagnifyingGlass className="pending-requests__search-icon" size={16} weight="bold" />
						<input
							type="search"
							className="pending-requests__search-input"
							placeholder="Search by student name…"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							aria-label="Search pending requests by student name"
						/>
						{searchQuery && (
							<button
								type="button"
								className="pending-requests__search-clear"
								onClick={() => setSearchQuery('')}
								aria-label="Clear search"
							>
								<X size={14} weight="bold" />
							</button>
						)}
					</div>

					<div className="pending-requests__filter-tabs" role="tablist" aria-label="Filter by date">
						{[
							{ key: 'all', label: 'All', count: countAll },
							{ key: 'today', label: 'Today', count: countToday },
							{ key: 'this_week', label: 'This Week', count: countThisWeek },
						].map(({ key, label, count }) => (
							<button
								key={key}
								type="button"
								role="tab"
								aria-selected={filterTab === key}
								className={`pending-requests__filter-tab${filterTab === key ? ' pending-requests__filter-tab--active' : ''}`}
								onClick={() => setFilterTab(key)}
							>
								{label}
								<span className="pending-requests__tab-count">{count}</span>
							</button>
						))}
					</div>
				</div>

				<div className="pending-requests__card-list">
					{filteredPending.length === 0 ? (
						<div className="pending-requests__empty">
							{searchQuery
								? `No results for "${searchQuery}"`
								: 'No pending requests right now.'}
						</div>
					) : (
						pageItems.map((reservation) => {
							const relMeta = getRelativeMeta(reservation.reservation_date);
							const isAccepted = acceptedIds.has(reservation.id);
							const isDismissing = dismissingIds.has(reservation.id);

							return (
								<div
									key={reservation.id}
									className={`pending-requests__card${isDismissing ? ' pending-requests__card--dismissing' : ''}`}
								>
									{isAccepted && (
										<div className="pending-requests__accepted-overlay" aria-hidden="true">
											<Check weight="bold" size={20} />
											Request accepted
										</div>
									)}

									<div className="pending-requests__card-content">
										<div className="pending-requests__card-row">
											<div className="pending-requests__card-label">Student</div>
											<div className="pending-requests__card-value name">{reservation.user_name}</div>
										</div>
										<div className="pending-requests__card-row">
											<div className="pending-requests__card-label">Request ID</div>
											<div className="pending-requests__card-value id">{reservation.id.slice(0, 8)}…</div>
										</div>
										<div className="pending-requests__card-row">
											<div className="pending-requests__card-label">Date</div>
											<div className="pending-requests__card-date">
												<div className="pending-requests__card-value date">
													{formatDate(reservation.reservation_date)}
												</div>
												<span className={`pending-requests__date-helper pending-requests__date-helper--${relMeta.tone}`}>
													{relMeta.label}
												</span>
											</div>
										</div>
										<div className="pending-requests__card-row">
											<div className="pending-requests__card-label">Time</div>
											<div className="pending-requests__card-value">
												{formatTime12(reservation.start_time)} – {formatTime12(reservation.end_time)}
											</div>
										</div>
									</div>

									<div className="pending-requests__card-actions">
										<button
											type="button"
											className="pending-requests__action-btn pending-requests__action-btn--approve"
											onClick={() => handleApprove(reservation)}
											disabled={isAccepted || isDismissing}
										>
											Approve
										</button>
										<button
											type="button"
											className="pending-requests__action-btn pending-requests__action-btn--decline"
											onClick={() => {
												setDenyModal(reservation);
												setDenyReason('');
												setDenyError('');
											}}
											disabled={isAccepted || isDismissing}
										>
											Decline
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>

				{totalPages > 1 && (
					<div className="pending-requests__cards-pagination">
						<span className="pending-requests__cards-pagination-info">
							Page {safePage} of {totalPages} · {filteredPending.length} request{filteredPending.length === 1 ? '' : 's'}
						</span>
						<div className="pending-requests__cards-pagination-controls">
							<button
								type="button"
								className="pagination-btn"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={safePage === 1}
								aria-label="Previous page"
							>
								‹
							</button>
							<button
								type="button"
								className="pagination-btn"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={safePage === totalPages}
								aria-label="Next page"
							>
								›
							</button>
						</div>
					</div>
				)}
			</div>

			<div className="reservations-table pending-requests-page__table-shell">
				<div className="reservations-table__header">
					<div className="pending-requests__section-copy">
						<div className="pending-requests__section-label">Recently Resolved</div>
						<div className="pending-requests__section-description">
							Latest approved or declined requests.
						</div>
					</div>
					<div className="pending-requests__section-controls">
						<div className="pending-requests__section-count">
							{recentlyResolved.length} request{recentlyResolved.length === 1 ? '' : 's'} resolved
						</div>
					</div>
				</div>

				<div className="reservations-table__wrapper">
					<table className="reservations-table__table">
						<thead>
							<tr className="table-header-row">
								{RESOLVED_HEADERS.map((h) => (
									<th key={h} className="table-header-cell">{h.toUpperCase()}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{resolvedItems.length === 0 ? (
								<tr className="table-body-row">
									<td className="table-cell" colSpan={RESOLVED_HEADERS.length}>
										No recently resolved reservations.
									</td>
								</tr>
							) : (
								resolvedItems.map((r) => (
									<tr key={r.id + r.status} className="table-body-row">
										<td className="table-cell pending-requests__ref-cell">
											{r.id.slice(0, 8)}…
										</td>
										<td className="table-cell">{r.user_name}</td>
										<td className="table-cell">{formatDate(r.reservation_date)}</td>
										<td className="table-cell">
											{formatTime12(r.start_time)} – {formatTime12(r.end_time)}
										</td>
										<td className="table-cell">
											<span className={`pending-requests__resolved-status pending-requests__resolved-status--${r.status}`}>
												{formatStatus(r.status)}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="reservations-table__footer">
					<div className="pagination-info">
						Displaying {resolvedItems.length} of {recentlyResolved.length} resolved
					</div>
					<div className="pagination-controls">
						<button
							type="button"
							className="pagination-btn"
							onClick={() => setResolvedPage((p) => Math.max(1, p - 1))}
							disabled={safeResolvedPage === 1}
							aria-label="Previous page"
						>
							‹
						</button>
						<button
							type="button"
							className="pagination-btn"
							onClick={() => setResolvedPage((p) => Math.min(resolvedTotalPages, p + 1))}
							disabled={safeResolvedPage === resolvedTotalPages}
							aria-label="Next page"
						>
							›
						</button>
					</div>
				</div>
			</div>

			{isPageLoading && (
				<div
					className="pending-requests-page-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading pending requests page"
				>
					<div className="pending-requests-page-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="pending-requests-page-transition__logo"
						/>
						<div className="pending-requests-page-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			)}

			{denyModal &&
				createPortal(
					<div
						className="deny-modal-overlay"
						onClick={() => setDenyModal(null)}
						role="dialog"
						aria-modal="true"
						aria-labelledby="deny-modal-title"
					>
						<div className="deny-modal" onClick={(e) => e.stopPropagation()}>
							<div className="deny-modal__header">
								<h2 id="deny-modal-title" className="deny-modal__title">
									Decline Request
								</h2>
								<button
									type="button"
									className="deny-modal__close"
									onClick={() => setDenyModal(null)}
									aria-label="Close"
								>
									<X size={18} weight="bold" />
								</button>
							</div>

							<div className="deny-modal__booking-info">
								<p className="deny-modal__info-label">Booking Details</p>
								<div className="deny-modal__info-row">
									<span className="deny-modal__info-key">Student</span>
									<span className="deny-modal__info-val">{denyModal.user_name}</span>
								</div>
								<div className="deny-modal__info-row">
									<span className="deny-modal__info-key">Date</span>
									<span className="deny-modal__info-val">{formatFullDate(denyModal.reservation_date)}</span>
								</div>
								<div className="deny-modal__info-row">
									<span className="deny-modal__info-key">Time</span>
									<span className="deny-modal__info-val">
										{formatTime12(denyModal.start_time)} – {formatTime12(denyModal.end_time)}
									</span>
								</div>
								<div className="deny-modal__info-row">
									<span className="deny-modal__info-key">Ref</span>
									<span className="deny-modal__info-val deny-modal__ref">{denyModal.id.slice(0, 8)}…</span>
								</div>
							</div>

							<div className="deny-modal__reason-section">
								<label className="deny-modal__reason-label" htmlFor="deny-reason">
									Reason for declining <span aria-hidden="true">*</span>
								</label>
								<textarea
									id="deny-reason"
									className="deny-modal__reason-textarea"
									placeholder="Explain why this request is being declined. This message will be sent to the student via email."
									value={denyReason}
									onChange={(e) => {
										setDenyReason(e.target.value);
										if (denyError) setDenyError('');
									}}
									rows={4}
									maxLength={500}
									disabled={denySubmitting}
								/>
								<div className="deny-modal__reason-footer">
									{denyError
										? <span className="deny-modal__error">{denyError}</span>
										: <span />
									}
									<span className="deny-modal__char-count">{denyReason.length}/500</span>
								</div>
							</div>

							<div className="deny-modal__actions">
								<button
									type="button"
									className="deny-modal__btn deny-modal__btn--cancel"
									onClick={() => setDenyModal(null)}
									disabled={denySubmitting}
								>
									Cancel
								</button>
								<button
									type="button"
									className="deny-modal__btn deny-modal__btn--submit"
									onClick={handleDenySubmit}
									disabled={denySubmitting}
								>
									{denySubmitting ? 'Sending…' : 'Decline & Notify'}
								</button>
							</div>
						</div>
					</div>,
					document.body
				)}
		</section>
	);
}
