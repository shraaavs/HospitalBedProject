import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function LoginOtpModal({
  isOpen,
  onClose,
  challengeData,
  onSuccess
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [liveOtpCode, setLiveOtpCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen && challengeData) {
      setOtp(['', '', '', '', '', '']);
      setError('');
      setTimeLeft(600);
      setCanResend(false);
      setResendCooldown(60);
      setLiveOtpCode(challengeData.liveOtpCode || '');
      setPreviewUrl(challengeData.previewUrl || '');

      // Focus first input box automatically
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);
    }
  }, [isOpen, challengeData]);

  // Expiration countdown
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen || !challengeData) return null;

  const handleChange = (index, value) => {
    // Only accept alphanumeric / digits
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned[cleaned.length - 1]; // pick last char
    setOtp(newOtp);

    // Auto move to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasted.length >= 6) {
      const chars = pasted.slice(0, 6).split('');
      setOtp(chars);
      inputRefs.current[5]?.focus();
    }
  };

  const handleAutoFill = () => {
    if (liveOtpCode && liveOtpCode.length === 6) {
      setOtp(liveOtpCode.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/verify-otp', {
        userId: challengeData.userId,
        role: challengeData.role,
        otp: fullOtp
      });

      if (data.success || data.token) {
        onSuccess(data);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setError('');
    setResendStatus('Sending new verification code...');
    setCanResend(false);
    setResendCooldown(60);

    try {
      const { data } = await axios.post('/api/auth/resend-otp', {
        userId: challengeData.userId,
        role: challengeData.role
      });

      if (data.success) {
        setResendStatus('✓ New OTP code sent to your email!');
        if (data.liveOtpCode) setLiveOtpCode(data.liveOtpCode);
        if (data.previewUrl) setPreviewUrl(data.previewUrl);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setTimeout(() => setResendStatus(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
      setResendStatus('');
      setCanResend(true);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#0f172a',
          borderRadius: '24px',
          border: '1px solid rgba(71, 85, 105, 0.6)',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          color: '#f8fafc',
          boxSizing: 'border-box'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(51, 65, 85, 0.6)',
            border: 'none',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#475569'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.6)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>

        {/* Header Badge & Icon */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.4))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '30px' }}>mark_email_read</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.025em', color: '#ffffff' }}>
            Two-Factor Verification
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 6px 0' }}>
            Enter the 6-digit code sent to your registered email:
          </p>
          <div 
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              backgroundColor: 'rgba(49, 46, 129, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '9999px',
              color: '#a5b4fc',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {challengeData.maskedEmail || challengeData.email}
          </div>
        </div>

        {/* Live Notification Notification Pill */}
        {liveOtpCode && (
          <div 
            style={{
              marginBottom: '18px',
              padding: '10px 14px',
              borderRadius: '14px',
              backgroundColor: 'rgba(6, 78, 59, 0.5)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#6ee7b7'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '18px' }}>notifications_active</span>
              <span>Live OTP Code: <strong style={{ fontFamily: 'monospace', color: '#ffffff', fontSize: '15px', letterSpacing: '2px' }}>{liveOtpCode}</strong></span>
            </div>
            <button
              type="button"
              onClick={handleAutoFill}
              style={{
                padding: '4px 12px',
                backgroundColor: '#10b981',
                border: 'none',
                borderRadius: '8px',
                color: '#022c22',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Auto-Fill
            </button>
          </div>
        )}

        {/* Error / Status Messages */}
        {error && (
          <div 
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              backgroundColor: 'rgba(127, 29, 29, 0.6)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              borderRadius: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#f87171', fontSize: '18px', flexShrink: 0 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div 
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              backgroundColor: 'rgba(49, 46, 129, 0.6)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              color: '#c7d2fe',
              borderRadius: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#818cf8', fontSize: '18px', flexShrink: 0 }}>info</span>
            <span>{resendStatus}</span>
          </div>
        )}

        {/* 6 Digit Input Boxes */}
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
              boxSizing: 'border-box'
            }}
            onPaste={handlePaste}
          >
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                style={{
                  flex: '1 1 0',
                  minWidth: '0',
                  height: '56px',
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  borderRadius: '12px',
                  backgroundColor: '#020617',
                  border: digit ? '2px solid #6366f1' : '1px solid #334155',
                  color: '#ffffff',
                  outline: 'none',
                  boxShadow: digit ? '0 0 12px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            ))}
          </div>

          {/* Expiration Timer & Resend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>timer</span>
              <span>Expires in: <strong style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</strong></span>
            </div>

            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                Resend Code
              </button>
            ) : (
              <span style={{ color: '#64748b' }}>
                Resend in {resendCooldown}s
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              style={{
                width: '100%',
                height: '48px',
                background: 'linear-gradient(to right, #4f46e5, #00478d)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                opacity: loading || otp.join('').length !== 6 ? 0.6 : 1,
                boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified_user</span>
                  <span>Confirm & Log In</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px',
                textAlign: 'center'
              }}
            >
              Cancel and try another account
            </button>
          </div>
        </form>

        {previewUrl && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
            <span>Live Inbox Preview: </span>
            <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>
              Open Email in Browser ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
