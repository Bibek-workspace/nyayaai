'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, ArrowRight, Loader2, FileText, Download, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { caseApi, documentApi, hearingApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate, formatDateTime, statusLabels, formatBytes, relativeTime } from '@/lib/utils';
import type { CaseStatus } from '@/types';

// Next states allowed for each status (mirror of CASE_TRANSITIONS on the backend)
const NEXT_STATUS: Record<CaseStatus, CaseStatus | null> = {
  filed: 'registered',
  registered: 'notice_issued',
  notice_issued: 'pleadings',
  pleadings: 'evidence',
  evidence: 'arguments',
  arguments: 'judgment_reserved',
  judgment_reserved: 'disposed',
  disposed: 'appealed',
  appealed: null,
};

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = user && ['judge', 'clerk', 'admin'].includes(user.role);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id], queryFn: () => caseApi.get(id),
  });
  const { data: history = [] } = useQuery({
    queryKey: ['case-history', id], queryFn: () => caseApi.history(id),
    enabled: !!caseData,
  });
  const { data: documents = [] } = useQuery({
    queryKey: ['case-docs', id], queryFn: () => documentApi.list(id),
    enabled: !!caseData,
  });
  const { data: hearings = [] } = useQuery({
    queryKey: ['case-hearings', id], queryFn: () => hearingApi.list({ case_id: id }),
    enabled: !!caseData,
  });

  const advance = useMutation({
    mutationFn: (newStatus: CaseStatus) => caseApi.changeStatus(id, newStatus),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['case', id] });
      qc.invalidateQueries({ queryKey: ['case-history', id] });
    },
    onError: (err) => {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed' : 'Network error');
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading('Uploading…', { id: 'up' });
      await documentApi.upload(file, { case_id: id });
      toast.success('Uploaded — AI processing started', { id: 'up' });
      qc.invalidateQueries({ queryKey: ['case-docs', id] });
    } catch (err) {
      toast.error(
        axios.isAxiosError(err) ? err.response?.data?.detail || 'Upload failed' : 'Network error',
        { id: 'up' },
      );
    }
    e.target.value = '';
  }

  async function openDoc(docId: string) {
    try {
      const { url } = await documentApi.downloadUrl(docId);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('Could not fetch download URL');
    }
  }

  if (isLoading || !caseData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-gold" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const nextStatus = NEXT_STATUS[caseData.status];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="nyaya-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-xs text-gold mb-2">{caseData.case_number}</div>
              <h1 className="font-display text-3xl font-bold text-ivory mb-2">{caseData.title}</h1>
              <div className="flex items-center gap-3 text-xs font-mono text-ivory/60">
                <span className="uppercase">{caseData.category}</span>
                <span>·</span>
                <span>{caseData.court_name}</span>
                {caseData.jurisdiction && <><span>·</span><span>{caseData.jurisdiction}</span></>}
                <span>·</span>
                <span>Filed {formatDate(caseData.filed_on)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={caseData.status} />
              {canManage && nextStatus && (
                <button
                  onClick={() => advance.mutate(nextStatus)}
                  disabled={advance.isPending}
                  className="nyaya-btn-primary flex items-center gap-2"
                >
                  {advance.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <ArrowRight size={14} />}
                  Advance to {statusLabels[nextStatus]}
                </button>
              )}
            </div>
          </div>
          {caseData.description && (
            <p className="text-ivory/70 text-sm mt-4 leading-relaxed border-t border-gold/10 pt-4">
              {caseData.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Documents */}
          <div className="lg:col-span-2 nyaya-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono tracking-widest text-gold">DOCUMENTS</div>
              <label className="cursor-pointer nyaya-btn-secondary flex items-center gap-2 text-xs">
                <Upload size={14} />
                Upload
                <input type="file" onChange={handleUpload} className="hidden" accept=".pdf,.docx,.doc,.txt,image/*" />
              </label>
            </div>
            {documents.length === 0 ? (
              <div className="py-10 text-center text-sm text-ivory/40">
                No documents yet — upload PDF, DOCX, or images
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded border border-gold/10 hover:border-gold/30 transition-colors">
                    <FileText size={18} className="text-gold flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ivory truncate">{d.filename}</div>
                      <div className="text-[10px] font-mono text-ivory/40 mt-0.5 flex gap-2">
                        <span>{formatBytes(d.size_bytes)}</span>
                        <span>·</span>
                        <span>{relativeTime(d.created_at)}</span>
                        {d.ocr_performed && <><span>·</span><span className="text-accent">OCR</span></>}
                        {d.ai_summary && <><span>·</span><span className="text-gold">AI-summarized</span></>}
                      </div>
                    </div>
                    <button
                      onClick={() => openDoc(d.id)}
                      className="text-ivory/50 hover:text-gold p-1"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="nyaya-card p-5">
            <div className="text-xs font-mono tracking-widest text-gold mb-4">LIFECYCLE</div>
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-sm text-ivory/40">No history yet</div>
              ) : (
                history.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-gold" />
                      {i < history.length - 1 && <div className="w-px h-full bg-gold/30 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-sm text-ivory">
                        {h.from_status ? statusLabels[h.from_status] : 'Created'} → {statusLabels[h.to_status]}
                      </div>
                      <div className="text-[10px] font-mono text-ivory/40 mt-0.5">
                        {formatDateTime(h.created_at)}
                      </div>
                      {h.note && <div className="text-xs text-ivory/60 mt-1">{h.note}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Hearings */}
        <div className="nyaya-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-mono tracking-widest text-gold">HEARINGS</div>
          </div>
          {hearings.length === 0 ? (
            <div className="py-8 text-center text-sm text-ivory/40">No hearings scheduled</div>
          ) : (
            <div className="space-y-2">
              {hearings.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded border border-gold/10">
                  <Clock size={16} className="text-gold flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-ivory">{h.purpose}</div>
                    <div className="text-[10px] font-mono text-ivory/40 mt-0.5">
                      {formatDateTime(h.scheduled_at)} · {h.duration_minutes} min
                      {h.courtroom && ` · ${h.courtroom}`}
                    </div>
                  </div>
                  <span className="text-xs font-mono uppercase text-ivory/60">{h.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
