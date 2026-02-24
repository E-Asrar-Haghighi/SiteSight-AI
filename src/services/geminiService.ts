import { GoogleGenAI, Type } from "@google/genai";
import { ConstructionStage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeConstructionImage(base64Image: string, mimeType: string): Promise<{ stage: ConstructionStage; insight: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: `Analyze this construction site photo. 
              Classify it into exactly one of these stages: "Excavation/Foundation", "Framing/Structural", "Enclosure/Roofing", or "Interior/Finishing".
              Also provide a brief "AI Insight" (max 15 words) about what specifically is visible (e.g., "Reinforced steel visible" or "Drywall installation started").
              Return the result in JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stage: {
              type: Type.STRING,
              description: "The construction stage classification.",
            },
            insight: {
              type: Type.STRING,
              description: "A brief insight about the image.",
            },
          },
          required: ["stage", "insight"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Validate stage
    const validStages = ["Excavation/Foundation", "Framing/Structural", "Enclosure/Roofing", "Interior/Finishing"];
    const stage = validStages.includes(result.stage) ? result.stage as ConstructionStage : "Unknown";

    return {
      stage,
      insight: result.insight || "No insight available.",
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    return {
      stage: "Unknown",
      insight: "Failed to analyze image.",
    };
  }
}
