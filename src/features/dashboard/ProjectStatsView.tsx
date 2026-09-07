import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Calendar,
  Target,
  Loader2,
  Activity
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface ProjectStats {
  totals: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    unassigned: number;
    overdue: number;
    dueThisWeek: number;
    completionRate: number;
    avgProgress: number;
  };
  byStatus: Array<{
    key: string;
    name: string;
    color: string;
    category: string;
    count: number;
  }>;
  byPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
}

interface ProjectStatsViewProps {
  projectId: string;
  projectName: string;
}

export const ProjectStatsView: React.FC<ProjectStatsViewProps> = ({ projectId, projectName }) => {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [projectId]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getProjectStats(projectId);
      // Handle wrapped response
      const data = response?.data || response;
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load project stats:', error);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Activity className="w-16 h-16 text-slate-400 mb-4" />
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Aucune statistique disponible
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Les données statistiques apparaîtront ici une fois le projet actif.
        </p>
      </div>
    );
  }

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    suffix = '', 
    trend, 
    colorClass = 'from-violet-500 to-purple-600',
    iconBg = 'bg-violet-500/20'
  }: { 
    icon: any; 
    label: string; 
    value: number | string; 
    suffix?: string; 
    trend?: number;
    colorClass?: string;
    iconBg?: string;
  }) => (
    <div className="group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {value}
              {suffix && <span className="text-lg text-slate-500 ml-1">{suffix}</span>}
            </p>
            {trend !== undefined && (
              <span className={`flex items-center text-xs font-semibold ${
                trend >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>
      </div>
    </div>
  );

  const ProgressRing = ({ 
    percentage, 
    size = 120, 
    strokeWidth = 8, 
    label,
    colorClass = 'stroke-violet-500'
  }: { 
    percentage: number; 
    size?: number; 
    strokeWidth?: number; 
    label: string;
    colorClass?: string;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              className="text-slate-200 dark:text-slate-800"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={colorClass}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {percentage}%
            </span>
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-3">{label}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
            Statistiques du projet
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {projectName} · Vue d'ensemble des performances
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition cursor-pointer shadow-lg hover:shadow-xl"
        >
          <Activity className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Target}
          label="Total des tâches"
          value={stats.totals.total}
          colorClass="from-violet-500 to-purple-600"
          iconBg="bg-violet-500/20"
        />
        <StatCard
          icon={CheckCircle2}
          label="Tâches terminées"
          value={stats.totals.completed}
          colorClass="from-emerald-500 to-teal-600"
          iconBg="bg-emerald-500/20"
        />
        <StatCard
          icon={Clock}
          label="En cours"
          value={stats.totals.inProgress}
          colorClass="from-amber-500 to-orange-600"
          iconBg="bg-amber-500/20"
        />
        <StatCard
          icon={AlertCircle}
          label="En retard"
          value={stats.totals.overdue}
          colorClass="from-rose-500 to-red-600"
          iconBg="bg-rose-500/20"
        />
      </div>

      {/* Progress & Priority Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Rate */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <ProgressRing
            percentage={Math.round(stats.totals.completionRate)}
            label="Taux de complétion"
            colorClass="stroke-emerald-500"
          />
        </div>

        {/* Status Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-500" />
            Répartition par statut
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {stats.byStatus.map((status) => (
              <div key={status.key} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{status.name}</p>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{status.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Priorités
            </h3>
            <span className="text-2xl font-black">
              {stats.totals.total}
            </span>
          </div>
          
          <div className="space-y-3">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="font-medium text-sm">{priority}</span>
                <div className="flex items-center gap-3 flex-1 ml-4">
                  <div className="flex-1 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all duration-500"
                      style={{ width: stats.totals.total > 0 ? `${(count / stats.totals.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="font-bold text-sm w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Performance
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                  Progression moyenne
                </p>
                <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {stats.totals.avgProgress}
                  <span className="text-sm font-normal ml-1">%</span>
                </p>
              </div>
              <Activity className="w-10 h-10 text-emerald-500" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <div>
                <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-1">
                  Tâches à faire
                </p>
                <p className="text-2xl font-black text-violet-900 dark:text-violet-100">
                  {stats.totals.todo}
                </p>
              </div>
              <Target className="w-10 h-10 text-violet-500" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                  Échéance cette semaine
                </p>
                <p className="text-2xl font-black text-amber-900 dark:text-amber-100">
                  {stats.totals.dueThisWeek}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-amber-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
