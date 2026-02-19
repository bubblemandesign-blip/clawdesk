// ============================================================
// validate.ts — API key validation against real endpoints
// ============================================================

import { detectProvider } from './config';

interface ValidationResult {
    ok: boolean;
    msg: string;
    provider?: string;
}

export async function validateKey(key: string): Promise<ValidationResult> {
    let provider = detectProvider(key);

    if (provider === 'unknown') {
        return {
            ok: false,
            msg: 'Key format not recognized. Supported: Anthropic, OpenAI, Groq, Kimi, DeepSeek, Google.',
        };
    }

    try {
        if (provider === 'anthropic') {
            const r = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'hi' }],
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (r.status === 200 || r.status === 400) return { ok: true, msg: '', provider };
            if (r.status === 401)
                return { ok: false, msg: 'Invalid Anthropic API key.' };
            if (r.status === 403)
                return { ok: false, msg: 'No credit. Check Anthropic console.' };
            return { ok: true, msg: '', provider };
        }

        if (provider === 'groq') {
            const r = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout(15000),
            });
            if (r.status === 200) return { ok: true, msg: '', provider };
            if (r.status === 401) return { ok: false, msg: 'Invalid Groq API key.' };
            return { ok: true, msg: '', provider };
        }

        // OpenAI, Moonshot (Kimi), DeepSeek all use 'sk-' and compatible endpoints.
        // We probe them in order of likelihood or user intent.
        // Defaults to 'openai' based on detection, but we allow fallback.
        if (provider === 'openai') {
            // 1. Try OpenAI
            const rOpenAI = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout(10000),
            });

            if (rOpenAI.status === 200) return { ok: true, msg: '', provider: 'openai' };

            // If OpenAI failed with 401/403, it might be Kimi or DeepSeek
            if (rOpenAI.status === 401) {
                // 2. Try Moonshot (Kimi)
                try {
                    const rMoon = await fetch('https://api.moonshot.cn/v1/models', {
                        headers: { Authorization: `Bearer ${key}` },
                        signal: AbortSignal.timeout(10000),
                    });
                    if (rMoon.status === 200) return { ok: true, msg: '', provider: 'moonshot' };
                } catch (e) { /* ignore */ }

                // 3. Try DeepSeek
                try {
                    const rSeek = await fetch('https://api.deepseek.com/models', {
                        headers: { Authorization: `Bearer ${key}` },
                        signal: AbortSignal.timeout(10000),
                    });
                    if (rSeek.status === 200) return { ok: true, msg: '', provider: 'deepseek' };
                } catch (e) { /* ignore */ }

                return { ok: false, msg: 'Invalid API key (OpenAI/Kimi/DeepSeek).' };
            }

            // Rate limit or other error -> assume OpenAI
            if (rOpenAI.status === 429)
                return { ok: false, msg: 'OpenAI: Too many requests.' };

            return { ok: true, msg: '', provider: 'openai' };
        }

        if (provider === 'google') {
            if (key.startsWith('AIza') && key.length > 30) {
                return { ok: true, msg: '', provider };
            }
            return { ok: false, msg: 'Invalid Google API key format.' };
        }
    } catch (e: any) {
        if (e?.name === 'TimeoutError' || e?.message?.includes('timeout')) {
            return { ok: false, msg: 'Connection timed out. Check your internet.' };
        }
        return { ok: false, msg: 'Connection failed. Check your internet.' };
    }

    return { ok: true, msg: '', provider };
}
