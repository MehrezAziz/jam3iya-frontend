'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { setupTwoFactor, confirmTwoFactor } from '@/lib/api/auth';

export default function Setup2faPage() {
  const t = useTranslations();
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function begin() {
    try {
      const data = await setupTwoFactor();
      setQr(data.qrDataUrl);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function confirm() {
    try {
      const res = await confirmTwoFactor(code);
      setRecoveryCodes(res.recoveryCodes);
      toast.success(t('common.successUpdated'));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (recoveryCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.twoFactorRecoveryTitle')}</CardTitle>
          <CardDescription>{t('auth.twoFactorRecoveryHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <li key={c} className="rounded border border-border bg-muted/50 px-3 py-2 text-center">
                {c}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('auth.twoFactorSetupTitle')}</CardTitle>
        <CardDescription>{t('auth.twoFactorSetupHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qr ? (
          <Button onClick={begin} className="w-full">
            {t('common.create')}
          </Button>
        ) : (
          <>
            <div className="flex justify-center">
              <Image src={qr} alt="2FA QR" width={224} height={224} unoptimized />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">{t('auth.twoFactorCode')}</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button onClick={confirm} className="w-full" disabled={code.length !== 6}>
              {t('auth.twoFactorConfirm')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
