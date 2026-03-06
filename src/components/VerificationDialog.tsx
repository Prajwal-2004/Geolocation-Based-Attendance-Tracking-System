import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Fingerprint, MessageSquare, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isWebAuthnSupported, verifyBiometric, hasBiometricRegistered } from '@/lib/webauthn';

interface VerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

const VerificationDialog = ({ open, onClose, onVerified }: VerificationDialogProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'fingerprint' | 'otp'>('fingerprint');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [error, setError] = useState('');

  const hasFingerprint = user ? hasBiometricRegistered(user.id) : false;
  const webauthnSupported = isWebAuthnSupported();

  // Default to fingerprint if registered, otherwise OTP
  useEffect(() => {
    if (open) {
      if (hasFingerprint && webauthnSupported) {
        setMode('fingerprint');
      } else {
        setMode('otp');
      }
    }
  }, [open, hasFingerprint, webauthnSupported]);

  const handleFingerprint = async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');

    try {
      const verified = await verifyBiometric(user.id);
      if (verified) {
        onVerified();
      } else {
        setError('Fingerprint verification failed. Try again or use OTP.');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleSendOtp = () => {
    if (!user?.phoneNumber) {
      setError('No phone number registered. Please update your profile.');
      return;
    }
    setIsLoading(true);
    setError('');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    setTimeout(() => {
      setOtpSent(true);
      setIsLoading(false);
      console.log(`[DEV] OTP for ${user.phoneNumber}: ${otp}`);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    setError('');
    if (otpCode === generatedOtp) {
      onVerified();
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  const resetState = () => {
    setMode(hasFingerprint && webauthnSupported ? 'fingerprint' : 'otp');
    setIsLoading(false);
    setOtpSent(false);
    setOtpCode('');
    setGeneratedOtp('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetState(); onClose(); } }}>
      <DialogContent className="max-w-sm border-border/30 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Identity Verification</DialogTitle>
          <DialogDescription className="text-center">
            Verify your identity to complete check-in
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {mode === 'fingerprint' && (
          <div className="space-y-4 pt-2 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              {isLoading ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Fingerprint className="h-8 w-8 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Place your finger on the sensor to verify your identity
            </p>
            <Button className="w-full rounded-xl" onClick={handleFingerprint} disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Fingerprint'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground rounded-xl text-sm"
              onClick={() => { setMode('otp'); setError(''); }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Having trouble? Use OTP instead
            </Button>
          </div>
        )}

        {mode === 'otp' && (
          <div className="space-y-4 pt-2">
            {!otpSent ? (
              <>
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20 mb-3">
                    <MessageSquare className="h-8 w-8 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user?.phoneNumber
                      ? `We'll send a 6-digit code to ***${user.phoneNumber.slice(-4)}`
                      : 'No phone number on file. Please register one first.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasFingerprint && webauthnSupported && (
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setMode('fingerprint'); setError(''); }}>
                      Back
                    </Button>
                  )}
                  <Button
                    className="flex-1 rounded-xl"
                    onClick={handleSendOtp}
                    disabled={isLoading || !user?.phoneNumber}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send OTP
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">OTP Sent!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the 6-digit code sent to ***{user?.phoneNumber?.slice(-4)}
                  </p>
                  <p className="text-xs text-amber-500 mt-2 font-medium">
                    Demo mode: Check browser console for OTP
                  </p>
                </div>
                <Input
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="text-center text-lg tracking-[0.5em] font-mono bg-secondary/40 border-border/50 h-12"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setOtpSent(false); setOtpCode(''); setError(''); }}>
                    Resend
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6}
                  >
                    Verify
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDialog;
