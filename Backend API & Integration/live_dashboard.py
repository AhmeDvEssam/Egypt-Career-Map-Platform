from flask import Flask, render_template_string, request, jsonify
from flask_socketio import SocketIO
import logging
import json
import os

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hireq_v3_secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireQ Stream Processing Engine (Pipeline V3)</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.4/socket.io.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        :root {
            --bg-base: #090d16;
            --bg-surface: #101623;
            --bg-card: #172033;
            --border-dim: #1e293b;
            --border-glow: #38bdf8;
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            --color-scraper: #f59e0b;
            --color-queue: #38bdf8;
            --color-burner: #f97316;
            --color-llm: #a855f7;
            --color-matcher: #6366f1;
            --color-saved: #10b981;
            --color-gate-block: #ef4444;
        }

        * {
            box-sizing: border-box;
        }

        /* Modern Sleek Scrollbar */
        ::-webkit-scrollbar {
            width: 7px;
            height: 7px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.6);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }

        body {
            background-color: var(--bg-base);
            color: var(--text-main);
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 16px;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 40%);
        }

        /* Top HUD Header */
        .hud-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            background: linear-gradient(135deg, rgba(16, 22, 35, 0.8), rgba(23, 32, 51, 0.9));
            border: 1px solid var(--border-dim);
            border-radius: 14px;
            margin-bottom: 20px;
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .hud-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .hud-title-box h1 {
            margin: 0;
            font-size: 1.45rem;
            font-weight: 800;
            background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }

        .hud-title-box .hud-sub {
            font-size: 0.78rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 3px;
        }

        .pulse-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 10px #10b981;
            animation: pulse-live 1.5s infinite;
        }

        @keyframes pulse-live {
            0% { transform: scale(0.9); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 14px #10b981; }
            100% { transform: scale(0.9); opacity: 0.8; }
        }

        .metrics-bar {
            display: flex;
            gap: 20px;
            align-items: center;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
        }

        .metric-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(30, 41, 59, 0.6);
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .metric-val {
            font-weight: 700;
            color: #38bdf8;
        }

        .mode-toggles {
            display: flex;
            gap: 6px;
            background: #0f172a;
            padding: 4px;
            border-radius: 10px;
            border: 1px solid #1e293b;
        }

        .mode-btn {
            background: transparent;
            color: var(--text-muted);
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            transition: all 0.25s ease;
        }

        .mode-btn.active {
            background: #6366f1;
            color: #ffffff;
            box-shadow: 0 2px 10px rgba(99, 102, 241, 0.5);
        }

        /* Pipeline Layout */
        .pipeline-container {
            display: flex;
            justify-content: space-between;
            align-items: stretch;
            min-height: calc(100vh - 105px);
            height: calc(100vh - 105px);
            background: var(--bg-surface);
            border: 1px solid var(--border-dim);
            border-radius: 16px;
            padding: 16px;
            position: relative;
            overflow-x: auto;
            gap: 12px;
        }

        #svg-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        }

        .stage-column {
            flex: 1;
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid var(--border-dim);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            position: relative;
            z-index: 10;
            min-width: 140px;
            transition: border-color 0.3s;
        }

        .stage-column:hover {
            border-color: rgba(255, 255, 255, 0.15);
        }

        #col-scrape { flex: 0.85; min-width: 135px; }
        #col-db { flex: 0.85; min-width: 135px; }
        #col-prune { flex: 0.9; min-width: 145px; }
        #col-llm { flex: 1.1; min-width: 165px; }

        .stage-header {
            padding: 12px 10px;
            background: #111827;
            border-bottom: 2px solid #374151;
            border-radius: 11px 11px 0 0;
            font-weight: 700;
            font-size: 0.86rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .stage-sub {
            font-size: 0.7rem;
            color: var(--text-muted);
            font-weight: 400;
        }

        .stage-content {
            flex-grow: 1;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
            overflow-x: hidden;
            max-height: calc(100vh - 175px);
        }

        #col-scrape .stage-header { border-bottom-color: var(--color-scraper); color: var(--color-scraper); }
        #col-db .stage-header { border-bottom-color: var(--color-queue); color: var(--color-queue); }
        #col-prune .stage-header { border-bottom-color: var(--color-burner); color: var(--color-burner); }
        #col-llm .stage-header { border-bottom-color: var(--color-llm); color: var(--color-llm); }

        /* The Center Circle (Hybrid Matcher V3) */
        #col-verify {
            flex: 0 0 210px;
            height: 210px;
            min-width: 210px;
            align-self: center;
            border-radius: 50%;
            border: 2px dashed #818cf8;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0.8) 70%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            animation: spin-radar 25s linear infinite;
            position: relative;
            box-shadow: 0 0 35px rgba(99, 102, 241, 0.2);
            margin: 0 6px;
        }

        /* Expanded Stage 5: Database (Clean Saved) */
        #col-save {
            flex: 2.3;
            min-width: 350px;
            max-width: 550px;
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid rgba(16, 185, 129, 0.35);
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.08);
        }

        #col-save .stage-header {
            border-bottom-color: var(--color-saved);
            color: var(--color-saved);
            font-size: 0.95rem;
            padding: 13px 12px;
            background: linear-gradient(180deg, #132225 0%, #0f172a 100%);
        }

        #col-save .stage-content {
            padding: 14px;
            gap: 14px;
            overflow-x: hidden;
            max-height: calc(100vh - 170px);
        }

        #col-save .job-pill {
            padding: 14px 16px;
            border-radius: 12px;
            width: 100%;
            box-sizing: border-box;
            background: #131d2e;
            border: 1px solid rgba(16, 185, 129, 0.4);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        #col-save .job-title {
            font-size: 0.96rem;
            line-height: 1.4;
        }

        #col-save .skills-container {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            justify-content: flex-start;
            direction: ltr;
            width: 100%;
            box-sizing: border-box;
        }

        #col-save .skill-badge {
            font-size: 0.78rem;
            padding: 4px 10px;
            border-radius: 6px;
            white-space: normal;
            word-break: break-word;
            line-height: 1.35;
            background: rgba(30, 41, 59, 0.95);
            border: 1px solid #334155;
            transition: all 0.2s ease;
        }

        #col-save .skill-badge:hover {
            border-color: #10b981;
            background: rgba(16, 185, 129, 0.2);
            color: #ffffff;
            transform: translateY(-1px);
        }

        @keyframes spin-radar {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .matcher-center-info {
            position: absolute;
            z-index: 20;
            animation: reverse-spin-radar 25s linear infinite;
            text-align: center;
            pointer-events: none;
            width: 90%;
        }

        @keyframes reverse-spin-radar {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
        }

        .matcher-title {
            font-size: 0.95rem;
            font-weight: 800;
            color: #c084fc;
            text-shadow: 0 0 10px rgba(192, 132, 252, 0.6);
        }

        .matcher-badge {
            display: inline-block;
            background: rgba(99, 102, 241, 0.25);
            border: 1px solid #818cf8;
            color: #e0e7ff;
            font-size: 0.68rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 20px;
            margin-top: 4px;
        }

        .matcher-meta {
            font-size: 0.62rem;
            color: #94a3b8;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 4px;
        }

        #content-verify {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            pointer-events: none;
        }

        /* Job Pill Cards */
        .job-pill {
            background: #172033;
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 12px;
            font-size: 0.83rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 15;
            transition: transform 0.25s, box-shadow 0.25s;
        }

        .job-pill-animating {
            position: absolute;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            z-index: 100;
        }

        .job-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .job-source-tag {
            font-size: 0.68rem;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            background: #0f172a;
            border: 1px solid #334155;
            text-transform: uppercase;
        }

        .job-provider-tag {
            font-size: 0.68rem;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            background: rgba(168, 85, 247, 0.15);
            border: 1px solid #a855f7;
            color: #d8b4fe;
            font-family: 'JetBrains Mono', monospace;
        }

        .job-category-tag {
            display: inline-block;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid #10b981;
            color: #6ee7b7;
            margin-bottom: 6px;
        }

        .job-title {
            font-weight: 700;
            margin-bottom: 4px;
            color: #ffffff;
            line-height: 1.3;
            text-align: right;
            direction: rtl;
        }

        .job-company {
            font-size: 0.74rem;
            color: var(--text-muted);
            margin-bottom: 8px;
            text-align: right;
            direction: rtl;
        }

        /* Pruning Sentences */
        .sentence-row {
            font-size: 0.72rem;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
            margin-top: 5px;
            direction: ltr;
            text-align: left;
            border-bottom: 1px dashed #1e293b;
            padding-bottom: 4px;
        }

        .sentence-text {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.25;
        }

        .icon-check { color: #10b981; font-weight: bold; }
        .icon-cross { color: #ef4444; font-weight: bold; }

        /* AI Mining Animation */
        .ai-mining-box {
            margin-top: 8px;
            padding: 8px;
            background: rgba(168, 85, 247, 0.08);
            border: 1px dashed rgba(168, 85, 247, 0.3);
            border-radius: 8px;
            text-align: center;
            font-size: 0.74rem;
            color: #d8b4fe;
        }

        .ai-anim-dots {
            display: flex;
            justify-content: center;
            gap: 5px;
            margin-top: 6px;
        }

        .ai-anim-dots div {
            width: 7px;
            height: 7px;
            background: #c084fc;
            border-radius: 50%;
            animation: bounce-dot 0.6s infinite alternate;
        }

        .ai-anim-dots div:nth-child(2) { animation-delay: 0.15s; }
        .ai-anim-dots div:nth-child(3) { animation-delay: 0.3s; }

        @keyframes bounce-dot {
            to { transform: translateY(-7px); }
        }

        /* Skills badges */
        .skills-container {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            width: 100%;
            box-sizing: border-box;
        }

        .skill-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #1e293b;
            border: 1px solid #475569;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 600;
            color: #e2e8f0;
            max-width: 100%;
        }

        .skill-level-tag {
            font-size: 0.62rem;
            color: #38bdf8;
            font-family: 'JetBrains Mono', monospace;
        }

        .flying-skill {
            position: absolute;
            z-index: 1000;
            background: #1e1e38;
            border: 1px solid #818cf8;
            color: #ffffff;
            box-shadow: 0 0 15px rgba(129, 140, 248, 0.7);
            font-size: 0.78rem;
            padding: 4px 10px;
            border-radius: 8px;
            pointer-events: none;
            transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .flying-skill.rejected {
            border-color: #ef4444;
            color: #fca5a5;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
            text-decoration: line-through;
        }
    </style>
</head>
<body>

    <!-- HUD Header -->
    <div class="hud-header">
        <div class="hud-left">
            <div class="hud-title-box">
                <h1>HireQ Stream Processing Engine</h1>
                <div class="hud-sub">
                    <span class="pulse-dot"></span>
                    <span>PIPELINE V3: DOMAIN-GATED HYBRID MATCHER</span>
                    <span>•</span>
                    <span style="color: #38bdf8;" id="hud-status">STREAM ACTIVE (15 WORKER THREADS)</span>
                </div>
            </div>
        </div>

        <div class="metrics-bar">
            <div class="metric-pill">
                <span>Total Analyzed:</span>
                <span class="metric-val" id="metric-analyzed">--</span>
            </div>
            <div class="metric-pill">
                <span>Verified Skills:</span>
                <span class="metric-val" style="color: #a855f7;" id="metric-skills">--</span>
            </div>
            <div class="metric-pill">
                <span>Active Keys:</span>
                <span class="metric-val" style="color: #10b981;" id="metric-keys">84 Keys</span>
            </div>
            
            <div class="mode-toggles">
                <button id="btn-single" class="mode-btn" onclick="setMode('single')">Cinematic</button>
                <button id="btn-multi" class="mode-btn active" onclick="setMode('multi')">Multi-Stream</button>
            </div>
        </div>
    </div>

    <!-- Main Visual Pipeline -->
    <div class="pipeline-container" id="main-container">
        <svg id="svg-canvas"></svg>

        <!-- Column 0: Collector -->
        <div class="stage-column" id="col-scrape">
            <div class="stage-header">
                <span>0. Ingestion (Scraper / DB)</span>
                <span class="stage-sub">Multi-Source Stream Ingest</span>
            </div>
            <div class="stage-content" id="content-scrape"></div>
        </div>

        <!-- Column 1: Priority Queue -->
        <div class="stage-column" id="col-db">
            <div class="stage-header">
                <span>1. Queue & Priority Chunk</span>
                <span class="stage-sub">SKILLS &gt; REQ &gt; DESC</span>
            </div>
            <div class="stage-content" id="content-db"></div>
        </div>

        <!-- Column 2: Smart Burner -->
        <div class="stage-column" id="col-prune">
            <div class="stage-header">
                <span>2. Smart Burner</span>
                <span class="stage-sub">Semantic Noise Pruning</span>
            </div>
            <div class="stage-content" id="content-prune"></div>
        </div>

        <!-- Column 3: AI Extractor -->
        <div class="stage-column" id="col-llm">
            <div class="stage-header">
                <span>3. AI Extractor</span>
                <span class="stage-sub">Multi-LLM Smart Router</span>
            </div>
            <div class="stage-content" id="content-llm"></div>
        </div>

        <!-- Center Stage 4: Hybrid Matcher V3 -->
        <div class="stage-column" id="col-verify">
            <div class="matcher-center-info">
                <div class="matcher-title">Hybrid Matcher V3</div>
                <div class="matcher-badge">🛡️ DOMAIN-GATED ENGINE</div>
                <div class="matcher-meta">MiniLM 384d • Cosine 0.82 • Reranker</div>
            </div>
            <div class="stage-content" id="content-verify"></div>
        </div>

        <!-- Column 5: Database Saved -->
        <div class="stage-column" id="col-save">
            <div class="stage-header">
                <span>5. Database (Clean Saved)</span>
                <span class="stage-sub">Categorized & Indexed</span>
            </div>
            <div class="stage-content" id="content-save"></div>
        </div>
    </div>

    <script>
        let currentMode = 'multi';
        function setMode(mode) {
            currentMode = mode;
            document.getElementById('btn-single').classList.toggle('active', mode === 'single');
            document.getElementById('btn-multi').classList.toggle('active', mode === 'multi');
        }

        const socket = io();
        const jobs = {}; 
        const jobQueues = {};

        // Track live metrics
        let totalJobsCount = 0;
        let totalSkillsCount = 0;

        socket.on('connect', () => {
            console.log('[+] Connected to HireQ Stream Server');
            document.getElementById('hud-status').innerText = 'CONNECTED (READY)';
        });

        socket.on('disconnect', () => {
            console.log('[-] Disconnected from Stream Server');
            document.getElementById('hud-status').innerText = 'DISCONNECTED (RECONNECTING...)';
        });

        // FIXED SOCKET LISTENER: Replaces broken applyEvent
        socket.on('job_event', function(data) {
            if (!data || !data.job_id) return;
            const id = data.job_id;
            if (!jobQueues[id]) {
                jobQueues[id] = { queue: [], processing: false };
            }
            jobQueues[id].queue.push(data);
            processJobQueue(id);
        });

        function processJobQueue(id) {
            if (!jobQueues[id] || jobQueues[id].processing || jobQueues[id].queue.length === 0) return;
            
            jobQueues[id].processing = true;
            const data = jobQueues[id].queue.shift();
            
            applyEvent(data);
            
            let delay = currentMode === 'single' ? 800 : 250;
            if (data.event === 'START') delay = currentMode === 'single' ? 1800 : 500; 
            if (data.event === 'PRUNING') delay = currentMode === 'single' ? 800 : 200; 
            if (data.event === 'PRUNING_DATA') delay = currentMode === 'single' ? 2000 : 400; 
            if (data.event === 'LLM') delay = currentMode === 'single' ? 1500 : 400;
            if (data.event === 'VERIFYING') delay = 400;
            if (data.event === 'VERIFYING_SKILL') delay = currentMode === 'single' ? 900 : 200;
            
            setTimeout(() => {
                if (jobQueues[id]) {
                    jobQueues[id].processing = false;
                    processJobQueue(id);
                }
            }, delay);
        }

        const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#f59e0b', '#10b981', '#34d399', '#2dd4bf'];
        function getColor(jobId) {
            let hash = 0;
            for (let i = 0; i < jobId.length; i++) hash = jobId.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        }

        function createPill(jobId, title, source, company) {
            const pill = document.createElement('div');
            pill.className = 'job-pill';
            pill.id = 'job-' + jobId;
            
            const color = getColor(jobId);
            pill.style.borderColor = color;
            pill.style.boxShadow = `0 0 12px ${color}30`;
            
            let sourceHtml = source ? `<div class="job-source-tag" style="color: ${color}">${source}</div>` : '';
            let companyHtml = company ? `<div class="job-company">${company}</div>` : '';
            
            pill.innerHTML = `
                <div class="job-header-row">
                    ${sourceHtml}
                    <span style="font-size:0.65rem; color:#64748b;">${jobId.substring(0, 8)}</span>
                </div>
                <div class="job-title">${title}</div>
                ${companyHtml}
                <div class="job-content-area" id="content-${jobId}"></div>
            `;
            return pill;
        }

        function animateToStage(jobId, targetStageId, extraHtml = '') {
            if (!jobs[jobId] || !jobs[jobId].el) return;
            const pill = jobs[jobId].el;
            const targetContainer = document.getElementById(targetStageId);
            if (!targetContainer) return;
            
            const startRect = pill.getBoundingClientRect();
            
            pill.style.width = startRect.width + 'px';
            pill.style.left = startRect.left + 'px';
            pill.style.top = startRect.top + 'px';
            pill.classList.add('job-pill-animating');
            document.body.appendChild(pill);

            const dummy = document.createElement('div');
            dummy.style.marginBottom = '12px';
            targetContainer.prepend(dummy);
            
            if (extraHtml) {
                const ca = pill.querySelector('.job-content-area');
                if (ca) ca.innerHTML = extraHtml;
            }
            dummy.style.height = startRect.height + 'px';

            requestAnimationFrame(() => {
                const endRect = dummy.getBoundingClientRect();
                
                const color = getColor(jobId);
                drawTrail({x: startRect.left + startRect.width/2, y: startRect.top + startRect.height/2}, 
                          {x: endRect.left + endRect.width/2, y: endRect.top + endRect.height/2}, 
                          color, jobId);
                
                pill.style.left = endRect.left + 'px';
                pill.style.top = endRect.top + 'px';
                
                setTimeout(() => {
                    pill.classList.remove('job-pill-animating');
                    pill.style.left = '';
                    pill.style.top = '';
                    pill.style.width = '';
                    
                    if(targetContainer.contains(dummy)) targetContainer.removeChild(dummy);
                    targetContainer.prepend(pill);
                    removeTrail(jobId);
                }, 400); 
            });
        }

        function drawTrail(start, end, color, jobId) {
            const svg = document.getElementById('svg-canvas');
            const container = document.getElementById('main-container').getBoundingClientRect();
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            
            const d = `M ${start.x - container.left} ${start.y - container.top} C ${start.x - container.left + dx/2} ${start.y - container.top}, ${end.x - container.left - dx/2} ${end.y - container.top}, ${end.x - container.left} ${end.y - container.top}`;
            
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-dasharray', '4,4');
            path.setAttribute('stroke', color);
            path.id = 'trail-' + jobId;
            
            svg.appendChild(path);
        }

        function removeTrail(jobId) {
            const trail = document.getElementById('trail-' + jobId);
            if (trail) trail.remove();
        }

        function applyEvent(data) {
            const id = data.job_id;
            
            if (data.event === 'START') {
                if (!jobs[id]) {
                    const pill = createPill(id, data.title || "Job Title", data.source || "Portal", data.company || "");
                    jobs[id] = { el: pill, stage: 'SCRAPE', title: data.title, source: data.source, flying_skills: [] };
                    document.getElementById('content-scrape').prepend(pill);
                    
                    setTimeout(() => {
                        if (jobs[id] && jobs[id].stage === 'SCRAPE') {
                            jobs[id].stage = 'START';
                            animateToStage(id, 'content-db');
                        }
                    }, currentMode === 'single' ? 1200 : 400);
                }
            }
            
            else if (data.event === 'PRUNING' && jobs[id]) {
                if (jobs[id].stage !== 'PRUNING') {
                    jobs[id].stage = 'PRUNING';
                    animateToStage(id, 'content-prune');
                }
            }
            
            else if (data.event === 'PRUNING_DATA' && jobs[id]) {
                if (jobs[id].stage === 'PRUNING') {
                    let html = '';
                    if (data.sentences && data.sentences.length > 0) {
                        html += '<div style="margin-top:6px;">';
                        data.sentences.slice(0, 4).forEach(s => {
                            let icon = s.is_skill ? '<span class="icon-check">✓</span>' : '<span class="icon-cross">✕</span>';
                            html += `<div class="sentence-row">${icon}<div class="sentence-text">${s.text}</div></div>`;
                        });
                        html += '</div>';
                    } else {
                        html = `<div style="font-size:0.7rem; color:#94a3b8; text-align:center;">Pruned & Normalized</div>`;
                    }
                    const ca = jobs[id].el.querySelector('.job-content-area');
                    if (ca) ca.innerHTML = html;
                }
            }
            
            else if (data.event === 'LLM' && jobs[id]) {
                if (jobs[id].stage !== 'LLM') {
                    jobs[id].stage = 'LLM';
                    let providerText = data.provider || "Smart Router";
                    let html = `
                        <div class="job-header-row" style="margin-top:8px;">
                            <span class="job-provider-tag">⚡ ${providerText}</span>
                        </div>
                        <div class="ai-mining-box">
                            <span>Extracting Core Competencies...</span>
                            <div class="ai-anim-dots">
                                <div></div><div></div><div></div>
                            </div>
                        </div>
                    `;
                    animateToStage(id, 'content-llm', html);
                }
            }
            
            else if (data.event === 'VERIFYING' && jobs[id]) {
                if (jobs[id].stage !== 'VERIFYING') {
                    jobs[id].stage = 'VERIFYING';
                    
                    let catHtml = data.category ? `<div class="job-category-tag">📂 ${data.category}</div>` : '';
                    const ca = jobs[id].el.querySelector('.job-content-area');
                    if (ca) {
                        ca.innerHTML = `${catHtml}<div class="skills-container" dir="rtl"></div>`;
                    }
                    animateToStage(id, 'content-save', '');
                }
            }
            
            else if (data.event === 'VERIFYING_SKILL' && jobs[id]) {
                const circle = document.getElementById('content-verify');
                const llmCol = document.getElementById('content-llm');
                if (!circle || !llmCol) return;
                
                const skillBadge = document.createElement('div');
                const isRejected = (data.status === 'REJECTED_DOMAIN_GATE');
                
                skillBadge.className = 'skill-badge flying-skill' + (isRejected ? ' rejected' : '');
                skillBadge.innerText = (isRejected ? '⛔ ' : '✓ ') + (data.skill_name || 'Skill');
                
                // Spawn from LLM column
                const llmRect = llmCol.getBoundingClientRect();
                skillBadge.style.left = (llmRect.left + llmRect.width / 2) + 'px';
                skillBadge.style.top = (llmRect.top + 80) + 'px';
                document.body.appendChild(skillBadge);
                
                // Fly to Matcher Orbit
                requestAnimationFrame(() => {
                    const circleRect = circle.getBoundingClientRect();
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 50 + 30; 
                    const destX = circleRect.left + circleRect.width / 2 + Math.cos(angle) * radius - 20;
                    const destY = circleRect.top + circleRect.height / 2 + Math.sin(angle) * radius - 10;
                    
                    skillBadge.style.left = destX + 'px';
                    skillBadge.style.top = destY + 'px';
                    
                    setTimeout(() => {
                        if (isRejected) {
                            // Fade out rejected skills
                            skillBadge.style.opacity = '0';
                            setTimeout(() => skillBadge.remove(), 600);
                            return;
                        }

                        // Attach to circle briefly then glide to Database Column
                        setTimeout(() => {
                            if (!jobs[id] || !jobs[id].el) {
                                skillBadge.remove();
                                return;
                            }
                            
                            const sc = jobs[id].el.querySelector('.skills-container');
                            if (!sc) { skillBadge.remove(); return; }
                            
                            const scRect = sc.getBoundingClientRect();
                            skillBadge.style.left = (scRect.left + scRect.width/2) + 'px';
                            skillBadge.style.top = (scRect.top + scRect.height/2) + 'px';
                            
                            setTimeout(() => {
                                skillBadge.remove();
                                
                                // Append clean permanent badge in the card
                                const permBadge = document.createElement('div');
                                permBadge.className = 'skill-badge';
                                permBadge.innerHTML = `<span>${data.skill_name}</span>`;
                                if (data.level && data.level !== 'Not Specified') {
                                    permBadge.innerHTML += `<span class="skill-level-tag">(${data.level})</span>`;
                                }
                                sc.appendChild(permBadge);
                                
                                totalSkillsCount++;
                                document.getElementById('metric-skills').innerText = totalSkillsCount;
                            }, 450);
                        }, 800);
                    }, 400);
                });
            }
            
            else if (data.event === 'DONE' && jobs[id]) {
                if (jobs[id].stage !== 'DONE') {
                    jobs[id].stage = 'DONE';
                    totalJobsCount++;
                    document.getElementById('metric-analyzed').innerText = totalJobsCount;
                    
                    if (data.category) {
                        const ca = jobs[id].el.querySelector('.job-content-area');
                        if (ca && !ca.querySelector('.job-category-tag')) {
                            const catBadge = document.createElement('div');
                            catBadge.className = 'job-category-tag';
                            catBadge.innerText = `📂 ${data.category}`;
                            ca.prepend(catBadge);
                        }
                    }
                    
                    setTimeout(() => {
                        if (jobs[id] && jobs[id].el) {
                            jobs[id].el.style.opacity = '0';
                            jobs[id].el.style.transition = 'opacity 1.5s';
                            setTimeout(() => {
                                if (jobs[id] && jobs[id].el && jobs[id].el.parentNode) {
                                    jobs[id].el.parentNode.removeChild(jobs[id].el);
                                }
                                delete jobs[id];
                            }, 1500);
                        }
                    }, 35000);
                }
            }
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/emit', methods=['POST'])
def emit_event():
    data = request.json
    socketio.emit('job_event', data)
    return jsonify({"status": "ok"})

@app.route('/status')
def status():
    return jsonify({"status": "online", "version": "v3_pipeline", "port": 8765})

if __name__ == '__main__':
    print("[+] Starting Live Stream Pipeline Server on http://localhost:8765")
    socketio.run(app, host='0.0.0.0', port=8765, allow_unsafe_werkzeug=True)
