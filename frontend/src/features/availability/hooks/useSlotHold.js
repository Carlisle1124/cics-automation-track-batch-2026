import { useEffect, useRef, useState } from 'react';
import {
	holdSlot,
	confirmSlot,
	releaseSlot,
	releaseSlotBeacon,
} from '../../../data/services/reservationService';
import { validateReservation } from '../../../data/services/reservationLogic';

/**
 * Custom hook for managing slot holding workflow
 * Encapsulates the hold → confirm → release lifecycle with countdown
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.userId - User ID for whom slot is being held
 * @param {Date} config.selectedDate - Selected reservation date
 * @param {number} config.holdDuration - Duration in hours
 * @param {string} config.selectedDateValue - Formatted date string (YYYY-MM-DD)
 * @param {Function} config.onSlotSelect - Optional callback when slot is selected
 * @param {boolean} config.skipValidation - If true, skip validateReservation check (staff use)
 * 
 * @returns {Object} State and handlers for slot holding
 */
export function useSlotHold({
	userId,
	selectedDate,
	holdDuration,
	selectedDateValue,
	onSlotSelect = null,
	skipValidation = false,
}) {
	const [activeHold, setActiveHold] = useState(null);
	const [holdCountdown, setHoldCountdown] = useState(null);
	const [holdLoading, setHoldLoading] = useState(false);
	const [holdError, setHoldError] = useState('');

	const activeHoldRef = useRef(null);
	const accessTokenRef = useRef(null);

	// Keep refs in sync
	useEffect(() => {
		activeHoldRef.current = activeHold;
	}, [activeHold]);

	// Load and cache access token on mount
	useEffect(() => {
		async function loadAccessToken() {
			try {
				const { data: { session } } = await (
					// Dynamic import of supabase to avoid circular dependencies
					import('../../../data/supabaseClient').then(m => m.supabase.auth.getSession())
				);
				accessTokenRef.current = session?.access_token ?? null;
			} catch (err) {
				console.warn('Failed to load access token:', err);
			}
		}
		loadAccessToken().catch(() => {});
	}, []);

	// Release hold on unmount
	useEffect(() => {
		return () => {
			const hold = activeHoldRef.current;
			if (hold?.id && userId) {
				releaseSlot(hold.id, userId).catch(() => {});
			}
		};
	}, [userId]);

	// Release hold on page exit (beforeunload)
	useEffect(() => {
		function handleBeforeUnload() {
			const hold = activeHoldRef.current;
			const token = accessTokenRef.current;
			if (hold?.id && userId && token) {
				releaseSlotBeacon(hold.id, userId, token);
			}
		}
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [userId]);

	// Countdown timer - decrements every second
	useEffect(() => {
		if (holdCountdown === null) return;
		if (holdCountdown <= 0) {
			const hold = activeHoldRef.current;
			if (hold?.id && userId) {
				releaseSlot(hold.id, userId).catch(() => {});
			}
			setActiveHold(null);
			setHoldCountdown(null);
			setHoldError('Your hold expired. Please select a new slot.');
			return;
		}
		const timer = setTimeout(() => setHoldCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [holdCountdown, userId]);

	/**
	 * Attempt to hold a slot
	 */
	const handleSlotClick = async (slot) => {
		if (!slot || holdLoading || !userId) return;

		// Clicking the same held slot does nothing
		if (activeHold && activeHold.slotId === slot.id) return;

		setHoldError('');

		// Release existing hold when selecting a different slot
		if (activeHold) {
			await releaseSlot(activeHold.id, userId).catch(() => {});
			setActiveHold(null);
			setHoldCountdown(null);
		}

		if (slot.available <= 0) {
			setHoldError('This slot is no longer available.');
			return;
		}

		setHoldLoading(true);

		try {
			// Validation check (can be skipped for staff)
			if (!skipValidation) {
				await validateReservation({
					userId,
					reservationDate: selectedDateValue,
					durationHours: holdDuration,
				});
			}

			// Hold the slot
			const held = await holdSlot({
				userId,
				reservationDate: selectedDateValue,
				startTime: slot.start,
				durationHours: holdDuration,
			});

			setActiveHold({ id: held.id, slotId: slot.id });
			
			// Calculate countdown in seconds
			const secs = held?.expires_at
				? Math.max(0, Math.round((new Date(held.expires_at) - Date.now()) / 1000))
				: 300;
			setHoldCountdown(secs);

			if (onSlotSelect) {
				onSlotSelect(slot.id);
			}
		} catch (err) {
			setHoldError(err.message || 'Could not hold this slot. Please try again.');
		} finally {
			setHoldLoading(false);
		}
	};

	/**
	 * Confirm the held slot and create reservation
	 */
	const handleConfirmReservation = async (e) => {
		if (!activeHold || holdLoading || !userId) return;
		setHoldLoading(true);
		setHoldError('');
		try {
			await confirmSlot(activeHold.id, userId);

            //reset hold state after confirmation
			setActiveHold(null);
			setHoldCountdown(null);
			return { success: true };
		} catch (err) {
			setHoldError(err.message || 'Could not confirm reservation. Please try again.');
			return { success: false, error: err.message };
		} finally {
			setHoldLoading(false);
		}
	};

	/**
	 * Cancel the current hold
	 */
	const handleCancelHold = async () => {
		if (activeHold?.id && userId) {
			await releaseSlot(activeHold.id, userId).catch(() => {});
		}
		setActiveHold(null);
		setHoldCountdown(null);
		setHoldError('');
	};

	/**
	 * Release hold (for external cleanup when userId or other conditions change)
	 */
	const releaseHoldManually = async () => {
		if (activeHold?.id && userId) {
			await releaseSlot(activeHold.id, userId).catch(() => {});
		}
		setActiveHold(null);
		setHoldCountdown(null);
		setHoldError('');
	};

	return {
		// State
		activeHold,
		holdCountdown,
		holdLoading,
		holdError,

		// Handlers
		handleSlotClick,
		handleConfirmReservation,
		handleCancelHold,
		releaseHoldManually,

		// Setters for external control
		setHoldError,
		setActiveHold,
		setHoldCountdown,
	};
}
