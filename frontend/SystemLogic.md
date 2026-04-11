# System Logic

## Layered Architecture:

UI (Pages & Components)
   ↓
Feature Layer (Business Logic)
   ↓
Data Services (CRUD / Data Access)
   ↓
Mock Data OR API (depending on environment)

---------------------------------------------------------------

🔄 FULL FLOW (STEP-BY-STEP)
1️⃣ USER INTERACTION (UI Layer)
User clicks a button (e.g., “Reserve Slot”)
Happens inside:
pages/
or shared UI components

👉 Example:

<button onClick={handleReserve}>Reserve</button>
2️⃣ FEATURE LAYER (BUSINESS LOGIC)

UI calls a feature service, not data directly.

import { reserveSlot } from '@/features/reservations/services/reservationLogic';
What happens here:
Validations
Business rules
Decision-making

👉 Example logic:

Is the slot available?
Is the user allowed?
Is the time valid?
3️⃣ DATA SERVICE LAYER

Feature services call data services:

import { createReservation } from '@/data/services/reservationService';
What happens here:
Fetch data
Store data
Update data

👉 No business logic here
👉 Only CRUD operations

4️⃣ ENVIRONMENT SWITCH (MOCK vs API)

Inside data services:

if (USE_MOCK) {
  return MOCK_DATA;
} else {
  return fetch('/api/endpoint');
}
Behavior:
Mode	Behavior
USE_MOCK = true	Uses local mock data
USE_MOCK = false	Calls real backend API
5️⃣ RESPONSE RETURNS UPWARD
API / Mock
   ↑
Data Service
   ↑
Feature Logic
   ↑
UI updates
UI re-renders
State updates
User sees result

---------------------------------------------------------------

## ⏱️ Time & Booking Rules
Operating: 8:00 AM – 5:00 PM
Slot granularity:
Hourly basis
Allow multi-hour booking (1–3 hours max)
Max stay: 3 hours

## ⏳ Grace Period Logic
15-minute grace period
At +10 min → notify user
At +15 min → auto-cancel

## 🔁 Extension Logic (Smart)
Only allowed:
within last 15 minutes of reservation
AND next slot has available capacity
Extension = +1 hour only (controlled) unless reservation is already 3 hours (max na kase)

## 👥 Group Booking (Important Decision)

Recommendation:
❌ Don’t allow 1 user to book for many (causes abuse)
✅ Instead:
    allow “invite system”
    each student confirms individually
    reservation is tied per user (cleaner DB + fairness)

## 🔔 Notification System

You need structured notification types:
- REMINDER_ENDING_SOON
- GRACE_WARNING
- SLOT_AVAILABLE
- RESERVATION_CONFIRMED

## 🔐 Authentication

Login with school email (SSO-style simulation) and OTP-based

## Staff Account Role
auto-accept function