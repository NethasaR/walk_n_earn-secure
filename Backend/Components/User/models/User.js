const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // passwordHash is optional for Google-authenticated users
    passwordHash: { type: String, required: false },

    //Role based system
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // Optional fields useful for your app
    totalPoints: { type: Number, default: 0 },
    totalCo2SavedKg: { type: Number, default: 0 },
    totalDistanceKm: { type: Number, default: 0 },

    // OAuth / OpenID Connect fields
    // googleId stores the stable Google subject identifier ('sub' claim from ID token)
    // This is used to securely link a Google identity to a local account
    googleId: { type: String, default: null, sparse: true, index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);