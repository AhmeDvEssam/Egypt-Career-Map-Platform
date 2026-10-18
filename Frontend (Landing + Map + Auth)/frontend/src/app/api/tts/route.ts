import { NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let EdgeTTSClass: any = null;
try {
  const edgeModule = require('node-edge-tts');
  EdgeTTSClass = edgeModule?.EdgeTTS || edgeModule;
} catch (e) {
  // EdgeTTS module not loadable
}

async function generateGoogleTTS(text: string, voice: string = 'en'): Promise<Buffer> {
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const lang = isArabic ? 'ar' : (voice.startsWith('ar') ? 'ar' : (voice === 'en-GB' ? 'en-GB' : 'en'));

  // getAllAudioBase64 chunks text so it handles > 200 characters without crashing
  const results = await googleTTS.getAllAudioBase64(text, {
    lang: lang,
    slow: false,
    host: 'https://translate.google.com',
    timeout: 10000,
  });

  const buffers = results.map((r: { base64: string }) => Buffer.from(r.base64, 'base64'));
  return Buffer.concat(buffers);
}

export async function POST(request: Request) {
  try {
    const { text, voice = 'en-US-GuyNeural', provider = 'google' } = await request.json();
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Valid text is required' }, { status: 400 });
    }

    const cleanText = text.trim();

    // --- CACHING STRATEGY ---
    const hashInput = `${provider}-${voice}-${cleanText}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const fileName = `${hash}.mp3`;
    
    const cacheDir = path.join(process.cwd(), 'public', 'voice_cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const filePath = path.join(cacheDir, fileName);

    // If file already exists, return the cached audio immediately
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      const cachedBuffer = fs.readFileSync(filePath);
      return new NextResponse(cachedBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    let audioBuffer: Buffer | null = null;

    // Try Edge TTS if requested and available
    if (provider === 'edge' && EdgeTTSClass) {
      try {
        const tts = new EdgeTTSClass({ voice: voice });
        await tts.ttsPromise(cleanText, filePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          audioBuffer = fs.readFileSync(filePath);
        }
      } catch (edgeError: any) {
        console.warn(`[TTS] Edge TTS failed (${edgeError?.message || edgeError}), falling back to Google TTS...`);
      }
    }

    // Default or fallback to Google TTS (stable and reliable)
    if (!audioBuffer) {
      audioBuffer = await generateGoogleTTS(cleanText, voice);
      fs.writeFileSync(filePath, audioBuffer);
    }

    return new NextResponse(audioBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error: any) {
    console.error('TTS API Route Error:', error);
    return NextResponse.json({ error: error.message || 'TTS generation failed' }, { status: 500 });
  }
}
