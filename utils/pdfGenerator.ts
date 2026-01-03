import { jsPDF } from "jspdf";
import { Paper } from "../types";

// Helper to clean markdown for PDF text
const cleanMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s?/g, '') // Remove Headers
    .replace(/\*\*/g, '')      // Remove Bold
    .replace(/\*/g, '')        // Remove Italic/Bullets
    .replace(/`/g, '')         // Remove Code ticks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');
};

export const generatePaperAnalysisPDF = async (paper: Paper) => {
  const doc = new jsPDF();
  const lineHeight = 7;
  let cursorY = 20;
  const pageHeight = 280;
  const margin = 20;
  const maxLineWidth = 170;

  const checkPageBreak = (heightNeeded: number) => {
    if (cursorY + heightNeeded >= pageHeight) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // Header ID
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`SIGGRAPH Scout Analysis`, margin, cursorY);
  cursorY += 10;

  // Paper Title
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102); // Dark Blue
  const titleLines = doc.splitTextToSize(paper.title, maxLineWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += (titleLines.length * lineHeight) + 5;

  // Authors
  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(paper.authors, margin, cursorY);
  cursorY += lineHeight + 5;

  // Citation Section
  if (paper.citation || paper.verification?.isVerified) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // Calculate Box Height based on citation text length
      const citeText = paper.citation || "Citation not generated yet.";
      const citeLines = doc.splitTextToSize(citeText, 160);
      // Base padding (14) + line height approx 4 * lines
      const boxHeight = 16 + (citeLines.length * 4);

      checkPageBreak(boxHeight + 5);
      
      // Citation Box Background
      doc.setDrawColor(220);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, cursorY, 170, boxHeight, 'F');
      
      // Label
      doc.setTextColor(50, 50, 50);
      doc.text("CITATION & VERIFICATION", margin + 5, cursorY + 6);
      
      // Verification Status Text
      if (paper.verification?.isVerified) {
           doc.setTextColor(0, 120, 0);
           doc.setFont("helvetica", "bold");
           doc.text("✓ Verified Source", margin + 120, cursorY + 6);
      } else {
           doc.setTextColor(150, 0, 0);
           doc.setFont("helvetica", "bold");
           doc.text("⚠ Unverified", margin + 120, cursorY + 6);
      }

      // Citation Text
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      doc.text(citeLines, margin + 5, cursorY + 14);

      cursorY += boxHeight + 10;
  }

  // Tags
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Tags: ${paper.tags.join(", ")}`, margin, cursorY);
  cursorY += lineHeight + 5;

  // Section: Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Abstract / Summary", margin, cursorY);
  cursorY += lineHeight;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(paper.summary, maxLineWidth);
  summaryLines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
  });
  cursorY += 10;

  // Section: Deep Dive (if available)
  if (paper.fullAnalysis) {
    checkPageBreak(20);
    doc.setDrawColor(200);
    doc.line(margin, cursorY, 190, cursorY);
    cursorY += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("Deep Dive Analysis", margin, cursorY);
    cursorY += lineHeight + 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);

    const cleanAnalysis = cleanMarkdown(paper.fullAnalysis);
    const analysisLines = doc.splitTextToSize(cleanAnalysis, maxLineWidth);

    analysisLines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    });
    cursorY += 10;
  }

  // Link
  checkPageBreak(20);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 255);
  doc.textWithLink("Original Source Link", margin, cursorY, { url: paper.url });
  if (paper.verification?.sourceUrl) {
     cursorY += 7;
     doc.textWithLink("Verified Source Link", margin, cursorY, { url: paper.verification.sourceUrl });
  }

  doc.save(`${paper.title.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_Analysis.pdf`);
};

