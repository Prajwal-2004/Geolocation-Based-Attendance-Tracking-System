import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, LogIn, LogOut, Clock, CheckCircle2, XCircle, Navigation, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocation } from '@/lib/geofence';
import { validateLocation, validateTimestamp, checkGpsAccuracy } from '@/lib/geofence';
import { getGeofences, getAttendanceRecords, addAttendanceRecord, updateAttendanceRecord, addAnomaly } from '@/lib/storage';
import { AttendanceRecord } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    getAttendanceRecords().filter(r => r.userId === user?.id).reverse()
  );

  const activeCheckIn = records.find(r => r.status === 'valid' && !r.checkOutTime);

  const handleCheckIn = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const location = await getCurrentLocation();

      // Anti-spoofing checks
      if (!validateTimestamp(location.timestamp)) {
        addAnomaly({ userId: user.id, userName: user.name, type: 'timestamp_mismatch', description: 'Client timestamp drift exceeds 30s', timestamp: new Date().toISOString(), locationData: location });
        toast({ title: 'Check-in rejected', description: 'Timestamp mismatch detected.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!checkGpsAccuracy(location.accuracy)) {
        addAnomaly({ userId: user.id, userName: user.name, type: 'spoofing', description: 'Suspiciously perfect GPS accuracy detected', timestamp: new Date().toISOString(), locationData: location });
        toast({ title: 'Check-in rejected', description: 'GPS accuracy anomaly detected.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const geofences = getGeofences().filter(g => g.isActive);
      if (geofences.length === 0) {
        toast({ title: 'No geofences', description: 'No active geofences configured. Contact admin.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Check duplicate
      const todayRecords = getAttendanceRecords().filter(r =>
        r.userId === user.id &&
        r.status === 'valid' &&
        new Date(r.checkInTime).toDateString() === new Date().toDateString() &&
        !r.checkOutTime
      );
      if (todayRecords.length > 0) {
        toast({ title: 'Already checked in', description: 'You have an active check-in session.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Validate against geofences
      let matched = false;
      for (const geofence of geofences) {
        const result = validateLocation(location, geofence);
        if (result.isValid) {
          const record = addAttendanceRecord({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            checkInTime: new Date().toISOString(),
            latitude: location.latitude,
            longitude: location.longitude,
            distanceFromCenter: result.distance,
            status: 'valid',
          });
          setRecords([record, ...records]);
          matched = true;
          toast({ title: 'Checked in!', description: `${geofence.name} — ${result.distance}m from center` });
          break;
        }
      }

      if (!matched) {
        const nearest = geofences[0];
        const result = validateLocation(location, nearest);
        const reason = nearest.corners && nearest.corners.length >= 3
          ? `Outside classroom boundary (${result.distance}m from center)`
          : `Outside geofence boundary (${result.distance}m from center, max ${nearest.radiusMeters}m)`;
        addAttendanceRecord({
          userId: user.id, userName: user.name, userRole: user.role,
          geofenceId: nearest.id, geofenceName: nearest.name,
          checkInTime: new Date().toISOString(),
          latitude: location.latitude, longitude: location.longitude,
          distanceFromCenter: result.distance, status: 'rejected',
          rejectionReason: reason,
        });
        addAnomaly({ userId: user.id, userName: user.name, type: 'out_of_range', description: `User is ${result.distance}m from ${nearest.name}`, timestamp: new Date().toISOString(), locationData: location });
        toast({ title: 'Check-in rejected', description: `You are outside the ${nearest.name} boundary.`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleCheckOut = async () => {
    if (!activeCheckIn) return;
    setIsLoading(true);
    try {
      const location = await getCurrentLocation();
      updateAttendanceRecord(activeCheckIn.id, { checkOutTime: new Date().toISOString() });
      setRecords(prev => prev.map(r => r.id === activeCheckIn.id ? { ...r, checkOutTime: new Date().toISOString() } : r));
      toast({ title: 'Checked out!', description: 'Your attendance has been recorded.' });
    } catch (err: any) {
      // Allow check-out even without location
      updateAttendanceRecord(activeCheckIn.id, { checkOutTime: new Date().toISOString() });
      setRecords(prev => prev.map(r => r.id === activeCheckIn.id ? { ...r, checkOutTime: new Date().toISOString() } : r));
      toast({ title: 'Checked out', description: 'Location unavailable, but check-out recorded.' });
    }
    setIsLoading(false);
  };

  const todayCount = records.filter(r => r.status === 'valid' && new Date(r.checkInTime).toDateString() === new Date().toDateString()).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">GeoAttend</h1>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <div className="rounded-lg bg-secondary/50 p-3 mb-4">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">{user?.role}</Badge>
                </div>
                {user?.role === 'admin' && (
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/admin')}>
                    Admin Dashboard
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { logout(); navigate('/login'); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6 pb-8">
        {/* Status Card */}
        <Card className="border-border/50 overflow-hidden">
          <div className={`h-1 ${activeCheckIn ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          <CardContent className="p-6 text-center space-y-4">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              {activeCheckIn && (
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring" />
              )}
              <div className={`rounded-full p-4 ${activeCheckIn ? 'bg-primary/20 border-2 border-primary' : 'bg-secondary border-2 border-border'}`}>
                <Navigation className={`h-8 w-8 ${activeCheckIn ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="text-xl font-bold">
                {activeCheckIn ? 'Checked In' : 'Not Checked In'}
              </p>
              {activeCheckIn && (
                <p className="text-xs text-muted-foreground mt-1">
                  Since {new Date(activeCheckIn.checkInTime).toLocaleTimeString()} at {activeCheckIn.geofenceName}
                </p>
              )}
            </div>
            {activeCheckIn ? (
              <Button onClick={handleCheckOut} disabled={isLoading} variant="destructive" className="w-full" size="lg">
                <LogOut className="mr-2 h-5 w-5" /> {isLoading ? 'Processing...' : 'Check Out'}
              </Button>
            ) : (
              <Button onClick={handleCheckIn} disabled={isLoading} className="w-full" size="lg">
                <LogIn className="mr-2 h-5 w-5" /> {isLoading ? 'Locating...' : 'Check In'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{todayCount}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{records.filter(r => r.status === 'valid').length}</p>
              <p className="text-xs text-muted-foreground">Total Valid</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{records.filter(r => r.status === 'rejected').length}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Records */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">RECENT ACTIVITY</h2>
          <div className="space-y-2">
            {records.slice(0, 10).map(r => (
              <Card key={r.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  {r.status === 'valid' ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.geofenceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.checkInTime).toLocaleDateString()} • {new Date(r.checkInTime).toLocaleTimeString()}
                      {r.checkOutTime && ` — ${new Date(r.checkOutTime).toLocaleTimeString()}`}
                    </p>
                  </div>
                  <Badge variant={r.status === 'valid' ? 'default' : 'destructive'} className="text-xs shrink-0">
                    {r.distanceFromCenter}m
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {records.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No attendance records yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
