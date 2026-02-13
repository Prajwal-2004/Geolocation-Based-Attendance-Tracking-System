import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { MapPin, Users, AlertTriangle, BarChart3, Plus, Trash2, LogOut, ArrowLeft, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getGeofences, addGeofence, deleteGeofence, updateGeofence, getAttendanceRecords, getAnomalies, getUsers } from '@/lib/storage';
import { Geofence, AttendanceRecord, AnomalyLog, User as AppUser } from '@/types';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [geofences, setGeofences] = useState<Geofence[]>(getGeofences);
  const [records] = useState<AttendanceRecord[]>(() => getAttendanceRecords().reverse());
  const [anomalies] = useState<AnomalyLog[]>(() => getAnomalies().reverse());
  const [users] = useState<AppUser[]>(getUsers);

  // Geofence form — 4 corners
  const [gName, setGName] = useState('');
  const [c1Lat, setC1Lat] = useState(''); const [c1Lon, setC1Lon] = useState('');
  const [c2Lat, setC2Lat] = useState(''); const [c2Lon, setC2Lon] = useState('');
  const [c3Lat, setC3Lat] = useState(''); const [c3Lon, setC3Lon] = useState('');
  const [c4Lat, setC4Lat] = useState(''); const [c4Lon, setC4Lon] = useState('');

  const handleAddGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    const corners = [
      { latitude: parseFloat(c1Lat), longitude: parseFloat(c1Lon) },
      { latitude: parseFloat(c2Lat), longitude: parseFloat(c2Lon) },
      { latitude: parseFloat(c3Lat), longitude: parseFloat(c3Lon) },
      { latitude: parseFloat(c4Lat), longitude: parseFloat(c4Lon) },
    ];
    // Compute center for legacy compatibility
    const centerLat = corners.reduce((s, c) => s + c.latitude, 0) / 4;
    const centerLon = corners.reduce((s, c) => s + c.longitude, 0) / 4;
    const g = addGeofence({
      name: gName,
      latitude: centerLat,
      longitude: centerLon,
      radiusMeters: 0,
      corners,
      createdBy: user!.id,
      isActive: true,
    });
    setGeofences([...geofences, g]);
    setGName('');
    setC1Lat(''); setC1Lon('');
    setC2Lat(''); setC2Lon('');
    setC3Lat(''); setC3Lon('');
    setC4Lat(''); setC4Lon('');
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
    if (g.corners && g.corners.length === 4) {
      return g.corners.map((c, i) => `C${i + 1}(${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`).join(' • ');
    }
    return `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)} • ${g.radiusMeters}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Admin Panel
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto pb-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-border/50"><CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{users.length}</p><p className="text-xs text-muted-foreground">Users</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{todayCount}</p><p className="text-xs text-muted-foreground">Today</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{validCount}</p><p className="text-xs text-muted-foreground">Valid</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-2xl font-bold">{anomalies.length}</p><p className="text-xs text-muted-foreground">Anomalies</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="geofences" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 bg-secondary/50">
            <TabsTrigger value="geofences"><MapPin className="h-4 w-4 mr-1 hidden sm:inline" /> Zones</TabsTrigger>
            <TabsTrigger value="attendance"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" /> Records</TabsTrigger>
            <TabsTrigger value="anomalies"><AlertTriangle className="h-4 w-4 mr-1 hidden sm:inline" /> Flags</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Users</TabsTrigger>
          </TabsList>

          {/* Geofences Tab */}
          <TabsContent value="geofences" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Add Geofence Zone (4 Corners)</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddGeofence} className="space-y-3">
                  <Input placeholder="Zone name (e.g., Room 101)" value={gName} onChange={e => setGName(e.target.value)} required className="bg-secondary/50" />
                  
                  <p className="text-xs text-muted-foreground font-medium">Corner 1 (e.g., Front-Left)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude" type="number" step="any" value={c1Lat} onChange={e => setC1Lat(e.target.value)} required className="bg-secondary/50" />
                    <Input placeholder="Longitude" type="number" step="any" value={c1Lon} onChange={e => setC1Lon(e.target.value)} required className="bg-secondary/50" />
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">Corner 2 (e.g., Front-Right)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude" type="number" step="any" value={c2Lat} onChange={e => setC2Lat(e.target.value)} required className="bg-secondary/50" />
                    <Input placeholder="Longitude" type="number" step="any" value={c2Lon} onChange={e => setC2Lon(e.target.value)} required className="bg-secondary/50" />
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">Corner 3 (e.g., Back-Right)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude" type="number" step="any" value={c3Lat} onChange={e => setC3Lat(e.target.value)} required className="bg-secondary/50" />
                    <Input placeholder="Longitude" type="number" step="any" value={c3Lon} onChange={e => setC3Lon(e.target.value)} required className="bg-secondary/50" />
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">Corner 4 (e.g., Back-Left)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude" type="number" step="any" value={c4Lat} onChange={e => setC4Lat(e.target.value)} required className="bg-secondary/50" />
                    <Input placeholder="Longitude" type="number" step="any" value={c4Lon} onChange={e => setC4Lon(e.target.value)} required className="bg-secondary/50" />
                  </div>

                  <Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Zone</Button>
                </form>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {geofences.map(g => (
                <Card key={g.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <MapPin className={`h-5 w-5 shrink-0 ${g.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground break-all">{formatCorners(g)}</p>
                    </div>
                    <Switch checked={g.isActive} onCheckedChange={v => handleToggleGeofence(g.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGeofence(g.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {geofences.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No geofences configured yet.</p>}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-2">
            {records.slice(0, 50).map(r => (
              <Card key={r.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  {r.status === 'valid' ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.userName} <Badge variant="outline" className="ml-1 text-[10px] capitalize">{r.userRole}</Badge></p>
                    <p className="text-xs text-muted-foreground">
                      {r.geofenceName} • {new Date(r.checkInTime).toLocaleString()}
                      {r.checkOutTime && ` — ${new Date(r.checkOutTime).toLocaleTimeString()}`}
                    </p>
                    {r.rejectionReason && <p className="text-xs text-destructive mt-1">{r.rejectionReason}</p>}
                  </div>
                  <Badge variant={r.status === 'valid' ? 'default' : 'destructive'} className="text-xs shrink-0">{r.distanceFromCenter}m</Badge>
                </CardContent>
              </Card>
            ))}
            {records.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No attendance records.</p>}
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-2">
            {anomalies.map(a => (
              <Card key={a.id} className="border-border/50 border-l-2 border-l-warning">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-medium">{a.userName}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{a.type.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
            {anomalies.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No anomalies detected.</p>}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-2">
            {users.map(u => (
              <Card key={u.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} {u.department && `• ${u.department}`}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{u.role}</Badge>
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
