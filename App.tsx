import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Download, Github, Layers, Sparkles, PlusCircle, Loader2, History, X, Check, AlertCircle, Menu, Upload, Save } from 'lucide-react';
import { discoverPapers, generatePaperReport, verifyPaperCitation } from './services/geminiService';
import { generateResearchPDF } from './utils/pdfGenerator';
import { Paper, AppView } from './types';
import { PaperCard } from './components/PaperCard';
import { DeepDiveView } from './components/DeepDiveView';
import { Button } from './components/Button';
import { ResearchSidebar } from './components/ResearchSidebar';

// Hook: useDebounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function App() {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  
  // -- State --
  // Initialize papers from localStorage if available
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('SIGGRAPH 2025 technical papers');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>(''); 
  const [error, setError] = useState<string | null>(null);

  // Analysis State
  const [analyzingPaperId, setAnalyzingPaperId] = useState<string | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [pdfProgress, setPdfProgress] = useState<{current: number, total: number} | undefined>(undefined);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Effects --

  // Load persistence
  useEffect(() => {
    try {
      const savedPapers = localStorage.getItem('siggraph_scout_papers');
      if (savedPapers) {
        setPapers(JSON.parse(savedPapers));
      }
      
      const savedHistory = localStorage.getItem('recentSearches');
      if (savedHistory) {
        setRecentSearches(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load persistence", e);
    }
  }, []);

  // Save persistence (Papers)
  useEffect(() => {
    localStorage.setItem('siggraph_scout_papers', JSON.stringify(papers));
  }, [papers]);

  // Clear errors when user types (debounced)
  useEffect(() => {
    if (debouncedSearchQuery && error) {
      setError(null);
    }
  }, [debouncedSearchQuery, error]);

  // -- Handlers --

  const addToHistory = (query: string) => {
    setRecentSearches(prev => {
      const newHistory = [query, ...prev.filter(q => q !== query)].slice(0, 6);
      localStorage.setItem('recentSearches', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const removeHistoryItem = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const newHistory = prev.filter(q => q !== query);
      localStorage.setItem('recentSearches', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const performSearch = async (query: string, isLoadMore: boolean = false) => {
     if (!query.trim()) return;
     
     setIsSearching(true);
     setError(null);
     
     if (!isLoadMore) {
       // Note: Standard search replaces results. Users can "Load More" to append.
       // Deleting papers from sidebar removes them permanently from session.
       setPapers([]);
       addToHistory(query);
     }

     try {
       // Visual pacing for initial search
       if (!isLoadMore) {
         setSearchStatus("Initializing research agents...");
         await new Promise(r => setTimeout(r, 400));
         
         setSearchStatus(`Scouring the web for "${query}"...`);
         await new Promise(r => setTimeout(r, 800));
       }

       const existingTitles = isLoadMore ? papers.map(p => p.title) : [];
       
       const results = await discoverPapers(query, existingTitles);

       if (!isLoadMore) {
         setSearchStatus("Analyzing content relevance...");
         await new Promise(r => setTimeout(r, 500));
         
         setSearchStatus("Extracting authors and summaries...");
         await new Promise(r => setTimeout(r, 400));
         
         setSearchStatus("Finalizing research digest...");
       }

       if (results.length === 0 && !isLoadMore) {
         setError("No papers found. Please try a different query.");
       } else {
         setPapers(prev => isLoadMore ? [...prev, ...results] : results);
       }

     } catch (err: any) {
       setError(err.message || "Failed to fetch papers.");
     } finally {
       setIsSearching(false);
       setSearchStatus('');
     }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery, false);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    performSearch(query, false);
  };

  const handleLoadMore = () => {
    performSearch(searchQuery, true);
  };

  const handleDeepDive = async (paper: Paper) => {
    if (paper.fullAnalysis) {
      setSelectedPaper(paper);
      setView(AppView.DETAIL);
      return;
    }

    setAnalyzingPaperId(paper.id);
    try {
      // Execute Report Generation and Citation Verification in parallel
      const [analysis, verificationResult] = await Promise.all([
        generatePaperReport(paper),
        verifyPaperCitation(paper.title, paper.authors)
      ]);
      
      const updatedPaper: Paper = { 
        ...paper, 
        fullAnalysis: analysis,
        citation: verificationResult.citation || paper.citation, 
        doi: verificationResult.doi || paper.doi,
        // Upgrade the main URL if we found a better verified one and the current one is a fallback
        url: (verificationResult.sourceUrl && (paper.url.includes('google.com/search') || paper.url === '#'))
             ? verificationResult.sourceUrl
             : paper.url,
        verification: {
          isVerified: verificationResult.isVerified,
          sourceUrl: verificationResult.sourceUrl,
          foundTitle: verificationResult.foundTitle
        }
      };
      
      // Update state AND strictly save to localStorage to ensure data persistence
      setPapers(prev => {
        const updatedPapers = prev.map(p => p.id === paper.id ? updatedPaper : p);
        localStorage.setItem('siggraph_scout_papers', JSON.stringify(updatedPapers));
        return updatedPapers;
      });
      
      setSelectedPaper(updatedPaper);
      setView(AppView.DETAIL);
    } catch (e) {
      console.error("Analysis failed", e);
      // Fallback if full analysis fails, still try to show paper details
      setSelectedPaper(paper);
      setView(AppView.DETAIL);
    } finally {
      setAnalyzingPaperId(null);
    }
  };

  const handleSidebarSelectPaper = (paper: Paper) => {
    handleDeepDive(paper);
  };

  const handleBack = () => {
    setSelectedPaper(null);
    setView(AppView.DASHBOARD);
  };

  const handleDeletePaper = (id: string) => {
    setPapers(prev => prev.filter(p => p.id !== id));
    if (selectedPaper?.id === id) {
      setSelectedPaper(null);
      setView(AppView.DASHBOARD);
    }
  };

  const handleClearAll = () => {
    setPapers([]);
    setSelectedPaper(null);
    setView(AppView.DASHBOARD);
  };

  const handleDownloadPDF = async () => {
    if (papers.length > 0) {
      setExportStatus('loading');
      setPdfProgress({ current: 0, total: papers.length });
      
      try {
        await generateResearchPDF(papers, (current, total) => {
          setPdfProgress({ current, total });
        });
        
        setExportStatus('success');
        setPdfProgress(undefined);
        setTimeout(() => setExportStatus('idle'), 4000);
      } catch (e) {
        console.error("PDF generation failed", e);
        setExportStatus('error');
        setPdfProgress(undefined);
        setTimeout(() => setExportStatus('idle'), 4000);
      }
    }
  };

  // -- Session Management Handlers --

  const handleSaveSession = () => {
    const sessionData = {
      papers,
      timestamp: Date.now(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siggraph-scout-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadSessionClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const data = JSON.parse(result);
        
        // Basic validation
        if (Array.isArray(data.papers)) {
          setPapers(data.papers);
          setView(AppView.DASHBOARD);
          setSelectedPaper(null);
          // Optional: Success toast could go here
        } else {
          alert("Invalid session file format.");
        }
      } catch (err) {
        console.error("Failed to parse session file", err);
        alert("Failed to load session file.");
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const renderPdfButtonContent = () => {
    switch (exportStatus) {
      case 'success':
        return <><Check size={16} className="text-white" /><span>Exported</span></>;
      case 'error':
        return <><AlertCircle size={16} /><span>Failed</span></>;
      case 'loading':
         return (
           <>
             <Loader2 size={16} className="animate-spin" />
             <span>
               {pdfProgress 
                 ? `Generating ${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%` 
                 : 'Preparing...'}
             </span>
           </>
         );
      case 'idle':
      default:
        return <><Download size={16} /><span>Export PDF</span></>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Hidden File Input for Loading Sessions */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      <ResearchSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        papers={papers}
        onSelectPaper={handleSidebarSelectPaper}
        onExport={handleDownloadPDF}
        onDeletePaper={handleDeletePaper}
        onClearAll={handleClearAll}
        exportStatus={exportStatus}
        exportProgress={pdfProgress}
        activePaperId={selectedPaper?.id}
        analyzingPaperId={analyzingPaperId}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
             {/* Hamburger / Menu Toggle */}
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="text-slate-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-800 relative"
             >
               <Menu size={24} />
               {papers.length > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
               )}
             </button>

             <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleBack()}>
               <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-lg">
                 <Layers size={20} className="text-white" />
               </div>
               <span className="font-bold text-xl tracking-tight hidden sm:block">SIGGRAPH<span className="text-blue-400">Scout</span></span>
             </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
             {/* Session Management Controls */}
             <div className="flex items-center gap-1 mr-2">
                <button 
                  onClick={handleLoadSessionClick}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all"
                  title="Load Session File"
                >
                  <Upload size={20} />
                </button>
                <button 
                  onClick={handleSaveSession}
                  className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-lg transition-all"
                  title="Save Session File"
                  disabled={papers.length === 0}
                >
                  <Save size={20} />
                </button>
             </div>

             {view === AppView.DASHBOARD && papers.length > 0 && (
                <Button 
                  variant={exportStatus === 'success' ? 'primary' : 'secondary'} 
                  onClick={handleDownloadPDF}
                  isLoading={exportStatus === 'loading'}
                  className={`hidden md:flex transition-all duration-300 min-w-[140px] ${
                    exportStatus === 'success' ? '!bg-green-600 !border-green-500 hover:!bg-green-500' : ''
                  } ${
                    exportStatus === 'error' ? '!bg-red-600 !border-red-500 hover:!bg-red-500' : ''
                  }`}
                  disabled={exportStatus !== 'idle'}
                >
                  {renderPdfButtonContent()}
                </Button>
             )}
            <a 
              href="https://github.com/p3nGu1nZz/SIGGRAPH-2025-Scout" 
              target="_blank" 
              rel="noreferrer" 
              className="text-slate-400 hover:text-white transition-colors ml-2"
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 max-w-7xl mx-auto px-6 py-8 w-full transition-all duration-300 ${isSidebarOpen ? 'blur-sm md:blur-0' : ''}`}>
        
        {/* VIEW: DASHBOARD */}
        {view === AppView.DASHBOARD && (
          <div className="space-y-10 animate-fade-in">
            
            {/* Search Hero */}
            <div className={`text-center space-y-6 transition-all duration-500 ${papers.length > 0 ? 'py-4' : 'py-10'}`}>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Discover the Future of <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Computer Graphics
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Review, analyze, and deep dive into SIGGRAPH 2025 sessions using Gemini AI with real-time grounding.
              </p>

              <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative group z-10">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 text-white text-lg rounded-full py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-xl"
                  placeholder="e.g. Neural Rendering, Generative AI, Physics Simulation"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <Button 
                    type="submit" 
                    isLoading={isSearching && papers.length === 0} 
                    className="rounded-full !px-6 !py-2 h-10"
                    disabled={!searchQuery.trim()}
                  >
                    Search
                  </Button>
                </div>
              </form>
              
              {/* Recent Searches */}
              {!isSearching && recentSearches.length > 0 && papers.length === 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto animate-fade-in">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
                    <History size={12} /> Recent:
                  </span>
                  {recentSearches.map((query, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleRecentSearchClick(query)}
                      className="group flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-700 cursor-pointer transition-all"
                    >
                      <span>{query}</span>
                      <button 
                        onClick={(e) => removeHistoryItem(e, query)}
                        className="text-slate-500 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress Bar & Status Text (ONLY for initial search) */}
              {isSearching && papers.length === 0 && (
                <div className="max-w-xl mx-auto mt-8 p-6 bg-slate-800/40 rounded-xl border border-slate-700/50 backdrop-blur-sm animate-fade-in">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                     <div className="relative">
                       <Loader2 className="animate-spin w-8 h-8 text-blue-400" />
                       <div className="absolute inset-0 animate-pulse bg-blue-500/20 blur-xl rounded-full"></div>
                     </div>
                     <div className="space-y-1">
                        <p className="text-blue-300 font-medium text-lg tracking-wide animate-pulse">
                          {searchStatus || "Initializing..."}
                        </p>
                        <p className="text-slate-500 text-xs uppercase tracking-widest">
                          AI Research Agent Active
                        </p>
                     </div>
                     
                     <div className="h-1.5 w-64 bg-slate-700/50 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-progress-indeterminate rounded-full"></div>
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
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg text-center max-w-xl mx-auto">
                {error}
              </div>
            )}

            {/* Results Grid */}
            {papers.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
                    <FileText className="text-blue-400" />
                    Research Found ({papers.length})
                  </h2>
                  <span className="text-sm text-slate-500">Powered by Google Search Grounding</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {papers.map((paper) => (
                    <PaperCard 
                      key={paper.id} 
                      paper={paper} 
                      onDeepDive={handleDeepDive} 
                      isAnalyzing={analyzingPaperId === paper.id}
                    />
                  ))}
                </div>

                {/* Load More Area */}
                <div className="flex justify-center pt-8 pb-12">
                   <Button 
                      onClick={handleLoadMore} 
                      variant="secondary"
                      isLoading={isSearching} // This uses the button's internal spinner
                      className="px-8 py-3 text-sm"
                      icon={<PlusCircle size={16}/>}
                   >
                      {isSearching ? "Discovering more papers..." : "Search for more related content"}
                   </Button>
                </div>
              </div>
            )}

            {/* Empty State / Initial Load (Only show if not searching) */}
            {!isSearching && papers.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 opacity-60">
                 <Sparkles className="w-16 h-16 mb-4 text-slate-600" />
                 <p className="text-lg">Enter a topic to start researching SIGGRAPH 2025 content.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: DETAIL (DEEP DIVE) */}
        {view === AppView.DETAIL && selectedPaper && (
          <div className="animate-fade-in-up">
            <DeepDiveView paper={selectedPaper} onBack={handleBack} />
          </div>
        )}

      </main>
    </div>
  );
}