import { api } from './client';

export type BeneficiaryStatus = 'draft' | 'pending_review' | 'active' | 'on_hold' | 'archived';

export interface BeneficiarySummaryItem {
  id: string;
  code: string;
  gender: 'male' | 'female';
  status: BeneficiaryStatus;
  region: string | null;
  city: string | null;
  publicAlias: string | null;
  isOrphan: boolean;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
  lastVerifiedAt: string | null;
  validUntil: string | null;
}

export interface ListResponse<T> {
  total: number;
  items: T[];
  limit: number;
  offset: number;
}

export function listBeneficiaries(params: {
  q?: string;
  status?: BeneficiaryStatus;
  departmentId?: string;
  limit?: number;
  offset?: number;
  fields?: BeneficiaryLookupField[];
} = {}): Promise<ListResponse<BeneficiarySummaryItem>> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (k === 'fields' && Array.isArray(v)) {
      sp.set('fields', v.join(','));
      return;
    }
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return api(`/beneficiaries${qs ? `?${qs}` : ''}`);
}

export type BeneficiaryLookupField = 'name' | 'phone' | 'cin' | 'code';

export interface TextHighlight {
  start: number;
  end: number;
}

export interface BeneficiaryDonationPickHit {
  id: string;
  code: string;
  publicAlias: string | null;
  status: BeneficiaryStatus;
  isOrphan: boolean;
  fullName: string;
  phone: string | null;
  cin: string | null;
  phoneHighlight?: TextHighlight | null;
  cinHighlight?: TextHighlight | null;
  /** False when searching with campaignId and beneficiary is not on the campaign list. */
  inCampaign: boolean;
  /** Total already allocated to this beneficiary on the selected campaign (millimes). */
  priorAllocatedMinor: number;
}

export function searchBeneficiariesForDonationPick(params: {
  q: string;
  fields: BeneficiaryLookupField[];
  campaignId?: string;
  limit?: number;
}): Promise<{ items: BeneficiaryDonationPickHit[] }> {
  const sp = new URLSearchParams();
  sp.set('q', params.q);
  sp.set('fields', params.fields.join(','));
  if (params.campaignId) sp.set('campaignId', params.campaignId);
  if (params.limit != null) sp.set('limit', String(params.limit));
  return api(`/beneficiaries/donation-pick-search?${sp.toString()}`);
}

export function rebuildBeneficiarySearchIndex(): Promise<{ rebuilt: number }> {
  return api('/beneficiaries/rebuild-search-index', { method: 'POST' });
}

export function createBeneficiary(input: {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
  cin?: string;
  phone?: string;
  address?: string;
  region?: string;
  city?: string;
  publicAlias?: string;
  departmentId: string;
  reason?: string;
  isOrphan?: boolean;
}): Promise<{ id: string; code: string }> {
  return api('/beneficiaries', { method: 'POST', body: JSON.stringify(input) });
}

export function getBeneficiarySummary(id: string) {
  return api(`/beneficiaries/${id}/summary`);
}

export function getBeneficiaryFull(id: string) {
  return api(`/beneficiaries/${id}/full`);
}

