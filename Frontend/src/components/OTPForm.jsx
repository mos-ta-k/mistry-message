import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/api";
import Loader from "./Loader";

export default function OTPForm({ email, onVerified, onBack }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const updateDigits = (value) => {
    const nextDigits = value.replace(/\D/g, "").slice(0, 6).split("");
    setDigits(Array.from({ length: 6 }, (_, index) => nextDigits[index] || ""));
    inputRefs.current[Math.min(nextDigits.length, 5)]?.focus();
  };

  const handleChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      updateDigits(cleaned);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleaned;
    setDigits(nextDigits);
    if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    updateDigits(event.clipboardData.getData("text"));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter all six digits to verify your email.");
      return;
    }

    setError("");
    setInfo("");
    setLoading(true);
    try {
      const result = await api.adminVerify(email, code);
      onVerified?.(result.user);
    } catch (submitError) {
      setError(submitError.message || "That code is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      await api.resendVerifyCode(email);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setInfo("A fresh code is on its way. Check your inbox and spam folder.");
    } catch (resendError) {
      setError(resendError.message || "Could not resend your code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every((digit) => digit !== "");

  return (
    <div className="otp-content">
      <div className="otp-icon"><Mail size={21} /></div>
      <p className="eyebrow">One last little step</p>
      <h2 className="otp-title">Check your inbox</h2>
      <p className="otp-description">
        We sent a six-digit verification code to
        <strong className="otp-email">{email}</strong>
      </p>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="auth-alert auth-alert-success" role="status">
          <CheckCircle2 size={17} />
          <span>{info}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="otp-digits" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputRefs.current[index] = element; }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              aria-label={`Verification digit ${index + 1}`}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className="otp-digit"
            />
          ))}
        </div>
        <button className="btn-primary auth-submit" type="submit" disabled={loading || !isComplete}>
          {loading ? (
            <>
              <Loader size={17} color="#ffffff" />
              Verifying your email...
            </>
          ) : (
            <>
              Verify and open inbox
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="otp-actions">
        <button className="otp-text-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to sign in
        </button>
        <button className="otp-text-button otp-resend" type="button" onClick={handleResend} disabled={resending}>
          {resending ? <Loader size={14} color="#287A74" /> : <RotateCcw size={14} />}
          Resend code
        </button>
      </div>
      <p className="otp-footnote"><ShieldCheck size={14} /> Your code expires in 15 minutes.</p>
    </div>
  );
}
