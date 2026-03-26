import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, CheckCircle2, XCircle, Clock, LogOut, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAttendanceRecords, getGeofences } from '@/lib/storage';
import { AttendanceRecord, Geofence } from '@/types';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Get geofences assigned to this teacher
  const myGeofences = useMemo(() => getGeofences().filter(g => g.teacherId === user?.id), [user?.id]);
  const myGeofenceIds = useMemo(() => new Set(myGeofences.map(g => g.id)), [myGeofences]);

  // Get attendance records for this teacher's classes
  const records = useMemo(() =>
    getAttendanceRecords().filter(r => myGeofenceIds.has(r.geofenceId)).reverse(),
    [myGeofenceIds]
  );

  const validCount = records.filter(r => r.status === 'valid').length;
  const todayRecords = records.filter(r => new Date(r.checkInTime).toDateString() === new Date().toDateString());
  const todayValid = todayRecords.filter(r => r.status === 'valid').length;

  // Unique students who attended
  const uniqueStudents = new Set(records.filter(r => r.status === 'valid').map(r => r.userId)).size;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <h1 className="text-lg font-bold flex items-center gap-2 tracking-tight">
            <BookOpen className="h-5 w-5 text-primary" /> Teacher Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground">{user?.subject}{user?.department ? ` · ${user.department}` : ''}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login'); }} className="rounded-xl">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto pb-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: BookOpen, value: myGeofences.length, label: 'My Classes', color: 'text-primary' },
            { icon: Clock, value: todayValid, label: 'Today', color: 'text-primary' },
            { icon: CheckCircle2, value: validCount, label: 'Total Valid', color: 'text-success' },
            { icon: Users, value: uniqueStudents, label: 'Students', color: 'text-accent' },
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

        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 bg-secondary/40 rounded-xl p-1">
            <TabsTrigger value="classes" className="rounded-lg text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" /> My Classes</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Attendance</TabsTrigger>
          </TabsList>

          {/* My Classes */}
          <TabsContent value="classes" className="space-y-2">
            {myGeofences.map(g => {
              const classRecords = records.filter(r => r.geofenceId === g.id);
              const classValid = classRecords.filter(r => r.status === 'valid').length;
              const classTodayValid = classRecords.filter(r => r.status === 'valid' && new Date(r.checkInTime).toDateString() === new Date().toDateString()).length;
              return (
                <Card key={g.id} className="border-border/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.teacherSubject}{g.classStartTime ? ` · ${g.classStartTime}` : ''}
                        </p>
                      </div>
                      <Badge variant={g.isActive ? 'default' : 'secondary'} className="text-xs rounded-lg">
                        {g.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <p className="text-lg font-bold text-primary">{classTodayValid}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Today</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <p className="text-lg font-bold">{classValid}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {myGeofences.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No classes assigned yet. Ask admin to assign you to a geofence zone.</p>
              </div>
            )}
          </TabsContent>

          {/* Attendance Records */}
          <TabsContent value="attendance" className="space-y-2">
            {records.slice(0, 50).map(r => (
              <Card key={r.id} className="border-border/30">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${r.status === 'valid' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {r.status === 'valid' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.geofenceName} · {new Date(r.checkInTime).toLocaleString()}
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
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No attendance records for your classes.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherDashboard;
