import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Proxy FormData to Python Backend
    const res = await fetch("http://127.0.0.1:8000/api/cv/analyze", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: 'Backend error', details: errorText }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('CV Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
