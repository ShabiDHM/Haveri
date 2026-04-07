// FILE: src/pages/LawSearchPage.tsx
// PHOENIX PROTOCOL - SINGLE SCROLLBAR (ONLY RESULTS AREA)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, BookOpen, AlertCircle, ChevronRight, ChevronDown, Loader2, Scale, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface LawResult {
  law_title: string;
  article_number?: string;
  source: string;
  text: string;
  chunk_id: string;
}

interface ArticleGroup {
  law_title: string;
  article_number: string;
  source: string;
  preview: string;
  chunkCount: number;
  chunkIds: string[];
}

interface LawSearchPageProps {
  onBackToDrafting?: () => void;
}

const KNOWN_JUNK_MAP: Record<string, string> = {
  'kodi lid': 'LIGJI NR. 06/L-082 – PËR MBROJTJEN E TË DHËNAVE PERSONALE'
};

function normalizeForDisplay(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

function extractDescriptiveFromSource(source: string): string | null {
  const match = source.match(/_PËR_(.+)\.pdf$/i);
  if (match && match[1]) {
    const descriptive = match[1].replace(/_/g, ' ').trim();
    return `PËR ${descriptive}`;
  }
  return null;
}

function isBareLawNumber(title: string): boolean {
  const trimmed = title.trim();
  if (!/^LIGJ/i.test(trimmed)) return false;
  if (!/\//.test(trimmed)) return false;
  if (/[—–-]/.test(trimmed) && !/^LIGJI?\s+NR\.?\s*\d+(?:\/[A-Za-z0-9-]+)*$/.test(trimmed)) {
    return false;
  }
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 4) return false;
  return true;
}

function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  return debouncedCallback;
}

