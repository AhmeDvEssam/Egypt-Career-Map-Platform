const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n=========================================');
console.log('    🧠 Universal API Key Tester 🧠');
console.log('=========================================\n');

rl.question('🔑 Paste your API Key: ', (apiKey) => {
    apiKey = apiKey.trim();
    if (!apiKey) {
        console.log('❌ Error: API Key cannot be empty.');
        process.exit(1);
    }

    if (apiKey.startsWith('AIza')) {
        console.log('\n🔍 Detected Google Gemini Key. Testing against Google servers...');
        testGoogle(apiKey);
    } else if (apiKey.startsWith('sk-')) {
        console.log('\n🔍 Detected OpenAI-style Key (or Proxy).');
        rl.question('🌐 Enter the Base URL (Leave empty for api.openai.com, or type e.g., api.bluesminds.com): ', (baseUrl) => {
            baseUrl = baseUrl.trim() || 'api.openai.com';
            testOpenAI(apiKey, baseUrl);
        });
    } else {
        console.log('\n⚠️ Unknown Key Format. Treating as OpenAI-style Key...');
        rl.question('🌐 Enter the Base URL (e.g., api.bluesminds.com): ', (baseUrl) => {
            if (!baseUrl.trim()) {
                console.log('❌ Error: You must provide a Base URL for custom keys.');
                process.exit(1);
            }
            testOpenAI(apiKey, baseUrl.trim());
        });
    }
});

function testGoogle(apiKey) {
    const prompt = "Reply with 'Gemini API is working!'";
    const data = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    makeRequest(options, data, (statusCode, body) => {
        if (statusCode === 200) {
            try {
                const json = JSON.parse(body);
                console.log('\n✅ SUCCESS! Google Gemini Replied:');
                console.log(`💬 "${json.candidates[0].content.parts[0].text.trim()}"\n`);
            } catch(e) {
                console.log('\n✅ SUCCESS (But failed to parse reply):', body);
            }
        } else {
            console.log(`\n❌ FAILED! Status Code: ${statusCode}`);
            console.log(`⚠️ Response: ${body}\n`);
        }
        process.exit(0);
    });
}

function testOpenAI(apiKey, hostname) {
    // Clean hostname if they pasted https://
    hostname = hostname.replace(/^https?:\/\//, '').split('/')[0];
    
    console.log(`\n⏳ Testing against ${hostname} ...`);
    
    const data = JSON.stringify({
        model: "gpt-3.5-turbo", // Fallback standard model
        messages: [{ role: "user", content: "Reply with 'API is working!'" }],
        max_tokens: 10
    });

    const options = {
        hostname: hostname,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(data)
        }
    };

    makeRequest(options, data, (statusCode, body) => {
        if (statusCode === 200) {
            try {
                const json = JSON.parse(body);
                console.log('\n✅ SUCCESS! Server Replied:');
                console.log(`💬 "${json.choices[0].message.content.trim()}"\n`);
            } catch(e) {
                console.log('\n✅ SUCCESS (But failed to parse reply):', body);
            }
        } else {
            console.log(`\n❌ FAILED! Status Code: ${statusCode}`);
            console.log(`⚠️ Response: ${body}\n`);
        }
        process.exit(0);
    });
}

function makeRequest(options, data, callback) {
    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => callback(res.statusCode, body));
    });

    req.on('error', (e) => {
        console.error(`\n❌ Network Error: Could not connect to ${options.hostname}`);
        console.error(`⚠️ Details: ${e.message}\n`);
        process.exit(1);
    });

    req.write(data);
    req.end();
}
