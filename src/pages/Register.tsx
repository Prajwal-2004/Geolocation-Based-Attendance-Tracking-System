import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fingerprint } from 'lucide-react';
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
      toast({ title: 'Account created!', description: `Welcome, ${user.name}` });
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <Card className="w-full max-w-md border-border/30 bg-card/60 backdrop-blur-xl shadow-2xl relative z-10">
        <CardContent className="p-8">
          <div className="text-center space-y-4 mb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
              <Fingerprint className="h-8 w-8 text-primary" />
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
