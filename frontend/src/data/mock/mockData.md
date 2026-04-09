# 📘 Mock Database Guide — Learning Commons Reservation System

This mock database simulates a **real backend system** for a single-room reservation system.

---

# 🧠 SYSTEM OVERVIEW

- Room capacity: **50 persons**
- Operating hours: **8:00 AM – 5:00 PM**
- Booking type: **Hourly slots**
- Max reservation: **3 hours**
- Grace period: **15 minutes**

---

# 🏫 ROOM

Defines system constraints:
- capacity
- operating hours

---

# 👤 USERS

Roles:
- `student`
- `admin`

Key features:
- Email-based login
- `rememberMe` for persistent login

---

# ⏱️ TIME SLOTS

- Fixed hourly slots
- Used as building blocks for reservations
- Multi-slot = multi-hour booking

---

# 📊 SLOT AVAILABILITY

Tracks:
- Number of reserved users per slot
- Enables:
  - capacity checking
  - real-time availability UI

Formula:
available = capacity - reservedCount


---

# 📖 RESERVATIONS

Core entity.

### Key Fields:
- `slotIds` → supports multi-hour booking
- `status`:
  - pending
  - confirmed
  - checked_in
  - completed
  - cancelled
  - expired

---

# ⏳ GRACE PERIOD LOGIC

- Users must check in within **15 minutes**
- At 10 minutes → send notification
- At 15 minutes → reservation becomes `expired`

---

# 🔔 NOTIFICATIONS

Types:
- `REMINDER_ENDING_SOON`
- `GRACE_WARNING`
- `RESERVATION_CONFIRMED`
- `SLOT_AVAILABLE`

---

# 🚶 OCCUPANCY

Tracks actual presence in the room.

Derived from:
- successful QR scan
- linked to reservation

---

# 🔳 QR CODE SYSTEM

- Generated upon reservation
- Used for check-in
- Enables:
  - validation
  - occupancy tracking

---

# 🔁 EXTENSION LOGIC

Allowed only if:
- user is within last **15 minutes**
- next time slot has available capacity

Extension:
- +1 hour only

---

# ⏳ AVAILABILITY ALERTS (WAITLIST)

Used when room is full.

User sets:
- time window (e.g., 15 mins)

System:
- notifies user if slot becomes available within window

---

# 👥 GROUP INVITES

Instead of bulk booking:
- user invites others
- each user confirms individually

Prevents:
- abuse of mass reservations

---

# 🔐 AUTHENTICATION DESIGN

Recommended:
- Email-based login (school email)
- OTP verification (optional simulation)

------------------------------------------------------------------------------

# ROOMS TABLE
| Column     | Type   | Notes                |
| ---------- | ------ | -------------------- |
| id         | string | Primary Key          |
| name       | string | Room name            |
| capacity   | number | Maximum occupancy    |
| open_time  | time   | Opening time (HH:mm) |
| close_time | time   | Closing time (HH:mm) |

# USERS TABLE
| Column         | Type     | Notes                               |
| -------------- | -------- | ----------------------------------- |
| id             | string   | Primary Key                         |
| name           | string   | Full name                           |
| email          | string   | Unique email                        |
| student_id     | string   | Student number (nullable for admin) |
| role           | enum     | student / admin                     |
| email_verified | boolean  | Email verification status           |
| created_at     | datetime | Account creation timestamp          |

# TIME SLOTS TABLE
| Column | Type   | Notes              |
| ------ | ------ | ------------------ |
| id     | string | Primary Key        |
| start  | time   | Start time (HH:mm) |
| end    | time   | End time (HH:mm)   |

# SLOT AVAILABILITY TABLE
| Column         | Type   | Notes                    |
| -------------- | ------ | ------------------------ |
| id             | string | Primary Key              |
| date           | date   | Specific date            |
| slot_id        | string | References TIME_SLOTS.id |
| room_id        | string | References ROOMS.id      |
| reserved_count | number | Number of reserved slots |
| capacity       | number | Room capacity            |

# RESERVATIONS TABLE
| Column        | Type     | Notes                                                              |
| ------------- | -------- | ------------------------------------------------------------------ |
| id            | string   | Primary Key                                                        |
| user_id       | string   | References USERS.id                                                |
| room_id       | string   | References ROOMS.id                                                |
| date          | date     | Reservation date                                                   |
| slot_ids      | array    | List of TIME_SLOTS.id (supports multi-hour bookings)               |
| status        | enum     | pending / confirmed / checked_in / cancelled / expired / completed |
| qr_code       | string   | QR code identifier                                                 |
| check_in_time | datetime | Nullable                                                           |
| expiry_time   | datetime | Expiration timestamp                                               |
| created_at    | datetime | When reservation was created                                       |

# OCCUPANCY TABLE
| Column         | Type     | Notes                      |
| -------------- | -------- | -------------------------- |
| id             | string   | Primary Key                |
| reservation_id | string   | References RESERVATIONS.id |
| user_id        | string   | References USERS.id        |
| check_in_time  | datetime | When user checked in       |
| check_out_time | datetime | Nullable (if still inside) |

# NOTIFICATIONS TABLE
| Column     | Type     | Notes                              |
| ---------- | -------- | ---------------------------------- |
| id         | string   | Primary Key                        |
| user_id    | string   | References USERS.id                |
| type       | string   | Notification type (e.g., reminder) |
| message    | string   | Notification content               |
| read       | boolean  | Read status                        |
| created_at | datetime | When notification was created      |

# AVAILABILITY ALERTS TABLE
| Column              | Type     | Notes                           |
| ------------------- | -------- | ------------------------------- |
| id                  | string   | Primary Key                     |
| user_id             | string   | References USERS.id             |
| date                | date     | Target date                     |
| time_window_minutes | number   | Alert window (e.g., 15 minutes) |
| created_at          | datetime | When alert was created          |
| status              | enum     | active / triggered / cancelled  |

# GROUP INVITES TABLE
| Column           | Type   | Notes                         |
| ---------------- | ------ | ----------------------------- |
| id               | string | Primary Key                   |
| created_by       | string | References USERS.id           |
| invited_user_ids | array  | List of invited USERS.id      |
| reservation_id   | string | References RESERVATIONS.id    |
| status           | enum   | pending / accepted / declined |

