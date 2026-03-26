import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, LogOut, Clock, CheckCircle2, XCircle, Navigation, Menu, Shield, MapPin, Crosshair } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocation } from '@/lib/geofence';
import { validateLocation, validateTimestamp, checkGpsAccuracy } from '@/lib/geofence';
import { getGeofences, getAttendanceRecords, addAttendanceRecord, updateAttendanceRecord, addAnomaly } from '@/lib/storage';
import { AttendanceRecord, LocationData, Geofence } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
import VerificationDialog from '@/components/VerificationDialog';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<LocationData | null>(null);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string>('');
  const activeGeofences = useMemo(() => getGeofences().filter(g => g.isActive), []);
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    getAttendanceRecords().filter(r => r.userId === user?.id).reverse()
  );

  const isAdmin = user?.role === 'admin';
  const activeCheckIn = records.find(r => r.status === 'valid' && !r.checkOutTime);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState(false);

  const handleCaptureLocation = async () => {
    setIsCapturing(true);
    setCapturedLocation(null);
    try {
      const location = await getCurrentLocation(30, 15000);
      setCapturedLocation(location);
      const accuracyNote = location.accuracy > 30
        ? ` (accuracy: ~${Math.round(location.accuracy)}m — try moving outdoors for better GPS)`
        : ` (accurate up to ${Math.round(location.accuracy)}m)`;
      toast({ title: 'Location captured', description: `GPS coordinates acquired${accuracyNote}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsCapturing(false);
  };

  const handleCheckIn = async () => {
    if (!user || !capturedLocation || !selectedGeofenceId) return;
    setIsLoading(true);
    try {
      const location = capturedLocation;

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

      const geofence = activeGeofences.find(g => g.id === selectedGeofenceId);
      if (!geofence) {
        toast({ title: 'Error', description: 'Selected class not found.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // 5-minute buffer check using device time
      if (geofence.classStartTime) {
        const now = new Date();
        const [startH, startM] = geofence.classStartTime.split(':').map(Number);
        const classStart = new Date(now);
        classStart.setHours(startH, startM, 0, 0);
        const diffMin = (now.getTime() - classStart.getTime()) / 60000;
        if (diffMin < 0 || diffMin > 5) {
          const timeStr = geofence.classStartTime;
          const reason = diffMin < 0
            ? `Class hasn't started yet (starts at ${timeStr})`
            : `Check-in window expired (class started at ${timeStr}, 5-min buffer exceeded)`;
          toast({ title: 'Check-in rejected', description: reason, variant: 'destructive' });
          setIsLoading(false);
          return;
        }
      }

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

      const result = validateLocation(location, geofence);
      if (result.isValid) {
        // Location valid → show identity verification before completing check-in
        setPendingCheckIn(true);
        setShowVerification(true);
        setIsLoading(false);
      } else {
        const reason = `Outside ${geofence.name} boundary (${result.distance}m from center, max ${result.maxDistance}m, accurate up to ${Math.round(location.accuracy)}m)`;
        addAttendanceRecord({
          userId: user.id, userName: user.name, userRole: user.role,
          geofenceId: geofence.id, geofenceName: geofence.name,
          checkInTime: new Date().toISOString(),
          latitude: location.latitude, longitude: location.longitude,
          distanceFromCenter: result.distance, status: 'rejected',
          rejectionReason: reason,
        });
        addAnomaly({ userId: user.id, userName: user.name, type: 'out_of_range', description: `User is ${result.distance}m from ${geofence.name}`, timestamp: new Date().toISOString(), locationData: location });
        setCapturedLocation(null);
        setSelectedGeofenceId('');
        toast({ title: 'Check-in rejected', description: `You are outside the ${geofence.name} boundary.`, variant: 'destructive' });
        setIsLoading(false);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const completeCheckIn = () => {
    if (!user || !capturedLocation || !selectedGeofenceId) return;
    const geofence = activeGeofences.find(g => g.id === selectedGeofenceId);
    if (!geofence) return;
    const location = capturedLocation;
    const result = validateLocation(location, geofence);
    const record = addAttendanceRecord({
      userId: user.id, userName: user.name, userRole: user.role,
      geofenceId: geofence.id, geofenceName: geofence.name,
      checkInTime: new Date().toISOString(),
      latitude: location.latitude, longitude: location.longitude,
      distanceFromCenter: result.distance, status: 'valid',
    });
    setRecords([record, ...records]);
    setCapturedLocation(null);
    setSelectedGeofenceId('');
    setPendingCheckIn(false);
    setShowVerification(false);
    toast({ title: 'Checked in!', description: `${geofence.name} — Identity verified & location confirmed` });
  };

  const handleCheckOut = async () => {
    if (!activeCheckIn) return;
    setIsLoading(true);
    try {
      await getCurrentLocation();
      updateAttendanceRecord(activeCheckIn.id, { checkOutTime: new Date().toISOString() });
      setRecords(prev => prev.map(r => r.id === activeCheckIn.id ? { ...r, checkOutTime: new Date().toISOString() } : r));
      toast({ title: 'Checked out!', description: 'Your attendance has been recorded.' });
    } catch {
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
      <header className="sticky top-0 z-10 border-b border-border/30 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <h1 className="text-lg font-bold tracking-tight">GeoAttend</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <div className="rounded-xl bg-secondary/50 p-4 mb-4">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize text-xs">{user?.role}</Badge>
                </div>
                {isAdmin && (
                  <Button variant="ghost" className="w-full justify-start rounded-xl" onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" /> Admin Panel
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-start text-destructive rounded-xl" onClick={() => { logout(); navigate('/login'); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-5 pb-8">
        {/* Status Card — hidden for admins */}
        {!isAdmin && (
          <Card className="border-border/30 overflow-hidden shadow-xl shadow-primary/5">
            <div className={`h-1 ${activeCheckIn ? 'bg-primary' : capturedLocation ? 'bg-accent' : 'bg-muted-foreground/20'}`} />
            <CardContent className="p-8 text-center space-y-5">
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                {activeCheckIn && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring" />
                )}
                <div className={`rounded-full p-5 transition-all ${activeCheckIn ? 'bg-primary/15 border-2 border-primary shadow-lg shadow-primary/20' : capturedLocation ? 'bg-accent/15 border-2 border-accent' : 'bg-secondary border-2 border-border/50'}`}>
                  {capturedLocation && !activeCheckIn ? (
                    <MapPin className="h-8 w-8 text-accent" />
                  ) : (
                    <Navigation className={`h-8 w-8 ${activeCheckIn ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Status</p>
                <p className="text-xl font-bold mt-1">
                  {activeCheckIn ? 'Checked In' : capturedLocation ? 'Location Captured' : 'Not Checked In'}
                </p>
                {activeCheckIn && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Since {new Date(activeCheckIn.checkInTime).toLocaleTimeString()} at {activeCheckIn.geofenceName}
                  </p>
                )}
              </div>

              {/* Captured Location Details */}
              {capturedLocation && !activeCheckIn && (
                <div className="rounded-xl bg-secondary/50 p-4 text-left space-y-2 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Crosshair className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Location</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Latitude</p>
                      <p className="font-mono font-medium">{capturedLocation.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Longitude</p>
                      <p className="font-mono font-medium">{capturedLocation.longitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Accurate up to</p>
                      <p className="font-mono font-medium">{Math.round(capturedLocation.accuracy)}m</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Time</p>
                      <p className="font-mono font-medium">{new Date(capturedLocation.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Class Selection */}
              {capturedLocation && !activeCheckIn && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Class</p>
                  <Select value={selectedGeofenceId} onValueChange={setSelectedGeofenceId}>
                    <SelectTrigger className="bg-secondary/40 border-border/50 h-11 rounded-xl">
                      <SelectValue placeholder="Choose your class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeGeofences.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}{g.teacherName ? ` — ${g.teacherName}` : ''}{g.teacherSubject ? ` (${g.teacherSubject})` : ''}{g.classStartTime ? ` · ${g.classStartTime}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeGeofences.length === 0 && (
                    <p className="text-xs text-destructive">No active classes available. Contact admin.</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {activeCheckIn ? (
                <Button onClick={handleCheckOut} disabled={isLoading} variant="destructive" className="w-full h-12 font-semibold rounded-xl shadow-lg" size="lg">
                  <LogOut className="mr-2 h-5 w-5" /> {isLoading ? 'Processing...' : 'Check Out'}
                </Button>
              ) : capturedLocation ? (
                <div className="space-y-2">
                  <Button onClick={handleCheckIn} disabled={isLoading || !selectedGeofenceId} className="w-full h-12 font-semibold rounded-xl shadow-lg shadow-primary/20" size="lg">
                    <LogIn className="mr-2 h-5 w-5" /> {isLoading ? 'Verifying...' : 'Check In'}
                  </Button>
                  <Button onClick={handleCaptureLocation} disabled={isCapturing} variant="outline" className="w-full rounded-xl" size="sm">
                    <Crosshair className="mr-2 h-4 w-4" /> {isCapturing ? 'Recapturing...' : 'Recapture Location'}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleCaptureLocation} disabled={isCapturing} className="w-full h-12 font-semibold rounded-xl shadow-lg shadow-primary/20" size="lg">
                  <Crosshair className="mr-2 h-5 w-5" /> {isCapturing ? 'Capturing...' : 'Capture Location'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center space-y-3">
              <Shield className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">You're logged in as admin. Check-in is not available for administrators.</p>
              <Button onClick={() => navigate('/admin')} className="rounded-xl shadow-lg shadow-primary/20">
                <Shield className="mr-2 h-4 w-4" /> Go to Admin Panel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{todayCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Today</p>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{records.filter(r => r.status === 'valid').length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Valid</p>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{records.filter(r => r.status === 'rejected').length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Records */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {records.slice(0, 10).map(r => (
              <Card key={r.id} className="border-border/30">
                <CardContent className="p-3.5 flex items-center gap-3">
                  {r.status === 'valid' ? (
                    <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.geofenceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.checkInTime).toLocaleDateString()} · {new Date(r.checkInTime).toLocaleTimeString()}
                      {r.checkOutTime && ` — ${new Date(r.checkOutTime).toLocaleTimeString()}`}
                    </p>
                  </div>
                  <Badge variant={r.status === 'valid' ? 'default' : 'destructive'} className="text-xs shrink-0 rounded-lg">
                    {r.distanceFromCenter}m
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {records.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <VerificationDialog
        open={showVerification}
        onClose={() => { setShowVerification(false); setPendingCheckIn(false); }}
        onVerified={completeCheckIn}
      />
    </div>
  );
};

export default Dashboard;
