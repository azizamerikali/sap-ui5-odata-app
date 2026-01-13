const https = require('https');

// SAP OData base URL
const SAP_BASE_URL = 'https://78.186.247.89:44302/sap/opu/odata/sap/YMONO_AKT_PLN_SRV';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Get the SAP path from the URL
        // URL format: /api/sap/SummarySet or /api/sap/$metadata
        const urlPath = req.url;
        const sapPath = urlPath.replace('/api/sap', '');

        // Build target URL
        const targetUrl = SAP_BASE_URL + sapPath;

        console.log(`[PROXY] ${req.method} ${targetUrl}`);

        // Get authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header required' });
        }

        // Prepare request options
        const url = new URL(targetUrl);
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: req.method,
            headers: {
                'Authorization': authHeader,
                'Accept': req.headers.accept || 'application/json',
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            rejectUnauthorized: false // Ignore SSL certificate errors
        };

        // Add X-CSRF-Token if present
        if (req.headers['x-csrf-token']) {
            options.headers['X-CSRF-Token'] = req.headers['x-csrf-token'];
        }

        // Make request to SAP
        const proxyResponse = await new Promise((resolve, reject) => {
            const proxyReq = https.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    resolve({
                        statusCode: proxyRes.statusCode,
                        headers: proxyRes.headers,
                        body: data
                    });
                });
            });

            proxyReq.on('error', reject);

            // Send body for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                proxyReq.write(bodyData);
            }

            proxyReq.end();
        });

        // Forward important headers
        if (proxyResponse.headers['x-csrf-token']) {
            res.setHeader('X-CSRF-Token', proxyResponse.headers['x-csrf-token']);
        }
        if (proxyResponse.headers['content-type']) {
            res.setHeader('Content-Type', proxyResponse.headers['content-type']);
        }

        // Send response
        res.status(proxyResponse.statusCode).send(proxyResponse.body);

    } catch (error) {
        console.error('[PROXY] Error:', error.message);
        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
};
