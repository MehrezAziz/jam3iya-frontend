import { readFileSync, writeFileSync } from 'fs';

const p = 'app/[locale]/(org)/beneficiaries/[id]/page.tsx';
let s = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const duplicateSelect = `          <Select
            value={subjectType}
            onChange={(e) => {
              const v = e.target.value as BenDisease['subjectType'];
              setSubjectType(v);
              setChildId('');
              setDependentPersonId('');
            }}
          >
            <option value="beneficiary">{t('beneficiaries.healthSubject_beneficiary')}</option>
            {hasSpouse ? <option value="spouse">{t('beneficiaries.healthSubject_spouse')}</option> : null}
            {children.map((c) => (
              <option key={c.id} value={\`child:\${c.id}\`} disabled>
                {/* placeholder */}
              </option>
            ))}
          </Select>
`;

s = s.replace(duplicateSelect, '');

s = s.replace(
  `          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('beneficiaries.diseaseNamePlaceholder')} />
        </motionPlaceholder>
        <motionPlaceholder>
          <Label>{t('beneficiaries.diagnosisDate')}</Label>
          <DateInput value={diagnosisDate} onChange={(e) => setDiagnosisDate(e.target.value)} />
        </motionPlaceholder>`,
  `          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('beneficiaries.diseaseNamePlaceholder')} />
        </motionPlaceholder>
        <motionPlaceholder>
          <Label>{t('beneficiaries.diagnosisDate')}</Label>
          <DateInput value={diagnosisDate} onChange={(e) => setDiagnosisDate(e.target.value)} />
        </motionPlaceholder>`,
);

s = s.replace(/motionPlaceholder/g, 'motionPlaceholder');

s = s.replace(
  /function (WorkSection|HousingSection|FamilySection)\(\{ beneficiaryId, t \}: \{ beneficiaryId: string; reason: string; t:/g,
  'function $1({ beneficiaryId, t }: { beneficiaryId: string; t:',
);

writeFileSync(p, s);
console.log('motionPlaceholder left:', s.includes('motionPlaceholder'));
