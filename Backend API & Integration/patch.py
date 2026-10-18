import io

with io.open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_html = '''                </div>
            </div>
        </div>

        <script>'''

new_html = '''                </div>
            </div>
            
            <div style="display: flex; gap: 20px; margin-top: 20px;">
                <div class="card" style="flex: 1;">
                    <h3 style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Model Layer Usage</h3>
                    <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; margin-top: 10px;">
                        <div style="color: #4ade80;"><span id="llm-calls">0</span><br><span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">LLM Generations</span></div>
                        <div style="color: #60a5fa; text-align: right;"><span id="classifier-calls">0</span><br><span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">Classifier Validations</span></div>
                    </div>
                </div>
                <div class="card" style="flex: 1;">
                    <h3 style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Free Trial Quotas</h3>
                    <div class="progress-container" style="margin-top: 15px;">
                        <div class="progress-bar" id="quota-bar" style="width: 0%; background: linear-gradient(90deg, #a855f7, #ec4899);"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-top: 5px;" id="quota-stats">
                        <span>Tokens Used: 0</span>
                        <span>Available Trial Limit: 0</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 10px;">
                        *Forever Free models (Groq, Gemini, SambaNova, Cohere, Zhipu, HuggingFace) are excluded from this limit.
                    </div>
                </div>
            </div>
        </div>

        <script>'''

content = content.replace(old_html, new_html)

with io.open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
