# SIGGRAPH 2025 Scout

An AI-powered research assistant designed to discover, analyze, and compile SIGGRAPH 2025 technical papers and talks.

**Edited and compiled by:** Kara Rawson (rawsonkara@gmail.com)  
**Published by:** Cat Game Research 2026

## Features

*   **Smart Discovery**: Uses Google Gemini + Google Search Grounding to find relevant SIGGRAPH 2025 papers and technical talks.
*   **Deep Dive Analysis**: Generates comprehensive markdown reports for each paper, including key contributions, methodology, and industry applications.
*   **Citation Verification**: Automatically verifies if a paper exists via live web search and retrieves the DOI and official URL.
*   **Chat with Papers**: Interactive Q&A with specific papers to understand complex technical details.
*   **PDF Journal Generation**: Compiles all collected research into a single, professionally formatted PDF Journal with a Table of Contents.
*   **Session Management**: Save your research progress to a local JSON file ("Save Session") and reload it later ("Load Session") to continue your work.

## Getting Started

1.  Clone the repository from [GitHub](https://github.com/p3nGu1nZz/SIGGRAPH-2025-Scout).
2.  Install dependencies (if running locally, though this is a browser-based build).
3.  **API Key**: This project requires a Google Gemini API Key with access to the `gemini-3-flash-preview` model and Google Search Grounding.
    *   The API Key is injected via `process.env.API_KEY`.

## Usage

1.  **Search**: Enter a topic (e.g., "Neural Radiance Fields", "Fluid Simulation") in the main search bar.
2.  **Analyze**: Click "Deep Dive" on any paper card to generate a full report and verify citations.
3.  **Export**: Click the "Export PDF" button in the sidebar or header to download your compiled research journal.
4.  **Save/Load**: Use the Save (Floppy Disk) and Load (Upload) icons in the header to backup your current research session to your local computer.

## Technologies

*   React 19
*   Google GenAI SDK (`@google/genai`)
*   Gemini 1.5 Pro / 2.0 Flash (via Gemini 3 preview models)
*   Tailwind CSS
*   jsPDF