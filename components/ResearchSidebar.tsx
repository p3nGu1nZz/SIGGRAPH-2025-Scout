import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Paper } from '../types';
import { X, FileText, CheckCircle, Download, BookOpen, Layers, Loader2, Trash2, Filter, ArrowUpDown, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Button } from './Button';

interface ResearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  papers: Paper[];
  onSelectPaper: (paper: Paper) => void;
  onExport: () => void;
  onDeletePaper: (id: string) => void;
  onClearAll: () => void;
  exportStatus: 'idle' | 'loading' | 'success' | 'error';
  exportProgress?: { current: number; total: number };
  activePaperId?: string;
  analyzingPaperId?: string | null;
}

type SortOption = 'newest' | 'oldest' | 'alpha' | 'verified';

export const ResearchSidebar: React.FC<ResearchSidebarProps> = ({
  isOpen,
  onClose,
  papers,
  onSelectPaper,
  onExport,
  onDeletePaper,
  onClearAll,
  exportStatus,
  exportProgress,
  activePaperId,
  analyzingPaperId
}) => {
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Local State for UI controls
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Smooth scroll to active paper
  useEffect(() => {
    if (isOpen && activePaperId && itemRefs.current[activePaperId]) {
      setTimeout(() => {
        itemRefs.current[activePaperId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [isOpen, activePaperId]);

  // Derived State: All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    papers.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [papers]);

  // Filter and Sort Logic
  const processedPapers = useMemo(() => {
    let result = [...papers];

    // Filter
    if (filterTag) {
      result = result.filter(p => p.tags.includes(filterTag));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'alpha':
          return a.title.localeCompare(b.title);
        case 'oldest':
          return (a.createdAt || 0) - (b.createdAt || 0);
        case 'verified':
           // Put verified first, then others
           const vA = a.verification?.isVerified ? 1 : 0;
           const vB = b.verification?.isVerified ? 1 : 0;
           return vB - vA;
        case 'newest':
        default:
          return (b.createdAt || 0) - (a.createdAt || 0);
      }
    });

    return result;
  }, [papers, filterTag, sortOption]);

  const getDoiLink = (doi: string) => {
    if (doi.startsWith('http')) return doi;
    return `https://doi.org/${doi}`;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 w-80 md:w-96 bg-slate-900 border-r border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded-lg">
                  <Layers size={18} className="text-white" />
               </div>
               <div>
                  <h2 className="font-bold text-white text-lg leading-tight">Research Journal</h2>
                  <p className="text-xs text-slate-400">{papers.length} Papers Collected</p>
               </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative flex-1 group">
               <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 cursor-pointer hover:border-slate-600">
                 <ArrowUpDown size={12} />
                 <select 
                   value={sortOption} 
                   onChange={(e) => setSortOption(e.target.value as SortOption)}
                   className="bg-transparent border-none outline-none appearance-none w-full cursor-pointer"
                 >
                   <option value="newest">Newest First</option>
                   <option value="oldest">Oldest First</option>
                   <option value="alpha">Alphabetical</option>
                   <option value="verified">Verified First</option>
                 </select>
               </div>
            </div>

            {/* Filter Dropdown */}
            <div className="relative flex-1">
               <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 cursor-pointer hover:border-slate-600">
                 <Filter size={12} />
                 <select 
                   value={filterTag || ''} 
                   onChange={(e) => setFilterTag(e.target.value || null)}
                   className="bg-transparent border-none outline-none appearance-none w-full cursor-pointer"
                 >
                   <option value="">All Tags</option>
                   {allTags.map(tag => (
                     <option key={tag} value={tag}>{tag}</option>
                   ))}
                 </select>
               </div>
            </div>

            {/* Clear All Button */}
            {papers.length > 0 && (
              <div className="relative">
                {!isConfirmingClear ? (
                  <button 
                    onClick={() => setIsConfirmingClear(true)}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-all"
                    title="Clear All Papers"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <div className="absolute top-0 right-0 flex items-center gap-1 bg-slate-800 border border-red-500/50 p-1 rounded-lg z-10 shadow-xl">
                    <button 
                      onClick={() => {
                        onClearAll();
                        setIsConfirmingClear(false);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-bold px-2"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setIsConfirmingClear(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {processedPapers.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-500">
              <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No research collected yet.</p>
              <p className="text-xs mt-1">Search for topics to build your journal.</p>
            </div>
          ) : (
            processedPapers.map((paper, index) => {
              const isAnalyzing = analyzingPaperId === paper.id;
              const isActive = activePaperId === paper.id;
              
              return (
                <div 
                  key={paper.id}
                  ref={el => { itemRefs.current[paper.id] = el }}
                  onClick={() => {
                    onSelectPaper(paper);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`relative p-3 rounded-xl cursor-pointer border transition-all duration-300 group overflow-hidden ${
                    isActive 
                      ? 'bg-blue-900/20 border-blue-500/40 shadow-lg shadow-blue-900/10' 
                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Delete Button (Visible on Hover/Active) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePaper(paper.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all z-10 ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Trash2 size={12} />
                  </button>

                  <div className="flex items-start gap-3">
                    <div className={`mt-1 flex-shrink-0 ${
                      isAnalyzing
                        ? 'text-blue-400'
                        : paper.fullAnalysis 
                          ? (paper.verification?.isVerified ? 'text-green-400' : 'text-blue-400')
                          : 'text-slate-500'
                    }`}>
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : (paper.fullAnalysis ? <CheckCircle size={14} /> : <FileText size={14} />)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className={`text-sm font-medium leading-snug transition-colors ${isActive ? 'text-blue-200' : 'text-slate-200 group-hover:text-white'}`}>
                        {paper.title}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{paper.authors}</p>
                      
                      {/* Expanded View: Abstract */}
                      {isActive && (
                         <div className="mt-2 text-[11px] text-slate-400 leading-relaxed border-t border-blue-500/20 pt-2 animate-fade-in">
                            {paper.summary.length > 150 ? `${paper.summary.substring(0, 150)}...` : paper.summary}
                         </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Analysis Progress Bar */}
                        {isAnalyzing && (
                          <div className="flex items-center gap-2 w-full max-w-[140px]">
                            <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-400 animate-progress-indeterminate rounded-full"></div>
                            </div>
                            <span className="text-[10px] text-blue-300 font-medium">Analyzing...</span>
                          </div>
                        )}

                        {!isAnalyzing && paper.fullAnalysis && (
                          <span className="inline-block text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">
                            Analyzed
                          </span>
                        )}
                        
                        {!isAnalyzing && paper.verification?.isVerified && (
                           <span className="inline-flex items-center gap-1 text-[10px] bg-green-900/30 text-green-300 px-1.5 py-0.5 rounded border border-green-800/50">
                              Verified
                           </span>
                        )}
                        
                        {!isAnalyzing && paper.verification && !paper.verification.isVerified && paper.fullAnalysis && (
                           <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-900/30 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-800/50">
                              Unverified
                           </span>
                        )}

                        {/* DOI Link */}
                        {!isAnalyzing && paper.doi && (
                           <a 
                             href={getDoiLink(paper.doi)} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-colors"
                             onClick={(e) => e.stopPropagation()}
                             title="Digital Object Identifier"
                           >
                              <LinkIcon size={8} /> DOI
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
          <Button 
            variant={exportStatus === 'success' ? 'primary' : 'secondary'}
            onClick={onExport}
            isLoading={exportStatus === 'loading'}
            disabled={papers.length === 0}
            className={`w-full justify-center ${exportStatus === 'success' ? '!bg-green-600 !border-green-500' : ''}`}
            icon={exportStatus === 'success' ? <CheckCircle size={16}/> : <Download size={16}/>}
          >
             {exportStatus === 'success' ? "Journal Exported" : (
               exportStatus === 'loading' && exportProgress 
                 ? `Processing ${exportProgress.current}/${exportProgress.total}`
                 : "Download Comprehensive PDF"
             )}
          </Button>
          <p className="text-[10px] text-center text-slate-600 mt-2">
            Includes Table of Contents, Citations & Analyses
          </p>
        </div>
      </div>
      <style>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 70%; margin-left: 30%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
      `}</style>
    </>
  );
};