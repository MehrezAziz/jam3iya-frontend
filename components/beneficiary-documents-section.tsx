'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  getSpouse,
  listChildren,
  listDiseases,
  listHousing,
  listJobs,
  listSocialCoverages,
  type BenChild,
  type BenDisease,
  type BenHousing,
  type BenJob,
  type BenSpouse,
} from '@/lib/api/beneficiaries';
import {
  attachDocument,
  deleteDocument,
  fileDownloadUrl,
  listBeneficiaryDocuments,
  updateDocument,
  uploadFile,
  type DocumentCategory,
  type DocumentOwnerType,
} from '@/lib/api/files';

const CATEGORIES: DocumentCategory[] = [
  'cin',
  'medical',
  'school',
  'housing_proof',
  'salary_proof',
  'birth_certificate',
  'marriage_certificate',
  'divorce_certificate',
  'death_certificate',
  'unemployment_proof',
  'bank_statement',
  'utility_bill',
  'signed_consent',
  'other',
];

type OwnerOption = {
  key: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  labelKey: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function ownerLabel(t: (k: string) => string, ownerLabel: string) {
  const base = ownerLabel.split(':')[0];
  const map: Record<string, string> = {
    identity: 'beneficiaries.docOwner_identity',
    spouse: 'beneficiaries.docOwner_spouse',
    child: 'beneficiaries.docOwner_child',
    job: 'beneficiaries.docOwner_job',
    housing: 'beneficiaries.docOwner_housing',
    disease: 'beneficiaries.docOwner_disease',
    illness: 'beneficiaries.docOwner_disease',
    coverage: 'beneficiaries.docOwner_coverage',
  };
  return t(map[base] ?? 'beneficiaries.tab_documents');
}

export function BeneficiaryDocumentsSection({
  beneficiaryId,
  t,
}: {
  beneficiaryId: string;
  t: (k: string) => string;
}) {
  const qc = useQueryClient();
  const [ownerKey, setOwnerKey] = useState(`beneficiary:${beneficiaryId}`);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const spouseQ = useQuery({ queryKey: ['spouse', beneficiaryId], queryFn: () => getSpouse(beneficiaryId) });
  const childrenQ = useQuery({ queryKey: ['children', beneficiaryId], queryFn: () => listChildren(beneficiaryId) });
  const jobsQ = useQuery({ queryKey: ['jobs', beneficiaryId], queryFn: () => listJobs(beneficiaryId) });
  const housingQ = useQuery({ queryKey: ['housing', beneficiaryId], queryFn: () => listHousing(beneficiaryId) });
  const diseasesQ = useQuery({ queryKey: ['diseases', beneficiaryId], queryFn: () => listDiseases(beneficiaryId) });
  const socialQ = useQuery({
    queryKey: ['social-coverages', beneficiaryId],
    queryFn: () => listSocialCoverages(beneficiaryId),
  });

  const docsQ = useQuery({
    queryKey: ['documents', 'tree', beneficiaryId],
    queryFn: () => listBeneficiaryDocuments(beneficiaryId),
  });

  const ownerOptions = useMemo(() => {
    const opts: OwnerOption[] = [
      {
        key: `beneficiary:${beneficiaryId}`,
        ownerType: 'beneficiary',
        ownerId: beneficiaryId,
        labelKey: 'beneficiaries.docOwner_identity',
      },
    ];
    const spouse = spouseQ.data as BenSpouse | null | undefined;
    if (spouse?.id) {
      opts.push({
        key: `spouse:${spouse.id}`,
        ownerType: 'spouse',
        ownerId: spouse.id,
        labelKey: 'beneficiaries.docOwner_spouse',
      });
    }
    for (const c of (childrenQ.data ?? []) as BenChild[]) {
      opts.push({
        key: `child:${c.id}`,
        ownerType: 'child',
        ownerId: c.id,
        labelKey: 'beneficiaries.docOwner_child',
      });
    }
    for (const j of (jobsQ.data ?? []) as BenJob[]) {
      opts.push({
        key: `job:${j.id}`,
        ownerType: 'job',
        ownerId: j.id,
        labelKey: 'beneficiaries.docOwner_job',
      });
    }
    for (const h of (housingQ.data ?? []) as BenHousing[]) {
      opts.push({
        key: `housing:${h.id}`,
        ownerType: 'housing',
        ownerId: h.id,
        labelKey: 'beneficiaries.docOwner_housing',
      });
    }
    for (const d of (diseasesQ.data ?? []) as BenDisease[]) {
      opts.push({
        key: `disease:${d.id}`,
        ownerType: 'disease',
        ownerId: d.id,
        labelKey: 'beneficiaries.docOwner_disease',
      });
    }
    for (const sc of socialQ.data ?? []) {
      opts.push({
        key: `social_coverage:${sc.id}`,
        ownerType: 'social_coverage',
        ownerId: sc.id,
        labelKey: 'beneficiaries.docOwner_coverage',
      });
    }
    return opts;
  }, [beneficiaryId, spouseQ.data, childrenQ.data, jobsQ.data, housingQ.data, diseasesQ.data, socialQ.data]);

  const selectedOwner = ownerOptions.find((o) => o.key === ownerKey) ?? ownerOptions[0];

  async function invalidateDocs() {
    await qc.invalidateQueries({ queryKey: ['documents', 'tree', beneficiaryId] });
  }

  async function handleUpload(file: File, documentId?: string) {
    try {
      setUploading(true);
      const uploaded = await uploadFile(file);
      if (documentId) {
        await updateDocument(documentId, uploaded.id);
        toast.success(t('beneficiaries.documentUpdated'));
      } else if (selectedOwner) {
        await attachDocument({
          ownerType: selectedOwner.ownerType,
          ownerId: selectedOwner.ownerId,
          category,
          fileId: uploaded.id,
        });
        toast.success(t('beneficiaries.documentUploaded'));
      }
      await invalidateDocs();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      setReplacingId(null);
    }
  }

  async function handleDelete(documentId: string) {
    try {
      await deleteDocument(documentId);
      toast.success(t('common.successUpdated'));
      await invalidateDocs();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('beneficiaries.documentsHint')}</p>

      <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 md:grid-cols-3">
        <div>
          <Label>{t('beneficiaries.docLinkTo')}</Label>
          <Select value={ownerKey} onChange={(e) => setOwnerKey(e.target.value)}>
            {ownerOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {t(o.labelKey)}
                {o.ownerType !== 'beneficiary' ? ` (${o.ownerId.slice(0, 8)})` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t('beneficiaries.docCategory')}</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`beneficiaries.docCat_${c}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-4 py-2 text-sm hover:bg-muted/50">
            {uploading ? t('common.loading') : t('beneficiaries.uploadDocument')}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {docsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : docsQ.data && docsQ.data.length > 0 ? (
        <ul className="divide-y rounded-md border border-border">
          {docsQ.data.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <Badge variant="muted">{t(`beneficiaries.docCat_${d.category}`)}</Badge>
                <span className="ms-2 text-muted-foreground">{ownerLabel(t, d.ownerLabel)}</span>
                <span className="ms-2 text-xs text-muted-foreground">{d.file.mime}</span>
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={fileDownloadUrl(d.fileId)} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <label className="inline-flex cursor-pointer">
                  <Button type="button" variant="ghost" size="sm" disabled={replacingId === d.id} asChild>
                    <span>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setReplacingId(d.id);
                        void handleUpload(f, d.id);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete(d.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}