export default function LawSearchPage({ onBackToDrafting }: LawSearchPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<LawResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  const [lawTitles, setLawTitles] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [selectedLaw, setSelectedLaw] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [enrichedTitles, setEnrichedTitles] = useState<Map<string, string>>(new Map());
  const [enrichingTitles, setEnrichingTitles] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    apiService.getLawTitles()
      .then(async (titles) => {
        const filteredTitles = titles.filter(title => normalizeForDisplay(title).length >= 2);
        setLawTitles(filteredTitles);
        
        const initialEnriched = new Map<string, string>();
        const remainingTitles: string[] = [];
        
        filteredTitles.forEach(title => {
          const lower = title.toLowerCase().trim();
          if (KNOWN_JUNK_MAP[lower]) {
            initialEnriched.set(title, KNOWN_JUNK_MAP[lower]);
          } else {
            remainingTitles.push(title);
          }
        });
        setEnrichedTitles(initialEnriched);
        
        const bareTitles = remainingTitles.filter(isBareLawNumber);
        if (bareTitles.length === 0) return;

        setEnrichingTitles(new Set(bareTitles));
        
        const enrichmentPromises = bareTitles.map(async (bareTitle) => {
          try {
            const lawData = await apiService.getLawArticlesByTitle(bareTitle);
            if (lawData?.source) {
              const descriptive = extractDescriptiveFromSource(lawData.source);
              if (descriptive) return { bare: bareTitle, full: `${bareTitle} – ${descriptive}` };
            }
            if (lawData?.law_title && lawData.law_title !== bareTitle) {
              return { bare: bareTitle, full: lawData.law_title };
            }
            return { bare: bareTitle, full: bareTitle };
          } catch {
            return { bare: bareTitle, full: bareTitle };
          }
        });

        const results = await Promise.all(enrichmentPromises);
        const newMap = new Map(initialEnriched);
        results.forEach(({ bare, full }) => newMap.set(bare, full));
        setEnrichedTitles(newMap);
        setEnrichingTitles(new Set());
      })
      .catch((err) => {
        console.error(err);
        setLoadingTitles(false);
      })
      .finally(() => setLoadingTitles(false));
  }, []);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, ArticleGroup>();
    rawResults.forEach(item => {
      const articleNum = item.article_number || '0';
      const key = `${item.law_title}|${articleNum}`;
      if (!groups.has(key)) {
        groups.set(key, {
          law_title: item.law_title,
          article_number: articleNum,
          source: item.source || '',
          preview: item.text || '',
          chunkCount: 1,
          chunkIds: [item.chunk_id]
        });
      } else {
        const group = groups.get(key)!;
        group.chunkCount++;
        group.chunkIds.push(item.chunk_id);
      }
    });
    return Array.from(groups.values());
  }, [rawResults]);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setRawResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiService.searchLaws(searchTerm, undefined, 100);
      setRawResults(data);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || t('lawSearch.error', 'Kërkimi dështoi.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const debouncedSearch = useDebounce(performSearch, 300);

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleClear = () => {
    setQuery('');
    setRawResults([]);
    setHasSearched(false);
    setError('');
  };

  const handleLawSelect = (lawTitle: string) => {
    setSelectedLaw(lawTitle);
    setDropdownOpen(false);
    navigate(`/laws/overview?lawTitle=${encodeURIComponent(lawTitle)}`);
  };

  const getDisplayTitle = (original: string): string => {
    return enrichedTitles.has(original) ? enrichedTitles.get(original)! : original;
  };

  const handleViewArticle = (lawTitle: string, articleNumber: string) => {
    navigate(`/law-article?lawTitle=${encodeURIComponent(lawTitle)}&articleNumber=${encodeURIComponent(articleNumber)}`);
  };

  const handleBack = () => {
    if (onBackToDrafting) {
      onBackToDrafting();
    } else {
      navigate(-1);
    }
  };

  if (loadingTitles) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary-start" />
        <p className="mt-4 text-text-muted">{t('general.loading', 'Duke ngarkuar...')}</p>
      </div>
    );
  }

  if (lawTitles.length === 0 && !loadingTitles) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle className="h-12 w-12 text-warning-start mb-4" />
        <h3 className="text-xl font-black text-text-primary">{t('lawSearch.noLawsFound', 'Nuk u gjetën ligje')}</h3>
        <p className="text-text-muted mt-2">{t('lawSearch.checkBackend', 'Lidhja me bazën ligjore nuk është në dispozicion.')}</p>
      </div>
    );
  }

  return (
    // Outer container: no overflow-y-auto (single scroll handled by results area)
    <div className="flex flex-col h-full w-full">
      <div className="max-w-5xl mx-auto w-full px-6 sm:px-8 mt-12 flex-1">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="text-xs font-black uppercase tracking-widest text-text-primary bg-surface/50 border border-border-main px-4 py-2 rounded-lg mb-6 hover:bg-surface transition-all w-fit flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          <span>KTHEHU</span>
        </button>

        {/* Search card - overflow-visible, no hidden */}
        <div className="glass-panel p-8 sm:p-10 rounded-[2rem] border border-border-main shadow-xl w-full mb-8 overflow-visible relative z-20">
          <div className="relative z-30 mb-5">
            <button
              ref={buttonRef}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-6 py-5 rounded-xl border border-border-main bg-surface text-left transition-all hover:border-blue-500/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              disabled={enrichingTitles.size > 0}
            >
              <div className="flex items-center gap-3">
                <Filter size={18} className="text-primary-start" />
                <span className="text-base font-bold text-text-primary">
                  {selectedLaw ? normalizeForDisplay(selectedLaw) : t('lawSearch.selectLaw', 'Shfleto ligje specifike...')}
                </span>
              </div>
              {enrichingTitles.size > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary-start" />
              ) : (
                <ChevronDown size={18} className={`text-text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 z-[100] mt-1 bg-surface dark:bg-gray-900 border border-border-main rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar py-2"
                >
                  {lawTitles.map(title => (
                    <button
                      key={title}
                      onClick={() => handleLawSelect(title)}
                      className="w-full text-left px-6 py-3.5 hover:bg-hover text-sm font-medium text-text-primary hover:text-primary-start transition-colors border-b border-border-main/50 last:border-0 flex items-center justify-between"
                    >
                      <span className="truncate pr-4">{normalizeForDisplay(getDisplayTitle(title))}</span>
                      {enrichingTitles.has(title) && <Loader2 className="shrink-0 h-3 w-3 animate-spin text-primary-start" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className={`h-6 w-6 transition-colors ${loading ? 'text-primary-start animate-pulse' : 'text-text-muted group-focus-within:text-blue-500'}`} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('lawSearch.placeholder', 'Kërko nene, fjalë kyçe, koncepte juridike...')}
              className="w-full pl-16 pr-16 py-6 bg-surface border border-border-main rounded-xl shadow-sm text-base font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-6 flex items-center text-text-muted hover:text-danger-start transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* ONLY results area scrolls - single scrollbar */}
        <div className="overflow-y-auto custom-scrollbar pb-12" style={{ maxHeight: 'calc(100vh - 380px)' }}>
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-panel p-8 rounded-[1.5rem] animate-pulse bg-surface/50 border border-border-main">
                  <div className="h-6 bg-border-main rounded-md w-1/3 mb-4"></div>
                  <div className="h-4 bg-border-main/50 rounded-md w-full mb-3"></div>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel border border-danger-start/30 bg-danger-start/5 p-6 rounded-2xl flex items-start gap-4 shadow-sm mb-8">
                <AlertCircle className="h-6 w-6 text-danger-start shrink-0" />
                <p className="text-danger-start font-bold text-sm mt-0.5">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && hasSearched && groupedResults.length === 0 && query.trim() !== '' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-16 rounded-[2rem] text-center border border-border-main shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-canvas rounded-full flex items-center justify-center mb-6">
                <BookOpen className="h-10 w-10 text-text-muted" strokeWidth={1.5} />
              </div>
              <p className="text-text-primary text-xl font-black tracking-tight mb-2 uppercase">
                {t('lawSearch.noResults', 'Nuk u gjet asnjë rezultat')}
              </p>
            </motion.div>
          )}

          {!loading && groupedResults.length > 0 && (
            <div className="space-y-6">
              <p className="text-xs text-text-muted font-black uppercase tracking-widest ml-2">
                {groupedResults.length} {groupedResults.length === 1 ? 'Rezultat i gjetur' : 'Rezultate të gjetura'}
              </p>
              
              {groupedResults.map((article, idx) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={idx}>
                  <div className="glass-panel p-8 rounded-[1.5rem] hover:shadow-md transition-all group border border-border-main hover:border-primary-start/50 bg-surface hover-lift">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="bg-primary-start/10 text-primary-start border border-primary-start/20 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Scale size={12} /> Referencë Ligjore
                        </span>
                        <span className="bg-canvas text-text-primary border border-border-main px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest">
                          Neni {article.article_number}
                        </span>
                      </div>

                      <button
                        onClick={() => handleViewArticle(article.law_title, article.article_number)}
                        className="text-lg sm:text-xl font-black text-text-primary group-hover:text-primary-start transition-colors leading-tight text-left"
                      >
                        {article.law_title}
                      </button>
                      
                      <p className="text-sm text-text-secondary leading-relaxed font-medium border-l-2 border-border-main pl-4">
                        {article.preview}
                      </p>
                      
                      <div className="flex items-center justify-between gap-4 mt-4 pt-6 border-t border-border-main">
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="px-3 py-1.5 bg-canvas border border-border-main rounded-lg text-text-muted font-bold">
                            {article.source}
                          </span>
                          {article.chunkCount > 1 && (
                            <span className="px-3 py-1.5 bg-primary-start/10 text-primary-start rounded-lg font-black uppercase tracking-widest text-xs">
                              {article.chunkCount} Pjesë
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleViewArticle(article.law_title, article.article_number)}
                            className="text-xs font-black uppercase tracking-widest text-primary-start hover:text-white hover:bg-primary-start px-4 py-2 rounded-lg border border-primary-start/30 hover:border-primary-start transition-all flex items-center gap-1.5 hover-lift shadow-sm"
                          >
                            {t('lawSearch.viewDetails', 'Lexo Nenin')} <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}