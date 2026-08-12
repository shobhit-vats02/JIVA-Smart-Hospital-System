'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, Activity } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { PageLoader } from '@/components/ui/Spinner';
import { AIEngineStatus } from '@/components/admin/AIEngineStatus';

export function AnalyticsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => (await adminApi.getAnalytics()).data,
  });

  if (isLoading) return <PageLoader label="Loading analytics" />;

  const daily = data?.daily || [];
  const deptDist = data?.departmentDistribution || [];
  const hourly = data?.hourly || [];
  const maxAppts = Math.max(...daily.map((d) => d.appointments), 1);
  const maxDept = Math.max(...deptDist.map((d) => d.count), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <BarChart3 className="h-5 w-5 text-primary" /> Hospital Analytics
      </h2>

      {/* Silent AI engine status */}
      <AIEngineStatus />

      {/* 7-day bar chart */}
      <div className="glass p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> Appointments — last 7 days</p>
        <div className="flex items-end gap-3" style={{ height: 220 }}>
          {daily.map((d, i) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-ink-2">{d.appointments}</span>
              <motion.div
                className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-primary to-royal"
                initial={{ height: 0 }}
                animate={{ height: `${(d.appointments / maxAppts) * 160}px` }}
                transition={{ duration: 0.8, delay: i * 0.06 }}
              />
              <span className="text-[10px] text-ink-3">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department distribution */}
        <div className="glass p-6">
          <p className="mb-4 font-semibold">Appointments by department (today)</p>
          <div className="space-y-3">
            {deptDist.map((d, i) => (
              <div key={d.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-ink-2">{d.count}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-soft">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet to-royal"
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / maxDept) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly load today */}
        <div className="glass p-6">
          <p className="mb-4 font-semibold">Hospital load by hour (today)</p>
          {hourly.length ? (
            <div className="flex items-end gap-1.5" style={{ height: 180 }}>
              {hourly.map((h, i) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-t-md bg-gradient-to-t from-amber-400 to-orange-500"
                    initial={{ height: 0 }}
                    animate={{ height: `${(h.hospitalLoad || h.appointments * 5) % 160}px` }}
                    transition={{ duration: 0.6, delay: i * 0.04 }}
                  />
                  <span className="text-[10px] text-ink-3">{h.hour}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-3">
              Hourly data will appear as the day progresses.
            </p>
          )}
        </div>
      </div>

      {/* Daily table */}
      <div className="glass p-6">
        <p className="mb-3 font-semibold">Daily summary</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Appointments</th>
                <th className="pb-2 pr-3">Completed</th>
                <th className="pb-2 pr-3">Emergencies</th>
                <th className="pb-2 pr-3">Avg wait</th>
                <th className="pb-2">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="py-2 pr-3">{d.date}</td>
                  <td className="py-2 pr-3">{d.appointments}</td>
                  <td className="py-2 pr-3">{d.completed}</td>
                  <td className="py-2 pr-3">{d.emergencies}</td>
                  <td className="py-2 pr-3">{d.avgWaitMinutes}m</td>
                  <td className="py-2">{d.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
