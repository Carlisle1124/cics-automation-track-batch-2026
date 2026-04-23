# Auth Pages — Developer Guidelines

## UI Changes Only

`Login.jsx`, `VerifyEmail.jsx`, and `Register.jsx` are **UI-only files**.
All business logic lives in:
- `src/data/services/authService.js` — login, logout, register, email verification
- `src/shared/utils/routeUtils.js` — role-based routing decisions

---

## Do NOT

- Import or call `supabase` directly inside these files
- Redefine `getRoleRoute` locally — it already exists in `routeUtils.js`
- Add or change `try/catch` blocks around service calls — error handling belongs in the service
- Change the arguments passed to `login()`, `registerUser()`, or `verifyEmailFromUrl()`
- Remove or rename the imports from `authService` or `routeUtils` at the top of each file

---

## You Are Free To

- Change any JSX, layout, class names, or styling
- Add or remove UI elements (buttons, labels, icons, animations)
- Update text, copy, and messages displayed to the user
- Add `useState` for purely visual state (e.g. show/hide password toggle, loading spinners)

---

## Rule of Thumb

If it touches data, Supabase, or routing decisions — it's logic and belongs in the service files, not here.
