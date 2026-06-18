'use client';

import { useTranslations } from 'next-intl';
import { ArrowRightLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Compact dashboard teaser — full UI lives on /transfers */
export function DepartmentTransfersCard() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4" />
          {t('treasury.transfersTitle')}
        </CardTitle>
        <CardDescription>{t('treasury.dashboardTeaser')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href="/transfers">{t('treasury.openTransfersPage')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
