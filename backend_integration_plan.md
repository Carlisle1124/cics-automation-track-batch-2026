# Backend Integration Plan: CICS Learning Commons

This document outlines the exact technical requirements and steps needed to connect the current React (Vite) frontend to the newly created Supabase PostgreSQL database and Auth system. It is designed to be handed off for AI execution.

## 1. Supabase Client Setup (Frontend)
- **Goal:** Initialize the Supabase client inside the Vite React application.
- **Tasks:**
  1. Install `@supabase/supabase-js` via npm.
  2. Create a `.env.local` file in the `frontend` root. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  3. Create `frontend/src/data/supabaseClient.js` that exports the initialized client.

## 2. Authentication Flow Update
- **Goal:** Refactor `frontend/src/pages/auth/Login.jsx` and `authService.js` to use live Supabase authentication instead of local mock delays.
- **Tasks:**
  1. Refactor the `handleQuickLogin` functionality. The 3 mock buttons should now autofill the login form and authenticate against Supabase using standard email/password login (`supabase.auth.signInWithPassword`). 
  2. **Test Accounts Provisioned in Supabase:**
     - Student: `juan.delacruz.cics@ust.edu.ph` | Password: `password123`
     - Admin: `admin.cics@ust.edu.ph` | Password: `password123`
     - Staff: `staff.cics@ust.edu.ph` | Password: `password123`
  3. Ensure that after a successful login, the app fetches the user's role from the `public.users` table so the routing logic (`getRoleRoute()`) works properly.

## 3. Node.js Backend Requirements (Edge Functions / Express)
- **Goal:** Implement the logic that cannot be safely run on the client.
- **Tasks:**
  1. **OTP Email Verification:** Ensure that new registrations strictly trigger Supabase's built-in OTP email flow (`supabase.auth.signInWithOtp` or `signUp`).
  2. **Auto-Cancellation Cron Job:** Write a Node.js script (either as a Supabase Edge Function or a Vercel Serverless Function) that runs continually to enforce the 15-minute grace period. 
     - **Logic:** Query all `reservations` where `status = 'approved'` AND `actual_check_in IS NULL` AND `start_time` is > 15 minutes past the current time.
     - **Action:** Update those reservation statuses to `no_show` and increment the `no_show_count` on the respective user in the `public.users` table.

## 4. Reservations CRUD (Direct Frontend -> Supabase)
- **Goal:** Refactor frontend data services to fetch/mutate data directly from the Supabase database.
- **Tasks:**
  1. **Fetch Capacity:** When checking for slot availability, query the `reservations` table and count overlapping active bookings. Compare this count to the `default_occupancy_limit` (from the `settings` table) or the `override_occupancy_limit` (from `calendar_overrides`).
  2. **Create Booking:** Insert a new row into `reservations` with status `pending`. Let the staff dashboard query pending rows and execute an update to switch them to `approved`.
  3. **Guest Handling:** Update the staff dashboard to allow inserting rows into `reservations` where `user_id` is null, but `guest_name` and `guest_email` are populated.
