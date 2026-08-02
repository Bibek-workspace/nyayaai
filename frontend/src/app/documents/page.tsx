'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Download, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { documentApi, aiApi } from '@/lib/api';
import { formatBytes, relativeTime } from '@/lib/utils';

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [summarizing, setSummarizing] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.list(),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading('Uploading…', { id: 'up' });
      await documentApi.upload(file);
      toast.success('Uploaded — AI processing started in background', { id: 'up' });
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      toast.error(
        axios.isAxiosError(err) ? err.response?.data?.detail || 'Upload failed' : 'Network error',
        { id: 'up' },
      );
    }
    e.target.value = '';
  }

  async function summarize(id: string) {
    setSummarizing(id);
    try {
      await aiApi.summarize(id);
      toast.success('Summary generated');
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed' : 'Network error');
    } finally {
      setSummarizing(null);
    }
  }

  async function download(id: string) {
    try {
      const { url } = await documentApi.downloadUrl(id);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('Could not fetch download URL');
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-mono tracking-widest text-gold/70 mb-2">DOCUMENT LIBRARY</div>
            <h1 className="font-display text-4xl font-bold text-ivory">Documents</h1>
            <p className="text-ivory/60 text-sm mt-1">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'} ·
              {' '}{documents.filter((d) => d.ai_summary).length} with AI summaries
            </p>
          </div>
          <label className="cursor-pointer nyaya-btn-primary flex items-center gap-2">
            <Upload size={16} />
            Upload Document
            <input type="file" onChange={handleUpload} className="hidden" accept=".pdf,.docx,.doc,.txt,image/*" />
          </label>
        </div>

        {isLoading ? (
          <div className="nyaya-card p-16 text-center text-ivory/40">Loading…</div>
        ) : documents.length === 0 ? (
          <div className="nyaya-card p-16 text-center">
            <FileText size={40} className="mx-auto text-gold/40 mb-3" />
            <div className="text-ivory/60">No documents yet</div>
            <div className="text-xs text-ivory/40 mt-1">
              Upload PDF, DOCX, or image files to build your indexed corpus.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((d) => (
              <div key={d.id} className="nyaya-card p-5">
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-gold flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ivory truncate">{d.filename}</div>
                    <div className="text-[10px] font-mono text-ivory/40 mt-1 flex flex-wrap gap-2">
                      <span>{formatBytes(d.size_bytes)}</span>
                      <span>·</span>
                      <span className="uppercase">{d.kind}</span>
                      <span>·</span>
                      <span>{relativeTime(d.created_at)}</span>
                      {d.ocr_performed && <><span>·</span><span className="text-accent">OCR PERFORMED</span></>}
                    </div>
                    {d.ai_summary && (
                      <div className="mt-3 p-3 rounded bg-navy/40 border border-gold/10">
                        <div className="text-[10px] font-mono tracking-widest text-gold mb-1.5 flex items-center gap-1">
                          <Sparkles size={10} /> AI SUMMARY
                        </div>
                        <p className="text-xs text-ivory/80 leading-relaxed whitespace-pre-wrap">
                          {d.ai_summary}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => download(d.id)}
                      className="text-xs px-3 py-1.5 rounded border border-gold/20 text-ivory/70 hover:border-gold hover:text-gold flex items-center gap-1.5"
                    >
                      <Download size={12} /> Download
                    </button>
                    {!d.ai_summary && (
                      <button
                        onClick={() => summarize(d.id)}
                        disabled={summarizing === d.id}
                        className="text-xs px-3 py-1.5 rounded border border-accent/30 text-accent hover:bg-accent/10 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles size={12} />
                        {summarizing === d.id ? 'Summarizing…' : 'Summarize'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
