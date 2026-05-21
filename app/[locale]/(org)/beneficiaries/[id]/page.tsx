'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Eye,
  EyeOff,
  Hash,
  Heart,
  Home,
  IdCard,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Plus,
  ShieldAlert,
  Trash2,
  User2,
  UserCircle2,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DateInput } from '@/components/ui/date-input';
import { MoneyInput } from '@/components/ui/money-input';
import { PhoneInput } from '@/components/phone-input';
import { phoneOptionalFromInput } from '@/lib/phone';
import { Link } from '@/i18n/navigation';
import {
  addChild,
  addDependent,
  addDisease,
  deleteDependent,
  listDependents,
  addHousing,
  addJob,
  deleteChild,
  deleteDisease,
  deleteHousing,
  deleteJob,
  deleteSpouse,
  getBeneficiaryFull,
  getBeneficiarySummary,
  getSpouse,
  listChildren,
  listDiseases,
  listHousing,
  listJobs,
  upsertSpouse,
  type BenChild,
  type BenDisease,
  type BenHousing,
  type BenJob,
  type BenSpouse,
  type BenDependent,
  listSocialCoverages,
  addSocialCoverage,
  deleteSocialCoverage,
} from '@/lib/api/beneficiaries';
import { BeneficiaryDocumentsSection } from '@/components/beneficiary-documents-section';
import { getBeneficiaryAccessStatus, verifyBeneficiaryAccessPin } from '@/lib/api/tenancy';
import { PinInput } from '@/components/pin-input';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { normalizeCinInput } from '@/lib/cin';
import { toast } from 'sonner';

interface BeneficiarySummary {
  id: string;
  code: string;
  gender: string;
  status: string;
  region: string | null;
  city: string | null;
  publicAlias: string | null;
  createdAt: string;
  lastVerifiedAt: string | null;
  validUntil: string | null;
}

interface BeneficiaryFull extends BeneficiarySummary {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  cin: string | null;
  phone: string | null;
  address: string | null;
}

type TabKey = 'identity' | 'family' | 'work' | 'health' | 'housing' | 'documents' | 'social';

