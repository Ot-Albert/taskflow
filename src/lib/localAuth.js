// Local auth fallback — mimics the subset of Supabase's auth API that the app
// uses, so components never need to know which backend is active.
//
// Security note: this uses SHA-256 via the Web Crypto API for password hashing.
// It is NOT a substitute for a real backend with bcrypt/argon2 + HTTP-only
// cookies. It exists so the app is demoable without a Supabase project. Once
// VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, this module is unused.

import { loadJSON, saveJSON, removeKey } from "../utils/storage";

const USERS_KEY = "taskflow.users.v1";
const SESSION_KEY = "taskflow.session.v1";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadUsers() {
  return loadJSON(USERS_KEY, []);
}

function saveUsers(users) {
  saveJSON(USERS_KEY, users);
}

function makeToken() {
  return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

function sanitizeUser(user) {
  // Never expose the password hash to the app.
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export const localAuth = {
  async signUp({ email, password, fullName }) {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase().trim();

    if (users.some((u) => u.email === normalizedEmail)) {
      return { data: null, error: { message: "An account with this email already exists." } };
    }

    const passwordHash = await hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      fullName: fullName.trim(),
      passwordHash,
      createdAt: Date.now(),
    };

    users.push(user);
    saveUsers(users);

    const session = {
      access_token: makeToken(),
      user: sanitizeUser(user),
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    };
    saveJSON(SESSION_KEY, session);

    return { data: { user: sanitizeUser(user), session }, error: null };
  },

  async signInWithPassword({ email, password }) {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find((u) => u.email === normalizedEmail);

    if (!user) {
      return { data: null, error: { message: "No account found with this email." } };
    }

    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      return { data: null, error: { message: "Incorrect password." } };
    }

    const session = {
      access_token: makeToken(),
      user: sanitizeUser(user),
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
    saveJSON(SESSION_KEY, session);

    return { data: { user: sanitizeUser(user), session }, error: null };
  },

  async signOut() {
    removeKey(SESSION_KEY);
    return { error: null };
  },

  getSession() {
    const session = loadJSON(SESSION_KEY, null);
    if (!session) return { data: { session: null }, error: null };
    if (session.expires_at && session.expires_at < Date.now()) {
      removeKey(SESSION_KEY);
      return { data: { session: null }, error: null };
    }
    return { data: { session }, error: null };
  },
};
