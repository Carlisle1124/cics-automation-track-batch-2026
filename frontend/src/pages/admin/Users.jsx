import { useEffect, useMemo, useState } from 'react';
import {
	Eye,
	PencilSimple,
	Plus,
	MagnifyingGlass,
	X,
	UserCircle,
	WarningCircle,
	CaretDown as CaretDownIcon,
	CaretUp as CaretUpIcon,
} from '@phosphor-icons/react';
import PageHeader from '../../shared/components/PageHeader';
import Modal from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import { getAllUsers, createUser, updateUser } from '../../data/services/userService';
import './Users.css';

/* ─── Constants ─────────────────────────────────────────── */
const FILTER_TABS = [
	{ id: 'all', label: 'All Users' },
	{ id: 'student', label: 'Students' },
	{ id: 'admin', label: 'Admins' },
	{ id: 'staff', label: 'Staff' },
	{ id: 'suspended', label: 'Suspended' },
];

const ITEMS_PER_PAGE = 8;

const ROLE_OPTIONS = ['student', 'staff', 'admin'];

const EMPTY_FORM = {
	full_name: '',
	email: '',
	password: '',
	student_id: '',
	role: 'student',
	no_show_count: 0,
	is_account_suspended: false,
	suspended_until: '',
};

/* ─── Helpers ────────────────────────────────────────────── */
function formatDate(iso) {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString('en-PH', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function roleBadgeClass(role) {
	switch (role) {
		case 'admin':
			return 'users-table__role-badge--admin';
		case 'staff':
			return 'users-table__role-badge--staff';
		default:
			return 'users-table__role-badge--student';
	}
}

/* ─── Sub-components ─────────────────────────────────────── */

function ViewModal({ user, onClose }) {
	if (!user) return null;

	return (
		<Modal isOpen={Boolean(user)} title="View Account" onClose={onClose} className="ui-modal--flexible">
			<div className="users-modal__view">
				<div className="users-modal__avatar" aria-hidden="true">
					<UserCircle size={56} weight="duotone" />
				</div>

				<dl className="users-modal__detail-list">
					<div className="users-modal__detail-row">
						<dt>Full Name</dt>
						<dd>{user.full_name}</dd>
					</div>
					<div className="users-modal__detail-row">
						<dt>Email</dt>
						<dd>{user.email}</dd>
					</div>
					<div className="users-modal__detail-row">
						<dt>Student ID</dt>
						<dd>{user.student_id || '—'}</dd>
					</div>
					<div className="users-modal__detail-row">
						<dt>Role</dt>
						<dd>
							<span className={`users-table__role-badge ${roleBadgeClass(user.role)}`}>
								{user.role}
							</span>
						</dd>
					</div>
					<div className="users-modal__detail-row">
						<dt>No-show Count</dt>
						<dd>{user.no_show_count}</dd>
					</div>
					<div className="users-modal__detail-row">
						<dt>Account Status</dt>
						<dd>
							{user.is_account_suspended ? (
								<span className="users-table__status-badge users-table__status-badge--suspended">
									Suspended
								</span>
							) : (
								<span className="users-table__status-badge users-table__status-badge--active">
									Active
								</span>
							)}
						</dd>
					</div>
					{user.is_account_suspended && (
						<div className="users-modal__detail-row">
							<dt>Suspended Until</dt>
							<dd>{formatDate(user.suspended_until)}</dd>
						</div>
					)}
					<div className="users-modal__detail-row">
						<dt>Registered</dt>
						<dd>{formatDate(user.created_at)}</dd>
					</div>
				</dl>

				<div className="users-modal__actions">
					<Button variant="secondary" onClick={onClose}>
						Close
					</Button>
				</div>
			</div>
		</Modal>
	);
}

function formFromUser(user) {
	if (!user) return EMPTY_FORM;
	return {
		full_name: user.full_name,
		email: user.email,
		student_id: user.student_id || '',
		role: user.role,
		no_show_count: user.no_show_count,
		is_account_suspended: user.is_account_suspended,
		suspended_until: user.suspended_until ? user.suspended_until.slice(0, 10) : '',
	};
}

// EditModal is keyed by editKey in the parent so it remounts for each new user;
// form state is therefore initialized once per mount via the lazy initializer.
function EditModal({ user, onClose, onSave }) {
	const [form, setForm] = useState(() => formFromUser(user));

	function handleChange(e) {
		const { name, value, type, checked } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	}

	function handleSubmit(e) {
		e.preventDefault();
		onSave({ ...user, ...form });
	}

	if (!user) return null;

	return (
		<Modal isOpen={Boolean(user)} title="Edit Account" onClose={onClose}>
			<form className="users-modal__form" onSubmit={handleSubmit}>
				<Input
					label="Full Name"
					name="full_name"
					value={form.full_name}
					onChange={handleChange}
					placeholder="Full name"
					required
				/>
				<Input
					label="Email"
					name="email"
					type="email"
					value={form.email}
					onChange={handleChange}
					placeholder="Email address"
					required
				/>
				<Input
					label="Student ID"
					name="student_id"
					value={form.student_id}
					onChange={handleChange}
					placeholder="e.g. 2021-00001"
				/>

				<div className="ui-input-field">
					<label className="ui-input-field__label" htmlFor="edit-role">
						Role
					</label>
					<div className="ui-input">
						<select
							id="edit-role"
							name="role"
							className="ui-input__control users-modal__select"
							value={form.role}
							onChange={handleChange}
						>
							{ROLE_OPTIONS.map((r) => (
								<option key={r} value={r}>
									{r.charAt(0).toUpperCase() + r.slice(1)}
								</option>
							))}
						</select>
					</div>
				</div>

				<Input
					label="No-show Count"
					name="no_show_count"
					type="number"
					min="0"
					value={form.no_show_count}
					onChange={handleChange}
				/>

				<div className="users-modal__checkbox-row">
					<input
						id="edit-suspended"
						name="is_account_suspended"
						type="checkbox"
						checked={form.is_account_suspended}
						onChange={handleChange}
					/>
					<label htmlFor="edit-suspended">Account Suspended</label>
				</div>

				{form.is_account_suspended && (
					<Input
						label="Suspended Until"
						name="suspended_until"
						type="date"
						value={form.suspended_until}
						onChange={handleChange}
					/>
				)}

				<div className="users-modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" variant="primary">
						Save Changes
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function SuspendModal({ user, onClose, onConfirm, isProcessing }) {
	if (!user) return null;

	const defaultDate = user.suspended_until ? user.suspended_until.slice(0, 10) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const [until, setUntil] = useState(defaultDate);

	// reset when user changes
	useEffect(() => {
		setUntil(user.suspended_until ? user.suspended_until.slice(0, 10) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
	}, [user]);

	return (
		<Modal isOpen={Boolean(user)} title="Suspend Account" onClose={onClose} className="ui-modal--flexible">
			<div className="users-modal__delete">
				<p className="users-modal__delete-message">
					Suspend the account of <strong>{user.full_name}</strong>. Select when the suspension should be lifted.
				</p>

				<div style={{ margin: '0.5rem 0 1rem' }}>
					<label htmlFor="suspend-until" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
						Suspend Until
					</label>
					<input
						id="suspend-until"
						type="date"
						value={until}
						onChange={(e) => setUntil(e.target.value)}
						className="ui-input__control users-modal__select"
						style={{ maxWidth: '14rem' }}
					/>
				</div>

				<div className="users-modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						className="users-modal__delete-confirm-btn"
						onClick={() => onConfirm({ ...user, suspended_until: until, is_account_suspended: true })}
						disabled={isProcessing}
					>
						{isProcessing ? 'Suspending…' : 'Suspend Account'}
					</Button>
				</div>
			</div>
		</Modal>
	);
}

function ConfirmEditModal({ user, onClose, onConfirm, isProcessing }) {
	if (!user) return null;

	return (
		<Modal isOpen={Boolean(user)} title="Confirm Changes" onClose={onClose} className="ui-modal--flexible">
			<div className="users-modal__confirm">
				<p className="users-modal__confirm-message">
					Save the updated details for <strong>{user.full_name}</strong>?
				</p>

				<dl className="users-modal__confirm-summary">
					<div className="users-modal__confirm-row">
						<dt>Email</dt>
						<dd>{user.email}</dd>
					</div>
					<div className="users-modal__confirm-row">
						<dt>Role</dt>
						<dd>{user.role}</dd>
					</div>
					<div className="users-modal__confirm-row">
						<dt>No-show Count</dt>
						<dd>{user.no_show_count}</dd>
					</div>
					<div className="users-modal__confirm-row">
						<dt>Status</dt>
						<dd>{user.is_account_suspended ? 'Suspended' : 'Active'}</dd>
					</div>
					{user.suspended_until && (
						<div className="users-modal__confirm-row">
							<dt>Suspended Until</dt>
							<dd>{formatDate(user.suspended_until)}</dd>
						</div>
					)}
				</dl>

				<div className="users-modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
						Cancel
					</Button>
					<Button type="button" variant="primary" onClick={() => onConfirm(user)} disabled={isProcessing}>
						{isProcessing ? 'Saving…' : 'Confirm Changes'}
					</Button>
				</div>
			</div>
		</Modal>
	);
}

function FeedbackModal({ feedback, onClose }) {
	if (!feedback) return null;

	return (
		<Modal isOpen={Boolean(feedback)} title={feedback.title} onClose={onClose} className="ui-modal--small">
			<div className="users-modal__success">
				<p className="users-modal__success-message">{feedback.message}</p>
				<div className="users-modal__actions">
					<Button type="button" variant="primary" onClick={onClose}>
						Okay
					</Button>
				</div>
			</div>
		</Modal>
	);
}

function AddModal({ isOpen, onClose, onAdd }) {
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState(null);

	function handleClose() {
		setForm(EMPTY_FORM);
		setSubmitError(null);
		onClose();
	}

	function handleChange(e) {
		const { name, value, type, checked } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setSubmitError(null);
		try {
			const newUser = await createUser({
				email: form.email,
				password: form.password,
				full_name: form.full_name,
				role: form.role,
				student_id: form.student_id || null,
			});
			onAdd(newUser);
			setForm(EMPTY_FORM);
		} catch (err) {
			setSubmitError(err.message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Modal isOpen={isOpen} title="Add Account" onClose={handleClose}>
			<form className="users-modal__form" onSubmit={handleSubmit}>
				<Input
					label="Full Name"
					name="full_name"
					value={form.full_name}
					onChange={handleChange}
					placeholder="Full name"
					required
				/>
				<Input
					label="Email"
					name="email"
					type="email"
					value={form.email}
					onChange={handleChange}
					placeholder="Email address"
					required
				/>
				<Input
					label="Password"
					name="password"
					type="password"
					value={form.password}
					onChange={handleChange}
					placeholder="Initial password"
					required
				/>
				<Input
					label="Student ID"
					name="student_id"
					value={form.student_id}
					onChange={handleChange}
					placeholder="e.g. 2021-00001"
				/>

				<div className="ui-input-field">
					<label className="ui-input-field__label" htmlFor="add-role">
						Role
					</label>
					<div className="ui-input">
						<select
							id="add-role"
							name="role"
							className="ui-input__control users-modal__select"
							value={form.role}
							onChange={handleChange}
						>
							{ROLE_OPTIONS.map((r) => (
								<option key={r} value={r}>
									{r.charAt(0).toUpperCase() + r.slice(1)}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="users-modal__checkbox-row">
					<input
						id="add-suspended"
						name="is_account_suspended"
						type="checkbox"
						checked={form.is_account_suspended}
						onChange={handleChange}
					/>
					<label htmlFor="add-suspended">Account Suspended</label>
				</div>

				{form.is_account_suspended && (
					<Input
						label="Suspended Until"
						name="suspended_until"
						type="date"
						value={form.suspended_until}
						onChange={handleChange}
					/>
				)}

				{submitError && (
					<p className="users-modal__error" role="alert">
						<WarningCircle size={15} weight="fill" aria-hidden="true" />
						{submitError}
					</p>
				)}

				<div className="users-modal__actions">
					<Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={submitting}>
						{submitting ? 'Adding…' : 'Add Account'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function RowActionButtons({ user, onView, onEdit, onDelete, onUnsuspend, roleCounts, isProcessing }) {
	const isLastAdmin =
		user.role === 'admin' && roleCounts.admin <= 1;

	const isLastStaff =
		user.role === 'staff' && roleCounts.staff <= 1;

	const disableDelete = isLastAdmin || isLastStaff;
	const showUnsuspend = user.is_account_suspended;

	return (
		<div className="admin-users__action-buttons">
			<button
				type="button"
				className="admin-users__action-btn"
				onClick={() => onView(user)}
			>
				<Eye size={15} weight="duotone" />
				View
			</button>

			<button
				type="button"
				className="admin-users__action-btn"
				onClick={() => onEdit(user)}
			>
				<PencilSimple size={15} weight="duotone" />
				Edit
			</button>

			{showUnsuspend ? (
				<button
					type="button"
					className="admin-users__action-btn"
					onClick={() => onUnsuspend(user)}
					disabled={isProcessing}
					title="Unsuspend account"
				>
					<X size={15} weight="bold" />
					Unsuspend
				</button>
			) : (
				<button
					type="button"
					className="admin-users__action-btn admin-users__action-btn--danger"
					onClick={() => onDelete(user)}
					disabled={disableDelete}
					title={
						disableDelete
							? 'Cannot suspend the last account in this role'
							: 'Suspend account'
					}
				>
					<WarningCircle size={15} weight="duotone" />
					Suspend
				</button>
			)}
		</div>
	);
}

/* ─── Main page ──────────────────────────────────────────── */
export default function Users() {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('all');
	const [search, setSearch] = useState('');
	const [sortColumn, setSortColumn] = useState('registered');
	const [sortDirection, setSortDirection] = useState('desc');
	const [currentPage, setCurrentPage] = useState(1);

	const [viewUser, setViewUser] = useState(null);
	const [editUser, setEditUser] = useState(null);
	// editKey is stable while closing (so animation plays) but changes
	// when a new user is opened for editing (remounting EditModal with fresh form).
	const [editKey, setEditKey] = useState('edit');
	const [pendingEditUser, setPendingEditUser] = useState(null);
	const [deleteModalUser, setDeleteModalUser] = useState(null);
	const [feedbackModal, setFeedbackModal] = useState(null);
	const [isProcessingAction, setIsProcessingAction] = useState(false);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const roleCounts = useMemo(() => {
	return users.reduce(
		(acc, user) => {
			acc[user.role] = (acc[user.role] || 0) + 1;
			return acc;
		},
		{ admin: 0, staff: 0, student: 0 }
	);
}, [users]);

	// Fetch users on component mount
	useEffect(() => {
		async function loadUsers() {
			try {
				setIsLoading(true);
				setError(null);
				const data = await getAllUsers();
				setUsers(data || []);
			} catch (err) {
				console.error('Failed to load users:', err);
				setError(err.message || 'Failed to load users. Please refresh the page.');
			} finally {
				setIsLoading(false);
			}
		}
		loadUsers();
	}, []);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Users - UST CICS Learning Common Room';
		return () => { document.title = previousTitle; };
	}, []);

	function handleTabChange(tab) {
		setActiveTab(tab);
		setCurrentPage(1);
	}

	function handleSearchChange(e) {
		setSearch(e.target.value);
		setCurrentPage(1);
	}

	function handleSearchClear() {
		setSearch('');
		setCurrentPage(1);
	}

	function handleSort(column) {
		setCurrentPage(1);
		if (sortColumn === column) {
			setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortColumn(column);
		setSortDirection(column === 'registered' || column === 'no_shows' ? 'desc' : 'asc');
	}

	function sortIcon(column) {
		if (sortColumn !== column) {
			return <CaretDownIcon size={20} weight="duotone" style={{ opacity: 0.25 }} />;
		}

		return sortDirection === 'asc' ? (
			<CaretUpIcon size={20} weight="duotone" />
		) : (
			<CaretDownIcon size={20} weight="duotone" />
		);
	}

	const filteredUsers = useMemo(() => {
		let list = [...users];

		if (activeTab === 'suspended') {
			list = list.filter((u) => u.is_account_suspended);
		} else if (activeTab !== 'all') {
			list = list.filter((u) => u.role === activeTab);
		}

		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(u) =>
					u.full_name.toLowerCase().includes(q) ||
					u.email.toLowerCase().includes(q) ||
					(u.student_id && u.student_id.toLowerCase().includes(q))
			);
		}

		const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

		list.sort((a, b) => {
			if (sortColumn === 'full_name') {
				return String(a.full_name || '').localeCompare(String(b.full_name || '')) * directionMultiplier;
			}

			if (sortColumn === 'student_id') {
				return String(a.student_id || '').localeCompare(String(b.student_id || '')) * directionMultiplier;
			}

			if (sortColumn === 'email') {
				return String(a.email || '').localeCompare(String(b.email || '')) * directionMultiplier;
			}

			if (sortColumn === 'role') {
				return String(a.role || '').localeCompare(String(b.role || '')) * directionMultiplier;
			}

			if (sortColumn === 'status') {
				const aStatus = a.is_account_suspended ? 'suspended' : 'active';
				const bStatus = b.is_account_suspended ? 'suspended' : 'active';
				return aStatus.localeCompare(bStatus) * directionMultiplier;
			}

			if (sortColumn === 'no_shows') {
				return ((Number(a.no_show_count) || 0) - (Number(b.no_show_count) || 0)) * directionMultiplier;
			}

			if (sortColumn === 'registered') {
				const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
				const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
				return (aDate - bDate) * directionMultiplier;
			}

			return 0;
		});

		return list;
	}, [users, activeTab, search, sortColumn, sortDirection]);

	const totalItems = filteredUsers.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
	// Clamp currentPage so it never exceeds totalPages (e.g. after filtering reduces results)
	const safePage = Math.min(currentPage, totalPages);
	const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
	const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	function handleSave(updated) {
		const clean = {
			...updated,
			suspended_until:
				updated.suspended_until === '' ? null : updated.suspended_until,
		};

		setPendingEditUser(clean);
		setEditUser(null);
	}

	async function confirmEdit(target) {
		try {
			setIsProcessingAction(true);
			await updateUser(target.id, target);
			setUsers((prev) =>
				prev.map((u) => (u.id === target.id ? target : u))
			);
			setPendingEditUser(null);
			setFeedbackModal({
				title: 'Update Successful',
				message: `Changes for ${target.full_name} were saved successfully.`,
			});
		} catch (err) {
			console.error('Failed to save user:', err);
			alert('Failed to save changes. Please try again.');
		} finally {
			setIsProcessingAction(false);
		}
	}

	async function confirmDelete(target) {
		try {
			setIsProcessingAction(true);
			const updated = await updateUser(target.id, {
				suspended_until: target.suspended_until,
				is_account_suspended: target.is_account_suspended,
			});

			setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
			setDeleteModalUser(null);
			setFeedbackModal({
				title: 'Suspend Successful',
				message: `The account for ${updated.full_name} is suspended until ${formatDate(updated.suspended_until)}.`,
			});
		} catch (err) {
			console.error('Failed to suspend user:', err);
			alert('Failed to suspend user. Please try again.');
		} finally {
			setIsProcessingAction(false);
		}
	}

		async function handleUnsuspend(target) {
			try {
				setIsProcessingAction(true);
				const updated = await updateUser(target.id, {
					suspended_until: null,
					is_account_suspended: false,
				});

				setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
				setFeedbackModal({
					title: 'Unsuspend Successful',
					message: `The account for ${updated.full_name} has been unsuspended.`,
				});
			} catch (err) {
				console.error('Failed to unsuspend user:', err);
				alert('Failed to unsuspend user. Please try again.');
			} finally {
				setIsProcessingAction(false);
			}
		}

	async function handleAdd(newUser) {
		try {
			setUsers((prev) => [newUser, ...prev]);
			setIsAddOpen(false);
		} catch (err) {
			console.error('Failed to create user:', err);
			alert('Failed to create user. Please try again.');
		}
	}

	function openEdit(user) {
		setEditKey(user.id);
		setEditUser(user);
	}

	return (
		<section className="dashboard-page admin-users">
			<PageHeader
				className="page-header--sticky"
				title="Account Management"
				subtitle="View, add, edit, and remove user accounts."
			/>

			{isLoading && (
				<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
					Loading users...
				</div>
			)}

			{error && (
				<div style={{ 
					padding: '1rem', 
					margin: '1rem', 
					backgroundColor: '#fee', 
					border: '1px solid #fcc', 
					borderRadius: '4px',
					color: '#c00'
				}}>
					{error}
				</div>
			)}

			{!isLoading && !error && (
			<div className="reservations-table admin-users__table-shell">
				{/* Header: tabs + search */}
				<div className="reservations-table__header admin-users__table-header">
					<div className="reservations-table__tabs">
						{FILTER_TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
								onClick={() => handleTabChange(tab.id)}
							>
								{tab.label}
							</button>
						))}
					</div>

					<div className="reservations-table__controls">
						<div className="admin-users__search-wrap">
							<span className="admin-users__search-icon" aria-hidden="true">
								<MagnifyingGlass size={16} weight="bold" />
							</span>
							<input
								type="search"
								className="admin-users__search-input"
								placeholder="Search by name, email, or ID…"
								value={search}
								onChange={handleSearchChange}
								aria-label="Search users"
							/>
							{search && (
								<button
									type="button"
									className="admin-users__search-clear"
									aria-label="Clear search"
									onClick={handleSearchClear}
								>
									<X size={14} weight="bold" />
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="reservations-table__wrapper">
					<table className="reservations-table__table admin-users__table">
						<thead>
							<tr className="table-header-row">
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('full_name')}>
										Full Name
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('full_name')}</span>
									</button>
								</th>
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('student_id')}>
										Student ID
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('student_id')}</span>
									</button>
								</th>
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('email')}>
										Email
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('email')}</span>
									</button>
								</th>
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('role')}>
										Role
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('role')}</span>
									</button>
								</th>
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('status')}>
										Status
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('status')}</span>
									</button>
								</th>
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('no_shows')}>
										No-shows
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('no_shows')}</span>
									</button>
								</th>
								<th className="table-header-cell">
									<button type="button" className="header-sort-btn" onClick={() => handleSort('registered')}>
										Registered
										<span className="header-sort-icon" aria-hidden="true">{sortIcon('registered')}</span>
									</button>
								</th>
								<th className="table-header-cell" aria-label="Actions" />
							</tr>
						</thead>
						<tbody>
							{paginatedUsers.length > 0 ? (
								paginatedUsers.map((user) => (
									<tr key={user.id} className="table-body-row">
										<td className="table-cell">
											<span className="user-name">{user.full_name}</span>
										</td>
										<td className="table-cell">
											<span className="student-id">{user.student_id || '—'}</span>
										</td>
										<td className="table-cell">
											<span className="admin-users__email">{user.email}</span>
										</td>
										<td className="table-cell">
											<span className={`users-table__role-badge ${roleBadgeClass(user.role)}`}>
												{user.role}
											</span>
										</td>
										<td className="table-cell">
											{user.is_account_suspended ? (
												<span className="users-table__status-badge users-table__status-badge--suspended">
													Suspended
												</span>
											) : (
												<span className="users-table__status-badge users-table__status-badge--active">
													Active
												</span>
											)}
										</td>
										<td className="table-cell">
											<span
												className={`admin-users__noshow${user.no_show_count >= 3 ? ' admin-users__noshow--warn' : ''}`}
											>
												{user.no_show_count}
											</span>
										</td>
										<td className="table-cell">
											<span className="date">{formatDate(user.created_at)}</span>
										</td>
										<td className="table-cell admin-users__actions-cell">
											<RowActionButtons
												user={user}
												onView={setViewUser}
												onEdit={openEdit}
												onDelete={setDeleteModalUser}
												onUnsuspend={handleUnsuspend}
												roleCounts={roleCounts}
												isProcessing={isProcessingAction}
											/>
										</td>
									</tr>
								))
							) : (
								<tr className="table-body-row">
									<td className="table-cell admin-users__empty-state" colSpan={8}>
										No users found for the selected filter.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Footer */}
				<div className="reservations-table__footer">
					<div className="pagination-info">
						Displaying {paginatedUsers.length} of {totalItems}{' '}
						{totalItems === 1 ? 'user' : 'users'}
					</div>

					<div className="pagination-controls">
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
			</div>
			)}

			{/* Floating Add button */}
			<button
				type="button"
				className="admin-users__fab"
				aria-label="Add new account"
				onClick={() => setIsAddOpen(true)}
			>
				<Plus size={24} weight="bold" aria-hidden="true" />
			</button>

			{/* Modals */}
			<ViewModal user={viewUser} onClose={() => setViewUser(null)} />
			<EditModal key={editKey} user={editUser} onClose={() => setEditUser(null)} onSave={handleSave} />
			<ConfirmEditModal
				user={pendingEditUser}
				onClose={() => setPendingEditUser(null)}
				onConfirm={confirmEdit}
				isProcessing={isProcessingAction}
			/>
			<SuspendModal
				user={deleteModalUser}
				onClose={() => setDeleteModalUser(null)}
				onConfirm={confirmDelete}
				isProcessing={isProcessingAction}
			/>
			<AddModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAdd} />
			<FeedbackModal feedback={feedbackModal} onClose={() => setFeedbackModal(null)} />
		</section>
	);
}
