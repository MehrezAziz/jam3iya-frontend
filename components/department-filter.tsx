'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { listDepartments } from '@/lib/api/tenancy';
import { useDepartmentScope } from '@/lib/department-scope';

export function DepartmentFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (departmentId: string) => void;
}) {
  const t = useTranslations();
  const { lockedDepartmentId } = useDepartmentScope();
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });

  const label = t('common.department');

  if (lockedDepartmentId) {
    const name =
      departments?.find((d) => d.id === lockedDepartmentId)?.name ?? lockedDepartmentId;
    return (
      <div>
        <Label>{label}</Label>
        <Input readOnly disabled value={name} className="bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('donations.filterAll')}</option>
        {(departments ?? []).map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
