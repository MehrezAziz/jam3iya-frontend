import { readFileSync, writeFileSync } from 'fs';

const p = 'app/[locale]/(org)/beneficiaries/[id]/edit/page.tsx';
let s = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const old = `  if (q.isLoading) {
    return (
      <motionPlaceholder className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </motionPlaceholder>
    );
  }

  if (q.isError || !b) {
    return (
      <motionPlaceholder className="p-8 text-destructive">{t('common.error')}</motionPlaceholder>
    );
  }
`;

const neu = `  async function unlockWithPin() {
    if (pin.length !== 4) {
      toast.error(t('beneficiaries.pinInvalid'));
      return;
    }
    try {
      await verifyBeneficiaryAccessPin(pin);
      await accessQ.refetch();
      setPin('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (accessQ.isLoading || (canLoad && q.isLoading)) {
    return (
      <motionPlaceholder className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </motionPlaceholder>
    );
  }

  if (accessQ.data?.pinConfigured && !accessQ.data.accessGranted) {
    return (
      <motionPlaceholder className="mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-xl font-bold">{t('beneficiaries.editProfile')}</h1>
        <p className="text-sm text-muted-foreground">{t('beneficiaries.enterPin')}</p>
        <PinInput value={pin} onChange={setPin} />
        <Button onClick={unlockWithPin} disabled={pin.length !== 4}>
          {t('beneficiaries.unlockButton')}
        </Button>
      </motionPlaceholder>
    );
  }

  if (q.isError || !b) {
    return (
      <motionPlaceholder className="p-8 text-destructive">{t('common.error')}</motionPlaceholder>
    );
  }
`;

const div = (x) => x.replace(/motionPlaceholder/g, 'div');
const oldDiv = div(old);
const neuDiv = div(neu);

if (!s.includes(oldDiv)) {
  console.error('not found');
  process.exit(1);
}
writeFileSync(p, s.replace(oldDiv, neuDiv));
console.log('ok');
