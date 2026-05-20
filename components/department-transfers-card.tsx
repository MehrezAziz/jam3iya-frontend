'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { listDepartments, type Department } from '@/lib/api/tenancy';
import {
  createDepartmentTransfer,
  listDepartmentBalances,
  listDepartmentTransfers,
} from '@/lib/api/treasury';
import { formatTndMinor } from '@/lib/utils';
import { tndToMinor } from '@/lib/money';

export function DepartmentTransfersCard() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountTnd, setAmountTnd] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);

  const deptsQ = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const balancesQ = useQuery({ queryKey: ['treasury-balances'], queryFn: listDepartmentBalances });
  const transfersQ = useQuery({ queryKey: ['treasury-transfers'], queryFn: () => listDepartmentTransfers(20) });

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
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4" />
          {t('treasury.transfersTitle')}
        </CardTitle>
        <CardDescription>{t('treasury.transfersHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {balancesQ.data.map((b) => (
              <div key={b.departmentId} className="flex justify-between py-0.5">
                <span>{b.departmentName}</span>
                <span className="font-medium text-foreground">{formatTndMinor(b.availableBalanceMinor)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {transfersQ.data && transfersQ.data.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {transfersQ.data.map((tr) => (
              <li key={tr.id} className="rounded border border-border px-3 py-2">
                <span className="font-medium">{tr.fromDepartmentName}</span>
                {' → '}
                <span className="font-medium">{tr.toDepartmentName}</span>
                <span className="ms-2 tabular-nums">{formatTndMinor(tr.amountMinor)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
