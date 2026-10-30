import React, { useState } from "react";
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
} from "lucide-react";
import { api } from "../services/api";
import Loader from "./Loader";

export default function AdminLogin({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const result = await api.adminRegister(
          username.trim(),
          email.trim(),
          password,
        );
        onLoginSuccess(result.user);
      } else {
        const result = await api.adminLogin(email.trim(), password);
        if (result.user?.role !== "admin") {
          await api.logout();
          throw new Error(
            "This account needs setup. Choose Create account and use the same username and password to finish.",
          );
        }
        onLoginSuccess(result.user);
      }
    } catch (submitError) {
      setError(
        submitError.message || "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-story">
          <div className="auth-brand">
            <img src="/mistry-logo.svg" alt="" width="44" height="44" />
            <span>Mistry Message</span>
          </div>
          <div className="auth-story-copy">
            <span className="eyebrow">A little note, just for you</span>
            <h1>Make room for the messages that matter.</h1>
            <p>
              Your own quiet corner for honest thoughts, kind words, and
              anonymous notes from your people.
            </p>
          </div>
          <div className="auth-story-note" aria-hidden="true">
            <div className="note-topline">
              <span>
                <MessageCircle size={16} /> a little mystery
              </span>
              <span className="note-dot" />
            </div>
            <p>“You make ordinary days feel a little brighter.”</p>
            <span className="note-signoff">sent with care, anonymously</span>
          </div>
          <span className="auth-orbit auth-orbit-one" />
          <span className="auth-orbit auth-orbit-two" />
        </aside>

        <section className="auth-card" aria-label="Account access">
          <div className="auth-card-heading">
            <span className="auth-icon">
              <LockKeyhole size={20} />
            </span>
            <div>
              <p className="eyebrow">
                {isRegister ? "Your inbox starts here" : "Welcome back"}
              </p>
              <h2>
                {isRegister ? "Create your account" : "Sign in to your inbox"}
              </h2>
              <p className="auth-subtitle">
                {isRegister
                  ? "Create your account and open your private message inbox."
                  : "Your anonymous messages are waiting for you."}
              </p>
            </div>
          </div>

          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Account options"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={!isRegister ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setIsRegister(false);
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={isRegister ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setIsRegister(true);
                setError("");
              }}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label className="auth-field">
                <span>Your Username</span>
                <div className="auth-input-wrap">
                  <MessageCircle size={17} />
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="set an username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    minLength={3}
                    maxLength={50}
                    required
                  />
                </div>
              </label>
            )}

            <label className="auth-field">
              <span>{isRegister ? "Email address" : "Email or username"}</span>
              <div className="auth-input-wrap">
                <Mail size={17} />
                <input
                  type={isRegister ? "email" : "text"}
                  autoComplete="email"
                  placeholder={
                    isRegister ? "you@example.com" : "Your email or handle"
                  }
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={isRegister ? 6 : undefined}
                  maxLength={128}
                  required
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button
              className="btn-primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={17} color="#ffffff" />
                  {isRegister ? "Creating your account..." : "Signing you in..."}
                </>
              ) : (
                <>
                  {isRegister ? "Create account" : "Open my inbox"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
