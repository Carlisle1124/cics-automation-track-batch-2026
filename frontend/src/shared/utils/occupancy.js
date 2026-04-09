export function getActiveOccupancyRecords(occupancyRecords = []) {
	return occupancyRecords.filter((record) => !record.checkOutTime);
}

export function getActiveOccupancyCount(occupancyRecords = []) {
	return getActiveOccupancyRecords(occupancyRecords).length;
}

export function summarizeOccupancy(occupancyRecords = [], capacity = 0) {
	const activeCount = getActiveOccupancyCount(occupancyRecords);
	const availableCount = Math.max(capacity - activeCount, 0);
	const occupiedPercent = capacity > 0 ? Math.round((activeCount / capacity) * 100) : 0;

	return {
		activeCount,
		capacity,
		availableCount,
		occupiedPercent,
		status: activeCount === 0 ? 'available' : activeCount >= capacity ? 'full' : 'partial',
	};
}

export function formatOccupancyLabel(activeCount, capacity) {
	return `${activeCount}/${capacity}`;
}
