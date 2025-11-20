import { GoogleGenAI } from "@google/genai";

// API Key is injected via process.env.API_KEY as per standard requirements.

export const callGemini = async (prompt: string): Promise<string> => {
  // Guidelines: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  // Guidelines: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return "AI service is currently unavailable (Missing Key).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Guidelines: Basic Text Tasks ... 'gemini-2.5-flash'
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // Guidelines: The simplest and most direct way to get the generated text content is by accessing the .text property
    return response.text || "Could not generate response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, AI service is temporarily unavailable.";
  }
};