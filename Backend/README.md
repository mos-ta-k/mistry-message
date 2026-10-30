# Mistry Message Backend

## Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Application startup and database](#application-startup-and-database)
- [Database models](#database-models)
- [Services](#services)
- [Controllers](#controllers)
- [HTTP API](#http-api)
- [Middleware and errors](#middleware-and-errors)
- [Current implementation caveats](#current-implementation-caveats)

## Quick start

The backend is an ES module Node.js application. Its package currently defines
the `dev` script, but no `start`, `build`, or test script.

```powershell
cd Backend
npm install
npm run dev
```

The application initializes database tables before serving requests, so a
reachable PostgreSQL database and valid environment configuration are required
at startup. The current server listens on port `5000`.

## Configuration

Create a local `.env` file in the backend directory. Never commit real
credentials. For example:

```dotenv
USER=app_user
HOST=127.0.0.1
DATABASE=mistry_message
PASSWORD=replace-with-a-secret
DB_PORT=5432
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MAIL_USER=sender@example.com
MAIL_PASS=replace-with-smtp-password
MAIL_HOST=smtp.example.com
MAIL_PORT=587
```

### Environment variables

| Variable                                                        | Required/use                                                                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `USER`                                                          | PostgreSQL user, read by `src/configs/database.js`.                                                                                           |
| `HOST`                                                          | PostgreSQL hostname.                                                                                                                          |
| `DATABASE`                                                      | PostgreSQL database name.                                                                                                                     |
| `PASSWORD`                                                      | PostgreSQL password.                                                                                                                          |
| `DB_PORT`                                                       | PostgreSQL port.                                                                                                                              |
| `JWT_SECRET`                                                    | Secret used to sign and verify access JWTs. Keep it private and sufficiently random.                                                          |
| `NODE_ENV`                                                      | Cookie security behavior; set to `production` in production.                                                                                  |
| `CLIENT_URL`                                                    | Added to the CORS allowlist, although current CORS code accepts all origins.                                                                  |
| `MAIL_USER` or `GMAIL_USER`                                     | Sender email account.                                                                                                                         |
| `MAIL_PASS`                                                     | SMTP password when Gmail OAuth2 is not configured.                                                                                            |
| `MAIL_HOST`                                                     | Optional SMTP host; defaults to `smtp.gmail.com`.                                                                                             |
| `MAIL_PORT`                                                     | Optional SMTP port; defaults to `587`; port `465` enables secure SMTP.                                                                        |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Optional Gmail OAuth2 credentials; all three are needed together.                                                                             |
| `PORT`                                                          | Read into a constant by `server.js`, but currently ignored by `app.listen`, which uses port `5000`.                                           |
| `JWT_REFRESH_SECRET`                                            | May exist in deployment configuration, but the current refresh-token implementation uses opaque random tokens and does not use this variable. |

`database.js` creates a shared `pg.Pool` using the five database variables. It
does not currently specify SSL, pool sizing, or explicit connection timeouts;
configure database transport and operations according to the hosting provider.

## Application startup and database

`src/app.js` loads Express middleware and awaits database initialization before
exporting the application. Initialization runs in this order:

1. Create/verify the `users` table.
2. Create/verify the `messages` table.
3. Create/verify the `refresh_tokens` table.
4. Create/verify `system_settings` and insert its initial reception setting.
5. Run `seedDefaultAdmin()` to synchronize account roles with verification.

These are `CREATE TABLE IF NOT EXISTS` operations rather than a versioned
migration system. Existing installations are not guaranteed to receive arbitrary
schema changes automatically.

The server registers `GET /health`. It runs `SELECT current_database()` and
returns:

```json
{ "status": "ok", "database": "mistry_message" }
```

Database failure returns status 500 with `{ "status": "error", "message":
"..." }`. The endpoint currently includes the database error message in its
response; consider whether this level of detail is appropriate for public
production health checks.

### Tables and relationships

| Table             | Role                                                                     | Relationships                                               |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `users`           | Account identity, password hash, role, verification, message preferences | Parent of messages and refresh tokens                       |
| `messages`        | Anonymous message contents and read state                                | `user_id` references `users.id`, cascading on user deletion |
| `refresh_tokens`  | Hashed refresh-token records, expiry, revocation                         | `user_id` references `users.id`, cascading on user deletion |
| `system_settings` | Independent string key/value settings                                    | No foreign keys                                             |

```text
users (1) ──────── (many) messages
  │                    ON DELETE CASCADE
  └────────────── (many) refresh_tokens
                       ON DELETE CASCADE

system_settings
  Independent key/value rows
```

## Database models

Model files are under `src/models/`. They issue parameterized PostgreSQL
queries through the shared pool. Unless stated otherwise, model return fields
use database-style names such as `user_id` and `is_read`.

### `user.model.js`

#### `users` columns

| Column                     | Type/behavior                                      |
| -------------------------- | -------------------------------------------------- |
| `id`                       | Serial primary key                                 |
| `username`                 | Unique, required, max 50 characters                |
| `email`                    | Unique, required, max 255 characters               |
| `password`                 | Required text; expected to contain a password hash |
| `role`                     | Required; `user` or `admin`, defaults to `user`    |
| `verify_code`              | Nullable six-character code                        |
| `verify_code_expiry`       | Nullable timestamp with time zone                  |
| `verify_resend_count`      | Small integer, defaults to zero                    |
| `verify_resend_reset`      | Timestamp with time zone, defaults to now          |
| `is_verified`              | Boolean, defaults to false                         |
| `is_accepting_messages`    | Boolean, defaults to true                          |
| `created_at`, `updated_at` | Timestamps with time zone                          |

#### Functions

- `createUsersTable()` creates the account table if absent.
- `seedDefaultAdmin()` assigns `admin` to every verified account and `user` to
  every unverified account when roles differ.
- `createUser({ username, email, password, verifyCode, verifyCodeExpiry, role, isVerified })`
  inserts an account and returns its public account fields, excluding password.
- `findUserByEmail(email)` returns the full matching database row or `null`.
- `findUserById(id)` returns safe account fields or `null`.
- `findUserByUsername(username)` returns ID, username, and reception state or
  `null`.
- `findDefaultAdmin()` returns the first verified admin ordered by ID, including
  reception state, or `null`.
- `findUserByUsernameOrEmail(identifier)` returns the full matching row or
  `null`.
- `verifyUser(email, code)` verifies a matching, unexpired code; promotes that
  user to `admin`; clears code fields and resend count; returns safe fields or
  `null`.
- `setVerifyCode(email, code, expiresAt)` replaces the code for an unverified
  account and updates its resend window/count; returns selected fields or
  `null`.
- `deleteUnverifiedUser(id)` deletes only a matching unverified account.
- `updatePassword(id, password)` stores the supplied value and returns ID/email
  or `null`; password hashing is performed by the auth service.
- `setAcceptingMessages(id, value)` updates the user's reception flag and
  returns ID/username/state or `null`.
- `listAllUsers()` returns account metadata newest first, excluding passwords
  and verification codes.

### `message.model.js`

#### `messages` columns

`id` is a serial primary key; `user_id` is a nullable foreign key to `users.id`
with cascade-on-delete; `content` is required and constrained to 1–1000
characters; `is_read` defaults to false; `created_at` defaults to now. Startup
also attempts to drop `NOT NULL` from `user_id` for older schemas.

#### Message creation and inbox functions

- `createAnonymousMessage(content, targetUserId = null)` uses the supplied
  recipient or looks up the first verified admin accepting messages, then
  inserts and returns the message. Throws a 503 `ApiError` if no recipient is
  available.
- `createMessage(userId, content)` inserts a message for an explicit user and
  returns the inserted row.
- `getMessagesByUserId(userId, { limit = 20, cursor })` returns messages for
  that user newest ID first; a cursor limits results to lower IDs.
- `findMessageById(id)` returns a message row or `null`.
- `markMessageRead(id, userId)` sets `is_read = TRUE` only for a message owned
  by that user; returns the row or `null`.
- `deleteMessageById(id, userId)` deletes only a message owned by that user;
  returns its ID or `null`.

#### Admin inbox functions

- `getAllMessagesForAdmin({ limit = 100, offset = 0, status = "all", userId })`
  returns messages scoped to `userId`; `status` may filter `unread` or `read`.
- `getMessageStats(userId)` returns `total`, `unread`, and `today` counts.
- `setMessageReadStatus(id, isRead = true, userId)` updates one owned message
  and returns ID/state/time or `null`.
- `markAllMessagesAsRead(userId)` marks all of that user's unread messages read
  and returns the affected-row count.
- `deleteMessageByAdmin(id, userId)` deletes one owned message and returns its
  ID or `null`.
- `clearAllMessagesAdmin(userId)` deletes all messages for that user and
  returns the affected-row count.

Legacy helpers also include `markMessageRead(id, userId)` and
`deleteMessageById(id, userId)` for user inbox actions.

### `token.model.js`

`refresh_tokens` columns: serial `id`; required `user_id` foreign key with
cascade-on-delete; unique required `token_hash`; required `expires_at`; `revoked`
boolean defaulting to false; and `created_at`.

- `createRefreshTokensTable()` creates the table if absent.
- `storeRefreshToken(userId, tokenHash, expiresAt)` stores a hash and expiry.
- `findRefreshToken(tokenHash)` returns a row only if it is not revoked and is
  unexpired, otherwise `null`.
- `revokeRefreshToken(tokenHash)` marks a matching token revoked.
- `revokeAllUserTokens(userId)` revokes every token belonging to the user.

### `settings.model.js`

`system_settings` contains a primary-key `key`, required text `value`, and
`updated_at` timestamp. `createSettingsTable()` creates the table and inserts
`is_accepting_messages=true` if missing.

- `getSetting(key, defaultValue = null)` returns the stored string or default.
- `setSetting(key, value)` inserts/upserts a stringified value and returns it.
- `isAcceptingMessagesSetting()` returns true only for stored `"true"` or
  boolean `true`.
- `setAcceptingMessagesSetting(boolVal)` updates the global setting and copies
  it to all admins' `users.is_accepting_messages`.

Current status controllers read/update the `users` field directly; they do not
use this settings table as their read source.

### Example model return shapes

Illustrative only; actual identifiers and timestamps differ:

```json
{
  "id": 42,
  "username": "sample_reader",
  "email": "reader@example.com",
  "role": "admin",
  "is_verified": true,
  "is_accepting_messages": true,
  "created_at": "2026-10-30T12:00:00.000Z"
}
```

```json
{
  "id": 81,
  "user_id": 42,
  "content": "Your note made my day!",
  "is_read": false,
  "created_at": "2026-10-30T12:10:00.000Z"
}
```

## Services

Service files are under `src/services/`; they implement business workflows
between controllers and models.

### `auth.service.js`

#### Token and cookie behavior

- Access tokens are JWTs containing user ID and role, expire after 15 minutes,
  and are returned in JSON.
- Refresh tokens are 40 random bytes encoded as hex; the database stores only
  their SHA-256 hash.
- Refresh tokens expire after 30 days and are sent in an HTTP-only
  `refreshToken` cookie.
- Cookie `secure` is true only when `NODE_ENV === "production"`; cookie
  `sameSite` is `"none"` in production and `"lax"` otherwise.

#### Functions

- `issueTokens(userId, role, res)` creates both tokens, stores the refresh hash,
  sets the cookie, and returns the access token.
- `registerUser({ username, email, password })` checks email/username
  uniqueness; generates a six-digit code valid for 15 minutes; hashes the
  password; creates an unverified account; and sends a verification email. If
  email delivery fails, it deletes that new unverified account and rethrows.
  Duplicate email or username returns 409.
- `verifyEmail({ email, code }, res)` verifies the code, promotes the account to
  admin through `verifyUser`, issues tokens, and returns `{ accessToken, user }`.
  Invalid/expired code returns 400.
- `resendCode({ email })` checks for an existing unverified account and resend
  limits, generates a new 15-minute code, sends email, and updates the code.
  Unknown account returns 404; verified account returns 400; limits return 429.
- `loginUser({ email, password, username }, res)` looks up the identifier as
  email or username, checks verification and bcrypt password, issues tokens,
  and returns a safe user. Invalid credentials return 401; unverified user
  returns 403.
- `refreshTokens(rawToken, res)` validates the refresh cookie token, revokes the
  old token, and issues a replacement pair. Missing, invalid, revoked, or
  expired token returns 401.
- `logoutUser(rawToken, res)` revokes the cookie token when provided and clears
  the refresh cookie.
- `changeUserPassword(userId, currentPassword, newPassword)` validates the
  current password, hashes/stores the new password, and revokes all refresh
  tokens for that user. A wrong current password returns 400.

### `message.service.js`

- `sendAnonymousMessage(username, content)` resolves a user by handle, rejects
  unknown user (404) or paused reception (403), and inserts the message.
- `getInbox(userId, { limit, cursor })` defaults limit to 20, caps it at 100,
  applies an optional cursor, and fetches messages.
- `readMessage(messageId, userId)` marks one owned message as read; missing or
  non-owned message returns 404.
- `removeMessage(messageId, userId)` deletes one owned message; missing or
  non-owned message returns 404.
- `adminRemoveMessage(messageId)` is a legacy helper that deletes without a
  user ID. Current routes use scoped model functions instead; do not use this
  helper for authorization-sensitive routes.

### `mail.service.js`

`sendVerificationEmail(email, username, code)` uses Nodemailer. Sender is
`MAIL_USER` or `GMAIL_USER`; it requires either `MAIL_PASS` or all three Gmail
OAuth variables. Host defaults to Gmail SMTP, port defaults to 587, and port
465 enables secure transport. It sends plain-text and HTML messages, escapes
the username in HTML, embeds the SVG logo, and explains the code's 15-minute
expiry. The service logs a masked email and SMTP message ID, never the code.
Delivery/configuration failures produce a generic 503 API error.

There is no standalone HTTP mail endpoint: registration and resend-code
workflows invoke this service.

## Controllers

Controllers are under `src/controllers/`; routes select the controller and
middleware.

### `auth.controller.js`

| Handler          | Route                           | Behavior                                                                                          |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `register`       | `POST /api/auth/register`       | Calls registration service and returns 201 with verification-required state, email, and username. |
| `verify`         | `POST /api/auth/verify`         | Verifies code; returns 200 with access token and user; service sets refresh cookie.               |
| `resendCode`     | `POST /api/auth/resend-code`    | Requests a replacement code and returns 200 confirmation.                                         |
| `login`          | `POST /api/auth/login`          | Authenticates; returns access token and user; service sets refresh cookie.                        |
| `refresh`        | `POST /api/auth/refresh`        | Reads cookie, rotates refresh token, returns a new access token.                                  |
| `logout`         | `POST /api/auth/logout`         | Revokes cookie token if present, clears cookie, returns 204.                                      |
| `changePassword` | `PUT /api/auth/change-password` | Currently has an argument mismatch when calling its service; see caveats.                         |

### `admin.controller.js`

All handlers are behind token authentication and `authorize("admin")`.

- `getAdminStatus` returns reception state, inbox statistics, and authenticated
  user.
- `toggleAcceptingStatus` requires boolean `isAcceptingMessages`, updates the
  user's setting, and returns state plus a status message.
- `getAdminMessages` returns scoped messages, statistics, and reception state.
  It reads `limit` (default 100, capped at 200), `offset` (default 0), and
  `status` (`all`, `read`, or `unread`).
- `updateAdminHandle` trims/lowercases and validates a 3–30 character
  alphanumeric/underscore handle, checks uniqueness, updates the current user,
  and returns the profile.
- `markMessageRead` updates a single owned message. Missing/non-owned ID
  returns 404; non-boolean `isRead` defaults to true.
- `markAllRead` marks all of this admin's unread messages read.
- `deleteMessage` deletes a single owned message; missing/non-owned ID returns 404.
- `clearAllMessages` deletes all messages owned by this admin.

### `me.controller.js`

All `/api/me` routes require a valid access token; the router itself has no
admin-role restriction.

- `getMe` returns `req.user`.
- `updateSettings` requires boolean `isAcceptingMessages`, updates the current
  user's setting, and returns the updated state.
- `getMessages` uses `limit` and `cursor` to fetch the current user's messages
  and reports a `nextCursor` (last returned message ID or `null`).
- `markRead` marks an owned message read.
- `deleteMessage` deletes an owned message and returns 204.

### `publicMessage.controller.js`

These public routes do not require authentication.

- `getMessageReceptionStatus` checks a requested username or, when omitted, the
  first verified admin. Returns reception state; unknown named account returns
  404; no default admin returns false.
- `sendPublicAnonymousMessage` accepts `content` and optional `username`, trims
  content, checks 1–1000 characters, finds an accepting recipient, stores the
  message, and returns 201 with confirmation and message data.

### `user.controller.js`

- `getPublicProfile` returns a username and its reception state, or 404.
- `sendMessage` delegates anonymous username-targeted message handling and
  returns the inserted message with status 201.

## HTTP API

All routes below are mounted under `/api`. Examples assume
`http://localhost:5000`; replace the host in deployment. JSON bodies require
`Content-Type: application/json`.

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

Login and verification return an access token in JSON and set an HTTP-only
refresh cookie. Browser clients need credentialed requests for cookie-based
refresh. For curl, persist/send the cookie jar for refresh/logout, e.g.
`-c cookies.txt -b cookies.txt`.

### Authentication: `/api/auth`

Registration, verification, and login use rate limiting and Zod validation.
Resend has its own IP limiter. The route schema requires an `email` field for
login, but the service accepts its value as either email or username.

#### `POST /api/auth/register`

**Input**

```json
{
  "username": "sample_reader",
  "email": "reader@example.com",
  "password": "correct-horse"
}
```

Username must be 3–50 ASCII letters/digits/underscores; email must be valid;
password must be 6–128 characters.

**201 response**

```json
{
  "success": true,
  "message": "Registration successful. Please enter the verification code sent to your email.",
  "requiresVerification": true,
  "email": "reader@example.com",
  "username": "sample_reader"
}
```

Typical errors: 400 invalid input, 409 duplicate email/username, 503 email
delivery unavailable.

#### `POST /api/auth/verify`

**Input**

```json
{ "email": "reader@example.com", "code": "123456" }
```

Code must be six numeric digits and unexpired.

**200 response**

```json
{
  "success": true,
  "message": "Email verified successfully! You are now logged in.",
  "accessToken": "<short-lived-access-token>",
  "user": {
    "id": 42,
    "username": "sample_reader",
    "email": "reader@example.com",
    "is_verified": true,
    "role": "admin",
    "is_accepting_messages": true
  }
}
```

The response also sets the refresh cookie. Invalid/expired code returns 400.

#### `POST /api/auth/resend-code`

**Input**

```json
{ "email": "reader@example.com" }
```

**200 response**

```json
{
  "success": true,
  "message": "A new verification code has been sent to your email."
}
```

The IP limiter permits three requests per hour; model-level account resend
limits also apply. Unknown email returns 404, already verified returns 400,
limits return 429.

#### `POST /api/auth/login`

**Input**

```json
{ "email": "sample_reader", "password": "correct-horse" }
```

The `email` value can be an email address or username.

**200 response**

```json
{
  "success": true,
  "accessToken": "<short-lived-access-token>",
  "user": {
    "id": 42,
    "username": "sample_reader",
    "email": "reader@example.com",
    "role": "admin",
    "is_verified": true,
    "is_accepting_messages": true
  }
}
```

Also sets the refresh cookie. Invalid credentials return 401; unverified
accounts return 403; invalid input returns 400.

#### `POST /api/auth/refresh`

Send the `refreshToken` cookie; no JSON body.

**200 response**

```json
{ "success": true, "accessToken": "<new-short-lived-access-token>" }
```

Sets a replacement refresh cookie. Missing, invalid, revoked, or expired token
returns 401.

#### `POST /api/auth/logout`

Send the refresh cookie if available; no JSON body.

**204 response:** empty body. Revokes the refresh token and clears the cookie.

#### `PUT /api/auth/change-password`

**Intended input**

```json
{
  "currentPassword": "correct-horse",
  "newPassword": "new-correct-horse"
}
```

Both passwords are required; new password must be 6–128 characters. **This
endpoint is currently broken:** its controller passes the entire request body
as one service argument, but the service expects current and new passwords as
separate arguments. Do not rely on this route until the code is fixed.

### Admin API: `/api/admin`

Every route requires a bearer token and `admin` role. Inbox operations are
scoped to the authenticated user.

#### `GET /api/admin/status`

**200 response**

```json
{
  "success": true,
  "isAcceptingMessages": true,
  "stats": { "total": 12, "unread": 4, "today": 2 },
  "user": {
    "id": 42,
    "username": "sample_reader",
    "email": "reader@example.com",
    "role": "admin",
    "is_verified": true,
    "is_accepting_messages": true,
    "created_at": "2026-10-30T12:00:00.000Z"
  }
}
```

#### `PATCH /api/admin/toggle-status`

**Input**

```json
{ "isAcceptingMessages": false }
```

**200 response**

```json
{
  "success": true,
  "isAcceptingMessages": false,
  "message": "Message reception is now PAUSED. Users cannot send messages."
}
```

Value must be boolean; otherwise 400.

#### `PATCH /api/admin/handle`

**Input**

```json
{ "username": "new_handle" }
```

Trimmed/lowercased handle must be 3–30 letters, digits, or underscores.

**200 response**

```json
{
  "success": true,
  "message": "Your custom link is now: /u/new_handle",
  "user": {
    "id": 42,
    "username": "new_handle",
    "email": "reader@example.com",
    "role": "admin",
    "is_accepting_messages": true
  }
}
```

Invalid handle returns 400; another user's handle returns 409.

#### `GET /api/admin/messages`

Query options: `limit` (default 100, max 200), `offset` (default 0), and
`status` (`all`, `unread`, or `read`).

Example: `GET /api/admin/messages?limit=20&offset=0&status=unread`

**200 response**

```json
{
  "success": true,
  "messages": [
    {
      "id": 81,
      "user_id": 42,
      "content": "Your note made my day!",
      "is_read": false,
      "created_at": "2026-10-30T12:10:00.000Z"
    }
  ],
  "stats": { "total": 12, "unread": 4, "today": 2 },
  "isAcceptingMessages": true
}
```

#### `PATCH /api/admin/messages/read-all`

No body.

**200 response**

```json
{ "success": true, "message": "Marked 4 messages as read" }
```

#### `PATCH /api/admin/messages/:id/read`

**Input**

```json
{ "isRead": false }
```

If `isRead` is omitted or not boolean, it defaults to true.

**200 response**

```json
{
  "success": true,
  "message": {
    "id": 81,
    "is_read": false,
    "created_at": "2026-10-30T12:10:00.000Z"
  }
}
```

Missing or non-owned message returns 404.

#### `DELETE /api/admin/messages/:id`

**200 response**

```json
{ "success": true, "message": "Message deleted successfully" }
```

Missing/non-owned message returns 404.

#### `DELETE /api/admin/messages`

No body.

**200 response**

```json
{ "success": true, "message": "Cleared 12 messages" }
```

Deletes all messages owned by the authenticated admin.

### Current-user API: `/api/me`

Every route requires a valid access token. The router does not itself require
admin role.

#### `GET /api/me`

**200 response**

```json
{
  "success": true,
  "user": {
    "id": 42,
    "username": "sample_reader",
    "email": "reader@example.com",
    "role": "admin",
    "is_verified": true,
    "is_accepting_messages": true,
    "created_at": "2026-10-30T12:00:00.000Z"
  }
}
```

#### `PATCH /api/me/settings`

**Input**

```json
{ "isAcceptingMessages": true }
```

**200 response**

```json
{
  "success": true,
  "user": {
    "id": 42,
    "username": "sample_reader",
    "is_accepting_messages": true
  }
}
```

Missing/non-boolean value returns 400.

#### `GET /api/me/messages`

Query parameters: `limit` (default 20, max 100) and optional `cursor`.
Example: `GET /api/me/messages?limit=20&cursor=81`.

**200 response**

```json
{
  "success": true,
  "messages": [
    {
      "id": 80,
      "user_id": 42,
      "content": "Thank you for listening.",
      "is_read": false,
      "created_at": "2026-10-29T12:10:00.000Z"
    }
  ],
  "nextCursor": 80
}
```

`nextCursor` is the last returned message ID or `null` if there are no results.
Invalid numeric pagination values are not explicitly rejected by the handler.

#### `PATCH /api/me/messages/:id/read`

No body. Marks the owned message read.

**200 response**

```json
{
  "success": true,
  "message": {
    "id": 80,
    "user_id": 42,
    "content": "Thank you for listening.",
    "is_read": true,
    "created_at": "2026-10-29T12:10:00.000Z"
  }
}
```

Missing/non-owned message returns 404.

#### `DELETE /api/me/messages/:id`

Deletes the owned message; **204 response** has an empty body. Missing or
non-owned message returns 404.

### Public message API: `/api/messages`

#### `GET /api/messages/status`

Optional query parameter `username`; without it, checks the first verified
admin.

Example: `GET /api/messages/status?username=sample_reader`

**200 with username**

```json
{
  "success": true,
  "username": "sample_reader",
  "isAcceptingMessages": true
}
```

**200 without username**

```json
{ "success": true, "isAcceptingMessages": true }
```

Unknown named user returns 404; no default admin reports false.

#### `POST /api/messages`

**Input**

```json
{
  "content": "Your note made my day!",
  "username": "sample_reader"
}
```

`username` is optional; when omitted the default admin is selected. Content is
trimmed and must be 1–1000 characters.

**201 response**

```json
{
  "success": true,
  "message": "Your message to sample_reader was sent anonymously!",
  "data": {
    "id": 81,
    "user_id": 42,
    "content": "Your note made my day!",
    "is_read": false,
    "created_at": "2026-10-30T12:10:00.000Z"
  }
}
```

Errors: 400 empty/oversized content, 403 paused reception, 404 unknown username,
503 no available default recipient. This route currently lacks the stricter
message-specific limiter; see [Current implementation caveats](#current-implementation-caveats).

### Public profile API: `/api/users`

#### `GET /api/users/:username`

**200 response**

```json
{
  "success": true,
  "user": {
    "username": "sample_reader",
    "isAcceptingMessages": true
  }
}
```

Unknown username returns 404.

#### `POST /api/users/:username/messages`

This alternative message endpoint is rate-limited and uses Zod validation.
Request content must be 1–1000 characters. Optional `website` honeypot field
must be empty.

**Input**

```json
{ "content": "A kind anonymous note." }
```

**201 response**

```json
{
  "success": true,
  "message": {
    "id": 82,
    "user_id": 42,
    "content": "A kind anonymous note.",
    "is_read": false,
    "created_at": "2026-10-30T12:15:00.000Z"
  }
}
```

Unknown recipient returns 404; paused reception returns 403; invalid input
returns 400; rate limit returns 429.

## Middleware and errors

### Authentication and authorization

- `middlewares/auth.js` requires `Authorization: Bearer <token>`, verifies the
  JWT, loads the current user, and sets `req.user`. Invalid/missing token or
  missing user returns 401.
- `middlewares/rbac.js` provides `authorize(...roles)`; a user without a
  required role receives 403.
- `middlewares/validate.js` parses request bodies with Zod; invalid input becomes
  an operational 400 error.

### Rate limits

- Global API limiter: 100 requests per 15 minutes.
- Auth limiter: 10 requests per 15 minutes for registration, verification, and
  login.
- Resend limiter: 3 requests per hour.
- Message limiter: 20 requests per hour, used on
  `POST /api/users/:username/messages`.

Limiters use the package's default in-memory store; in a multi-instance
deployment, use a shared store if consistent global limits are required.

### Error response shape

Operational API errors generally return:

```json
{
  "success": false,
  "message": "Human-readable error detail"
}
```

Unexpected errors are logged server-side and returned as generic 500
`Internal server error`. JWT errors return 401. Rate-limit errors return 429
with a JSON message.

## Current implementation caveats

These notes describe source behavior; they are not claims about deployment
configuration outside the repository.

1. **Port:** `server.js` calculates a value from `process.env.PORT` but calls
   `app.listen(5000, ...)`; the environment port is ignored.
2. **CORS:** `app.js` includes local origins and `CLIENT_URL`, but the callback
   currently returns success for every origin. Credentials are enabled. Restrict
   accepted origins before production use.
3. **Message abuse protection:** the frontend's `/api/messages` submission
   route has only the global limiter. The stricter `messageLimiter` applies to
   `/api/users/:username/messages`.
4. **Password change integration:** `auth.controller.js` passes `req.body` as a
   single service argument, but `changeUserPassword` expects `userId`,
   `currentPassword`, and `newPassword` as three arguments. The route is broken
   until that call is corrected.
5. **Account roles:** `verifyUser()` and startup `seedDefaultAdmin()` promote
   every verified account to `admin`; this is the current behavior, not a
   single-admin invite/provisioning model.
6. **Production cookies:** set `NODE_ENV=production` so refresh cookies receive
   `secure: true` and `sameSite: "none"`. Browser deployments also require
   correct credentialed CORS behavior.
7. **Health error detail:** `/health` includes the database driver's error
   message on failure. Consider returning a generic response in production.
8. **Database migrations:** startup creates tables if missing but is not a
   complete schema migration system.
9. **Test/build scripts:** the backend package currently exposes only `dev`;
   it does not define dedicated test, build, or production start scripts.
