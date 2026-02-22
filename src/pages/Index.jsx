import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, MapPin, Shield, Users } from 'lucide-react';

const GeoAttendLogo = ({ className = "h-10 w-10" }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="28" r="20" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <ellipse cx="32" cy="28" rx="12" ry="20" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    <line x1="12" y1="28" x2="52" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    <ellipse cx="32" cy="28" rx="20" ry="8" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    <path
      d="M32 2C19.85 2 10 11.85 10 24c0 16.5 22 38 22 38s22-21.5 22-38C54 11.85 44.15 2 32 2z"
      stroke="hsl(var(--primary))"
      strokeWidth="2.5"
      fill="hsl(var(--primary))"
      fillOpacity="0.12"
    />
    <circle cx="32" cy="24" r="10" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
    <ellipse cx="32" cy="24" rx="6" ry="10" stroke="hsl(var(--primary))" strokeWidth="1.2" fill="none" />
    <line x1="22" y1="24" x2="42" y2="24" stroke="hsl(var(--primary))" strokeWidth="1.2" />
    <line x1="32" y1="14" x2="32" y2="34" stroke="hsl(var(--primary))" strokeWidth="1.2" />
  </svg>
);

const Index = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <GeoAttendLogo className="h-8 w-8 text-foreground" />
          <span className="text-lg font-bold tracking-tight">GeoAttend</span>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="absolute top-16 right-6 z-30 w-56 rounded-2xl border border-border bg-card shadow-2xl p-2 animate-slide-up">
          <button onClick={() => { navigate('/login'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:bg-secondary/60 transition-colors">Sign In</button>
          <button onClick={() => { navigate('/register'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:bg-secondary/60 transition-colors">Create Account</button>
          <button onClick={() => { navigate('/dashboard'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:bg-secondary/60 transition-colors">Attendance</button>
        </div>
      )}

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 max-w-3xl mx-auto">
        <div className="mb-8">
          <GeoAttendLogo className="h-24 w-24 text-foreground mx-auto" />
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
          Geo<span className="text-primary">Attend</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-md leading-relaxed mb-10">
          Location-verified attendance tracking powered by Haversine distance calculation and anti-spoofing algorithms.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => navigate('/login')} size="lg" className="h-12 px-8 rounded-xl font-semibold shadow-lg shadow-primary/20 text-sm">
            Get Started
          </Button>
          <Button onClick={() => navigate('/register')} variant="outline" size="lg" className="h-12 px-8 rounded-xl font-semibold text-sm">
            Register
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 w-full">
          {[
            { icon: MapPin, title: 'Radius Geofencing', desc: 'Define a center point and radius — Haversine formula validates distance accurately' },
            { icon: Shield, title: 'Anti-Spoofing', desc: 'GPS accuracy checks and timestamp drift detection' },
            { icon: Users, title: 'Role-Based Access', desc: 'Separate flows for students, faculty, and administrators' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border/40 bg-card/50 p-6 text-left hover:border-primary/30 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/30 py-6 text-center">
        <p className="text-xs text-muted-foreground">GeoAttend — Haversine-powered attendance verification</p>
      </footer>
    </div>
  );
};

export default Index;