export default function BeneficiaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();

  const summary = useQuery({
    queryKey: ['beneficiary', id, 'summary'],
    queryFn: () => getBeneficiarySummary(id) as Promise<BeneficiarySummary>,
  });

  const accessQ = useQuery({
    queryKey: ['beneficiary-access'],
    queryFn: () => getBeneficiaryAccessStatus(),
  });
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [fullData, setFullData] = useState<BeneficiaryFull | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [showPii, setShowPii] = useState(false);
  const [tab, setTab] = useState<TabKey>('identity');

  const pinConfigured = accessQ.data?.pinConfigured ?? false;
  const accessGranted = accessQ.data?.accessGranted ?? false;

  async function loadFullFile() {
    setLoadingFull(true);
    try {
      const data = (await getBeneficiaryFull(id)) as BeneficiaryFull;
      setFullData(data);
      setUnlocked(true);
      setShowPii(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingFull(false);
    }
  }

  async function unlock() {
    if (pinConfigured && !accessGranted) {
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
        return;
      }
    }
    await loadFullFile();
  }

  useEffect(() => {
    if (!accessQ.data) return;
    if (unlocked || loadingFull) return;
    if (accessQ.data.accessGranted) {
      void loadFullFile();
    }
  }, [accessQ.data, unlocked, loadingFull]);

  function close() {
    setFullData(null);
    setUnlocked(false);
    setShowPii(false);
    setPin('');
    setTab('identity');
  }

  const s = summary.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ms-2 h-7 px-2 text-muted-foreground">
            <Link href="/beneficiaries">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('common.back')}
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">
              {s?.code ?? '...'}
            </h1>
            {s?.status ? <StatusBadge status={s.status} t={t} /> : null}
          </div>
          {s?.publicAlias ? (
            <p className="text-sm text-muted-foreground">
              {t('beneficiaries.publicAlias')}: <span className="font-medium">{s.publicAlias}</span>
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/beneficiaries/${id}/edit`}>{t('beneficiaries.editProfile')}</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="h-4 w-4" />
            {t('beneficiaries.summaryTitle')}
          </CardTitle>
          <CardDescription>{t('beneficiaries.summaryHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : s ? (
            <dl className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Field icon={<Hash className="h-3.5 w-3.5" />} label={t('beneficiaries.code')}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{s.code}</code>
              </Field>
              <Field icon={<User2 className="h-3.5 w-3.5" />} label={t('beneficiaries.gender')}>
                {t(`beneficiaries.${s.gender}`)}
              </Field>
              <Field icon={<ShieldAlert className="h-3.5 w-3.5" />} label={t('beneficiaries.status')}>
                <StatusBadge status={s.status} t={t} />
              </Field>
              <Field icon={<MapPin className="h-3.5 w-3.5" />} label={t('beneficiaries.region')}>
                {s.region ?? dash}
              </Field>
              <Field icon={<MapPin className="h-3.5 w-3.5" />} label={t('beneficiaries.city')}>
                {s.city ?? dash}
              </Field>
              <Field icon={<Calendar className="h-3.5 w-3.5" />} label={t('beneficiaries.createdAt')}>
                {formatDate(s.createdAt)}
              </Field>
              <Field icon={<Calendar className="h-3.5 w-3.5" />} label={t('beneficiaries.lastVerifiedAt')}>
                {s.lastVerifiedAt ? formatDate(s.lastVerifiedAt) : dash}
              </Field>
              <Field icon={<Calendar className="h-3.5 w-3.5" />} label={t('beneficiaries.validUntil')}>
                {s.validUntil ? formatDate(s.validUntil) : dash}
              </Field>
            </dl>
          ) : (
            <p className="text-sm text-destructive">{t('common.error')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>{t('beneficiaries.fullFileTitle')}</CardTitle>
          <CardDescription>{t('beneficiaries.fullFileHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('beneficiaries.fullFileSteps')}</p>
        </CardContent>
      </Card>

      <Card className="border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <Lock className="h-4 w-4" />
            {t('beneficiaries.viewFull')}
          </CardTitle>
          <CardDescription className="text-amber-900/80 dark:text-amber-200/80">
            {t('beneficiaries.viewFullPrompt')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!unlocked ? (
            <div className="space-y-3">
              {accessQ.isLoading ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : pinConfigured && !accessGranted ? (
                <>
                  <Label className="text-amber-900">{t('beneficiaries.enterPin')}</Label>
                  <PinInput value={pin} onChange={setPin} disabled={loadingFull} />
                  <Button onClick={unlock} disabled={loadingFull || pin.length !== 4}>
                    {loadingFull ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {t('beneficiaries.unlockButton')}
                  </Button>
                </>
              ) : (
                <Button onClick={unlock} disabled={loadingFull}>
                  {loadingFull ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {t('beneficiaries.unlockButton')}
                </Button>
              )}
              <p className="flex items-center gap-1.5 text-xs text-amber-900/80">
                <AlertTriangle className="h-3 w-3" />
                {pinConfigured ? t('beneficiaries.pinAccessNotice') : t('beneficiaries.openAccessNotice')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-amber-900">
                  <KeyRound className="h-4 w-4" />
                  <span>{t('beneficiaries.unlockedNotice')}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPii((v) => !v)}>
                    {showPii ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPii ? t('beneficiaries.hidePii') : t('beneficiaries.showPii')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={close}>
                    {t('beneficiaries.lockBack')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-b">
                <TabButton current={tab} value="identity" onClick={() => setTab('identity')}>
                  <UserCircle2 className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_identity')}
                </TabButton>
                <TabButton current={tab} value="family" onClick={() => setTab('family')}>
                  <Users className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_family')}
                </TabButton>
                <TabButton current={tab} value="work" onClick={() => setTab('work')}>
                  <Briefcase className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_work')}
                </TabButton>
                <TabButton current={tab} value="health" onClick={() => setTab('health')}>
                  <Heart className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_health')}
                </TabButton>
                <TabButton current={tab} value="housing" onClick={() => setTab('housing')}>
                  <Home className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_housing')}
                </TabButton>
                <TabButton current={tab} value="documents" onClick={() => setTab('documents')}>
                  <IdCard className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_documents')}
                </TabButton>
                <TabButton current={tab} value="social" onClick={() => setTab('social')}>
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {t('beneficiaries.tab_social')}
                </TabButton>
              </div>

              {tab === 'identity' && showPii && fullData && (
                <IdentitySection full={fullData} t={t} />
              )}
              {tab === 'family' && (
                <FamilySection beneficiaryId={id} t={t} />
              )}
              {tab === 'work' && (
                <WorkSection beneficiaryId={id} t={t} />
              )}
              {tab === 'health' && (
                <HealthSection beneficiaryId={id} t={t} />
              )}
              {tab === 'housing' && (
                <HousingSection beneficiaryId={id} t={t} />
              )}
              {tab === 'documents' && (
                <BeneficiaryDocumentsSection beneficiaryId={id} t={t} />
              )}
              {tab === 'social' && (
                <SocialCoverageSection beneficiaryId={id} t={t} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Identity section
// =============================================================================
function IdentitySection({
  full,
  t,
}: {
  full: BeneficiaryFull;
  t: (k: string) => string;
}) {
  return (
    <dl className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Field icon={<User2 className="h-3.5 w-3.5" />} label={t('beneficiaries.firstName')}>
        {full.firstName}
      </Field>
      <Field icon={<User2 className="h-3.5 w-3.5" />} label={t('beneficiaries.lastName')}>
        {full.lastName}
      </Field>
      <Field icon={<Calendar className="h-3.5 w-3.5" />} label={t('beneficiaries.dateOfBirth')}>
        {full.dateOfBirth ? formatDate(full.dateOfBirth) : dash}
      </Field>
      <Field icon={<IdCard className="h-3.5 w-3.5" />} label={t('beneficiaries.cin')}>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{full.cin ?? '—'}</code>
      </Field>
      <Field icon={<Phone className="h-3.5 w-3.5" />} label={t('beneficiaries.phone')}>
        {full.phone ?? dash}
      </Field>
      <Field icon={<User2 className="h-3.5 w-3.5" />} label={t('beneficiaries.maritalStatus')}>
        {full.maritalStatus ? t(`beneficiaries.marital_${full.maritalStatus}`) : dash}
      </Field>
      <Field
        icon={<MapPin className="h-3.5 w-3.5" />}
        label={t('beneficiaries.address')}
        className="md:col-span-2 lg:col-span-3"
      >
        {full.address ?? dash}
      </Field>
    </dl>
  );
}

// =============================================================================
// Family (spouse + children)
// =============================================================================
function FamilySection({ beneficiaryId, t }: { beneficiaryId: string; t: (k: string) => string }) {
  const qc = useQueryClient();
  const spouseQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'spouse'],
    queryFn: () => getSpouse(beneficiaryId),
  });
  const childrenQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'children'],
    queryFn: () => listChildren(beneficiaryId),
  });
  const dependentsQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'dependents'],
    queryFn: () => listDependents(beneficiaryId),
  });

  const [showSpouseForm, setShowSpouseForm] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [showDependentForm, setShowDependentForm] = useState(false);

  const delSpouseMut = useMutation({
    mutationFn: () => deleteSpouse(beneficiaryId),
    onSuccess: () => {
      toast.success(t('beneficiaries.spouseDeleted'));
      qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'spouse'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delChildMut = useMutation({
    mutationFn: (childId: string) => deleteChild(beneficiaryId, childId),
    onSuccess: () => {
      toast.success(t('beneficiaries.childDeleted'));
      qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'children'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delDependentMut = useMutation({
    mutationFn: (dependentId: string) => deleteDependent(beneficiaryId, dependentId),
    onSuccess: () => {
      toast.success(t('common.successDeleted'));
      qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'dependents'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-border bg-background p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('beneficiaries.spouseTitle')}
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowSpouseForm((v) => !v)}>
            <Plus className="h-3 w-3" />
            {spouseQ.data ? t('beneficiaries.replaceSpouse') : t('beneficiaries.addSpouse')}
          </Button>
        </header>

        {showSpouseForm ? (
          <SpouseForm
            beneficiaryId={beneficiaryId}
            initial={spouseQ.data ?? null}
            onClose={() => setShowSpouseForm(false)}
            onSaved={() => {
              setShowSpouseForm(false);
              qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'spouse'] });
            }}
            t={t}
          />
        ) : spouseQ.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : spouseQ.data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label={t('beneficiaries.firstName')}>{spouseQ.data.firstName}</Field>
            <Field label={t('beneficiaries.lastName')}>{spouseQ.data.lastName}</Field>
            <Field label={t('beneficiaries.cin')}>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{spouseQ.data.cin}</code>
            </Field>
            <Field label={t('beneficiaries.dateOfBirth')}>
              {spouseQ.data.dateOfBirth ? formatDate(spouseQ.data.dateOfBirth) : dash}
            </Field>
            <Field label={t('beneficiaries.phone')}>{spouseQ.data.phone ?? dash}</Field>
            <Field label={t('beneficiaries.hasJob')}>
              {spouseQ.data.hasJob ? t('common.yes') : t('common.no')}
            </Field>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => delSpouseMut.mutate()}>
                <Trash2 className="h-3 w-3" />
                {t('common.delete')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('beneficiaries.noSpouse')}</p>
        )}
      </section>

      <section className="rounded-md border border-border bg-background p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('beneficiaries.childrenTitle')}
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowChildForm((v) => !v)}>
            <Plus className="h-3 w-3" />
            {t('beneficiaries.addChild')}
          </Button>
        </header>

        {showChildForm && (
          <ChildForm
            beneficiaryId={beneficiaryId}
            onClose={() => setShowChildForm(false)}
            onSaved={() => {
              setShowChildForm(false);
              qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'children'] });
            }}
            t={t}
          />
        )}

        {childrenQ.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : childrenQ.data && childrenQ.data.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {childrenQ.data.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(`beneficiaries.${c.gender}`)} · {formatDate(c.dateOfBirth)} ·{' '}
                      {ageYears(c.dateOfBirth)} {t('beneficiaries.yo')}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => delChildMut.mutate(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {c.inSchool ? (
                    <Badge variant="success">
                      {t('beneficiaries.inSchool')} · {t(`beneficiaries.school_${c.schoolLevel}`)}
                    </Badge>
                  ) : (
                    <Badge variant="muted">{t('beneficiaries.notInSchool')}</Badge>
                  )}
                  {c.works ? <Badge variant="warning">{t('beneficiaries.works')}</Badge> : null}
                  {c.hasDisability ? (
                    <Badge variant="destructive">{t('beneficiaries.hasDisability')}</Badge>
                  ) : null}
                </div>
                {c.notes ? <p className="mt-2 text-xs text-muted-foreground">{c.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('beneficiaries.noChildren')}</p>
        )}
      </section>

      <section className="rounded-md border border-border bg-background p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('beneficiaries.dependentsTitle')}
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowDependentForm((v) => !v)}>
            <Plus className="h-3 w-3" />
            {t('beneficiaries.addDependent')}
          </Button>
        </header>

        {showDependentForm && (
          <DependentForm
            beneficiaryId={beneficiaryId}
            onClose={() => setShowDependentForm(false)}
            onSaved={() => {
              setShowDependentForm(false);
              qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'dependents'] });
            }}
            t={t}
          />
        )}

        {dependentsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : dependentsQ.data && dependentsQ.data.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {dependentsQ.data.map((p) => (
              <li key={p.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {p.firstName} {p.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(`beneficiaries.relation_${p.relationType}`)}
                      {p.relationType === 'other' && p.relationOther ? ` (${p.relationOther})` : ''}
                      {p.dateOfBirth ? ` · ${formatDate(p.dateOfBirth)}` : ''}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => delDependentMut.mutate(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {p.notes ? <p className="mt-2 text-xs text-muted-foreground">{p.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('beneficiaries.noDependents')}</p>
        )}
      </section>
    </div>
  );
}

function DependentForm({
  beneficiaryId,
  onClose,
  onSaved,
  t,
}: {
  beneficiaryId: string;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [relationType, setRelationType] = useState<'mother' | 'father' | 'orphan' | 'sibling' | 'grandparent' | 'uncle_aunt' | 'other'>('mother');
  const [relationOther, setRelationOther] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [cin, setCin] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => {
      let phoneVal: string | undefined;
      try {
        phoneVal = phoneOptionalFromInput(phone);
      } catch {
        throw new Error(t('validation.phone8Digits'));
      }
      return addDependent(beneficiaryId, {
        relationType,
        relationOther: relationType === 'other' ? relationOther : undefined,
        firstName,
        lastName,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        cin: cin || undefined,
        phone: phoneVal,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mb-4 space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>{t('beneficiaries.relationType')}</Label>
          <Select value={relationType} onChange={(e) => setRelationType(e.target.value as typeof relationType)}>
            <option value="mother">{t('beneficiaries.relation_mother')}</option>
            <option value="father">{t('beneficiaries.relation_father')}</option>
            <option value="orphan">{t('beneficiaries.relation_orphan')}</option>
            <option value="sibling">{t('beneficiaries.relation_sibling')}</option>
            <option value="grandparent">{t('beneficiaries.relation_grandparent')}</option>
            <option value="uncle_aunt">{t('beneficiaries.relation_uncle_aunt')}</option>
            <option value="other">{t('beneficiaries.relation_other')}</option>
          </Select>
        </div>
        {relationType === 'other' ? (
          <div>
            <Label>{t('beneficiaries.relationOther')}</Label>
            <Input value={relationOther} onChange={(e) => setRelationOther(e.target.value)} />
          </div>
        ) : null}
        <div>
          <Label>{t('beneficiaries.firstName')}</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.lastName')}</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.gender')}</Label>
          <Select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
            <option value="female">{t('beneficiaries.female')}</option>
            <option value="male">{t('beneficiaries.male')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.dateOfBirth')}</Label>
          <DateInput
            value={dateOfBirth}
            fromYear={1920}
            toYear={new Date().getFullYear()}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div>
          <Label>{t('beneficiaries.cin')}</Label>
          <Input
            inputMode="numeric"
            value={cin}
            onChange={(e) => setCin(normalizeCinInput(e.target.value))}
            maxLength={8}
            placeholder="00000000"
          />
        </div>
        <div>
          <Label>{t('beneficiaries.phone')}</Label>
          <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending || !firstName || !lastName}>
          {mut.isPending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </div>
  );
}

function SpouseForm({
  beneficiaryId,
  initial,
  onClose,
  onSaved,
  t,
}: {
  beneficiaryId: string;
  initial: BenSpouse | null;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(initial?.gender ?? 'female');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth?.slice(0, 10) ?? '');
  const [cin, setCin] = useState(initial?.cin ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [hasJob, setHasJob] = useState<boolean>(initial?.hasJob ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const mut = useMutation({
    mutationFn: () => {
      let phoneVal: string | undefined;
      try {
        phoneVal = phoneOptionalFromInput(phone);
      } catch {
        throw new Error(t('validation.phone8Digits'));
      }
      return upsertSpouse(beneficiaryId, {
        firstName,
        lastName,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        cin,
        phone: phoneVal,
        hasJob,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>{t('beneficiaries.firstName')}</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.lastName')}</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.gender')}</Label>
          <Select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
            <option value="female">{t('beneficiaries.female')}</option>
            <option value="male">{t('beneficiaries.male')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.dateOfBirth')}</Label>
          <DateInput
            value={dateOfBirth}
            fromYear={1920}
            toYear={new Date().getFullYear()}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div>
          <Label>{t('beneficiaries.cin')}</Label>
          <Input
            inputMode="numeric"
            maxLength={8}
            value={cin}
            placeholder="00000000"
            onChange={(e) => setCin(normalizeCinInput(e.target.value))}
          />
        </div>
        <div>
          <Label>{t('beneficiaries.phone')}</Label>
          <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <input type="checkbox" checked={hasJob} onChange={(e) => setHasJob(e.target.checked)} className="h-4 w-4" />
          <Label>{t('beneficiaries.hasJob')}</Label>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </div>
  );
}

function ChildForm({
  beneficiaryId,
  onClose,
  onSaved,
  t,
}: {
  beneficiaryId: string;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [inSchool, setInSchool] = useState(false);
  const [schoolLevel, setSchoolLevel] = useState<BenChild['schoolLevel']>('none');
  const [schoolName, setSchoolName] = useState('');
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityNotes, setDisabilityNotes] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      addChild(beneficiaryId, {
        firstName,
        lastName,
        gender,
        dateOfBirth,
        inSchool,
        schoolLevel,
        schoolName: schoolName || undefined,
        hasDisability,
        disabilityNotes: disabilityNotes || undefined,
      }),
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>{t('beneficiaries.firstName')}</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.lastName')}</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.gender')}</Label>
          <Select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
            <option value="male">{t('beneficiaries.male')}</option>
            <option value="female">{t('beneficiaries.female')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.dateOfBirth')}</Label>
          <DateInput
            value={dateOfBirth}
            fromYear={1920}
            toYear={new Date().getFullYear()}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <input type="checkbox" checked={inSchool} onChange={(e) => setInSchool(e.target.checked)} className="h-4 w-4" />
          <Label>{t('beneficiaries.inSchool')}</Label>
        </div>
        <div>
          <Label>{t('beneficiaries.schoolLevel')}</Label>
          <Select
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value as BenChild['schoolLevel'])}
            disabled={!inSchool}
          >
            <option value="none">—</option>
            <option value="primary">{t('beneficiaries.school_primary')}</option>
            <option value="preparatory">{t('beneficiaries.school_preparatory')}</option>
            <option value="secondary">{t('beneficiaries.school_secondary')}</option>
            <option value="university">{t('beneficiaries.school_university')}</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.schoolName')}</Label>
          <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} disabled={!inSchool} />
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={hasDisability}
            onChange={(e) => setHasDisability(e.target.checked)}
            className="h-4 w-4"
          />
          <Label>{t('beneficiaries.hasDisability')}</Label>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.disabilityNotes')}</Label>
          <Input
            value={disabilityNotes}
            onChange={(e) => setDisabilityNotes(e.target.value)}
            disabled={!hasDisability}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Work
// =============================================================================
function WorkSection({ beneficiaryId, t }: { beneficiaryId: string; t: (k: string) => string }) {
  const qc = useQueryClient();
  const jobsQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'jobs'],
    queryFn: () => listJobs(beneficiaryId),
  });
  const [showForm, setShowForm] = useState(false);

  const delMut = useMutation({
    mutationFn: (jobId: string) => deleteJob(beneficiaryId, jobId),
    onSuccess: () => {
      toast.success(t('common.successDeleted'));
      qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'jobs'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3 w-3" />
          {t('beneficiaries.addJob')}
        </Button>
      </div>

      {showForm && (
        <JobForm
          beneficiaryId={beneficiaryId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'jobs'] });
          }}
          t={t}
        />
      )}

      {jobsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : jobsQ.data && jobsQ.data.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {jobsQ.data.map((j) => (
            <li key={j.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`beneficiaries.subject_${j.subjectType}`)}
                    {j.employer ? ` · ${j.employer}` : ''}
                    {j.place ? ` · ${j.place}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delMut.mutate(j.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                {j.schedule ? <span>{j.schedule}</span> : null}
                {j.isRegistered ? <Badge variant="success">{t('beneficiaries.isRegistered')}</Badge> : <Badge variant="warning">{t('beneficiaries.notRegistered')}</Badge>}
                {j.salaryMinor != null && j.salaryMinor > 0 ? (
                  <span className="font-medium text-foreground">· {formatMoney(j.salaryMinor)}/{t('beneficiaries.month')}</span>
                ) : null}
              </div>
              {j.notes ? <p className="mt-2 text-xs text-muted-foreground">{j.notes}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('beneficiaries.noJobs')}</p>
      )}
    </div>
  );
}

