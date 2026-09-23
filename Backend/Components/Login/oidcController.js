/**
 * oidcController.js
 *
 * Google OpenID Connect authentication controller.
 * Implements the Authorization Code Flow with:
 *  - Cryptographically secure state for CSRF protection
 *  - Nonce for ID token replay protection
 *  - Full ID token verification via openid-client (issuer, audience, expiry, nonce, signature)
 *  - Secure account linking via verified Google subject identifier (sub)
 *  - Integration with Walk_N_Earn's existing JWT authentication mechanism
 *
 * Author: Viman (SE4030 Individual Contribution — OAuth/OIDC)
 */

const { Issuer, generators } = require("openid-client");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../User/models/User");

// Google OIDC discovery URL (well-known endpoint)
const GOOGLE_ISSUER_URL = "https://accounts.google.com";

// Cache the discovered OIDC client to avoid re-fetching on every request
let cachedClient = null;

/**
 * Discover Google's OIDC configuration and create an openid-client Client.
 * Results are cached in memory for performance.
 *
 * @returns {Promise<import('openid-client').Client>}
 */
async function getOidcClient() {
  if (cachedClient) return cachedClient;

  const googleIssuer = await Issuer.discover(GOOGLE_ISSUER_URL);

  cachedClient = new googleIssuer.Client({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: [process.env.GOOGLE_CALLBACK_URL],
    response_types: ["code"],
  });

  return cachedClient;
}

/**
 * STEP 1 — Initiate Google OIDC Authorization
 *
 * GET /auth/google
 *
 * Generates a cryptographically secure state and nonce, stores them in the
 * server-side session, then redirects the user's browser to Google's
 * authorization endpoint.
 *
 * Security controls:
 *  - state: 32-byte random hex — prevents CSRF (cross-site request forgery)
 *  - nonce: 32-byte random hex — prevents ID token replay attacks
 *  - Both are stored server-side in the session, NOT in the URL
 */
