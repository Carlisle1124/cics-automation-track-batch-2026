import { handleRequest } from './baseService';
import { NOTIFICATIONS } from '../mock/mockData';

export function getNotificationsByUser(userId) {
	return handleRequest(
		() => NOTIFICATIONS.filter((notification) => notification.userId === userId),
		`/api/notifications?userId=${encodeURIComponent(userId)}`
	);
}
