/**
 * oidcRoutes.js
 *
 * Express router for Google OpenID Connect authentication endpoints.
 *
 * Routes:
 *   GET /auth/google          — Initiate OIDC Authorization Code Flow
 *   GET /auth/google/callback — Handle Google authorization callback
 *
 * Author: Viman (SE4030 Individual Contribution — OAuth/OIDC)
 */

const express = require("express");
const { initiateGoogleAuth, handleGoogleCallback } = require("./oidcController");

const router = express.Router();

/**
 * GET /auth/google
 * Initiates Google OpenID Connect authentication.
 * Generates state + nonce, stores in session, redirects to Google.
 */
router.get("/google", initiateGoogleAuth);

/**
 * GET /auth/google/callback
 * Google redirects here after user authentication.
 * Validates state, exchanges code, verifies ID token, issues Walk_N_Earn JWT.
 */
router.get("/google/callback", handleGoogleCallback);

module.exports = router;
