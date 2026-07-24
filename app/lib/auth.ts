"use client";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

const USERS_KEY = "tul_users";
const SESSION_KEY = "tul_session";

function getUsers(): Record<string, { email: string; password: string; fullName: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, { email: string; password: string; fullName: string }>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function signUp(email: string, password: string, fullName: string): AuthUser {
  const users = getUsers();
  if (users[email]) throw new Error("An account with this email already exists.");
  users[email] = { email, password, fullName };
  saveUsers(users);
  const user: AuthUser = { id: email, email, fullName };
  setSession(user);
  return user;
}

export function signIn(email: string, password: string): AuthUser {
  const users = getUsers();
  const record = users[email];
  if (!record || record.password !== password) throw new Error("Invalid email or password.");
  const user: AuthUser = { id: email, email, fullName: record.fullName };
  setSession(user);
  return user;
}

export function signOut() {
  setSession(null);
}

export function resetPassword(email: string, code: string, newPassword: string) {
  const users = getUsers();
  const record = users[email];
  if (!record) throw new Error("No account found with this email.");
  const expectedCode = localStorage.getItem("tul_reset_code_" + email);
  if (code !== expectedCode) throw new Error("Invalid reset code.");
  record.password = newPassword;
  saveUsers(users);
  localStorage.removeItem("tul_reset_code_" + email);
}

export function sendResetCode(email: string): string {
  const users = getUsers();
  if (!users[email]) throw new Error("No account found with this email.");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem("tul_reset_code_" + email, code);
  return code;
}