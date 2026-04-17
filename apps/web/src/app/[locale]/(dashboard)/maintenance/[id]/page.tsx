'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Check, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate } from '@aqari/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { PageSpinner } from '@/components/shared/spinner';
import { useAuthStore } from '@/stores/auth-store';

export default function MaintenanceDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('maintenance');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [showAddCost, setShowAddCost] = useState(false);
  const [costAmount, setCostAmount] = useState('');
  const [costDescription, setCostDescription] = useState('');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingCostId, setRejectingCostId] = useState<string | null>(null);

  const { data: request, isLoading } = useQuery({
    queryKey: ['maintenance-request', id],
    queryFn: async () => {
      const res = await apiClient.get(`/maintenance/${id}`);
      return res.data;
    },
  });

  const { data: costsRaw } = useQuery({
    queryKey: ['maintenance-costs', id],
    queryFn: async () => {
      const res = await apiClient.get(`/maintenance/${id}/costs`);
      return res.data;
    },
  });
  const costs = Array.isArray(costsRaw) ? costsRaw : (costsRaw?.data || costsRaw?.costs || []);

  // Override duplicate
  const overrideMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/maintenance/${id}/override-duplicate`, {
        justification: overrideJustification,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-request', id] });
      setOverrideJustification('');
    },
  });

  // Submit cost
  const addCostMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/maintenance/${id}/costs`, {
        amount: Number(costAmount),
        description: costDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', id] });
      setShowAddCost(false);
      setCostAmount('');
      setCostDescription('');
    },
  });

  // Approve cost
  const approveCostMutation = useMutation({
    mutationFn: (costId: string) =>
      apiClient.patch(`/maintenance/costs/${costId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', id] });
    },
  });

  // Reject cost
  const rejectCostMutation = useMutation({
    mutationFn: ({ costId, reason }: { costId: string; reason: string }) =>
      apiClient.patch(`/maintenance/costs/${costId}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', id] });
      setRejectingCostId(null);
      setRejectReason('');
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiClient.patch(`/maintenance/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-request', id] });
    },
  });

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!request) return null;

  const isBlocked = request.status === 'blocked_duplicate';
  const isOwner = user?.role === 'owner';
  const approvedCostTotal = (costs || [])
    .filter((c: any) => c.status === 'approved')
    .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

  // Budget info (if available from addCostMutation response)
  const budgetInfo = addCostMutation.data?.data;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/maintenance`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {locale === 'ar' ? request.category?.name_ar : request.category?.name}
              </h1>
              <StatusBadge status={request.status} locale={locale} />
              {request.is_duplicate_override && (
                <Badge variant="warning">Override</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {request.unit?.unit_number} — {formatDate(request.created_at, locale as 'en' | 'ar')}
            </p>
          </div>
        </div>
        {/* Status actions */}
        {(user?.role === 'owner' || user?.role === 'employee') && !isBlocked && (
          <div className="flex gap-2">
            {request.status === 'submitted' && (
              <Button size="sm" onClick={() => updateStatusMutation.mutate('in_progress')}>
                Start Work
              </Button>
            )}
            {request.status === 'in_progress' && (
              <Button size="sm" onClick={() => updateStatusMutation.mutate('completed')}>
                Mark Complete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Duplicate override section */}
      {isBlocked && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-yellow-800">
              <ShieldAlert className="h-5 w-5" />
              {t('duplicate_warning')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-yellow-700">
              {t('duplicate_message', { days: '30' })}
            </p>
            {request.duplicate_of && (
              <div className="rounded-md border border-yellow-200 bg-white p-3">
                <p className="text-sm font-medium">
                  Original: {request.duplicate_of.category?.name} — {request.duplicate_of.unit?.unit_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.duplicate_of.description?.slice(0, 100)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {formatDate(request.duplicate_of.created_at, locale as 'en' | 'ar')}
                </p>
              </div>
            )}

            {isOwner ? (
              <div className="space-y-3 rounded-md border border-yellow-200 bg-white p-4">
                <h4 className="text-sm font-medium">Owner Override</h4>
                <div>
                  <label className="mb-1.5 block text-sm">{t('justification')}</label>
                  <textarea
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Explain why this is not a duplicate..."
                  />
                </div>
                {overrideMutation.isError && (
                  <p className="text-xs text-destructive">Failed to override.</p>
                )}
                <Button
                  onClick={() => overrideMutation.mutate()}
                  disabled={overrideMutation.isPending || !overrideJustification.trim()}
                >
                  {overrideMutation.isPending ? '...' : t('override')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-yellow-700 font-medium">
                Contact the property owner to override this check.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Request details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{tc('description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            </CardContent>
          </Card>

          {/* Photos */}
          {request.photos?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {request.photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Photo ${i + 1}`} className="h-32 w-full rounded-md object-cover hover:opacity-80" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Costs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Costs</CardTitle>
                {!isBlocked && (user?.role === 'owner' || user?.role === 'employee') && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddCost(true)}>
                    <Plus className="me-2 h-3.5 w-3.5" />
                    {t('add_cost')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Add cost form */}
              {showAddCost && (
                <div className="mb-4 rounded-md border bg-muted/30 p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{tc('amount')} (AED)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={costAmount}
                        onChange={(e) => setCostAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{tc('description')}</label>
                      <Input
                        value={costDescription}
                        onChange={(e) => setCostDescription(e.target.value)}
                        placeholder="What does this cost cover?"
                      />
                    </div>
                  </div>
                  {addCostMutation.isError && (
                    <p className="text-xs text-destructive">
                      {(addCostMutation.error as any)?.response?.data?.message || 'Failed to add cost.'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => addCostMutation.mutate()}
                      disabled={addCostMutation.isPending || !costAmount || !costDescription}
                    >
                      {addCostMutation.isPending ? '...' : 'Submit for Approval'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddCost(false)}>
                      {tc('cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cost list */}
              {(!costs || costs.length === 0) ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No costs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {costs.map((cost: any) => (
                    <div key={cost.id} className="flex items-start justify-between rounded-md border p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CurrencyDisplay
                            amount={Number(cost.amount)}
                            locale={locale as 'en' | 'ar'}
                            className="font-semibold"
                          />
                          <StatusBadge status={cost.status} locale={locale} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{cost.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(cost.created_at, locale as 'en' | 'ar')}
                          {cost.rejection_reason && (
                            <span className="text-destructive"> — Rejected: {cost.rejection_reason}</span>
                          )}
                        </p>
                      </div>

                      {/* Approve/Reject buttons (owner only, pending costs) */}
                      {isOwner && cost.status === 'pending' && (
                        <div className="ms-3 flex gap-1.5">
                          {rejectingCostId === cost.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason..."
                                className="h-8 w-40 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectCostMutation.mutate({ costId: cost.id, reason: rejectReason })}
                                disabled={!rejectReason}
                                className="h-8"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setRejectingCostId(null)} className="h-8">
                                {tc('cancel')}
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                onClick={() => approveCostMutation.mutate(cost.id)}
                                disabled={approveCostMutation.isPending}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setRejectingCostId(cost.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — request info + budget */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{request.unit?.unit_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('category')}</span>
                <span className="font-medium">
                  {locale === 'ar' ? request.category?.name_ar : request.category?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('priority')}</span>
                <Badge
                  variant={
                    request.priority === 'urgent' ? 'destructive' :
                    request.priority === 'high' ? 'warning' : 'secondary'
                  }
                  className="capitalize"
                >
                  {t(request.priority)}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reported</span>
                <span>{formatDate(request.created_at, locale as 'en' | 'ar')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Budget progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('budget_status')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spent (Approved)</span>
                  <CurrencyDisplay amount={approvedCostTotal} locale={locale as 'en' | 'ar'} className="font-medium" />
                </div>
                {request.unit?.maintenance_budget && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <CurrencyDisplay
                        amount={Number(request.unit.maintenance_budget)}
                        locale={locale as 'en' | 'ar'}
                        className="font-medium"
                      />
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          approvedCostTotal > Number(request.unit.maintenance_budget)
                            ? 'bg-red-500'
                            : approvedCostTotal > Number(request.unit.maintenance_budget) * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (approvedCostTotal / Number(request.unit.maintenance_budget)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {request.unit.maintenance_budget_period} budget
                    </p>
                    {approvedCostTotal > Number(request.unit.maintenance_budget) && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('budget_exceeded')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Override info */}
          {request.is_duplicate_override && (
            <Card className="border-yellow-200">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-yellow-700">Duplicate Override</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.duplicate_override_justification}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
