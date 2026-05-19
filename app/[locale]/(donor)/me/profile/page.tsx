import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';

export default async function MyProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Inner />;
}

function Inner() {
  const t = useTranslations();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t('nav.myProfile')}</h1>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Profile editing, pseudo, fiscal id, visibility preferences ("see PP only when paid out")
          will be exposed here.
        </CardContent>
      </Card>
    </div>
  );
}
