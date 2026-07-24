"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

interface AuthCardProps {
  onGuest: () => void;
}

export default function AuthCard({ onGuest }: AuthCardProps) {
  return (
    <div className="auth-card">
      <div className="auth-top">
        <span className="wordmark">tul</span>
        <p>edit photos, have fun</p>
      </div>
      <div className="auth-actions">
        <SignInButton mode="modal">
          <button className="btn btn-primary btn-block">Sign in</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="btn btn-outline btn-block">Create account</button>
        </SignUpButton>
      </div>
      <div className="auth-footer">
        <button className="btn btn-ghost btn-block" onClick={onGuest} style={{ marginBottom: "12px" }}>
          Skip for now - try as guest
        </button>
        <p className="fine">
          Sign in to download your edits. Guest edits are saved locally.
        </p>
      </div>
    </div>
  );
}