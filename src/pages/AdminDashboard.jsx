import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { MapPin, Users, AlertTriangle, BarChart3, Trash2, LogOut, ArrowLeft, CheckCircle2, XCircle, Clock, Shield, Crosshair, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getGeofences, addGeofence, deleteGeofence, updateGeofence, getAttendanceRecords, getAnomalies, getUsers } from '@/lib/storage';
import { getCurrentLocation } from '@/lib/geofence';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [geofences, setGeofences] = useState(getGeofences);
  const [records] = useState(() => getAttendanceRecords().reverse());
  const [anomalies] = useState(() => getAnomalies().reverse());
  const [users] = useState(getUsers);

  // Geofence form — center point + radius
  const [gName, setGName] = useState('');
  const [centerLat, setCenterLat] = useState('');
  const [centerLon, setCenterLon] = useState('');
  const [radius, setRadius] = useState('50');
  const [isCapturingCenter, setIsCapturingCenter] = useState(false);

  const captureCenterLocation = async () => {
    setIsCapturingCenter(true);
    try {
      const location = await getCurrentLocation();
      setCenterLat(location.latitude.toFixed(6));
      setCenterLon(location.longitude.toFixed(6));
      toast({ title: 'Center captured', description: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (accuracy: ${location.accuracy.toFixed(1)}m)` });
    } catch (err) {
      toast({ title: 'Location error', description: err.message, variant: 'destructive' });
    }
    setIsCapturingCenter(false);
  };

  const handleAddGeofence = (e) => {
    e.preventDefault();
    const lat = parseFloat(centerLat);
    const lon = parseFloat(centerLon);
    const rad = parseFloat(radius);
    if (isNaN(lat) || isNaN(lon)) {
      toast({ title: 'Invalid coordinates', description: 'Please capture or enter center coordinates.', variant: 'destructive' });
      return;
    }
    if (isNaN(rad) || rad <= 0) {
      toast({ title: 'Invalid radius', description: 'Please enter a valid radius in meters.', variant: 'destructive' });
      return;
    }
    const g = addGeofence({
      name: gName,
      latitude: lat,
      longitude: lon,
      radiusMeters: rad,
      createdBy: user.id,
      isActive: true,
    });
    setGeofences([...geofences, g]);
    setGName('');
    setCenterLat('');
    setCenterLon('');
    setRadius('50');
    toast({ title: 'Geofence created', description: `${g.name} — ${rad}m radius` });
  };

  const handleDeleteGeofence = (id) => {
    deleteGeofence(id);
    setGeofences(geofences.filter((g) => g.id !== id));
    toast({ title: 'Geofence deleted' });
  };

  const handleToggleGeofence = (id, active) => {
    updateGeofence(id, { isActive: active });
    setGeofences(geofences.map((g) => g.id === id ? { ...g, isActive: active } : g));
  };

  const validCount = records.filter((r) => r.status === 'valid').length;
  const todayCount = records.filter((r) => new Date(r.checkInTime).toDateString() === new Date().toDateString()).length;

  const formatGeofence = (g) => `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)} · ${g.radiusMeters}m radius`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl"><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold flex items-center gap-2 tracking-tight"><Shield className="h-5 w-5 text-primary" /> Admin Panel</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login'); }} className="rounded-xl"><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto pb-8">
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

          <TabsContent value="geofences" className="space-y-4">
            <Card className="border-border/30 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Add Geofence Zone</CardTitle>
                <p className="text-xs text-muted-foreground">Set a center point and radius. Use "Capture" to grab your current GPS position as center, or type coordinates manually.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddGeofence} className="space-y-4">
                  <Input placeholder="Zone name (e.g., Room 101)" value={gName} onChange={(e) => setGName(e.target.value)} required className="bg-secondary/40 border-border/50 h-11" />

                  <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Center Point</p>
                      <Button type="button" variant="outline" size="sm" onClick={captureCenterLocation} disabled={isCapturingCenter} className="h-8 text-xs rounded-lg gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                        {isCapturingCenter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                        {isCapturingCenter ? 'Capturing…' : 'Capture Center'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Latitude" type="number" step="any" value={centerLat} onChange={(e) => setCenterLat(e.target.value)} required className="bg-secondary/40 border-border/50 text-xs h-9" />
                      <Input placeholder="Longitude" type="number" step="any" value={centerLon} onChange={(e) => setCenterLon(e.target.value)} required className="bg-secondary/40 border-border/50 text-xs h-9" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Radius (meters)</p>
                    <Input placeholder="e.g., 50" type="number" min="1" step="1" value={radius} onChange={(e) => setRadius(e.target.value)} required className="bg-secondary/40 border-border/50 text-xs h-9" />
                    <p className="text-[10px] text-muted-foreground">Students must be within this distance from the center to check in.</p>
                  </div>

                  <Button type="submit" className="w-full h-11 font-semibold rounded-xl shadow-lg shadow-primary/20">Create Zone</Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {geofences.map((g) => (
                <Card key={g.id} className="border-border/30">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${g.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <MapPin className={`h-4 w-4 ${g.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground break-all leading-relaxed">{formatGeofence(g)}</p>
                    </div>
                    <Switch checked={g.isActive} onCheckedChange={(v) => handleToggleGeofence(g.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGeofence(g.id)} className="rounded-lg"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

          <TabsContent value="attendance" className="space-y-2">
            {records.slice(0, 50).map((r) => (
              <Card key={r.id} className="border-border/30">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${r.status === 'valid' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {r.status === 'valid' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.userName} <Badge variant="outline" className="ml-1 text-[10px] capitalize">{r.userRole}</Badge></p>
                    <p className="text-xs text-muted-foreground">
                      {r.geofenceName} · {new Date(r.checkInTime).toLocaleString()}
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

          <TabsContent value="anomalies" className="space-y-2">
            {anomalies.map((a) => (
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

          <TabsContent value="users" className="space-y-2">
            {users.map((u) => (
              <Card key={u.id} className="border-border/30">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{u.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} {u.department && `· ${u.department}`}</p>
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
