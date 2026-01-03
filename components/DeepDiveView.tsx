import React, { useState, useEffect, useRef } from 'react';
import { Paper, ChatMessage } from '../types';
import { Button } from './Button';
import { generatePaperReport, createDeepDiveChat } from '../services/geminiService';
import { generatePaperAnalysisPDF } from '../utils/pdfGenerator';
import { ArrowLeft, Send, Download, Sparkles, MessageSquare, CheckCircle, AlertTriangle, ExternalLink, Quote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DeepDiveViewProps {
  paper: Paper;
  onBack: () => void;
}

export const DeepDiveView: React.FC<DeepDiveViewProps> = ({ paper, onBack }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report');
  const [report, setReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatSession = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Report & Chat
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Generate Static Report
      if (!paper.fullAnalysis) {
        setIsGeneratingReport(true);
        // Note: Analysis generation is now handled in App.tsx before view switch, 
        // but we keep this as fallback or if logic changes.
        // For now, if paper has fullAnalysis, we use it directly.
        // If it doesn't (legacy/direct nav), we might need to generate.
        try {
            const generatedReport = await generatePaperReport(paper);
            if (isMounted) {
                setReport(generatedReport);
                setIsGeneratingReport(false);
            }
        } catch (e) {
            console.error("Failed to generate report locally", e);
            setIsGeneratingReport(false);
        }
      } else {
        setReport(paper.fullAnalysis);
      }

      // 2. Initialize Chat
      chatSession.current = createDeepDiveChat();
      // Prime the chat with context
      await chatSession.current.sendMessage({
        message: `I am researching the paper titled "${paper.title}" by ${paper.authors}. Here is the summary: ${paper.summary}. Please answer my questions about it.`
      });
    };

    init();
    return () => { isMounted = false; };
  }, [paper]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isChatting) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsChatting(true);

    try {
      const response = await chatSession.current.sendMessage({ message: userMsg.content });
      const modelMsg: ChatMessage = { role: 'model', content: response.text, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />}>
          Back to Results
        </Button>
        
        <div className="flex items-center gap-4">
          {/* Download Button */}
          {activeTab === 'report' && !isGeneratingReport && report && (
            <Button 
              variant="secondary" 
              onClick={() => generatePaperAnalysisPDF({ ...paper, fullAnalysis: report })}
              icon={<Download size={16} />}
              className="text-xs hidden sm:flex"
            >
              Download Analysis
            </Button>
          )}

          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Full Analysis
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Ask Questions
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col relative">
        
        {/* REPORT TAB */}
        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             
             {/* Verification Banner */}
             <div className={`mb-6 p-4 rounded-lg border flex items-start justify-between ${
               paper.verification?.isVerified 
                 ? 'bg-green-900/10 border-green-500/30 text-green-200' 
                 : 'bg-yellow-900/10 border-yellow-500/30 text-yellow-200'
             }`}>
                <div className="flex items-start gap-3 w-full">
                  {paper.verification?.isVerified ? <CheckCircle className="text-green-400 mt-1 shrink-0" size={20} /> : <AlertTriangle className="text-yellow-400 mt-1 shrink-0" size={20} />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">
                      {paper.verification?.isVerified ? "Citation Verified" : "Citation Unverified"}
                    </h3>
                    <p className="text-xs opacity-80 mt-1">
                      {paper.verification?.isVerified 
                        ? `Confirmed existence via search: "${paper.verification.foundTitle || paper.title}"`
                        : "Could not definitively verify this paper's publication status via public search."}
                    </p>
                    
                    {/* Citation Box */}
                    {paper.citation && (
                      <div className="mt-4 bg-slate-950/50 p-4 rounded-lg border border-slate-700/60 shadow-inner">
                         <div className="flex items-center gap-2 mb-2">
                             <Quote size={12} className="text-slate-500" />
                             <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Recommended Citation</span>
                         </div>
                         <div className="text-sm font-mono text-slate-200 break-words leading-relaxed select-all">
                           {paper.citation}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end ml-4 shrink-0">
                    {paper.verification?.sourceUrl && (
                    <a 
                        href={paper.verification.sourceUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs hover:underline hover:text-blue-400 transition-colors whitespace-nowrap"
                    >
                        View Source <ExternalLink size={10} />
                    </a>
                    )}
                    {paper.doi && (
                    <a 
                        href={paper.doi.startsWith('http') ? paper.doi : `https://doi.org/${paper.doi}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs hover:underline hover:text-blue-400 transition-colors whitespace-nowrap"
                    >
                        DOI Record <ExternalLink size={10} />
                    </a>
                    )}
                </div>
             </div>

             <h1 className="text-3xl font-bold text-slate-100 mb-2">{paper.title}</h1>
             <p className="text-slate-400 italic mb-8 border-b border-slate-700 pb-4">{paper.authors}</p>
             
             {isGeneratingReport ? (
               <div className="flex flex-col items-center justify-center h-64 space-y-4">
                 <Sparkles className="animate-pulse text-blue-400 w-12 h-12" />
                 <p className="text-slate-400 animate-pulse">Generating comprehensive analysis with Gemini...</p>
               </div>
             ) : (
               <div className="prose prose-invert prose-blue max-w-none">
                 <ReactMarkdown>{report}</ReactMarkdown>
               </div>
             )}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                  <MessageSquare size={48} className="mb-4" />
                  <p>Ask anything about this paper.</p>
                  <p className="text-sm">e.g., "What is the novel contribution?" or "How does the rendering algorithm work?"</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-slate-700 text-slate-100 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t border-slate-700 bg-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!input.trim() || isChatting}
                  className="px-4"
                  icon={<Send size={18} />}
                >
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};