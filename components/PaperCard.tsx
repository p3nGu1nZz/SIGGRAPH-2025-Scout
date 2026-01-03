import React from 'react';
import { Paper } from '../types';
import { ExternalLink, BookOpen, Sparkles, Link as LinkIcon, Quote } from 'lucide-react';
import { Button } from './Button';

interface PaperCardProps {
  paper: Paper;
  onDeepDive: (paper: Paper) => void;
  isAnalyzing?: boolean;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onDeepDive, isAnalyzing = false }) => {
  const getDoiUrl = (doi: string) => doi.startsWith('http') ? doi : `https://doi.org/${doi}`;

  return (
    <div className={`relative bg-slate-800 border rounded-xl p-6 flex flex-col h-full transition-all duration-300 shadow-sm overflow-hidden group
      ${isAnalyzing ? 'border-blue-500/50 shadow-blue-900/20' : 'border-slate-700 hover:border-blue-500/50'}
    `}>
      
      {/* Dynamic Scanning Overlay for Analysis Mode */}
      {isAnalyzing && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-blue-900/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/10 to-transparent animate-scan" style={{ height: '200%', top: '-50%' }}></div>
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-blue-300 text-xs font-mono font-bold animate-pulse">
            <Sparkles size={12} />
            ANALYZING CONTENT...
          </div>
          <style>{`
            @keyframes scan {
              0% { transform: translateY(-30%); }
              100% { transform: translateY(30%); }
            }
            .animate-scan {
              animation: scan 3s linear infinite;
            }
          `}</style>
        </div>
      )}

      <div className="flex-1 relative z-0">
        <div className="flex flex-wrap gap-2 mb-3">
          {paper.tags.map((tag, idx) => (
            <span key={idx} className="text-xs font-semibold px-2 py-1 bg-slate-700 text-blue-200 rounded-full border border-slate-600">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2 leading-tight">{paper.title}</h3>
        <p className="text-sm text-slate-400 italic mb-4">{paper.authors}</p>
        <p className={`text-slate-300 text-sm line-clamp-4 leading-relaxed transition-opacity ${isAnalyzing ? 'opacity-70' : 'opacity-100'}`}>
          {paper.summary}
        </p>

        {/* Citation Display */}
        {paper.citation && !isAnalyzing && (
          <div className="mt-5 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
               <Quote size={12} className="text-slate-500" />
               <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Citation</p>
            </div>
            <div className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-600/50 shadow-inner break-words leading-relaxed select-all">
               {paper.citation}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-700/50 relative z-20">
        {paper.doi && !isAnalyzing && (
          <a
            href={getDoiUrl(paper.doi)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-slate-800 border border-slate-600 hover:border-blue-500 hover:text-blue-400 hover:bg-slate-750 rounded-lg text-slate-400 transition-all flex items-center justify-center shrink-0"
            title="Digital Object Identifier Link"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkIcon size={16} />
          </a>
        )}

        <Button 
          variant="secondary" 
          onClick={(e) => {
            e.stopPropagation();
            window.open(paper.url, '_blank');
          }}
          className="flex-1 text-xs"
          icon={<ExternalLink size={14} />}
          disabled={isAnalyzing}
        >
          Source
        </Button>
        <Button 
          variant="primary" 
          onClick={(e) => {
             e.stopPropagation();
             onDeepDive(paper);
          }}
          className={`flex-[2] text-xs transition-all duration-300 ${isAnalyzing ? 'bg-blue-600/80' : ''}`}
          isLoading={isAnalyzing}
          icon={<BookOpen size={14} />}
        >
          {isAnalyzing ? "Reading Paper..." : (paper.fullAnalysis ? "View Analysis" : "Deep Dive Analysis")}
        </Button>
      </div>
    </div>
  );
};