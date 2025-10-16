import http from 'node:http';
import { URL } from 'node:url';

const port = Number.parseInt(process.env.PORT || process.env.RELAY_PORT || '8787', 10);
const allowOrigin = process.env.RELAY_ALLOW_ORIGIN || '*';
const relayPath = process.env.RELAY_PATH || '/api/gpt';
const apiKey = process.env.OPENAI_API_KEY || '';
const apiBase = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '');
const projectId = process.env.OPENAI_PROJECT_ID || '';

const normaliseMessagesForResponses = (messages = []) => {
    if (!Array.isArray(messages)) return [];
    return messages.map((message = {}) => {
        const role = message?.role || 'user';
        const content = message?.content;
        if (Array.isArray(content)) {
            const parts = content.map((part) => {
                if (part && typeof part === 'object' && part.type === 'text') {
                    return { type: 'text', text: part.text ?? '' };
                }
                if (typeof part === 'string') {
                    return { type: 'text', text: part };
                }
                if (part && typeof part === 'object' && 'text' in part) {
                    return { type: 'text', text: String(part.text ?? '') };
                }
                return { type: 'text', text: JSON.stringify(part ?? '') };
            });
            return { role, content: parts };
        }

        if (typeof content === 'string') {
            return { role, content: [{ type: 'text', text: content }] };
        }

        if (content && typeof content === 'object' && 'text' in content) {
            return { role, content: [{ type: 'text', text: String(content.text ?? '') }] };
        }

        const fallback = content == null ? '' : JSON.stringify(content);
        return { role, content: [{ type: 'text', text: fallback }] };
    });
};

const extractTextFromResponses = (payload) => {
    if (!payload || typeof payload !== 'object') return '';
    const pieces = [];
    const push = (value) => {
        if (typeof value !== 'string') return;
        const trimmed = value.trim();
        if (trimmed) {
            pieces.push(trimmed);
        }
    };

    if (Array.isArray(payload.output)) {
        payload.output.forEach((entry) => {
            if (entry?.content) {
                entry.content.forEach((part) => {
                    if (part?.text) push(part.text);
                    if (typeof part === 'string') push(part);
                    if (part?.value) push(part.value);
                });
            }
        });
    }

    if (Array.isArray(payload.content)) {
        payload.content.forEach((part) => {
            if (part?.text) push(part.text);
            if (typeof part === 'string') push(part);
        });
    }

    if (typeof payload.output_text === 'string') {
        push(payload.output_text);
    }

    return pieces.join('').trim();
};

const writeJson = (res, status, body) => {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });
    res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
        writeJson(res, 204, {});
        return;
    }

    if (url.pathname !== relayPath) {
        writeJson(res, 404, { error: { message: 'Unknown path for GPT relay.' } });
        return;
    }

    if (req.method !== 'POST') {
        writeJson(res, 405, { error: { message: 'Use POST for GPT relay.' } });
        return;
    }

    if (!apiKey) {
        writeJson(res, 500, { error: { message: 'Set OPENAI_API_KEY for the relay server.' } });
        return;
    }

    let raw = '';
    req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 2_000_000) {
            raw = '';
            req.destroy(new Error('Payload too large'));
        }
    });

    req.on('end', async () => {
        const logs = [];

        try {
            const payload = raw ? JSON.parse(raw) : {};
            if (payload.mode === 'ping') {
                writeJson(res, 200, {
                    message: 'Relay online',
                    timestamp: new Date().toISOString(),
                    base: apiBase
                });
                return;
            }

            const { messages = [], temperature = 0.7, model = 'gpt-4o-mini' } = payload;

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            if (projectId) {
                headers['OpenAI-Project'] = projectId;
            }

            const callChat = async () => {
                const response = await fetch(`${apiBase}/chat/completions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ messages, temperature, model })
                });
                logs.push(`chat/completions → ${response.status}`);
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    const message = error?.error?.message || `Chat completions failed (${response.status})`;
                    const err = new Error(message);
                    err.status = response.status;
                    err.details = error;
                    throw err;
                }
                const data = await response.json();
                const text = data?.choices?.[0]?.message?.content?.trim();
                if (!text) {
                    throw new Error('Chat completions returned empty response.');
                }
                return { text, route: 'chat/completions' };
            };

            const callResponses = async () => {
                const response = await fetch(`${apiBase}/responses`, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'OpenAI-Beta': 'assistants=v1'
                    },
                    body: JSON.stringify({
                        model,
                        temperature,
                        input: normaliseMessagesForResponses(messages)
                    })
                });
                logs.push(`responses → ${response.status}`);
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    const message = error?.error?.message || `Responses failed (${response.status})`;
                    const err = new Error(message);
                    err.status = response.status;
                    err.details = error;
                    throw err;
                }
                const data = await response.json();
                const text = extractTextFromResponses(data);
                if (!text) {
                    throw new Error('Responses endpoint returned empty result.');
                }
                return { text, route: 'responses' };
            };

            try {
                const result = await callChat();
                writeJson(res, 200, { ...result, log: logs });
                return;
            } catch (error) {
                if (error.status === 404) {
                    logs.push('chat/completions unsupported, trying responses');
                    try {
                        const result = await callResponses();
                        writeJson(res, 200, { ...result, log: logs });
                        return;
                    } catch (fallbackError) {
                        logs.push(`responses failed: ${fallbackError.message}`);
                        writeJson(res, fallbackError.status || 500, {
                            error: { message: fallbackError.message, details: fallbackError.details },
                            log: logs
                        });
                        return;
                    }
                }
                logs.push(`chat/completions failed: ${error.message}`);
                writeJson(res, error.status || 500, { error: { message: error.message, details: error.details }, log: logs });
                return;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logs.push(`relay exception: ${message}`);
            writeJson(res, 500, { error: { message }, log: logs });
        }
    });
});

server.listen(port, () => {
    console.log(`Milana GPT relay listening on http://localhost:${port}${relayPath}`);
    if (!apiKey) {
        console.warn('Warning: OPENAI_API_KEY is not set. Requests will fail.');
    }
});