export function updateBeneficiary(
  id: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    dateOfBirth: string | null;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
    cin: string | null;
    phone: string | null;
    address: string | null;
    region: string | null;
    city: string | null;
    publicAlias: string | null;
    hasCnss: boolean;
    hasCnam: boolean;
    hasYellowNotebook: boolean;
    hasWhiteNotebook: boolean;
    hasMonthlyGrant: boolean;
    photoConsent: boolean;
    isOrphan: boolean;
  }>,
) {
  return api(`/beneficiaries/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

// ---- Spouse ----------------------------------------------------------------
export interface BenSpouse {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string | null;
  cin: string;
  phone: string | null;
  hasJob: boolean;
  notes: string | null;
}

export function getSpouse(beneficiaryId: string): Promise<BenSpouse | null> {
  return api(`/beneficiaries/${beneficiaryId}/spouse`);
}

export function upsertSpouse(beneficiaryId: string, input: {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth?: string;
  cin: string;
  phone?: string;
  hasJob?: boolean;
  notes?: string;
}) {
  return api(`/beneficiaries/${beneficiaryId}/spouse`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteSpouse(beneficiaryId: string) {
  return api(`/beneficiaries/${beneficiaryId}/spouse`, { method: 'DELETE' });
}

// ---- Children --------------------------------------------------------------
export interface BenChild {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  inSchool: boolean;
  schoolLevel: 'none' | 'primary' | 'preparatory' | 'secondary' | 'university';
  schoolName: string | null;
  works: boolean;
  jobDescription: string | null;
  hasDisability: boolean;
  disabilityNotes: string | null;
  notes: string | null;
}

export function listChildren(beneficiaryId: string): Promise<BenChild[]> {
  return api(`/beneficiaries/${beneficiaryId}/children`);
}

export function addChild(beneficiaryId: string, input: {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  inSchool?: boolean;
  schoolLevel?: BenChild['schoolLevel'];
  schoolName?: string;
  works?: boolean;
  jobDescription?: string;
  hasDisability?: boolean;
  disabilityNotes?: string;
  notes?: string;
}) {
  return api(`/beneficiaries/${beneficiaryId}/children`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteChild(beneficiaryId: string, childId: string) {
  return api(`/beneficiaries/${beneficiaryId}/children/${childId}`, { method: 'DELETE' });
}

// ---- Jobs ------------------------------------------------------------------
export interface BenJob {
  id: string;
  subjectType: 'beneficiary' | 'spouse';
  title: string;
  employer: string | null;
  place: string | null;
  schedule: string | null;
  salaryMinor: number | null;
  currency: string;
  isRegistered: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export function listJobs(beneficiaryId: string): Promise<BenJob[]> {
  return api(`/beneficiaries/${beneficiaryId}/jobs`);
}

export function addJob(beneficiaryId: string, input: {
  subjectType: 'beneficiary' | 'spouse';
  title: string;
  employer?: string;
  place?: string;
  schedule?: string;
  /** Salary in TND (major units); server converts to millimes. */
  salary?: number;
  isRegistered?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
}) {
  return api(`/beneficiaries/${beneficiaryId}/jobs`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteJob(beneficiaryId: string, jobId: string) {
  return api(`/beneficiaries/${beneficiaryId}/jobs/${jobId}`, { method: 'DELETE' });
}

// ---- Housing ---------------------------------------------------------------
export interface BenHousing {
  id: string;
  tenure: 'owned' | 'rented' | 'hosted' | 'homeless' | 'other';
  rentMinor: number | null;
  currency: string;
  ownerName: string | null;
  ownerPhone: string | null;
  condition: 'good' | 'fair' | 'poor' | 'unsafe';
  rooms: number | null;
  occupants: number | null;
  hasElectricity: boolean;
  hasRunningWater: boolean;
  address: string | null;
  notes: string | null;
}

export function listHousing(beneficiaryId: string): Promise<BenHousing[]> {
  return api(`/beneficiaries/${beneficiaryId}/housing`);
}

export function addHousing(beneficiaryId: string, input: {
  tenure: BenHousing['tenure'];
  /** Rent in TND (major units); server converts to millimes. */
  rent?: number;
  ownerName?: string;
  ownerPhone?: string;
  condition?: BenHousing['condition'];
  rooms?: number;
  occupants?: number;
  hasElectricity?: boolean;
  hasRunningWater?: boolean;
  address?: string;
  notes?: string;
}) {
  return api(`/beneficiaries/${beneficiaryId}/housing`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteHousing(beneficiaryId: string, housingId: string) {
  return api(`/beneficiaries/${beneficiaryId}/housing/${housingId}`, { method: 'DELETE' });
}

// ---- Diseases --------------------------------------------------------------
export interface BenDependent {
  id: string;
  relationType: 'mother' | 'father' | 'orphan' | 'sibling' | 'grandparent' | 'uncle_aunt' | 'other';
  relationOther: string | null;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string | null;
  cin: string | null;
  phone: string | null;
  notes: string | null;
}

export function listDependents(beneficiaryId: string): Promise<BenDependent[]> {
  return api(`/beneficiaries/${beneficiaryId}/dependents`);
}

export function addDependent(
  beneficiaryId: string,
  input: {
    relationType: BenDependent['relationType'];
    relationOther?: string;
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    dateOfBirth?: string;
    cin?: string;
    phone?: string;
    notes?: string;
  },
) {
  return api(`/beneficiaries/${beneficiaryId}/dependents`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteDependent(beneficiaryId: string, dependentId: string) {
  return api(`/beneficiaries/${beneficiaryId}/dependents/${dependentId}`, { method: 'DELETE' });
}

export interface BenDisease {
  id: string;
  subjectType: 'beneficiary' | 'spouse' | 'child' | 'dependent';
  childId: string | null;
  dependentPersonId: string | null;
  name: string | null;
  nameFree: string | null;
  diagnosisDate: string | null;
  monthlyCostMinor: number | null;
  currency: string;
  status: 'active' | 'controlled' | 'recovered';
  needsMedication: boolean;
  needsMonitoring: boolean;
  notes: string | null;
}

export function listDiseases(beneficiaryId: string): Promise<BenDisease[]> {
  return api(`/beneficiaries/${beneficiaryId}/diseases`);
}

export function addDisease(beneficiaryId: string, input: {
  subjectType?: BenDisease['subjectType'];
  childId?: string;
  dependentPersonId?: string;
  name?: string;
  nameFree?: string;
  diagnosisDate?: string;
  monthlyCost?: number;
  status?: BenDisease['status'];
  needsMedication?: boolean;
  needsMonitoring?: boolean;
  notes?: string;
}) {
  return api(`/beneficiaries/${beneficiaryId}/diseases`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteDisease(beneficiaryId: string, diseaseId: string) {
  return api(`/beneficiaries/${beneficiaryId}/diseases/${diseaseId}`, { method: 'DELETE' });
}

// ---- Social coverage -------------------------------------------------------
export interface SocialCoverageItem {
  id: string;
  type: string;
  identifier: string | null;
  monthlyAmountMinor: number | null;
  currency: string;
  validFrom: string | null;
  validUntil: string | null;
  notes: string | null;
}

export function listSocialCoverages(beneficiaryId: string) {
  return api<SocialCoverageItem[]>(`/beneficiaries/${beneficiaryId}/social-coverages`);
}

export function addSocialCoverage(
  beneficiaryId: string,
  input: {
    type: string;
    identifier?: string;
    monthlyAmount?: number;
    validFrom?: string;
    validUntil?: string;
    notes?: string;
  },
) {
  return api(`/beneficiaries/${beneficiaryId}/social-coverages`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteSocialCoverage(beneficiaryId: string, coverageId: string) {
  return api(`/beneficiaries/${beneficiaryId}/social-coverages/${coverageId}`, { method: 'DELETE' });
}
