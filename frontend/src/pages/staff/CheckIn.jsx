import { useCallback, useEffect, useState } from 'react';
import { ArrowSquareIn, ArrowSquareOut, MagnifyingGlass, UserCircle, X } from '@phosphor-icons/react';
import { supabase } from '../../data/supabaseClient';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './CheckIn.css';

const SLOT_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM – 8 PM

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime12(timeStr) {
	if (!timeStr) return '';
	const [h, m] = timeStr.split(':').map(Number);
	const period = h >= 12 ? 'PM' : 'AM';
	const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${hour}:${pad(m)} ${period}`;
}

function formatSlotHour(h) {
	const period = h >= 12 ? 'PM' : 'AM';
	const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${hour} ${period}`;
}

function getSlotHour(timeStr) {
	if (!timeStr) return -1;
	return parseInt(timeStr.split(':')[0], 10);
}

function getTodayStr() {
	const d = new Date();
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function enrichRow(r, usersMap) {
	const user = usersMap[r.user_id];
	return {
		id: r.id,
		userId: r.user_id,
		user_name: user?.full_name || 'Unknown',
		user_email: user?.email || '',
		student_id: user?.student_id || '',
		reservation_date: r.reservation_date,
		start_time: r.start_time,
		end_time: r.end_time,
		status: r.status,
		actual_check_in: r.actual_check_in,
		created_at: r.created_at,
	};
}

export default function CheckIn() {
	const [now, setNow] = useState(new Date());
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [awaitingCheckIn, setAwaitingCheckIn] = useState([]);
	const [checkedIn, setCheckedIn] = useState([]);
	const [allTodayRows, setAllTodayRows] = useState([]);
	const [processingIds, setProcessingIds] = useState(new Set());
	const [selectedHour, setSelectedHour] = useState(null);
	const [awaitingSearch, setAwaitingSearch] = useState('');
	const [insideSearch, setInsideSearch] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	const loadData = useCallback(async () => {
		const today = getTodayStr();
		try {
			const { data: todayData } = await supabase
				.from('reservations')
				.select('id, user_id, reservation_date, start_time, end_time, status, actual_check_in, created_at')
				.eq('reservation_date', today)
				.in('status', ['pending', 'approved', 'checked_in', 'completed'])
				.order('start_time', { ascending: true });

			const allRows = todayData ?? [];
			const userIds = [...new Set(allRows.map((r) => r.user_id).filter(Boolean))];
			const usersMap = {};
			if (userIds.length > 0) {
				const { data: usersData } = await supabase
					.from('users')
					.select('id, full_name, email, student_id')
					.in('id', userIds);
				(usersData ?? []).forEach((u) => { usersMap[u.id] = u; });
			}

			const enriched = allRows.map((r) => enrichRow(r, usersMap));
			setAllTodayRows(enriched);
			setAwaitingCheckIn(enriched.filter((r) => r.status === 'approved'));
			setCheckedIn(enriched.filter((r) => r.status === 'checked_in'));
		} catch (err) {
			console.error('[CheckIn] load error:', err);
		} finally {
			setIsPageLoading(false);
		}
	}, []);

	useEffect(() => {
		const prevTitle = document.title;
		document.title = 'Check In/Out - UST CICS Learning Common Room';

		loadData();

		const today = getTodayStr();
		const channel = supabase
			.channel('checkin-reservations')
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'reservations',
				filter: `reservation_date=eq.${today}`,
			}, () => loadData())
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
			document.title = prevTitle;
		};
	}, [loadData]);

	async function handleCheckIn(reservation) {
		setProcessingIds((prev) => new Set([...prev, reservation.id]));
		setError('');
		try {
			const { error: err } = await supabase
				.from('reservations')
				.update({ status: 'checked_in', actual_check_in: new Date().toISOString() })
				.eq('id', reservation.id)
				.eq('status', 'approved');
			if (err) throw err;
			setAwaitingCheckIn((prev) => prev.filter((r) => r.id !== reservation.id));
			setCheckedIn((prev) => [
				...prev,
				{ ...reservation, status: 'checked_in', actual_check_in: new Date().toISOString() },
			]);
		} catch (err) {
			setError(`Check-in failed: ${err.message}`);
		} finally {
			setProcessingIds((prev) => { const n = new Set(prev); n.delete(reservation.id); return n; });
		}
	}

	async function handleCheckOut(reservation) {
		setProcessingIds((prev) => new Set([...prev, reservation.id]));
		setError('');
		try {
			const { error: err } = await supabase
				.from('reservations')
				.update({ status: 'completed' })
				.eq('id', reservation.id)
				.eq('status', 'checked_in');
			if (err) throw err;
			setCheckedIn((prev) => prev.filter((r) => r.id !== reservation.id));
		} catch (err) {
			setError(`Check-out failed: ${err.message}`);
		} finally {
			setProcessingIds((prev) => { const n = new Set(prev); n.delete(reservation.id); return n; });
		}
	}

	// Build slot map for the schedule grid from ALL today's reservations
	const slotMap = {};
	SLOT_HOURS.forEach((h) => { slotMap[h] = { pending: 0, approved: 0, checkedIn: 0, completed: 0 }; });
	allTodayRows.forEach((r) => {
		const h = getSlotHour(r.start_time);
		if (slotMap[h] === undefined) return;
		if (r.status === 'pending') slotMap[h].pending += 1;
		else if (r.status === 'approved') slotMap[h].approved += 1;
		else if (r.status === 'checked_in') slotMap[h].checkedIn += 1;
		else if (r.status === 'completed') slotMap[h].completed += 1;
	});

	const currentHour = now.getHours();
	const displayHour = now.getHours() === 0 ? 12 : now.getHours() > 12 ? now.getHours() - 12 : now.getHours();
	const period = now.getHours() >= 12 ? 'PM' : 'AM';
	const dateStr = now.toLocaleDateString('en-US', {
		weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
	});

	return (
		<section
			className={`dashboard-page check-in-page ${
				isPageLoading ? 'check-in-page--hidden' : 'check-in-page--visible'
			}`}
		>
			<PageHeader
				className="page-header--sticky"
				title="Check In / Out"
				subtitle="Manually check students in and out of the Learning Commons."
			/>

			{/* Live clock */}
			<div className="check-in__clock-shell">
				<div className="check-in__clock">
					<span className="check-in__clock-time">
						{pad(displayHour)}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
					</span>
					<span className="check-in__clock-period">{period}</span>
				</div>
				<div className="check-in__clock-date">{dateStr}</div>
			</div>

			{error && (
				<div className="check-in__error" role="alert">{error}</div>
			)}

			{/* Today's schedule grid */}
			<div className="check-in__slot-shell">
				<div className="check-in__section-header">
					<span className="check-in__section-label">Today's Schedule</span>
					<span className="check-in__section-count">
						{allTodayRows.length} total booking{allTodayRows.length !== 1 ? 's' : ''}
					</span>
				</div>
				<div className="check-in__slot-grid">
					{SLOT_HOURS.map((h) => {
						const { pending, approved, checkedIn: ci, completed } = slotMap[h];
						const total = pending + approved + ci + completed;
						const isNow = h === currentHour;
						const isSelected = selectedHour === h;
						return (
							<div
								key={h}
								role="button"
								tabIndex={0}
								onClick={() => setSelectedHour((prev) => prev === h ? null : h)}
								onKeyDown={(e) => e.key === 'Enter' && setSelectedHour((prev) => prev === h ? null : h)}
								className={`check-in__slot${isNow ? ' check-in__slot--now' : ''}${total === 0 ? ' check-in__slot--empty' : ' check-in__slot--active'}${isSelected ? ' check-in__slot--selected' : ''}`}
							>
								<div className="check-in__slot-hour">{formatSlotHour(h)}</div>
								<div className="check-in__slot-body">
									{pending > 0 && (
										<span className="check-in__slot-badge check-in__slot-badge--pending">
											{pending} pending
										</span>
									)}
									{approved > 0 && (
										<span className="check-in__slot-badge check-in__slot-badge--approved">
											{approved} {h <= currentHour ? 'waiting' : 'reserved'}
										</span>
									)}
									{ci > 0 && (
										<span className="check-in__slot-badge check-in__slot-badge--in">
											{ci} in
										</span>
									)}
									{completed > 0 && (
										<span className="check-in__slot-badge check-in__slot-badge--completed">
											{completed} done
										</span>
									)}
									{total === 0 && <span className="check-in__slot-dash">—</span>}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Awaiting + Checked-in panels */}
			{(() => {
				const awaitingQ = awaitingSearch.trim().toLowerCase();
				const insideQ = insideSearch.trim().toLowerCase();

				const filteredAwaiting = awaitingCheckIn.filter((r) => {
					if (selectedHour !== null && getSlotHour(r.start_time) !== selectedHour) return false;
					if (awaitingQ && !r.user_name.toLowerCase().includes(awaitingQ) && !r.student_id.toLowerCase().includes(awaitingQ)) return false;
					return true;
				});

				const filteredInside = checkedIn.filter((r) => {
					if (selectedHour !== null && getSlotHour(r.start_time) !== selectedHour) return false;
					if (insideQ && !r.user_name.toLowerCase().includes(insideQ) && !r.student_id.toLowerCase().includes(insideQ)) return false;
					return true;
				});

				return (
					<div className="check-in__panels">
						{/* Awaiting check-in */}
						<div className="check-in__panel">
							<div className="check-in__panel-header">
								<span className="check-in__section-label">
									Awaiting Check-In{selectedHour !== null ? ` · ${formatSlotHour(selectedHour)}` : ''}
								</span>
								<span className="check-in__panel-count">
									{filteredAwaiting.length} student{filteredAwaiting.length !== 1 ? 's' : ''}
								</span>
							</div>
							<div className="check-in__panel-search">
								<MagnifyingGlass className="check-in__panel-search-icon" size={14} weight="bold" />
								<input
									type="search"
									className="check-in__panel-search-input"
									placeholder="Search by name or student ID…"
									value={awaitingSearch}
									onChange={(e) => setAwaitingSearch(e.target.value)}
									aria-label="Search awaiting check-in"
								/>
								{awaitingSearch && (
									<button
										type="button"
										className="check-in__panel-search-clear"
										onClick={() => setAwaitingSearch('')}
										aria-label="Clear search"
									>
										<X size={12} weight="bold" />
									</button>
								)}
							</div>
							<div className="check-in__list">
								{filteredAwaiting.length === 0 ? (
									<div className="check-in__empty">
										{awaitingSearch ? `No results for "${awaitingSearch}"` : 'No students awaiting check-in.'}
									</div>
								) : (
									filteredAwaiting.map((r) => (
										<div key={r.id} className="check-in__row">
											<div className="check-in__row-avatar">
												<UserCircle size={34} weight="duotone" />
											</div>
											<div className="check-in__row-info">
												<div className="check-in__row-name">{r.user_name}</div>
												<div className="check-in__row-time">
													{formatTime12(r.start_time)} – {formatTime12(r.end_time)}
												</div>
											</div>
											<button
												type="button"
												className="check-in__action-btn check-in__action-btn--in"
												onClick={() => handleCheckIn(r)}
												disabled={processingIds.has(r.id)}
											>
												<ArrowSquareIn size={15} weight="bold" />
												{processingIds.has(r.id) ? '…' : 'Check In'}
											</button>
										</div>
									))
								)}
							</div>
						</div>

						{/* Currently checked in */}
						<div className="check-in__panel">
							<div className="check-in__panel-header">
								<span className="check-in__section-label">
									Currently Inside{selectedHour !== null ? ` · ${formatSlotHour(selectedHour)}` : ''}
								</span>
								<span className="check-in__panel-count">
									{filteredInside.length} student{filteredInside.length !== 1 ? 's' : ''}
								</span>
							</div>
							<div className="check-in__panel-search">
								<MagnifyingGlass className="check-in__panel-search-icon" size={14} weight="bold" />
								<input
									type="search"
									className="check-in__panel-search-input"
									placeholder="Search by name or student ID…"
									value={insideSearch}
									onChange={(e) => setInsideSearch(e.target.value)}
									aria-label="Search currently inside"
								/>
								{insideSearch && (
									<button
										type="button"
										className="check-in__panel-search-clear"
										onClick={() => setInsideSearch('')}
										aria-label="Clear search"
									>
										<X size={12} weight="bold" />
									</button>
								)}
							</div>
							<div className="check-in__list">
								{filteredInside.length === 0 ? (
									<div className="check-in__empty">
										{insideSearch ? `No results for "${insideSearch}"` : 'No students currently checked in.'}
									</div>
								) : (
									filteredInside.map((r) => (
										<div key={r.id} className="check-in__row check-in__row--inside">
											<div className="check-in__row-avatar check-in__row-avatar--inside">
												<UserCircle size={34} weight="fill" />
											</div>
											<div className="check-in__row-info">
												<div className="check-in__row-name">{r.user_name}</div>
												<div className="check-in__row-time">
													{formatTime12(r.start_time)} – {formatTime12(r.end_time)}
												</div>
												{r.actual_check_in && (
													<div className="check-in__row-meta">
														In at {new Date(r.actual_check_in).toLocaleTimeString('en-US', {
															hour: 'numeric', minute: '2-digit',
														})}
													</div>
												)}
											</div>
											<button
												type="button"
												className="check-in__action-btn check-in__action-btn--out"
												onClick={() => handleCheckOut(r)}
												disabled={processingIds.has(r.id)}
											>
												<ArrowSquareOut size={15} weight="bold" />
												{processingIds.has(r.id) ? '…' : 'Check Out'}
											</button>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				);
			})()}

			{isPageLoading && (
				<div
					className="check-in-page-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading check-in page"
				>
					<div className="check-in-page-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="check-in-page-transition__logo"
						/>
						<div className="check-in-page-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
