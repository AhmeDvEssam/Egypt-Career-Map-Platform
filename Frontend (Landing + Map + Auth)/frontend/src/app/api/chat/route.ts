import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set.");
      return NextResponse.json({ reply: "عذراً، مفتاح Gemini API غير متوفر في السيرفر." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an AI assistant for a job market analytics platform in Egypt. 
The user will ask a question. You must map their question to a predefined intent and extract parameters.

Available Intents:
1. job_count
   - parameters: city (string)
   - description: User wants to know how many jobs are available in a specific city/location. If no city specified, default to "Egypt".
2. top_skills
   - parameters: role (string)
   - description: User wants to know what skills are required for a specific job title or role. If no role specified, default to "Software Developer".

If you can match it to an intent, respond with ONLY a valid JSON object in this format:
{
  "chart_config": {
    "intentId": "job_count" | "top_skills",
    "parameters": { ... }
  },
  "reply": "A brief conversational acknowledgment in Arabic."
}

If the user's question does not match any of these intents, respond with ONLY a valid JSON object in this format:
{
  "reply": "A helpful conversational response in Arabic answering them directly or explaining what you can do."
}

User Message: "${message}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from potential markdown blocks
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return NextResponse.json(parsed);
    }
    
    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ reply: "عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي." }, { status: 500 });
  }
}
