import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = register(
        { email, name, role, department, studentId: role === 'student' ? studentId : undefined },
        password
      );
      toast({ title: 'Account created!', description: `Welcome, ${user.name}` });
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Join GeoAttend to manage attendance</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required className="bg-secondary/50" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-secondary/50" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-secondary/50" placeholder="Min 6 characters" minLength={6} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <Select value={role} onValueChange={v => setRole(v as UserRole)}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <Input value={department} onChange={e => setDepartment(e.target.value)} className="bg-secondary/50" placeholder="Computer Science" />
            </div>
            {role === 'student' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                <Input value={studentId} onChange={e => setStudentId(e.target.value)} className="bg-secondary/50" placeholder="STU-001" />
              </div>
            )}
            <Button type="submit" className="w-full font-semibold">Create Account</Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/login')} className="text-sm text-primary hover:underline">
              Already have an account? Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
