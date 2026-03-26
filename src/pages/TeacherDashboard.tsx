import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, CheckCircle2, XCircle, Clock, LogOut, BarChart3, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAttendanceRecords, getGeofences, getUsers } from '@/lib/storage';
import { AttendanceRecord, Geofence, User as AppUser } from '@/types';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isClassTeacher = user?.classTeacherOf && user.classTeacherOf !== 'NA';

  // Parse class teacher assignment: "semester-course"
  const classTeacherSem = isClassTeacher ? user!.classTeacherOf!.split('-')[0] : null;
  const classTeacherCourse = isClassTeacher ? user!.classTeacherOf!.substring(user!.classTeacherOf!.indexOf('-') + 1) : null;

  // Get geofences assigned to this teacher (subject-specific)
  const myGeofences = useMemo(() => getGeofences().filter(g => g.teacherId === user?.id), [user?.id]);
  const myGeofenceIds = useMemo(() => new Set(myGeofences.map(g => g.id)), [myGeofences]);

  // Get attendance records for this teacher's classes
  const myRecords = useMemo(() =>
    getAttendanceRecords().filter(r => myGeofenceIds.has(r.geofenceId)).reverse(),
    [myGeofenceIds]
  );

  // Class teacher view: all students in the assigned class (semester + course)
  const allUsers = useMemo(() => getUsers(), []);
  const classStudents = useMemo(() => {
    if (!isClassTeacher) return [];
    return allUsers.filter(u =>
      u.role === 'student' &&
      u.semester === classTeacherSem &&
      u.course === classTeacherCourse
    );
  }, [isClassTeacher, classTeacherSem, classTeacherCourse, allUsers]);

  const classStudentIds = useMemo(() => new Set(classStudents.map(s => s.id)), [classStudents]);

  // ALL attendance records for class students (across all subjects/geofences)
  const classRecords = useMemo(() => {
    if (!isClassTeacher) return [];
    return getAttendanceRecords().filter(r => classStudentIds.has(r.userId)).reverse();
  }, [isClassTeacher, classStudentIds]);

  const validCount = myRecords.filter(r => r.status === 'valid').length;
  const todayRecords = myRecords.filter(r => new Date(r.checkInTime).toDateString() === new Date().toDateString());
  const todayValid = todayRecords.filter(r => r.status === 'valid').length;
  const uniqueStudents = new Set(myRecords.filter(r => r.status === 'valid').map(r => r.userId)).size;

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
              <p className="text-[10px] text-muted-foreground">
                {user?.subject}
                {isClassTeacher && ` · CT: Sem ${classTeacherSem} ${classTeacherCourse}`}
              </p>
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
          <TabsList className={`w-full grid bg-secondary/40 rounded-xl p-1 ${isClassTeacher ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="classes" className="rounded-lg text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" /> My Classes</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Attendance</TabsTrigger>
            {isClassTeacher && (
              <TabsTrigger value="class-teacher" className="rounded-lg text-xs"><GraduationCap className="h-3.5 w-3.5 mr-1" /> My Class</TabsTrigger>
            )}
          </TabsList>

          {/* My Classes */}
          <TabsContent value="classes" className="space-y-2">
            {myGeofences.map(g => {
              const classRecordsForZone = myRecords.filter(r => r.geofenceId === g.id);
              const classValid = classRecordsForZone.filter(r => r.status === 'valid').length;
              const classTodayValid = classRecordsForZone.filter(r => r.status === 'valid' && new Date(r.checkInTime).toDateString() === new Date().toDateString()).length;
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

          {/* Attendance Records (my subject) */}
          <TabsContent value="attendance" className="space-y-2">
            {myRecords.slice(0, 50).map(r => (
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
            {myRecords.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No attendance records for your classes.</p>
              </div>
            )}
          </TabsContent>

          {/* Class Teacher Tab — all students' attendance across all subjects */}
          {isClassTeacher && (
            <TabsContent value="class-teacher" className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold">
                      Class Teacher — Sem {classTeacherSem}, {classTeacherCourse}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {classStudents.length} student{classStudents.length !== 1 ? 's' : ''} enrolled · Showing attendance across all subjects
                  </p>
                </CardContent>
              </Card>

              {/* Student-wise breakdown */}
              {classStudents.map(student => {
                const studentRecords = classRecords.filter(r => r.userId === student.id);
                const studentValid = studentRecords.filter(r => r.status === 'valid').length;
                const studentToday = studentRecords.filter(r => r.status === 'valid' && new Date(r.checkInTime).toDateString() === new Date().toDateString()).length;
                return (
                  <Card key={student.id} className="border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.studentId || student.email} · Sem {student.semester}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{studentValid}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                        </div>
                      </div>
                      {studentToday > 0 && (
                        <Badge className="text-xs rounded-lg">{studentToday} today</Badge>
                      )}
                      {/* Recent records for this student */}
                      {studentRecords.slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {r.status === 'valid' ? (
                            <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive shrink-0" />
                          )}
                          <span className="truncate">
                            {r.geofenceName}{r.teacherName ? ` · ${r.teacherName}` : ''}{r.teacherSubject ? ` (${r.teacherSubject})` : ''} · {new Date(r.checkInTime).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              {classStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No students registered for Sem {classTeacherSem}, {classTeacherCourse} yet.</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherDashboard;
