'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search, Loader2, Sparkles, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { aiApi } from '@/lib/api';
import type { PrecedentSearchResponse } from '@/types';

const SAMPLE_QUERIES = [
  'bail application murder accused first offender',
  'service of notice in tenancy dispute',
  'compensation in motor accident case minor injuries',
  'maintenance under Section 125 CrPC unemployed wife',
];

export default function AISearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PrecedentSearchResponse | null>(null);

  const search = useMutation({
    mutationFn: (q: string) => aiApi.precedentSearch(q, 5),
    onSuccess: setResult,
    onError: (err) => {
      toast.error(
        axios.isAxiosError(err) ? err.response?.data?.detail || 'Search failed' : 'Network error',
      );
    },
  });

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 3) return;
    search.mutate(query.trim());
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
        <div>
          <div className="text-xs font-mono tracking-widest text-gold/70 mb-2">
            SEMANTIC SEARCH · RAG
          </div>
          <h1 className="font-display text-4xl font-bold text-ivory">
            AI Precedent <span className="text-gold">Search</span>
          </h1>
          <p className="text-ivory/60 text-sm mt-2">
            Ask in plain English. The system retrieves relevant passages from your indexed corpus
            and produces a grounded summary with source citations.
          </p>
        </div>

        <form onSubmit={submit} className="nyaya-card p-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ivory/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. bail application IPC 302 first offender"
              className="nyaya-input pl-11 pr-32"
            />
            <button
              type="submit"
              disabled={search.isPending || query.trim().length < 3}
              className="absolute right-2 top-1/2 -translate-y-1/2 nyaya-btn-primary py-2 px-4 flex items-center gap-1.5 text-sm"
            >
              {search.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Searching</>
              ) : (
                <><Sparkles size={14} /> Search</>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[10px] font-mono tracking-widest text-ivory/40 mr-1 self-center">
              TRY:
            </span>
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuery(q); search.mutate(q); }}
                className="text-xs px-2.5 py-1 rounded border border-gold/15 text-ivory/60 hover:border-gold hover:text-gold transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </form>

        {result && (
          <>
            <div className="nyaya-card p-6 border-gold/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-gold" />
                <span className="text-xs font-mono tracking-widest text-gold">AI ANSWER</span>
                <span className="text-[10px] font-mono text-ivory/40 ml-auto">
                  {result.elapsed_ms}ms · {result.hits.length} sources
                </span>
              </div>
              <p className="text-ivory leading-relaxed whitespace-pre-wrap">{result.answer}</p>
            </div>

            <div>
              <div className="text-xs font-mono tracking-widest text-gold mb-3">SOURCES</div>
              {result.hits.length === 0 ? (
                <div className="nyaya-card p-8 text-center text-ivory/40 text-sm">
                  No matching documents in the corpus. Upload case files to populate the index.
                </div>
              ) : (
                <div className="space-y-3">
                  {result.hits.map((h, i) => (
                    <div key={i} className="nyaya-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-gold" />
                        <span className="text-sm font-medium text-ivory">{h.filename}</span>
                        <span className="text-[10px] font-mono text-ivory/40 ml-auto">
                          {(h.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <p className="text-xs text-ivory/70 leading-relaxed line-clamp-4">
                        {h.chunk_content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
