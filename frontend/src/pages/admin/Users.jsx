import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Eye,
	PencilSimple,
	Trash,
	Plus,
	MagnifyingGlass,
	X,
	UserCircle,
} from '@phosphor-icons/react';
import PageHeader from '../../shared/components/PageHeader';
import Modal from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../data/services/userService';
import './Users.css';

/* ─── Mock data ─────────────────────────────────────────── */
const MOCK_USERS = [
	{
		id: 'a1b2c3d4-0001-0000-0000-000000000001',
		email: 'juan.delacruz@ust.edu.ph',
		full_name: 'Juan Dela Cruz',
		role: 'student',
		no_show_count: 2,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-08-01T08:00:00Z',
		student_id: '2021-00001',
	},
	{
		id: 'a1b2c3d4-0002-0000-0000-000000000002',
		email: 'maria.santos@ust.edu.ph',
		full_name: 'Maria Santos',
		role: 'student',
		no_show_count: 0,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-08-03T09:15:00Z',
		student_id: '2021-00002',
	},
	{
		id: 'a1b2c3d4-0003-0000-0000-000000000003',
		email: 'pedro.reyes@ust.edu.ph',
		full_name: 'Pedro Reyes',
		role: 'student',
		no_show_count: 5,
		suspended_until: '2026-05-15T00:00:00Z',
		is_account_suspended: true,
		created_at: '2025-08-05T10:30:00Z',
		student_id: '2021-00003',
	},
	{
		id: 'a1b2c3d4-0004-0000-0000-000000000004',
		email: 'ana.garcia@ust.edu.ph',
		full_name: 'Ana Garcia',
		role: 'admin',
		no_show_count: 0,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-07-20T07:00:00Z',
		student_id: null,
	},
	{
		id: 'a1b2c3d4-0005-0000-0000-000000000005',
		email: 'carlos.mendoza@ust.edu.ph',
		full_name: 'Carlos Mendoza',
		role: 'student',
		no_show_count: 1,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-08-10T11:00:00Z',
		student_id: '2022-00005',
	},
	{
		id: 'a1b2c3d4-0006-0000-0000-000000000006',
		email: 'liza.ramos@ust.edu.ph',
		full_name: 'Liza Ramos',
		role: 'student',
		no_show_count: 3,
		suspended_until: '2026-06-01T00:00:00Z',
		is_account_suspended: true,
		created_at: '2025-08-12T13:45:00Z',
		student_id: '2022-00006',
	},
	{
		id: 'a1b2c3d4-0007-0000-0000-000000000007',
		email: 'jose.torres@ust.edu.ph',
		full_name: 'Jose Torres',
		role: 'staff',
		no_show_count: 0,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-07-25T08:30:00Z',
		student_id: null,
	},
	{
		id: 'a1b2c3d4-0008-0000-0000-000000000008',
		email: 'rosa.bautista@ust.edu.ph',
		full_name: 'Rosa Bautista',
		role: 'student',
		no_show_count: 0,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-08-15T14:00:00Z',
		student_id: '2023-00008',
	},
	{
		id: 'a1b2c3d4-0009-0000-0000-000000000009',
		email: 'miguel.flores@ust.edu.ph',
		full_name: 'Miguel Flores',
		role: 'student',
		no_show_count: 4,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-08-18T09:00:00Z',
		student_id: '2023-00009',
	},
	{
		id: 'a1b2c3d4-0010-0000-0000-000000000010',
		email: 'claire.villanueva@ust.edu.ph',
		full_name: 'Claire Villanueva',
		role: 'admin',
		no_show_count: 0,
		suspended_until: null,
		is_account_suspended: false,
		created_at: '2025-07-18T07:30:00Z',
		student_id: null,
	},
];

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

	function handleClose() {
		setForm(EMPTY_FORM);
		onClose();
	}

	function handleChange(e) {
		const { name, value, type, checked } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	}

	function handleSubmit(e) {
		e.preventDefault();
		onAdd({
			...form,
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			no_show_count: Number(form.no_show_count),
			suspended_until: form.suspended_until ? `${form.suspended_until}T00:00:00Z` : null,
		});
		setForm(EMPTY_FORM);
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

				<div className="users-modal__actions">
					<Button type="button" variant="secondary" onClick={handleClose}>
						Cancel
					</Button>
					<Button type="submit" variant="primary">
						Add Account
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function RowActionButtons({ user, onView, onEdit, onDelete }) {
	return (
		<div className="admin-users__action-buttons">
			<button type="button" className="admin-users__action-btn" onClick={() => onView(user)}>
				<Eye size={15} weight="duotone" aria-hidden="true" />
				View
			</button>
			<button type="button" className="admin-users__action-btn" onClick={() => onEdit(user)}>
				<PencilSimple size={15} weight="duotone" aria-hidden="true" />
				Edit
			</button>
			<button
				type="button"
				className="admin-users__action-btn admin-users__action-btn--danger"
				onClick={() => onDelete(user)}
			>
				<Trash size={15} weight="duotone" aria-hidden="true" />
				Delete
			</button>
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
	const [currentPage, setCurrentPage] = useState(1);

	const [viewUser, setViewUser] = useState(null);
	const [editUser, setEditUser] = useState(null);
	// editKey is stable while closing (so animation plays) but changes
	// when a new user is opened for editing (remounting EditModal with fresh form).
	const [editKey, setEditKey] = useState('edit');
	const [deleteModalUser, setDeleteModalUser] = useState(null);
	const [isAddOpen, setIsAddOpen] = useState(false);

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

	async function handleSave(updated) {
		try {
			await updateUser(updated.id, updated);
			setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
			setEditUser(null);
		} catch (err) {
			console.error('Failed to save user:', err);
			alert('Failed to save changes. Please try again.');
		}
	}

	async function handleDelete(target) {
		try {
			await deleteUser(target.id);
			setUsers((prev) => prev.filter((u) => u.id !== target.id));
			setDeleteModalUser(null);
		} catch (err) {
			console.error('Failed to delete user:', err);
			alert('Failed to delete user. Please try again.');
		}
	}

	async function handleAdd(newUser) {
		try {
			const createdUser = await createUser(newUser);
			setUsers((prev) => [createdUser, ...prev]);
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
				className="admin-users__header"
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
											<RowActionButtons
												user={user}
												onView={setViewUser}
												onEdit={openEdit}
												onDelete={setDeleteModalUser}
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
			<DeleteModal user={deleteModalUser} onClose={() => setDeleteModalUser(null)} onConfirm={handleDelete} />
			<AddModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAdd} />
		</section>
	);
}
