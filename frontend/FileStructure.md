src/
│
├── app/                        # App-level config (routing, layout)
│   ├── routes.js
│   ├── App.jsx
│   └── providers.jsx
│
├── features/                   # 🔥 FEATURE-BASED (BEST PRACTICE)
│   │
│   ├── auth/
│   │   ├── components/  # specific to one feature, and so on
│   │   ├── services/
│   │   └── hooks/
│   │
│   ├── reservations/
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── availability/
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── notifications/
│   │   ├── components/
│   │   └── services/
│   │
│   ├── admin/
│   │   ├── components/
│   │   └── services/
│
├── shared/                     # Reusable across features
│   ├── components/             # Buttons, cards, modals
│   ├── hooks/                  # useAuth, useFetch
│   ├── utils/                  # helpers (date, time, etc.)
│   ├── constants/              # enums, config
│   └── styles/
│
├── data/                       # 🔁 SWAPPABLE DATA LAYER
│   ├── mock/
│   │   ├── mockData.js
│   │   └── mockData.md
│   │
│   └── services/               # 🔥 ABSTRACTION LAYER | GLOBAL LAYER
│       ├── reservationService.js
│       ├── authService.js
│       ├── availabilityService.js
│       └── notificationService.js
│
├── layouts/                    # Role-based layouts
│   ├── StudentLayout.jsx
│   └── AdminLayout.jsx
│
├── pages/                      # Route-level pages
│   ├── student/
│   │   ├── Overview.jsx
│   │   ├── Reservations.jsx
│   │   ├── Schedule.jsx
│   │   └── Profile.jsx
│   │
│   ├── admin/
│   │   ├── Overview.jsx
│   │   ├── ManageReservations.jsx
│   │   ├── Analytics.jsx
│   │   └── Users.jsx
│   │
│   └── auth/
│       ├── Login.jsx
│       └── Register.jsx
│
└── main.jsx

🧠 The One Rule You Need

data/services = “GET/SET data”
features/*/services = “DECIDE what to do with that data”

🔍 Think of it Like This

You’re building a system with 2 layers:

🗄️ 1. Data Layer (data/services/)

👉 “Database access” (even if mock)

fetch
create
update
delete
🧠 2. Feature Layer (features/.../services/)

👉 “Business logic”

rules
conditions
validations
decisions


🔥 MOST IMPORTANT PART (Don’t Skip This)
🧩 data/services/ Layer (Your Secret Weapon)

This is what makes your system scalable + clean.

Instead of doing:

import { RESERVATIONS } from '../mockData'

You do:

import { getReservations } from '@/data/services/reservationService'
✨ Example: reservationService.js
import { RESERVATIONS } from '../mock/mockData';

export function getReservationsByUser(userId) {
  return RESERVATIONS.filter(r => r.userId === userId);
}

export function createReservation(newReservation) {
  // simulate DB insert
  RESERVATIONS.push(newReservation);
  return newReservation;
}
🚀 Later (Real Backend)

You just change this:

// BEFORE (mock)
return RESERVATIONS.filter(...)

➡️ to:

// AFTER (API)
return fetch('/api/reservations').then(res => res.json());

👉 Your UI stays untouched. This is huge.