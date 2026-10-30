# Mistry Message

Mistry Message is a web app for receiving anonymous notes. A recipient can
create an account, verify their email, share a personal link, and manage incoming
messages in a private dashboard. Visitors can send a message without creating an
account.

## What you can do

### As a visitor

- Open the main page to send a message to the default recipient, or open a
  personal link such as `https://example.com/u/sample_reader`.
- Check whether the recipient is currently accepting messages.
- Write and send an anonymous note of up to 1,000 characters.
- No visitor account is required.

### As a recipient

- Create an account with a username, email address, and password.
- Verify the email address with the six-digit code sent to your inbox.
- Sign in at `/admin` to open the dashboard.
- Copy or change your personal message link.
- Pause or resume message intake.
- Review, search, filter, and display messages as cards or a list.
- Mark messages read, mark all as read, delete individual messages, or clear
  the inbox.

## How messages work

1. A recipient registers and receives an email verification code.
2. After verification, the app opens the recipient's dashboard.
3. The recipient shares their `/u/<username>` link.
4. A visitor opens the link and sends a note. The visitor does not need to sign
   in.
5. The note appears in the recipient's inbox, where it can be managed.

The app does not ask visitors for a name or account when submitting a note.
Avoid including personal or sensitive information in a message.

## Project layout

```text
.
├── Backend/
│   ├── src/
│   │   ├── configs/       # PostgreSQL connection
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── middlewares/   # Authentication, validation, limits, errors
│   │   ├── models/        # PostgreSQL tables and queries
│   │   ├── routes/        # API route declarations
│   │   └── services/      # Authentication, messages, email
│   └── README.md          # Detailed backend and API reference
└── Frontend/
    ├── src/
    │   ├── components/    # Public messaging, login, dashboard
    │   └── services/      # Frontend API client
    └── vite.config.js
```

## Requirements

- Node.js and npm
- PostgreSQL
- SMTP credentials or Gmail OAuth credentials for verification emails

## Run locally

Install dependencies from each project directory:

```powershell
cd Backend
npm install
cd ..\Frontend
npm install
```

### Configure the backend

Create `Backend/.env` with values for your PostgreSQL database, JWT signing
secret, client origin, and email provider. Example with placeholders:

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

Alternatively, configure Gmail OAuth with `GMAIL_USER`,
`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` instead of
`MAIL_PASS`. Keep all credentials private; do not commit `.env` files.

### Configure the frontend API URL

The frontend reads `VITE_API_URL` (or the legacy `VITE_APP_URL`) as the API
base URL, then appends endpoint paths such as `/auth/login`. Because the backend
mounts routes below `/api`, the frontend adds `/api` automatically if it is
omitted. For local development, create or update `Frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000
```

Restart Vite after changing environment variables. Vite embeds this value into
the frontend bundle, so set the production value in the frontend hosting
environment and rebuild/redeploy the frontend whenever it changes.

### Start both applications

Start the backend in one terminal:

```powershell
cd Backend
npm run dev
```

Start the frontend in another terminal:

```powershell
cd Frontend
npm run dev
```

Open the Vite URL shown in the frontend terminal (normally
`http://localhost:5173`). The backend listens on `PORT`, or `5000` if it is
unset.

The backend initializes its database tables during startup. The frontend
provides a Vite proxy for `/api`; the API client uses `VITE_API_URL` (or its
legacy alias) to target the backend API.

## Main pages

| Page          | Purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| `/`           | Public anonymous-message form for the default recipient        |
| `/<username>` | Public form for a specific recipient                           |
| `/admin`      | Registration, email verification, sign-in, and admin dashboard |

Use the **Admin** navigation action to open `/admin`. After signing in, use the
dashboard to copy your public link and manage received messages.

## Security and privacy notes

- Passwords are hashed by the backend; access tokens are short-lived and the
  refresh token is stored in an HTTP-only cookie.
- Visitors can submit messages without accounts, but the service may still
  process request metadata for transport, rate limiting, and operations.
- Never send passwords, financial details, or other sensitive information in
  anonymous messages.
- Configure production secrets in the hosting provider's secret manager.
- Set the backend's `CLIENT_URL` to the exact public frontend origin (for
  example, `https://mistry-message-frontend.onrender.com`) and set
  `NODE_ENV=production`. Set frontend `VITE_API_URL` to the backend public URL;
  `/api` may be included or omitted. `VITE_APP_URL` is also accepted as an
  alternative variable name.
- The backend still has a message endpoint without its stricter route-specific
  limiter. Review the backend's current implementation
  caveats in [backend documentation](./Backend/README.md#current-implementation-caveats)
  before deploying.

## Developer commands

| Directory  | Command           | Description                                            |
| ---------- | ----------------- | ------------------------------------------------------ |
| `Backend`  | `npm run dev`     | Start backend with Node.js watch mode for development  |
| `Backend`  | `npm start`       | Start backend without watch mode for production        |
| `Frontend` | `npm run dev`     | Start Vite development server                          |
| `Frontend` | `npm run build`   | Create the optimized frontend build in `Frontend/dist` |
| `Frontend` | `npm run preview` | Preview the built frontend locally                     |

The backend package does not define dedicated build or test scripts.
For backend setup, endpoint details, request/response examples, and model/service
documentation, see [Backend/README.md](./Backend/README.md).
