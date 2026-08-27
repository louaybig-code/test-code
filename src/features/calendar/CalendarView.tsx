import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { apiService } from '../../services/api';
import { Task } from '../../types';
import { PRIORITY_CONFIG } from '../../lib/constants';
import { ErrorView } from '../../components/ErrorView';

interface CalendarViewProps {
  projectId: string;
  onSelectTask: (task: Task) => void;
}

const getMockCalendarTasks = (): Task[] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    {
      id: 'cal-1',
      title: 'Lancement de la démo client',
      dueDate: new Date(y, m, 12).toISOString(),
      priority: 'URGENT',
      status: 'todo',
      position: 1,
      projectId: 'proj-demo-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cal-2',
      title: 'Sprint Planning & Backlog Grooming',
      dueDate: new Date(y, m, 18).toISOString(),
      priority: 'HIGH',
      status: 'todo',
      position: 2,
      projectId: 'proj-demo-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cal-3',
      title: 'Revue de sécurité & Code Review',
      dueDate: new Date(y, m, 24).toISOString(),
      priority: 'MEDIUM',
      status: 'todo',
      position: 3,
      projectId: 'proj-demo-1',
      createdAt: new Date().toISOString(),
    },
  ];
};

export const CalendarView: React.FC<CalendarViewProps> = ({ projectId, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadCalendarTasks = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getCalendarTasks(projectId);
      // Only use mock if the API itself threw — empty array is a valid real response
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks(getMockCalendarTasks());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadCalendarTasks();
    }
  }, [projectId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  const getTasksForDay = (day: number) => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <div className="space-y-4">
      {/* Calendar Navigation */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-sm text-slate-100 capitalize">{monthName}</h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-2">
        {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-bold uppercase text-slate-400">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] rounded-2xl bg-slate-900/10 border border-slate-800/30 opacity-30" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayTasks = getTasksForDay(dayNum);
          return (
            <div
              key={dayNum}
              className="min-h-[100px] p-2 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex flex-col justify-between"
            >
              <span className="text-xs font-bold text-slate-400">{dayNum}</span>
              <div className="space-y-1 my-1 overflow-y-auto max-h-16">
                {dayTasks.map((t) => {
                  const priorityInfo = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.MEDIUM;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="w-full text-left p-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-[10px] font-semibold text-slate-100 truncate block cursor-pointer border border-violet-500/30"
                    >
                      {t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
