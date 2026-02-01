import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Simulate a short delay to make it feel like AI is thinking
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return a "Mock" (Fake) Analysis Result
  const mockAnalysis = {
    language_level: "B2 (Upper Intermediate)",
    sentiment: "Confident",
    summary: "The candidate introduced themselves clearly and mentioned 2 years of customer service experience.",
    recommendation: "Interview"
  };

  return NextResponse.json(mockAnalysis);
}