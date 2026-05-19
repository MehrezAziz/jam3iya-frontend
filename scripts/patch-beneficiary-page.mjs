import { readFileSync, writeFileSync } from 'fs';

const p = 'app/[locale]/(org)/beneficiaries/[id]/page.tsx';
let s = readFileSync(p, 'utf8');

const unlockOld = [
  '            <div className="space-y-2">',
  '              <Label htmlFor="reason" className="text-amber-900">',
  "                {t('beneficiaries.reason')}",
  '              </Label>',
  '              <div className="flex flex-col gap-2 sm:flex-row">',
  '                <Input',
  '                  id="reason"',
  '                  className="border-amber-300 bg-white"',
  "                  placeholder={t('beneficiaries.reasonPlaceholder')}",
  '                  value={reason}',
  '                  onChange={(e) => setReason(e.target.value)}',
  '                />',
  '                <Button onClick={unlock} disabled={loadingFull}>',
  '                  {loadingFull ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}',
  "                  {t('beneficiaries.unlockButton')}",
  '                </Button>',
  '              </div>',
  '              <p className="flex items-center gap-1.5 text-xs text-amber-900/80">',
  '                <AlertTriangle className="h-3 w-3" />',
  "                {t('beneficiaries.reasonAuditNotice')}",
  '              </p>',
  '            </div>',
].join('\n');

const unlockNew = [
  '            <div className="space-y-3">',
  '              {accessQ.isLoading ? (',
  '                <p className="text-sm text-muted-foreground">{t(\'common.loading\')}</p>',
  '              ) : pinConfigured && !accessGranted ? (',
  '                <>',
  '                  <Label className="text-amber-900">{t(\'beneficiaries.enterPin\')}</Label>',
  '                  <PinInput value={pin} onChange={setPin} disabled={loadingFull} />',
  '                  <Button onClick={unlock} disabled={loadingFull || pin.length !== 4}>',
  '                    {loadingFull ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}',
  "                    {t('beneficiaries.unlockButton')}",
  '                  </Button>',
  '                </>',
  '              ) : (',
  '                <Button onClick={unlock} disabled={loadingFull}>',
  '                  {loadingFull ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}',
  "                  {t('beneficiaries.unlockButton')}",
  '                </Button>',
  '              )}',
  '              <p className="flex items-center gap-1.5 text-xs text-amber-900/80">',
  '                <AlertTriangle className="h-3 w-3" />',
  "                {pinConfigured ? t('beneficiaries.pinAccessNotice') : t('beneficiaries.openAccessNotice')}",
  '              </p>',
  '            </div>',
].join('\n');

const norm = (x) => x.replace(/\r\n/g, '\n');
s = norm(s);
const oldN = norm(unlockOld);
const newN = norm(unlockNew);
if (!s.includes(oldN)) {
  console.error('unlock block not found');
  process.exit(1);
}
s = s.replace(oldN, newN);

const pairs = [
  [/function FamilySection\(\{ beneficiaryId, reason, t \}/g, 'function FamilySection({ beneficiaryId, t }'],
  [/function WorkSection\(\{ beneficiaryId, reason, t \}/g, 'function WorkSection({ beneficiaryId, t }'],
  [/function HealthSection\(\{ beneficiaryId, reason, t \}/g, 'function HealthSection({ beneficiaryId, t }'],
  [/function HousingSection\(\{ beneficiaryId, reason, t \}/g, 'function HousingSection({ beneficiaryId, t }'],
  [/, reason, t \}: \{ beneficiaryId: string; reason: string; t:/g, ', t }: { beneficiaryId: string; t:'],
  [/getSpouse\(beneficiaryId, reason\)/g, 'getSpouse(beneficiaryId)'],
  [/listChildren\(beneficiaryId, reason\)/g, 'listChildren(beneficiaryId)'],
  [/listJobs\(beneficiaryId, reason\)/g, 'listJobs(beneficiaryId)'],
  [/listHousing\(beneficiaryId, reason\)/g, 'listHousing(beneficiaryId)'],
  [/listDiseases\(beneficiaryId, reason\)/g, 'listDiseases(beneficiaryId)'],
  [/listSocialCoverages\(beneficiaryId, reason\)/g, 'listSocialCoverages(beneficiaryId)'],
  [/, 'spouse', reason\]/g, ", 'spouse']"],
  [/, 'children', reason\]/g, ", 'children']"],
  [/, 'jobs', reason\]/g, ", 'jobs']"],
  [/, 'housing', reason\]/g, ", 'housing']"],
  [/, 'diseases', reason\]/g, ", 'diseases']"],
  [
    /<SocialCoverageSection beneficiaryId=\{id\} reason=\{unlocked\.reason\} t=\{t\} \/>/g,
    '<SocialCoverageSection beneficiaryId={id} t={t} />',
  ],
  [
    /  reason,\n  t,\n\}: \{\n  beneficiaryId: string;\n  reason: string;\n  t:/g,
    '  t,\n}: {\n  beneficiaryId: string;\n  t:',
  ],
  [
    /if \(!accessQ\.data\.pinConfigured \|\| accessQ\.data\.accessGranted\) \{\n      void loadFullFile\(\);\n    \}/,
    'if (accessQ.data.accessGranted) {\n      void loadFullFile();\n    }',
  ],
];

for (const [re, rep] of pairs) {
  s = s.replace(re, rep);
}

writeFileSync(p, s);
console.log('patched', p);
