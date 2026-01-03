import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { Paper, ChatMessage } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is missing");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Discovers papers using Google Search Grounding.
 * Accepts an optional list of titles to exclude for pagination/discovery.
 */
export const discoverPapers = async (query: string, excludeTitles: string[] = []): Promise<Paper[]> => {
  const ai = getAiClient();
  
  const excludeInstruction = excludeTitles.length > 0 
    ? `Do NOT include the following papers: ${excludeTitles.slice(-10).join(", ")}. Find NEW and DIFFERENT papers.` 
    : "";

  const searchPrompt = `
    Find research papers, technical talks, and sessions related to "${query}" for the SIGGRAPH 2025 conference.
    Focus on finding real titles, authors, and brief descriptions from the available web information.
    
    If specific SIGGRAPH 2025 papers are not yet fully public, find the most recent related graphics research from 2024-2025 that is likely to be relevant or pre-prints.
    
    ${excludeInstruction}

    FORMATTING INSTRUCTIONS:
    Return the data as a list of items separated by "|||ITEM|||".
    Inside each item, separate fields with "|||FIELD|||".
    The fields must be in this order: Title |||FIELD||| Authors |||FIELD||| Summary (2-3 sentences) |||FIELD||| URL/Source |||FIELD||| KeyTags (comma separated).
    
    Do not add markdown formatting like **bold** inside the fields.
    Return at least 4-6 high quality results.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Manual Parsing of the custom format
    const items = text.split("|||ITEM|||").filter(i => i.trim().length > 10);
    
    const papers: Paper[] = items.map((item, index) => {
      const parts = item.split("|||FIELD|||").map(p => p.trim());
      const clean = (s: string) => s ? s.replace(/\n/g, " ").trim() : "Unknown";

      // Simple dedup check based on title similarity if needed, but rely on prompt mostly
      return {
        id: `paper-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        title: clean(parts[0] || "Untitled Research"),
        authors: clean(parts[1] || "Unknown Authors"),
        summary: clean(parts[2] || "No summary available."),
        url: clean(parts[3] || "#"),
        tags: parts[4] ? parts[4].split(',').map(t => t.trim()) : ["Graphics", "Research"],
        createdAt: Date.now(),
      };
    });

    return papers;

  } catch (error) {
    console.error("Error discovering papers:", error);
    throw new Error("Failed to fetch research data. Please try again.");
  }
};

/**
 * Deep Dive analysis for a specific paper.
 * Uses the Chat API to maintain context.
 */
export const createDeepDiveChat = () => {
  const ai = getAiClient();
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a senior computer graphics researcher helping a user understand SIGGRAPH technical papers. Be technical, precise, but accessible.",
    },
  });
};

/**
 * Generates a full markdown report for a specific paper.
 */
export const generatePaperReport = async (paper: Paper): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    Create a detailed Markdown research summary for the following paper:
    Title: ${paper.title}
    Authors: ${paper.authors}
    Context/Summary: ${paper.summary}
    
    The report should include:
    1. A concise Abstract.
    2. Key Contributions (bullet points).
    3. Technical Methodology (speculate based on standard practices if full text unavailable).
    4. Potential Applications in Industry.
    5. A formal Citation in ACM reference format.
    
    Output strictly in Markdown format. Ensure the final section is ## Citation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Analysis failed to generate.";
  } catch (e) {
    return "Could not generate full report at this time.";
  }
};

/**
 * Verifies if a citation/paper is real using Google Search.
 */
export const verifyPaperCitation = async (title: string, authors: string): Promise<{ isVerified: boolean; sourceUrl?: string; foundTitle?: string; citation?: string; doi?: string }> => {
  const ai = getAiClient();
  const query = `Verify existence of research paper: "${title}" by ${authors}. Return the official title, url, DOI (Digital Object Identifier) if available, and a standard citation string.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             exists: { type: Type.BOOLEAN },
             officialTitle: { type: Type.STRING },
             url: { type: Type.STRING },
             doi: { type: Type.STRING, description: "The Digital Object Identifier (e.g., 10.1145/3414685.3417765)" },
             citation: { type: Type.STRING, description: "ACM format citation string" }
          }
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.exists) {
      return {
        isVerified: true,
        sourceUrl: result.url,
        foundTitle: result.officialTitle,
        citation: result.citation,
        doi: result.doi
      };
    }
    
    return { isVerified: false };

  } catch (error) {
    console.error("Verification failed:", error);
    // Fallback: If JSON parsing fails but we have text, check grounding metadata
    return { isVerified: false };
  }
};