export const generateResearchPDF = async (
  papers: Paper[], 
  onProgress?: (current: number, total: number) => void
) => {
  const doc = new jsPDF();
  const lineHeight = 7;
  let cursorY = 20;
  const pageHeight = 280;
  const margin = 20;
  const maxLineWidth = 170;

  const checkPageBreak = (heightNeeded: number) => {
    if (cursorY + heightNeeded >= pageHeight) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // --- Title Page ---
  doc.setFontSize(26);
  doc.setTextColor(20, 20, 40);
  doc.setFont("helvetica", "bold");
  doc.text("SIGGRAPH 2025", margin, cursorY);
  cursorY += 12;
  
  doc.setFontSize(20);
  doc.setTextColor(60, 60, 70);
  doc.setFont("helvetica", "normal");
  doc.text("Research Journal & Digest", margin, cursorY);
  cursorY += 30;

  // Accreditation & Metadata
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  
  doc.text("Edited and Compiled by:", margin, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Kara Rawson", margin, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text("rawsonkara@gmail.com", margin + 40, cursorY);
  cursorY += 15;
  
  doc.text("Published by:", margin, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Cat Game Research 2026", margin, cursorY);
  cursorY += 20;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, cursorY);
  doc.text(`Total Papers: ${papers.length}`, margin, cursorY + 7);
  cursorY += 20;

  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(margin, cursorY, 190, cursorY);
  
  // Prepare TOC Page (Reserve space, will fill later)
  doc.addPage();
  const tocPageNumber = doc.internal.getNumberOfPages(); 
  // tocPageNumber will capture the actual page index of the TOC
  
  // Track where each paper starts for TOC links
  const tocEntries: { title: string; page: number; verification: boolean }[] = [];

  // --- Process Papers ---
  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    
    // Update progress
    if (onProgress) {
      onProgress(i + 1, papers.length);
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Start new page for paper
    doc.addPage();
    // CRITICAL: Capture the actual page number immediately after adding the page.
    // doc.internal.getNumberOfPages() returns the total page count, which corresponds
    // to the index of the newly added page (1-based index).
    const startPage = doc.internal.getNumberOfPages();
    cursorY = margin;

    // Record for TOC
    tocEntries.push({ 
      title: paper.title, 
      page: startPage,
      verification: !!paper.verification?.isVerified
    });

    // Header ID
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Paper #${i + 1}`, margin, cursorY);
    cursorY += 10;

    // Paper Title
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102); // Dark Blue
    const titleLines = doc.splitTextToSize(paper.title, maxLineWidth);
    doc.text(titleLines, margin, cursorY);
    cursorY += (titleLines.length * lineHeight) + 5;

    // Authors
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text(paper.authors, margin, cursorY);
    cursorY += lineHeight + 5;

    // Citation Section
    if (paper.citation || paper.verification?.isVerified) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        
        // Calculate Box Height based on citation text length
        const citeText = paper.citation || "Citation not generated yet.";
        const citeLines = doc.splitTextToSize(citeText, 160);
        // Base padding (14) + line height approx 4 * lines
        const boxHeight = 16 + (citeLines.length * 4);

        checkPageBreak(boxHeight + 5);
        
        // Citation Box Background
        doc.setDrawColor(220);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, cursorY, 170, boxHeight, 'F');
        
        // Label
        doc.setTextColor(50, 50, 50);
        doc.text("CITATION & VERIFICATION", margin + 5, cursorY + 6);
        
        // Verification Status Text
        if (paper.verification?.isVerified) {
             doc.setTextColor(0, 120, 0);
             doc.setFont("helvetica", "bold");
             doc.text("✓ Verified Source", margin + 120, cursorY + 6);
        } else {
             doc.setTextColor(150, 0, 0);
             doc.setFont("helvetica", "bold");
             doc.text("⚠ Unverified", margin + 120, cursorY + 6);
        }

        // Citation Text
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40);
        doc.text(citeLines, margin + 5, cursorY + 14);

        cursorY += boxHeight + 10;
    }

    // Tags
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Tags: ${paper.tags.join(", ")}`, margin, cursorY);
    cursorY += lineHeight + 5;

    // Section: Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Abstract / Summary", margin, cursorY);
    cursorY += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(paper.summary, maxLineWidth);
    summaryLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
    });
    cursorY += 10;

    // Section: Deep Dive (if available)
    if (paper.fullAnalysis) {
      checkPageBreak(20);
      doc.setDrawColor(200);
      doc.line(margin, cursorY, 190, cursorY);
      cursorY += 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      doc.text("Deep Dive Analysis", margin, cursorY);
      cursorY += lineHeight + 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);

      const cleanAnalysis = cleanMarkdown(paper.fullAnalysis);
      const analysisLines = doc.splitTextToSize(cleanAnalysis, maxLineWidth);

      analysisLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
      });
      cursorY += 10;
    }

    // Link
    checkPageBreak(20);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink("Original Source Link", margin, cursorY, { url: paper.url });
    if (paper.verification?.sourceUrl) {
       cursorY += 7;
       doc.textWithLink("Verified Source Link", margin, cursorY, { url: paper.verification.sourceUrl });
    }
  }

  // --- Go Back and Fill TOC ---
  doc.setPage(tocPageNumber);
  cursorY = margin;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Table of Contents", margin, cursorY);
  cursorY += 15;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  tocEntries.forEach((entry, i) => {
    if (cursorY + 10 >= pageHeight) {
      doc.addPage();
      cursorY = margin;
    }
    
    // Add Link
    doc.setTextColor(0, 51, 102);
    const title = `${i + 1}. ${entry.title.substring(0, 70)}${entry.title.length > 70 ? '...' : ''}`;
    
    // Check verification status for TOC
    const statusMark = entry.verification ? " (Verified)" : "";
    const lineText = `${title}${statusMark}`;
    
    doc.text(lineText, margin, cursorY);
    
    // Create clickable link over text area
    // pageNumber option in doc.link expects the 1-based page index.
    // entry.page contains the exact page number captured during the loop.
    doc.link(margin, cursorY - 5, 170, 7, { pageNumber: entry.page });
    
    // Page number on right
    doc.setTextColor(100);
    doc.text(`p. ${entry.page}`, 180, cursorY, { align: 'right' });

    cursorY += 8;
  });

  doc.save("SIGGRAPH_2025_Comprehensive_Journal.pdf");
};