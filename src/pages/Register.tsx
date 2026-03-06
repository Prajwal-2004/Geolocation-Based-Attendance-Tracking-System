import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // OTP verification step
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = register(
        { email, name, role, department, studentId: role === 'student' ? studentId : undefined, phoneNumber: phoneNumber || undefined },
        password
      );
      setRegisteredUser(user);
      toast({ title: 'Account created!', description: `Welcome, ${user.name}` });

      if (user.role === 'student' && user.phoneNumber) {
        // Go to OTP verification step
        setStep('otp');
        sendOtp(user.phoneNumber);
      } else {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    }
  };

  const sendOtp = (phone: string) => {
    setIsLoading(true);
    setError('');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setTimeout(() => {
      setOtpSent(true);
      setIsLoading(false);
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    setError('');
    if (otpCode === generatedOtp) {
      toast({ title: 'Phone verified!', description: 'Your phone number has been verified. Redirecting...' });
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        <Card className="w-full max-w-md border-border/30 bg-card/60 backdrop-blur-xl shadow-2xl relative z-10">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 shadow-lg shadow-primary/10">
              {isLoading ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : otpSent ? (
                <CheckCircle2 className="h-10 w-10 text-primary" />
              ) : (
                <MessageSquare className="h-10 w-10 text-primary" />
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {otpSent ? 'Enter Verification Code' : 'Sending OTP...'}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {otpSent
                  ? `Enter the 6-digit code sent to ***${registeredUser?.phoneNumber?.slice(-4)}`
                  : 'Sending a verification code to your phone...'}
              </p>
              {otpSent && (
                <p className="text-xs text-amber-500 mt-2 font-medium">
                  Demo mode: Check browser console for OTP
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-left">
                {error}
              </div>
            )}

            {otpSent && (
              <div className="space-y-4">
                <Input
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="text-center text-lg tracking-[0.5em] font-mono bg-secondary/40 border-border/50 h-12"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => { setOtpSent(false); setOtpCode(''); setError(''); sendOtp(registeredUser?.phoneNumber); }}
                  >
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <Card className="w-full max-w-md border-border/30 bg-card/60 backdrop-blur-xl shadow-2xl relative z-10">
        <CardContent className="p-8">
          <div className="text-center space-y-4 mb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
              <p className="text-sm text-muted-foreground mt-1">Join GeoAttend to manage attendance</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required className="bg-secondary/40 border-border/50 h-11" placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-secondary/40 border-border/50 h-11" placeholder="you@university.edu" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-secondary/40 border-border/50 h-11" placeholder="Min 6 characters" minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                <Select value={role} onValueChange={v => setRole(v as UserRole)}>
                  <SelectTrigger className="bg-secondary/40 border-border/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</label>
                <Input value={department} onChange={e => setDepartment(e.target.value)} className="bg-secondary/40 border-border/50 h-11" placeholder="CS" />
              </div>
            </div>
            {role === 'student' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student ID</label>
                <Input value={studentId} onChange={e => setStudentId(e.target.value)} className="bg-secondary/40 border-border/50 h-11" placeholder="STU-001" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
                className="bg-secondary/40 border-border/50 h-11"
                placeholder="+1234567890"
              />
              <p className="text-[10px] text-muted-foreground">Required for OTP verification during check-in</p>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold text-sm tracking-wide shadow-lg shadow-primary/20">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/login')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Already have an account? <span className="text-primary font-medium">Sign In</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
