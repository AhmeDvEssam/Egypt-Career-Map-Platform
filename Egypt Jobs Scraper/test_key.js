const https = require('https');

const apiKey = process.argv[2];

if (!apiKey) {
    console.log('\n❌ Error: Please provide an API key.');
    console.log('Usage: node test_key.js YOUR_API_KEY_HERE\n');
    process.exit(1);
}

const prompt = "Hello! Please reply with exactly: 'API Key is working perfectly!'";

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

console.log(`\n⏳ Testing API Key: ${apiKey.substring(0, 8)}...`);

const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            const json = JSON.parse(body);
            const text = json.candidates[0].content.parts[0].text;
            console.log('\n✅ SUCCESS! Google Gemini Replied:');
            console.log(`💬 "${text.trim()}"\n`);
        } else {
            console.log(`\n❌ FAILED! Status Code: ${res.statusCode}`);
            try {
                const err = JSON.parse(body);
                console.log(`⚠️ Error Message: ${err.error.message}\n`);
            } catch (e) {
                console.log(`⚠️ Raw Response: ${body}\n`);
            }
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ Network Error: ${e.message}\n`);
});

req.write(data);
req.end();
