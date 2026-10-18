import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Proxy to Python Backend
    const res = await fetch("http://127.0.0.1:8000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: 'Backend error', details: errorText }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
