import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { taskTitle, taskDescription, submissionContent, disputeReason } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "AI service not configured" },
                { status: 503 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are an expert impartial arbitrator for a freelance task platform.
      
      Task: "${taskTitle}"
      Requirements: "${taskDescription}"
      
      The Assignee submitted the following work:
      "${submissionContent}"
      
      The Task Owner/Assignee raised a dispute with this reason:
      "${disputeReason}"
      
      Analyze the situation based ONLY on the provided text.
      Determine if the submission meets the requirements described.
      
      Provide your response in JSON format with the following fields:
      - analysis: A clear, neutral explanation of the findings (max 100 words).
      - recommendation: "release" (to assignee) or "refund" (to owner).
      - confidence: A number between 0 and 100 indicating your confidence in this judgment.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const jsonResponse = JSON.parse(cleanedText);
            return NextResponse.json(jsonResponse);
        } catch (e) {
            // Fallback if model didn't return valid JSON
            return NextResponse.json({
                analysis: text,
                recommendation: "manual_review",
                confidence: 0
            });
        }

    } catch (error: any) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to analyze dispute" },
            { status: 500 }
        );
    }
}
