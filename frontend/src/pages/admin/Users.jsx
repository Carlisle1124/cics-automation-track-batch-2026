import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Eye,
	PencilSimple,
	Trash,
	Plus,
	DotsThreeVertical,
	MagnifyingGlass,
	X,
	UserCircle,
	WarningCircle,
} from '@phosphor-icons/react';
import PageHeader from '../../shared/components/PageHeader';
import Modal from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import {
	getUsers,
	updateUser,
	deleteUser as deleteUserService,
	createUser,
} from '../../data/services/authService';
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

function DeleteModal({ user, onClose, onConfirm }) {
	if (!user) return null;

	return (
		<Modal isOpen={Boolean(user)} title="Delete Account" onClose={onClose} className="ui-modal--flexible">
			<div className="users-modal__delete">
				<p className="users-modal__delete-message">
					Are you sure you want to delete the account of{' '}
					<strong>{user.full_name}</strong>? This action cannot be undone.
				</p>
				<div className="users-modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						className="users-modal__delete-confirm-btn"
						onClick={() => onConfirm(user)}
					>
						Delete Account
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
			const newUser = await createUser(
				form.email,
				form.password,
				form.full_name,
				form.role,
				form.student_id || null
			);
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

/* ─── Row action menu ────────────────────────────────────── */
function RowActionMenu({ user, onView, onEdit, onDelete }) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		if (!open) return;

		function handlePointerDown(e) {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setOpen(false);
			}
		}

		function handleEscape(e) {
			if (e.key === 'Escape') setOpen(false);
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [open]);

	return (
		<div className="action-menu-container" ref={menuRef}>
			<button
				type="button"
				className="action-menu-btn"
				aria-label={`Actions for ${user.full_name}`}
				aria-haspopup="true"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
			>
				<DotsThreeVertical size={20} weight="bold" />
			</button>

			{open && (
				<div className="action-dropdown" role="menu">
					<button
						type="button"
						className="action-dropdown__item"
						role="menuitem"
						onClick={() => { setOpen(false); onView(user); }}
					>
						<Eye size={15} weight="duotone" aria-hidden="true" />
						View
					</button>
					<button
						type="button"
						className="action-dropdown__item"
						role="menuitem"
						onClick={() => { setOpen(false); onEdit(user); }}
					>
						<PencilSimple size={15} weight="duotone" aria-hidden="true" />
						Edit
					</button>
					<button
						type="button"
						className="action-dropdown__item action-dropdown__item--danger"
						role="menuitem"
						onClick={() => { setOpen(false); onDelete(user); }}
					>
						<Trash size={15} weight="duotone" aria-hidden="true" />
						Delete
					</button>
				</div>
			)}
		</div>
	);
}

/* ─── Main page ──────────────────────────────────────────── */
export default function Users() {
	const [users, setUsers] = useState(MOCK_USERS);
	const [activeTab, setActiveTab] = useState('all');
	const [search, setSearch] = useState('');
	const [currentPage, setCurrentPage] = useState(1);

	const [viewUser, setViewUser] = useState(null);
	const [editUser, setEditUser] = useState(null);
	// editKey is stable while closing (so animation plays) but changes
	// when a new user is opened for editing (remounting EditModal with fresh form).
	const [editKey, setEditKey] = useState('edit');
	const [deleteUser, setDeleteUser] = useState(null);
	const [isAddOpen, setIsAddOpen] = useState(false);

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

		return list;
	}, [users, activeTab, search]);

	const totalItems = filteredUsers.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
	// Clamp currentPage so it never exceeds totalPages (e.g. after filtering reduces results)
	const safePage = Math.min(currentPage, totalPages);
	const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
	const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	function handleSave(updated) {
		setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
		setEditUser(null);
	}

	function handleDelete(target) {
		setUsers((prev) => prev.filter((u) => u.id !== target.id));
		setDeleteUser(null);
	}

	function handleAdd(newUser) {
		setUsers((prev) => [newUser, ...prev]);
		setIsAddOpen(false);
	}

	function openEdit(user) {
		setEditKey(user.id);
		setEditUser(user);
	}

	return (
		<section className="dashboard-page admin-users">
			<PageHeader
				className="admin-users__header"
				title="Account Management"
				subtitle="View, add, edit, and remove user accounts."
			/>

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

				{/* Table */}
				<div className="reservations-table__wrapper">
					<table className="reservations-table__table admin-users__table">
						<thead>
							<tr className="table-header-row">
								<th className="table-header-cell">Full Name</th>
								<th className="table-header-cell">Student ID</th>
								<th className="table-header-cell">Email</th>
								<th className="table-header-cell">Role</th>
								<th className="table-header-cell">Status</th>
								<th className="table-header-cell">No-shows</th>
								<th className="table-header-cell">Registered</th>
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
											<RowActionMenu
												user={user}
												onView={setViewUser}
												onEdit={openEdit}
												onDelete={setDeleteUser}
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
			<DeleteModal user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />
			<AddModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAdd} />
		</section>
	);
}
