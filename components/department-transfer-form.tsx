'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { listDepartments, type Department } from '@/lib/api/tenancy';
import { createDepartmentTransfer, listDepartmentBalances } from '@/lib/api/treasury';
import { formatTndMinor } from '@/lib/utils';
import { tndToMinor } from '@/lib/money';

export function DepartmentTransferForm({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations();
  const qc = useQueryClient();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountTnd, setAmountTnd] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);

  const deptsQ = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const balancesQ = useQuery({ queryKey: ['treasury-balances'], queryFn: listDepartmentBalances });

  const departments = deptsQ.data ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountTnd);
    if (!fromId || !toId || !amount || amount <= 0) {
      toast.error(t('treasury.transferInvalid'));
      return;
    }
    if (fromId === toId) {
      toast.error(t('treasury.sameDepartment'));
      return;
    }
    setPending(true);
    try {
      await createDepartmentTransfer({
        fromDepartmentId: fromId,
        toDepartmentId: toId,
        amountMinor: tndToMinor(amount),
        notes: notes.trim() || undefined,
      });
      toast.success(t('treasury.transferCreated'));
      setAmountTnd('');
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['treasury-transfers'] });
      void qc.invalidateQueries({ queryKey: ['treasury-balances'] });
      void qc.invalidateQueries({ queryKey: ['donation-stats'] });
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void submit(e)} className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>{t('treasury.fromDepartment')}</Label>
          <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
            <option value="">—</option>
            {departments.map((d: Department) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t('treasury.toDepartment')}</Label>
          <Select value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">—</option>
            {departments.map((d: Department) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t('treasury.amount')}</Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={amountTnd}
            onChange={(e) => setAmountTnd(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>{t('treasury.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? t('common.loading') : t('treasury.transferSubmit')}
          </Button>
        </div>
      </form>

      {balancesQ.data && balancesQ.data.length > 0 ? (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">{t('treasury.balancesSnapshot')}</p>
          {balancesQ.data.map((b) => (
            <div key={b.departmentId} className="flex justify-between gap-2 py-0.5">
              <span>{b.departmentName}</span>
              <span className="shrink-0 font-medium text-foreground tabular-nums">
                {formatTndMinor(b.availableBalanceMinor)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