exports.initiateGoogleAuth = async (req, res) => {
  try {
    const client = await getOidcClient();

    // Generate cryptographically secure random state and nonce
    const state = generators.state();     // 32-byte random, URL-safe base64
    const nonce = generators.nonce();     // 32-byte random, URL-safe base64

    // Store in server-side session with a timestamp for expiry validation
    req.session.oidc = {
      state,
      nonce,
      initiatedAt: Date.now(),
    };

    // Build the Google authorization URL
    const authorizationUrl = client.authorizationUrl({
      scope: "openid email profile",
      state,
      nonce,
    });

    // Redirect user to Google
    res.redirect(authorizationUrl);
  } catch (err) {
    console.error("[OIDC] initiateGoogleAuth error:", err.message);
    // Do not expose internal error details to the user
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=auth_init_failed`
    );
  }
};

/**
 * STEP 2 — Handle Google OIDC Callback
 *
 * GET /auth/google/callback
 *
 * Validates the state, exchanges the authorization code for tokens,
 * verifies the ID token, then finds or creates a local Walk_N_Earn user
 * and issues the application's own JWT.
 *
 * Security controls verified here:
 *  - OAuth error parameter handled
 *  - state validated against session (CSRF protection)
 *  - Session expiry checked (10-minute window)
 *  - Code exchanged via back-channel (server to Google, not browser)
 *  - ID token fully verified: issuer, audience, expiry, nonce, signature
 *  - Account linked via verified Google sub (not unverified email)
 *  - Session OIDC data cleared after use (one-time use)
 */
exports.handleGoogleCallback = async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  try {
    const client = await getOidcClient();

    // --- 1. Check for OAuth error response from Google ---
    if (req.query.error) {
      console.warn("[OIDC] Google returned error:", req.query.error);
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_cancelled`);
    }

    // --- 2. Retrieve session OIDC data ---
    const sessionOidc = req.session.oidc;

    if (!sessionOidc || !sessionOidc.state || !sessionOidc.nonce) {
      console.warn("[OIDC] Missing OIDC session data — possible CSRF attempt");
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
    }

    // --- 3. Validate state (CSRF protection) ---
    // Use timing-safe comparison to prevent timing attacks
    const receivedState = req.query.state || "";
    const expectedState = sessionOidc.state;

    if (
      receivedState.length !== expectedState.length ||
      !crypto.timingSafeEqual(
        Buffer.from(receivedState, "utf8"),
        Buffer.from(expectedState, "utf8")
      )
    ) {
      console.warn("[OIDC] State mismatch — possible CSRF attack");
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
    }

    // --- 4. Check session expiry (10-minute window) ---
    const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - sessionOidc.initiatedAt > SESSION_TTL_MS) {
      console.warn("[OIDC] OAuth session expired");
      return res.redirect(`${FRONTEND_URL}/login?error=session_expired`);
    }

    // --- 5. Exchange authorization code for tokens (back-channel) ---
    // openid-client handles the HTTP request to Google's token endpoint.
    // The client_secret is NEVER exposed to the browser during this step.
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(
      process.env.GOOGLE_CALLBACK_URL,
      params,
      {
        state: sessionOidc.state,
        nonce: sessionOidc.nonce,
        // openid-client automatically verifies: issuer, audience, expiry,
        // nonce, and signature using Google's JWKS endpoint
      }
    );

    // --- 6. Obtain verified identity claims from the ID token ---
    // openid-client has already fully verified the ID token above.
    // We extract claims from the already-verified token.
    const claims = tokenSet.claims();

    // Validate essential claims are present
    if (!claims.sub || !claims.email) {
      console.error("[OIDC] Missing required claims in ID token");
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_token`);
    }

    // Validate email is verified by Google
    if (claims.email_verified === false) {
      console.warn("[OIDC] Google email not verified:", claims.email);
      return res.redirect(`${FRONTEND_URL}/login?error=email_not_verified`);
    }

    // --- 7. Clear OIDC session data (one-time use) ---
    // Prevent session fixation / replay of the same state+nonce
    delete req.session.oidc;

    // --- 8. Find or create local user ---
    // Primary lookup: by googleId (stable sub identifier)
    // This is more reliable than email because Google email can change
    let user = await User.findOne({ googleId: claims.sub });

    if (!user) {
      // Secondary lookup: by email (to link with existing local account)
      // We only use this email because it comes from Google's verified ID token
      user = await User.findOne({ email: claims.email.toLowerCase() });

      if (user) {
        // Link existing local account to Google identity
        user.googleId = claims.sub;
        user.authProvider = "google";
        await user.save();
        console.info(`[OIDC] Linked existing account ${user.email} to Google sub: ${claims.sub}`);
      } else {
        // Create new user from verified Google identity
        user = await User.create({
          fullName: claims.name || claims.email.split("@")[0],
          email: claims.email.toLowerCase(),
          googleId: claims.sub,
          authProvider: "google",
          // No passwordHash for Google-only accounts
        });
        console.info(`[OIDC] Created new user from Google identity: ${user.email}`);
      }
    }

    // --- 9. Issue Walk_N_Earn JWT (same structure as existing login) ---
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // --- 10. Encode user info for frontend ---
    const userPayload = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      totalPoints: user.totalPoints,
      totalCo2SavedKg: user.totalCo2SavedKg,
      totalDistanceKm: user.totalDistanceKm,
      authProvider: user.authProvider,
    };

    const encodedUser = Buffer.from(JSON.stringify(userPayload)).toString("base64url");

    // --- 11. Redirect to frontend callback page with token ---
    // The token is briefly in the URL but will be cleared by the frontend
    // OAuthCallback page immediately after reading (using history.replaceState).
    // This is the standard approach for SPA OIDC integrations when cookies
    // cannot be used cross-origin.
    return res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(encodedUser)}`
    );
  } catch (err) {
    console.error("[OIDC] handleGoogleCallback error:", err.message);
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=auth_failed`
    );
  }
};
