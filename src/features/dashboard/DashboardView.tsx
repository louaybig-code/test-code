import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import {
  Download, BarChart2, PieChart as PieIcon,
  TrendingUp, CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { BoardData, Task } from '../../types';
import { Button } from '../../components/Button';
import toast from 'react-hot-toast';

interface DashboardViewProps { projectId: string; }

/* ── Recharts custom tooltip ── */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs font-semibold"
      style={{
        backgroundColor: 'var(--sp-surface)',
        border: '1px solid var(--sp-border)',
        boxShadow: 'var(--sp-shadow-md)',
        color: 'var(--sp-text)',
      }}
    >
      {label && <p className="mb-1" style={{ color: 'var(--sp-text-muted)' }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill ?? 'var(--sp-text)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ── KPI card ── */
const KPI: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
}> = ({ label, value, icon, accentColor }) => (
  <div
    className="p-5 rounded-2xl flex items-center justify-between gap-4"
    style={{
      backgroundColor: 'var(--sp-surface)',
      border: '1px solid var(--sp-border)',
      boxShadow: 'var(--sp-shadow-sm)',
    }}
  >
    <div>
      <p className="sp-label mb-1.5">{label}</p>
      <h4
        className="text-3xl font-black"
        style={{ color: 'var(--sp-text)', fontFamily: "'Sora', sans-serif" }}
      >
        {value}
      </h4>
    </div>
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: accentColor + '18' }}
    >
      <span style={{ color: accentColor }}>{icon}</span>
    </div>
  </div>
);

/* ── Chart widget wrapper ── */
const ChartCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, iconColor, children, className = '' }) => (
  <div
    className={`p-5 rounded-2xl space-y-4 ${className}`}
    style={{
      backgroundColor: 'var(--sp-surface)',
      border: '1px solid var(--sp-border)',
      boxShadow: 'var(--sp-shadow-sm)',
    }}
  >
    <h4
      className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
      style={{ color: 'var(--sp-text-secondary)' }}
    >
      <span style={{ color: iconColor }}>{icon}</span>
      {title}
    </h4>
    {children}
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ projectId }) => {
  const [board,     setBoard]     = useState<BoardData | null>(null);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!projectId || hasLoadedRef.current) return;
    
    hasLoadedRef.current = true;
    setIsLoading(true);
    
    Promise.all([
      apiService.getBoard(projectId),
      apiService.getProjectTasks(projectId),
    ])
      .then(([bd, tl]) => {
        setBoard(bd);
        setTasks(Array.isArray(tl) ? tl : (tl as any).tasks ?? []);
      })
      .catch(() => toast.error('Erreur lors du chargement du tableau de bord'))
      .finally(() => setIsLoading(false));
      
    // Reset flag when project changes
    return () => {
      hasLoadedRef.current = false;
    };
  }, [projectId]);

  /* ── Computed data ── */
  const statusData = (board?.columns ?? []).map((col) => ({
    name:  col.status.name,
    value: col.tasks.length,
    color: col.status.color || '#1A8C8C',
  }));

  const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  tasks.forEach((t) => { if (t.priority in priorityCounts) priorityCounts[t.priority]++; });

  const priorityData = [
    { name: 'Low',    count: priorityCounts.LOW,    fill: 'var(--sp-text-muted)' },
    { name: 'Medium', count: priorityCounts.MEDIUM, fill: 'var(--sp-teal)'       },
    { name: 'High',   count: priorityCounts.HIGH,   fill: 'var(--sp-orange)'     },
    { name: 'Urgent', count: priorityCounts.URGENT, fill: '#EF4444'              },
  ];

  const velocityData = [
    { day: 'Mon', done: 3,  remaining: 12 },
    { day: 'Tue', done: 5,  remaining: 10 },
    { day: 'Wed', done: 8,  remaining: 7  },
    { day: 'Thu', done: 12, remaining: 4  },
    { day: 'Fri', done: 15, remaining: 2  },
  ];

  const totalDone     = tasks.filter((t) => t.status === 'done').length;
  const totalProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const totalUrgent   = priorityCounts.URGENT;

  const exportCSV = () => {
    if (!tasks.length) { toast.error('Aucune tâche à exporter'); return; }
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Created'];
    const rows    = tasks.map((t) => [t.id, `"${t.title}"`, t.status, t.priority, t.createdAt ?? '']);
    const csv     = 'data:text/csv;charset=utf-8,' +
      encodeURI([headers, ...rows].map((r) => r.join(',')).join('\n'));
    const a = Object.assign(document.createElement('a'), {
      href: csv, download: `studiopilot_${projectId}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success('CSV exporté !');
  };

  const axisStyle = { stroke: 'var(--sp-text-muted)', fontSize: 11 };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between p-5 rounded-2xl"
        style={{
          backgroundColor: 'var(--sp-surface)',
          border: '1px solid var(--sp-border)',
          boxShadow: 'var(--sp-shadow-sm)',
        }}
      >
        <div>
          <h3
            className="text-lg font-bold mb-0.5"
            style={{ color: 'var(--sp-text)', fontFamily: "'Sora', sans-serif" }}
          >
            Analytics Dashboard
          </h3>
          <p className="text-xs" style={{ color: 'var(--sp-text-muted)' }}>
            Performance tracking, team velocity and workload distribution.
          </p>
        </div>
        <Button
          variant="outline-teal"
          size="sm"
          icon={<Download className="w-3.5 h-3.5" />}
          onClick={exportCSV}
        >
          Export CSV
        </Button>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI
          label="Total Tasks"
          value={isLoading ? '—' : tasks.length}
          icon={<BarChart2 className="w-6 h-6" />}
          accentColor="var(--sp-charcoal)"
        />
        <KPI
          label="Completed"
          value={isLoading ? '—' : totalDone}
          icon={<CheckCircle className="w-6 h-6" />}
          accentColor="var(--sp-teal)"
        />
        <KPI
          label="In Progress"
          value={isLoading ? '—' : totalProgress}
          icon={<Clock className="w-6 h-6" />}
          accentColor="var(--sp-orange)"
        />
      </div>

      {/* Urgent warning strip */}
      {totalUrgent > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#EF4444',
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {totalUrgent} urgent task{totalUrgent > 1 ? 's' : ''} need attention
        </div>
      )}

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Status Pie */}
        <ChartCard
          title="Status Distribution"
          icon={<PieIcon className="w-4 h-4" />}
          iconColor="var(--sp-teal)"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  innerRadius={44}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Priority Bar */}
        <ChartCard
          title="Tasks by Priority"
          icon={<BarChart2 className="w-4 h-4" />}
          iconColor="var(--sp-orange)"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} barSize={32}>
                <XAxis dataKey="name" {...axisStyle} />
                <YAxis {...axisStyle} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Velocity Area — full width */}
        <ChartCard
          title="Sprint Velocity Burndown"
          icon={<TrendingUp className="w-4 h-4" />}
          iconColor="var(--sp-teal)"
          className="lg:col-span-2"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1A8C8C" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1A8C8C" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradRem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#E8531A" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#E8531A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" {...axisStyle} />
                <YAxis {...axisStyle} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="done"
                  stroke="#1A8C8C"
                  strokeWidth={2}
                  fill="url(#gradDone)"
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="remaining"
                  stroke="#E8531A"
                  strokeWidth={2}
                  fill="url(#gradRem)"
                  name="Remaining"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 pt-1">
            {[
              { color: '#1A8C8C', label: 'Completed' },
              { color: '#E8531A', label: 'Remaining' },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sp-text-muted)' }}>
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
