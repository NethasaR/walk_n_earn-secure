# Google OpenID Connect — Developer Setup Guide

This guide explains how to configure and run the Google OpenID Connect (OIDC)
authentication feature implemented in Walk N Earn.

---

## Overview

The OIDC implementation uses the **Authorization Code Flow** via the
[`openid-client`](https://github.com/panva/node-openid-client) library (v5).

The backend discovers Google's OIDC configuration from:
```
https://accounts.google.com/.well-known/openid-configuration
```

Full ID token verification is performed server-side, including:
- Issuer (`iss`)
- Audience (`aud`)
- Expiration (`exp`)
- Nonce
- Cryptographic signature (via Google's JWKS endpoint)

---

## Authentication Flow

```
User (Browser)
     |
     | 1. Click "Continue with Google"
     v
Backend GET /auth/google
     |
     | 2. Generate secure state + nonce, store in server-side session
     | 3. Build Google authorization URL
     v
Google Authorization Server (https://accounts.google.com/o/oauth2/v2/auth)
     |
     | 4. User authenticates with Google
     | 5. Google redirects to registered callback URI
     v
Backend GET /auth/google/callback
     |
     | 6. Validate state (CSRF protection)
     | 7. Exchange authorization code for tokens (back-channel)
     | 8. Verify ID token (issuer, audience, expiry, nonce, signature)
     | 9. Extract verified Google identity (sub, email, name)
     | 10. Find existing user by googleId OR link/create by verified email
     | 11. Issue Walk N Earn JWT (same mechanism as normal login)
     v
Frontend /auth/callback
     |
     | 12. Read JWT from URL, clear from URL (history.replaceState)
     | 13. Store in localStorage, update AuthContext
     v
Walk N Earn App (/app/walk)
```

---

## Step 1: Create Google OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Set Application type: **Web application**
6. Set Name: e.g., `Walk N Earn Dev`
7. Under **Authorised redirect URIs**, add:
   ```
   http://localhost:5050/auth/google/callback
   ```
   > ⚠️ This URI must exactly match `GOOGLE_CALLBACK_URL` in your `.env`.
   > Do NOT use wildcards.

8. Click **Create**
9. Copy the **Client ID** and **Client Secret** — you will need these in Step 2

---

## Step 2: Configure Environment Variables

Copy `Backend/.env.example` to `Backend/.env`:

```
Backend/.env.example  →  Backend/.env
```

Fill in your actual values:

```dotenv
PORT=5050
MONGO_URI=your-mongodb-connection-string

JWT_SECRET=a-long-random-secret-for-jwt

GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Google OIDC
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5050/auth/google/callback

# Frontend URL (must match where your React dev server runs)
FRONTEND_URL=http://localhost:5173

# Session secret — use a strong random value
SESSION_SECRET=another-long-random-secret
```

> ⚠️ **NEVER commit `.env` to version control.**
> The `.gitignore` already excludes `Backend/.env`.

---

## Step 3: Install Dependencies

```bash
cd Backend
npm install
```

The required packages (`openid-client@5`, `express-session`, `connect-mongo`)
are already listed in `package.json`.

---

## Step 4: Start the Application

**Terminal 1 — Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd Frontend
npm run dev
```

---

## Step 5: Test Google Login

1. Open `http://localhost:5173/login`
2. Click **Continue with Google**
3. You will be redirected to Google's login page
4. Sign in with your Google account
5. You will be returned to `http://localhost:5173/app/walk` as an authenticated user

---

## Security Controls Implemented

| Control | Implementation |
|---|---|
| CSRF / State | 32-byte random state, stored server-side, timing-safe comparison on callback |
| Nonce | 32-byte random nonce, stored server-side, verified in ID token |
| ID Token Verification | openid-client verifies issuer, audience, expiry, nonce, and ECDSA/RSA signature |
| Client Secret | Stored only in `Backend/.env`, never sent to browser |
| Account Linking | Uses verified Google `sub` (subject) identifier, not unverified email |
| Session TTL | 10-minute expiry on OAuth state/nonce session |
| Session Storage | MongoDB-backed (not in-memory) via connect-mongo |
| Session Cookie | `httpOnly: true`, `sameSite: lax`, `secure: true` in production |
| Error Handling | All errors redirect to frontend with safe error codes, no stack traces exposed |
| CORS | Tightened to specific frontend origin (replaces previous wildcard) |
| Redirect URI | Fixed server-side via env var, no arbitrary redirects accepted |

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth 2.0 Client Secret (server-side only) |
| `GOOGLE_CALLBACK_URL` | ✅ | Exact registered redirect URI |
| `FRONTEND_URL` | ✅ | Frontend base URL for post-auth redirects |
| `SESSION_SECRET` | ✅ | Secret for signing session cookies |

---

## Files Added/Modified

| File | Change |
|---|---|
| `Backend/Components/Login/oidcController.js` | NEW — OIDC logic |
| `Backend/Components/Login/oidcRoutes.js` | NEW — OIDC routes |
| `Backend/server.js` | MODIFIED — session + OIDC routes |
| `Backend/Components/User/models/User.js` | MODIFIED — `googleId`, `authProvider` fields |
| `Backend/.env.example` | MODIFIED — added OIDC vars |
| `Frontend/src/pages/OAuthCallback.jsx` | NEW — callback handler |
| `Frontend/src/pages/Login.jsx` | MODIFIED — Google button |
| `Frontend/src/App.jsx` | MODIFIED — callback route |
| `.gitignore` | MODIFIED — excludes `*.env` |

---

## Troubleshooting

**"redirect_uri_mismatch" error from Google:**
Ensure `GOOGLE_CALLBACK_URL` in `.env` exactly matches the URI registered in Google Cloud Console.

**"invalid_state" error:**
The OAuth session expired (10-minute limit) or the callback was accessed without initiating login first.

**"Cannot GET /auth/google":**
Ensure the backend is running on the port specified in `GOOGLE_CALLBACK_URL`.

**Google login redirects to `/login?error=auth_failed`:**
Check backend console logs for the root cause. Common issues: incorrect `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, MongoDB not connected.
