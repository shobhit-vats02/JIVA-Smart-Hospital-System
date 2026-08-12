'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, RefreshCw, Activity, Sparkles, Users } from 'lucide-react';
import { aiApi } from '@/lib/aiApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { formatMinutes } from '@/lib/utils';

/**
 * Silent AI engine status, surfaced inside the admin Analytics view.
 * No dedicated AI page — the engine runs automatically; this panel lets admins
 * observe its live output (predictions, recommendations) and trigger a cycle.
 */
export function AIEngineStatus() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: predictions } = useQuery({
    queryKey: ['ai', 'predictions'],
    queryFn: async () => (await aiApi.currentPredictions()).data,
    refetchInterval: 30_000,
  });
  const { data: recsData } = useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: async () => (await aiApi.recommendations()).data,
  });

  const predList = Object.entries(predictions || {});
  const recs = recsData || [];

  const runCycle = async () => {
    await aiApi.triggerCycle();
    toast('success', 'AI engine cycle complete', 'Predictions & analytics refreshed.');
    qc.invalidateQueries({ queryKey: ['ai'] });
    qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
  };

  return (
    <div className="glass glow-border p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <BrainCircuit className="h-5 w-5 text-violet" /> JIVA AI Engine
        </p>
        <span className="flex items-center gap-2 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-ink-2">Monitoring live · 60s cycle</span>
          <Button size="sm" variant="glass" onClick={runCycle} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Run cycle
          </Button>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Live waiting predictions */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Live waiting predictions
          </p>
          {predList.length ? (
            <div className="space-y-2">
              {predList.map(([doctorId, w]) => (
                <div key={doctorId} className="flex items-center justify-between rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                  <span className="truncate">Doctor {doctorId.slice(0, 8)}</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-ink-2"><Users className="h-3.5 w-3.5" /> {w.patientsAhead} ahead</span>
                    <span className="font-bold text-primary">{formatMinutes(w.waitMinutes)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              No doctors currently available to predict for.
            </p>
          )}
        </div>

        {/* Recent AI recommendations */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-violet" /> Recent AI recommendations
          </p>
          {recs.length ? (
            <div className="space-y-2">
              {recs.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-ink-3">{r.type}</span>
                  </div>
                  <p className="truncate text-xs text-ink-2">{r.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              No recommendations generated yet — they appear as the engine detects load.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
