import { useEffect, useState } from 'react';
import { getUsers } from '../../data/services/authService';
import PageHeader from '../../shared/components/PageHeader';

export default function Users() {
	const [users, setUsers] = useState([]);

	useEffect(() => {
		let active = true;

		async function loadUsers() {
			const items = await getUsers();

			if (!active) return;

			setUsers(items);
		}

		loadUsers();

		return () => {
			active = false;
		};
	}, []);

	return (
		<section style={{ padding: '2rem' }}>
			<PageHeader
				title="Users"
				subtitle="View registered students and administrators."
			/>
			<ul>
				{users.map((user) => (
					<li key={user.id}>
						{user.name} - {user.role}
					</li>
				))}
			</ul>
		</section>
	);
}
