const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 3000;

// Default SAP OData base URL (fallback)
const DEFAULT_SAP_URL = 'https://78.186.247.89:44302/sap/opu/odata/sap/YMONO_AKT_PLN_SRV';

// Enable CORS for all origins
app.use(cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.text({ type: '*/*' }));

// Create an HTTPS agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Proxy all requests to SAP
app.all('/sap/*', async (req, res) => {
    try {
        // Get SAP target URL from header or use default
        const sapBaseUrl = req.headers['x-sap-target-url'] || DEFAULT_SAP_URL;

        // Get the path after /sap/
        const sapPath = req.path.replace('/sap', '');
        const targetUrl = sapBaseUrl + sapPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');

        console.log(`[PROXY] ${req.method} ${targetUrl}`);
        console.log(`[PROXY] SAP Target: ${sapBaseUrl}`);

        // Get authorization header from request
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            console.log('[PROXY] No authorization header provided');
            return res.status(401).json({ error: 'Authorization header required' });
        }

        // Prepare headers for SAP request
        const headers = {
            'Authorization': authHeader,
            'Accept': req.headers.accept || 'application/json',
            'Content-Type': req.headers['content-type'] || 'application/json'
        };

        // Add X-CSRF-Token header if present
        if (req.headers['x-csrf-token']) {
            headers['X-CSRF-Token'] = req.headers['x-csrf-token'];
        }

        // Add Language headers if present
        if (req.headers['sap-language']) {
            headers['sap-language'] = req.headers['sap-language'];
        }
        if (req.headers['sap-langu']) {
            headers['sap-langu'] = req.headers['sap-langu'];
        }

        // Forward Cookie header if present
        if (req.headers.cookie) {
            headers['Cookie'] = req.headers.cookie;
        }

        // Prepare fetch options
        const fetchOptions = {
            method: req.method,
            headers: headers,
            agent: httpsAgent
        };

        // Add body for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        // Dynamic import for node-fetch (ESM module)
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(targetUrl, fetchOptions);

        // Get response headers we want to forward
        const responseHeaders = {};

        // Forward set-cookie with sanitation
        const rawCookies = response.headers.raw()['set-cookie'];
        if (rawCookies) {
            const sanitizedCookies = rawCookies.map(cookie => {
                // Remove Domain attribute to allow localhost setting; keep Path=/sap/ or similar
                // Also could remove Secure if testing on http, but httpsAgent ignores invalid certs
                return cookie.replace(/Domain=[^;]+;?/gi, '');
            });
            res.setHeader('Set-Cookie', sanitizedCookies);
        }

        response.headers.forEach((value, key) => {
            // Forward important headers
            if (['content-type', 'x-csrf-token', 'sap-message', 'sap-messages', 'location'].includes(key.toLowerCase())) {
                responseHeaders[key] = value;
            }
        });

        // Set response headers
        Object.keys(responseHeaders).forEach(key => {
            res.setHeader(key, responseHeaders[key]);
        });

        // Get response body
        const contentType = response.headers.get('content-type') || '';
        let body;

        // Use arraybuffer for potentially binary data (e.g. images, favicon)
        const buffer = await response.arrayBuffer();
        const bufferContent = Buffer.from(buffer);

        if (contentType.includes('application/json')) {
            // If strictly JSON, we can try to parse it, but sending buffer is safer to preserve exact content
            // unless we want to modify the JSON. Sending buffer is fine for proxy.
            res.status(response.status).send(bufferContent);
        } else {
            res.status(response.status).send(bufferContent);
        }

        console.log(`[PROXY] Response: ${response.status}`);

    } catch (error) {
        console.error('[PROXY] Error:', error.message);
        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Proxy server is running' });
});

app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`SAP OData Proxy Server`);
    console.log(`=================================`);
    console.log(`Proxy running on: http://localhost:${PORT}`);
    console.log(`Default SAP Target: ${DEFAULT_SAP_URL}`);
    console.log(`\nProxy endpoint: http://localhost:${PORT}/sap/`);
    console.log(`\nUse X-SAP-Target-URL header to override target`);
    console.log(`=================================\n`);
});
