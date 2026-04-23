import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, AlertTriangle, BarChart3, Trash2, LogOut, ArrowLeft, CheckCircle2, XCircle, Clock, Shield, Crosshair, Loader2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getGeofences, addGeofence, deleteGeofence, updateGeofence, getAttendanceRecords, getAnomalies, getUsers } from '@/lib/storage';
import { getCurrentLocation } from '@/lib/geofence';
import { getLocationPermissionState, requestLocationPermission, type LocationPermissionState } from '@/lib/location-permissions';
import { Geofence, AttendanceRecord, AnomalyLog, User as AppUser } from '@/types';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [geofences, setGeofences] = useState<Geofence[]>(getGeofences);
  const [records] = useState<AttendanceRecord[]>(() => getAttendanceRecords().reverse());
  const [anomalies] = useState<AnomalyLog[]>(() => getAnomalies().reverse());
  const [users] = useState<AppUser[]>(getUsers);

  // Faculty users for teacher dropdown
  const facultyUsers = useMemo(() => users.filter(u => u.role === 'faculty'), [users]);

  // Geofence form
  const [gName, setGName] = useState('');
  const [gAccuracy, setGAccuracy] = useState('');
  const [gClassTime, setGClassTime] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [locationPermission, setLocationPermission] = useState<LocationPermissionState>('prompt');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [corners, setCorners] = useState<Array<{ lat: string; lon: string }>>([
    { lat: '', lon: '' },
    { lat: '', lon: '' },
    { lat: '', lon: '' },
    { lat: '', lon: '' },
  ]);
  const [capturingCorner, setCapturingCorner] = useState<number | null>(null);

  const refreshLocationPermission = async () => {
    try {
      setLocationPermission(await getLocationPermissionState());
    } catch {
      setLocationPermission('prompt');
    }
  };

  useEffect(() => {
    void refreshLocationPermission();
  }, []);

  const handleEnableLocation = async () => {
    setIsRequestingPermission(true);
    try {
      const status = await requestLocationPermission();
      setLocationPermission(status);

      if (status === 'granted') {
        toast({ title: 'Location enabled', description: 'GPS access is ready for corner capture.' });
      } else if (status === 'denied') {
        toast({ title: 'Location blocked', description: 'Allow location for this app in Android settings, then come back.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Location error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRequestingPermission(false);
      void refreshLocationPermission();
    }
  };

  const captureCornerLocation = async (index: number) => {
    setCapturingCorner(index);
    try {
      const location = await getCurrentLocation();
      setLocationPermission('granted');
      const updated = [...corners];
      updated[index] = {
        lat: location.latitude.toFixed(6),
        lon: location.longitude.toFixed(6),
      };
      setCorners(updated);
      toast({ title: `Corner ${index + 1} captured`, description: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` });
    } catch (err: any) {
      toast({ title: 'Location error', description: err.message, variant: 'destructive' });
    } finally {
      setCapturingCorner(null);
      void refreshLocationPermission();
    }
  };

  const handleAddGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCorners = corners.map(c => ({
      latitude: parseFloat(c.lat),
      longitude: parseFloat(c.lon),
    }));
    if (parsedCorners.some(c => isNaN(c.latitude) || isNaN(c.longitude))) {
      toast({ title: 'Invalid coordinates', description: 'Please capture or enter all 4 corners.', variant: 'destructive' });
      return;
    }
    const centerLat = parsedCorners.reduce((s, c) => s + c.latitude, 0) / 4;
    const centerLon = parsedCorners.reduce((s, c) => s + c.longitude, 0) / 4;
    const accuracyVal = parseFloat(gAccuracy);

    // Get selected teacher info
    const selectedTeacher = facultyUsers.find(u => u.id === selectedTeacherId);

    const g = addGeofence({
      name: gName,
      latitude: centerLat,
      longitude: centerLon,
      radiusMeters: 0,
      corners: parsedCorners,
      accuracyMeters: !isNaN(accuracyVal) && accuracyVal > 0 ? accuracyVal : undefined,
      classStartTime: gClassTime || undefined,
      teacherId: selectedTeacher?.id,
      teacherName: selectedTeacher?.name,
      teacherSubject: selectedTeacher?.subject,
      createdBy: user!.id,
      isActive: true,
    });
    setGeofences([...geofences, g]);
    setGName('');
    setGAccuracy('');
    setGClassTime('');
    setSelectedTeacherId('');
    setCorners([{ lat: '', lon: '' }, { lat: '', lon: '' }, { lat: '', lon: '' }, { lat: '', lon: '' }]);
    toast({ title: 'Geofence created', description: g.name });
  };

  const handleDeleteGeofence = (id: string) => {
    deleteGeofence(id);
    setGeofences(geofences.filter(g => g.id !== id));
    toast({ title: 'Geofence deleted' });
  };

  const handleToggleGeofence = (id: string, active: boolean) => {
    updateGeofence(id, { isActive: active });
    setGeofences(geofences.map(g => g.id === id ? { ...g, isActive: active } : g));
  };

  const validCount = records.filter(r => r.status === 'valid').length;
  const todayCount = records.filter(r => new Date(r.checkInTime).toDateString() === new Date().toDateString()).length;

  const formatCorners = (g: Geofence) => {
    const accuracy = g.accuracyMeters ? ` · ≤${g.accuracyMeters}m` : '';
    const timing = g.classStartTime ? ` · 🕐${g.classStartTime}` : '';
    const teacher = g.teacherName ? ` · 👤${g.teacherName}${g.teacherSubject ? ` (${g.teacherSubject})` : ''}` : '';
    if (g.corners && g.corners.length === 4) {
      return g.corners.map((c, i) => `C${i + 1}(${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`).join(' · ') + accuracy + timing + teacher;
    }
    return `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)} · ${g.radiusMeters}m` + accuracy + timing + teacher;
  };

  const cornerLabels = ['Front-Left', 'Front-Right', 'Back-Right', 'Back-Left'];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2 tracking-tight">
              <Shield className="h-5 w-5 text-primary" /> Admin Panel
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login'); }} className="rounded-xl">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto pb-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, value: users.length, label: 'Users', color: 'text-primary' },
            { icon: Clock, value: todayCount, label: 'Today', color: 'text-primary' },
            { icon: CheckCircle2, value: validCount, label: 'Valid', color: 'text-success' },
            { icon: AlertTriangle, value: anomalies.length, label: 'Anomalies', color: 'text-warning' },
          ].map(({ icon: Icon, value, label, color }) => (
            <Card key={label} className="border-border/30">
              <CardContent className="p-4 text-center">
                <Icon className={`h-5 w-5 mx-auto ${color} mb-1.5`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="geofences" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 bg-secondary/40 rounded-xl p-1">
            <TabsTrigger value="geofences" className="rounded-lg text-xs"><MapPin className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Zones</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Records</TabsTrigger>
            <TabsTrigger value="anomalies" className="rounded-lg text-xs"><AlertTriangle className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Flags</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg text-xs"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Users</TabsTrigger>
          </TabsList>

          {/* Geofences Tab */}
          <TabsContent value="geofences" className="space-y-4">
            {locationPermission !== 'granted' && (
              <Alert className="border-border/30 bg-card/70 backdrop-blur-sm">
                <Crosshair className="h-4 w-4" />
                <AlertTitle>Enable location before capturing corners</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    {locationPermission === 'denied'
                      ? 'Location access is currently blocked for this app. Turn it on in Android settings, then return here.'
                      : 'Use this once on your phone to allow GPS access for zone setup.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEnableLocation}
                    disabled={isRequestingPermission}
                    className="w-full rounded-xl sm:w-auto"
                  >
                    <Crosshair className="mr-2 h-4 w-4" />
                    {isRequestingPermission ? 'Requesting access...' : 'Enable Location'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-border/30 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Add Geofence Zone</CardTitle>
                <p className="text-xs text-muted-foreground">Stand at each corner and use "Capture" to grab your GPS position, or type coordinates manually.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddGeofence} className="space-y-4">
                  <Input
                    placeholder="Zone name (e.g., Room 101)"
                    value={gName}
                    onChange={e => setGName(e.target.value)}
                    required
                    className="bg-secondary/40 border-border/50 h-11"
                  />

                  {/* Teacher Selection */}
                  <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Assign Teacher & Subject
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Select the teacher responsible for this class. Their subject will be auto-filled.</p>
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger className="bg-secondary/40 border-border/50 h-10">
                        <SelectValue placeholder="Choose a teacher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {facultyUsers.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}{f.subject ? ` — ${f.subject}` : ''}{f.course ? ` (${f.course})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {facultyUsers.length === 0 && (
                      <p className="text-xs text-amber-500">No faculty registered yet. Teachers must register first.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Accurate up to (meters)</p>
                    <p className="text-[10px] text-muted-foreground/70">Students within this distance from the zone center will be marked present. Leave empty to auto-calculate from corners.</p>
                    <Input
                      placeholder="e.g., 50"
                      type="number"
                      min="1"
                      step="1"
                      value={gAccuracy}
                      onChange={e => setGAccuracy(e.target.value)}
                      className="bg-secondary/40 border-border/50 h-9 text-sm"
                    />
                  </div>

                  <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Class Start Time</p>
                    <p className="text-[10px] text-muted-foreground/70">Students must check in within 5 minutes of this time. Leave empty for no time restriction.</p>
                    <Input
                      type="time"
                      value={gClassTime}
                      onChange={e => setGClassTime(e.target.value)}
                      className="bg-secondary/40 border-border/50 h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-3">
                    {corners.map((corner, i) => (
                      <div key={i} className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            Corner {i + 1} <span className="text-muted-foreground/60">({cornerLabels[i]})</span>
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => captureCornerLocation(i)}
                            disabled={capturingCorner !== null}
                            className="h-8 text-xs rounded-lg gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                          >
                            {capturingCorner === i ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Crosshair className="h-3 w-3" />
                            )}
                            {capturingCorner === i ? 'Capturing…' : 'Capture'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Latitude"
                            type="number"
                            step="any"
                            value={corner.lat}
                            onChange={e => {
                              const updated = [...corners];
                              updated[i].lat = e.target.value;
                              setCorners(updated);
                            }}
                            required
                            className="bg-secondary/40 border-border/50 text-xs h-9"
                          />
                          <Input
                            placeholder="Longitude"
                            type="number"
                            step="any"
                            value={corner.lon}
                            onChange={e => {
                              const updated = [...corners];
                              updated[i].lon = e.target.value;
                              setCorners(updated);
                            }}
                            required
                            className="bg-secondary/40 border-border/50 text-xs h-9"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button type="submit" className="w-full h-11 font-semibold rounded-xl shadow-lg shadow-primary/20">
                    Create Zone
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {geofences.map(g => (
                <Card key={g.id} className="border-border/30">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${g.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <MapPin className={`h-4 w-4 ${g.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground break-all leading-relaxed">{formatCorners(g)}</p>
                    </div>
                    <Switch checked={g.isActive} onCheckedChange={v => handleToggleGeofence(g.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGeofence(g.id)} className="rounded-lg">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {geofences.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No geofences configured yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-2">
            {records.slice(0, 50).map(r => (
              <Card key={r.id} className="border-border/30">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${r.status === 'valid' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {r.status === 'valid' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.userName} <Badge variant="outline" className="ml-1 text-[10px] capitalize">{r.userRole}</Badge></p>
                    <p className="text-xs text-muted-foreground">
                      {r.geofenceName}{r.teacherName ? ` · ${r.teacherName}` : ''}{r.teacherSubject ? ` (${r.teacherSubject})` : ''} · {new Date(r.checkInTime).toLocaleString()}
                      {r.checkOutTime && ` — ${new Date(r.checkOutTime).toLocaleTimeString()}`}
                    </p>
                    {r.rejectionReason && <p className="text-xs text-destructive mt-1">{r.rejectionReason}</p>}
                  </div>
                  <Badge variant={r.status === 'valid' ? 'default' : 'destructive'} className="text-xs shrink-0 rounded-lg">{r.distanceFromCenter}m</Badge>
                </CardContent>
              </Card>
            ))}
            {records.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No attendance records.</p>
              </div>
            )}
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-2">
            {anomalies.map(a => (
              <Card key={a.id} className="border-border/30 border-l-2 border-l-warning">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-medium">{a.userName}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{a.type.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
            {anomalies.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No anomalies detected.</p>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-2">
            {users.map(u => (
              <Card key={u.id} className="border-border/30">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.email} {u.department && `· ${u.department}`} {u.subject && `· ${u.subject}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs rounded-lg">{u.role}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
