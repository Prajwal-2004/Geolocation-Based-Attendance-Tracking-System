import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { deliverOtp, requestNotificationPermission } from '@/lib/otp-delivery';

interface VerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

const VerificationDialog = ({ open, onClose, onVerified }: VerificationDialogProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  // Pre-prompt for notification permission as soon as the dialog opens, so the
  // very first OTP can already arrive as a system notification.
  useEffect(() => {
    if (open) void requestNotificationPermission();
  }, [open]);

  // Normalize a phone number to E.164. If it's already +<digits>, keep it.
  // Otherwise strip non-digits and assume India (+91) by default.
  const toE164 = (raw?: string): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
    return null;
  };

  const handleSendOtp = async () => {
    const e164 = toE164(user?.phoneNumber);
    if (!e164) {
      setError(`Invalid phone number on file: "${user?.phoneNumber ?? ''}". Please update your profile.`);
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-otp', {
        body: { phoneNumber: e164 },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.devOtp) {
        // Deliver via system notification + SMS-styled toast.
        await deliverOtp(data.devOtp, e164);
        console.log(`[DEV] OTP for ${e164}: ${data.devOtp}`);
      }
      setOtpSent(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send OTP';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const e164 = toE164(user?.phoneNumber);
    if (!e164) return;
    setError('');
    setIsVerifying(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-otp', {
        body: { phoneNumber: e164, otp: otpCode },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.verified) {
        onVerified();
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verification failed';
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const resetState = () => {
    setIsLoading(false);
    setIsVerifying(false);
    setOtpSent(false);
    setOtpCode('');
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
            Verify your identity via OTP to complete check-in
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4 pt-2">
          {!otpSent ? (
            <>
              <div className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20 mb-3">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 text-accent animate-spin" />
                  ) : (
                    <MessageSquare className="h-8 w-8 text-accent" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {user?.phoneNumber
                    ? `We'll generate a 6-digit code for ***${user.phoneNumber.slice(-4)}`
                    : 'No phone number on file. Please register one first.'}
                </p>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={handleSendOtp}
                disabled={isLoading || !user?.phoneNumber}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <div className="text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Code sent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check your notifications. Enter the 6-digit code sent to ***{user?.phoneNumber?.slice(-4)}
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
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setOtpSent(false); setOtpCode(''); setError(''); }} disabled={isVerifying}>
                  Resend
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDialog;