function JobForm({
  beneficiaryId,
  onClose,
  onSaved,
  t,
}: {
  beneficiaryId: string;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [subjectType, setSubjectType] = useState<'beneficiary' | 'spouse'>('beneficiary');
  const [title, setTitle] = useState('');
  const [employer, setEmployer] = useState('');
  const [place, setPlace] = useState('');
  const [schedule, setSchedule] = useState('');
  const [salary, setSalary] = useState<number>(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      addJob(beneficiaryId, {
        subjectType,
        title,
        employer: employer || undefined,
        place: place || undefined,
        schedule: schedule || undefined,
        salary: salary > 0 ? salary : undefined,
        isRegistered,
        startDate: startDate || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>{t('beneficiaries.subject')}</Label>
          <Select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as 'beneficiary' | 'spouse')}
          >
            <option value="beneficiary">{t('beneficiaries.subject_beneficiary')}</option>
            <option value="spouse">{t('beneficiaries.subject_spouse')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.jobTitle')}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.employer')}</Label>
          <Input value={employer} onChange={(e) => setEmployer(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.place')}</Label>
          <Input value={place} onChange={(e) => setPlace(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.schedule')}</Label>
          <Input placeholder="8h-17h, Mon-Fri" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
        <div>
          <Label>
            {t('beneficiaries.salary')} <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
          </Label>
          <MoneyInput value={salary || ''} onValueChange={(v) => setSalary(v)} />
        </div>
        <div>
          <Label>{t('beneficiaries.startDate')}</Label>
          <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={isRegistered}
            onChange={(e) => setIsRegistered(e.target.checked)}
            className="h-4 w-4"
          />
          <Label>{t('beneficiaries.isRegistered')}</Label>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Health
// =============================================================================
function HealthSection({ beneficiaryId, t }: { beneficiaryId: string; t: (k: string) => string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'diseases'],
    queryFn: () => listDiseases(beneficiaryId),
  });
  const childrenQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'children'],
    queryFn: () => listChildren(beneficiaryId),
  });
  const dependentsQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'dependents'],
    queryFn: () => listDependents(beneficiaryId),
  });
  const spouseQ = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'spouse'],
    queryFn: () => getSpouse(beneficiaryId),
  });
  const [showForm, setShowForm] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteDisease(beneficiaryId, id),
    onSuccess: () => {
      toast.success(t('common.successDeleted'));
      qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'diseases'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3 w-3" />
          {t('beneficiaries.addDisease')}
        </Button>
      </div>

      {showForm && (
        <DiseaseForm
          beneficiaryId={beneficiaryId}
          children={childrenQ.data ?? []}
          dependents={dependentsQ.data ?? []}
          hasSpouse={!!spouseQ.data}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'diseases'] });
          }}
          t={t}
        />
      )}

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : q.data && q.data.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {q.data.map((d) => (
            <li key={d.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{d.name ?? d.nameFree ?? t('beneficiaries.unspecified')}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.subjectType !== 'beneficiary' ? (
                      <span className="me-1 font-medium">{t(`beneficiaries.healthSubject_${d.subjectType}`)} · </span>
                    ) : null}
                    {t(`beneficiaries.diseaseStatus_${d.status}`)}
                    {d.diagnosisDate ? ` · ${formatDate(d.diagnosisDate)}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delMut.mutate(d.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {d.needsMedication ? <Badge variant="warning">{t('beneficiaries.needsMedication')}</Badge> : null}
                {d.needsMonitoring ? <Badge variant="warning">{t('beneficiaries.needsMonitoring')}</Badge> : null}
                {d.monthlyCostMinor != null && d.monthlyCostMinor > 0 ? (
                  <span className="text-muted-foreground">
                    · {formatMoney(d.monthlyCostMinor)}/{t('beneficiaries.month')}
                  </span>
                ) : null}
              </div>
              {d.notes ? <p className="mt-2 text-xs text-muted-foreground">{d.notes}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('beneficiaries.noDiseases')}</p>
      )}
    </div>
  );
}

function DiseaseForm({
  beneficiaryId,
  children,
  dependents,
  hasSpouse,
  onClose,
  onSaved,
  t,
}: {
  beneficiaryId: string;
  children: BenChild[];
  dependents: BenDependent[];
  hasSpouse: boolean;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [subjectType, setSubjectType] = useState<BenDisease['subjectType']>('beneficiary');
  const [childId, setChildId] = useState('');
  const [dependentPersonId, setDependentPersonId] = useState('');
  const [name, setName] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [monthlyCost, setMonthlyCost] = useState<number>(0);
  const [status, setStatus] = useState<BenDisease['status']>('active');
  const [needsMedication, setNeedsMedication] = useState(false);
  const [needsMonitoring, setNeedsMonitoring] = useState(false);
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      addDisease(beneficiaryId, {
        subjectType,
        childId: subjectType === 'child' ? childId : undefined,
        dependentPersonId: subjectType === 'dependent' ? dependentPersonId : undefined,
        nameFree: name || undefined,
        diagnosisDate: diagnosisDate || undefined,
        monthlyCost: monthlyCost > 0 ? monthlyCost : undefined,
        status,
        needsMedication,
        needsMonitoring,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.healthSubject')}</Label>
          <Select
            className="mt-2"
            value={
              subjectType === 'child' && childId
                ? `child:${childId}`
                : subjectType === 'dependent' && dependentPersonId
                  ? `dep:${dependentPersonId}`
                  : subjectType
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('child:')) {
                setSubjectType('child');
                setChildId(v.slice(6));
                setDependentPersonId('');
              } else if (v.startsWith('dep:')) {
                setSubjectType('dependent');
                setDependentPersonId(v.slice(4));
                setChildId('');
              } else {
                setSubjectType(v as BenDisease['subjectType']);
                setChildId('');
                setDependentPersonId('');
              }
            }}
          >
            <option value="beneficiary">{t('beneficiaries.healthSubject_beneficiary')}</option>
            {hasSpouse ? <option value="spouse">{t('beneficiaries.healthSubject_spouse')}</option> : null}
            {children.map((c) => (
              <option key={c.id} value={`child:${c.id}`}>
                {t('beneficiaries.healthSubject_child')}: {c.firstName} {c.lastName}
              </option>
            ))}
            {dependents.map((p) => (
              <option key={p.id} value={`dep:${p.id}`}>
                {t('beneficiaries.healthSubject_dependent')}: {p.firstName} {p.lastName}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.diseaseName')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('beneficiaries.diseaseNamePlaceholder')} />
        </div>
        <div>
          <Label>{t('beneficiaries.diagnosisDate')}</Label>
          <DateInput value={diagnosisDate} onChange={(e) => setDiagnosisDate(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.diseaseStatus')}</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as BenDisease['status'])}>
            <option value="active">{t('beneficiaries.diseaseStatus_active')}</option>
            <option value="controlled">{t('beneficiaries.diseaseStatus_controlled')}</option>
            <option value="recovered">{t('beneficiaries.diseaseStatus_recovered')}</option>
          </Select>
        </div>
        <div>
          <Label>
            {t('beneficiaries.monthlyCost')}{' '}
            <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
          </Label>
          <MoneyInput value={monthlyCost || ''} onValueChange={(v) => setMonthlyCost(v)} />
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={needsMedication}
            onChange={(e) => setNeedsMedication(e.target.checked)}
            className="h-4 w-4"
          />
          <Label>{t('beneficiaries.needsMedication')}</Label>
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={needsMonitoring}
            onChange={(e) => setNeedsMonitoring(e.target.checked)}
            className="h-4 w-4"
          />
          <Label>{t('beneficiaries.needsMonitoring')}</Label>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Housing
// =============================================================================
function HousingSection({ beneficiaryId, t }: { beneficiaryId: string; t: (k: string) => string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'housing'],
    queryFn: () => listHousing(beneficiaryId),
  });
  const [showForm, setShowForm] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteHousing(beneficiaryId, id),
    onSuccess: () => {
      toast.success(t('common.successDeleted'));
      qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'housing'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3 w-3" />
          {t('beneficiaries.addHousing')}
        </Button>
      </div>

      {showForm && (
        <HousingForm
          beneficiaryId={beneficiaryId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId, 'housing'] });
          }}
          t={t}
        />
      )}

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : q.data && q.data.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {q.data.map((h) => (
            <li key={h.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{t(`beneficiaries.tenure_${h.tenure}`)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`beneficiaries.condition_${h.condition}`)}
                    {h.rooms != null ? ` · ${h.rooms} ${t('beneficiaries.rooms')}` : ''}
                    {h.occupants != null ? ` · ${h.occupants} ${t('beneficiaries.occupants')}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delMut.mutate(h.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {!h.hasElectricity ? <Badge variant="warning">{t('beneficiaries.noElectricity')}</Badge> : null}
                {!h.hasRunningWater ? <Badge variant="warning">{t('beneficiaries.noRunningWater')}</Badge> : null}
                {h.rentMinor != null && h.rentMinor > 0 ? (
                  <span className="text-muted-foreground">
                    · {t('beneficiaries.rent')}: {formatMoney(h.rentMinor)}/{t('beneficiaries.month')}
                  </span>
                ) : null}
              </div>
              {h.address ? <p className="mt-2 text-xs text-muted-foreground">{h.address}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('beneficiaries.noHousing')}</p>
      )}
    </div>
  );
}

function HousingForm({
  beneficiaryId,
  onClose,
  onSaved,
  t,
}: {
  beneficiaryId: string;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [tenure, setTenure] = useState<BenHousing['tenure']>('rented');
  const [rent, setRent] = useState<number>(0);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [condition, setCondition] = useState<BenHousing['condition']>('fair');
  const [rooms, setRooms] = useState<number>(0);
  const [occupants, setOccupants] = useState<number>(0);
  const [hasElectricity, setHasElectricity] = useState(true);
  const [hasRunningWater, setHasRunningWater] = useState(true);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => {
      let ownerPhoneVal: string | undefined;
      try {
        ownerPhoneVal = phoneOptionalFromInput(ownerPhone);
      } catch {
        throw new Error(t('validation.phone8Digits'));
      }
      return addHousing(beneficiaryId, {
        tenure,
        rent: tenure === 'rented' && rent > 0 ? rent : undefined,
        ownerName: ownerName || undefined,
        ownerPhone: ownerPhoneVal,
        condition,
        rooms: rooms > 0 ? rooms : undefined,
        occupants: occupants > 0 ? occupants : undefined,
        hasElectricity,
        hasRunningWater,
        address: address || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      onSaved();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>{t('beneficiaries.tenure')}</Label>
          <Select value={tenure} onChange={(e) => setTenure(e.target.value as BenHousing['tenure'])}>
            <option value="owned">{t('beneficiaries.tenure_owned')}</option>
            <option value="rented">{t('beneficiaries.tenure_rented')}</option>
            <option value="hosted">{t('beneficiaries.tenure_hosted')}</option>
            <option value="homeless">{t('beneficiaries.tenure_homeless')}</option>
            <option value="other">{t('beneficiaries.tenure_other')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.condition')}</Label>
          <Select value={condition} onChange={(e) => setCondition(e.target.value as BenHousing['condition'])}>
            <option value="good">{t('beneficiaries.condition_good')}</option>
            <option value="fair">{t('beneficiaries.condition_fair')}</option>
            <option value="poor">{t('beneficiaries.condition_poor')}</option>
            <option value="unsafe">{t('beneficiaries.condition_unsafe')}</option>
          </Select>
        </div>
        {tenure === 'rented' && (
          <>
            <div>
              <Label>
                {t('beneficiaries.rent')}{' '}
                <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
              </Label>
              <MoneyInput value={rent || ''} onValueChange={(v) => setRent(v)} />
            </div>
            <div>
              <Label>{t('beneficiaries.ownerName')}</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
            <div>
              <Label>{t('beneficiaries.ownerPhone')}</Label>
              <PhoneInput value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <Label>{t('beneficiaries.rooms')}</Label>
          <Input type="number" value={rooms || ''} onChange={(e) => setRooms(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label>{t('beneficiaries.occupants')}</Label>
          <Input
            type="number"
            value={occupants || ''}
            onChange={(e) => setOccupants(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={hasElectricity}
            onChange={(e) => setHasElectricity(e.target.checked)}
            className="h-4 w-4"
          />
          <Label>{t('beneficiaries.hasElectricity')}</Label>
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={hasRunningWater}
            onChange={(e) => setHasRunningWater(e.target.checked)}
            className="h-4 w-4"
          />
          <Label>{t('beneficiaries.hasRunningWater')}</Label>
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.address')}</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>{t('beneficiaries.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Social coverage
// =============================================================================
const COVERAGE_TYPES = [
  'cnss',
  'cnam',
  'yellow_notebook',
  'white_notebook',
  'monthly_grant',
  'none',
  'other',
] as const;

function SocialCoverageSection({
  beneficiaryId,
  t,
}: {
  beneficiaryId: string;
  t: (k: string) => string;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<string>('cnss');
  const [identifier, setIdentifier] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [notes, setNotes] = useState('');

  const listQ = useQuery({
    queryKey: ['social-coverages', beneficiaryId],
    queryFn: () => listSocialCoverages(beneficiaryId),
  });

  const addMut = useMutation({
    mutationFn: () =>
      addSocialCoverage(beneficiaryId, {
        type,
        identifier: identifier || undefined,
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t('common.successCreated'));
      setIdentifier('');
      setMonthlyAmount('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['social-coverages', beneficiaryId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('beneficiaries.socialHint')}</p>
      <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2">
        <div>
          <Label>{t('beneficiaries.coverageType')}</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {COVERAGE_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.coverageId')}</Label>
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </div>
        <div>
          <Label>{t('beneficiaries.monthlyAmount')}</Label>
          <Input
            type="number"
            min={0}
            step="0.001"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>{t('beneficiaries.notes')}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
            {t('beneficiaries.addCoverage')}
          </Button>
        </div>
      </div>
      {listQ.data?.length ? (
        <ul className="divide-y rounded-md border border-border">
          {listQ.data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <Badge>{c.type}</Badge>
                {c.identifier ? <span className="ms-2">{c.identifier}</span> : null}
                {c.monthlyAmountMinor != null ? (
                  <span className="ms-2 text-muted-foreground">
                    {formatMoney(c.monthlyAmountMinor, c.currency)}
                  </span>
                ) : null}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  deleteSocialCoverage(beneficiaryId, c.id).then(() =>
                    qc.invalidateQueries({ queryKey: ['social-coverages', beneficiaryId] }),
                  )
                }
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================
const dash = <span className="text-muted-foreground">—</span>;

function TabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: TabKey;
  value: TabKey;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const variant: Record<string, 'success' | 'warning' | 'destructive' | 'muted' | 'default'> = {
    approved: 'success',
    active: 'success',
    verified: 'default',
    under_review: 'warning',
    submitted: 'warning',
    draft: 'muted',
    rejected: 'destructive',
    suspended: 'destructive',
    archived: 'muted',
  };
  const key = `beneficiaries.status_${status}`;
  return <Badge variant={variant[status] ?? 'muted'}>{safeT(t, key, status)}</Badge>;
}

function safeT(t: (k: string) => string, key: string, fallback: string): string {
  try {
    const v = t(key);
    return v === key ? fallback : v;
  } catch {
    return fallback;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function ageYears(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 86400000));
}
