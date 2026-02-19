// ============================================================
// gateway.ts — OpenClaw gateway lifecycle management
// ============================================================

import { invoke } from '@tauri-apps/api/core';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { getOpenClawPath } from './bootstrap';
import { getEnvVarName } from './config';

const GATEWAY_PORT = 18789;
let isGatewayRunning = false;
let crashes = 0;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function startGateway(apiKey: string, provider: string): Promise<void> {
    // Ensure port is free
    const portFree = await isPortFree(GATEWAY_PORT);
    if (!portFree) {
        await invoke('kill_port', { port: GATEWAY_PORT });
        await sleep(1000);
    }

    // Build environment with API key
    const envVarName = getEnvVarName(provider);

    const openclawPath = await getOpenClawPath();
    const platform = await invoke('get_platform') as string;

    // Use our custom Rust command to bypass shell scope restrictions
    // This launches the process detached
    try {
        if (platform === 'windows') {
            await invoke('spawn_gateway_process', {
                cmd: 'cmd',
                args: ['/c', openclawPath, 'gateway', '--port', String(GATEWAY_PORT)],
                envKey: envVarName,
                envVal: apiKey
            });
        } else {
            await invoke('spawn_gateway_process', {
                cmd: openclawPath,
                args: ['gateway', '--port', String(GATEWAY_PORT)],
                envKey: envVarName,
                envVal: apiKey
            });
        }
        isGatewayRunning = true;
    } catch (e) {
        console.error('[OpenClaw] Spawn failed:', e);
        throw e;
    }

    // Start health check
    startHealthCheck(apiKey, provider);
}

export async function waitForGateway(timeoutMs: number = 60000): Promise<'ready' | 'timeout'> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const r = await fetch(`http://localhost:${GATEWAY_PORT}/`, {
                signal: AbortSignal.timeout(2000),
            });
            if (r.status < 500) return 'ready';
        } catch { }
        await sleep(1000);
    }
    return 'timeout';
}

export async function pingGateway(): Promise<boolean> {
    try {
        const r = await fetch(`http://localhost:${GATEWAY_PORT}/`, {
            signal: AbortSignal.timeout(3000),
        });
        return r.status < 500;
    } catch {
        return false;
    }
}

export async function stopGateway(): Promise<void> {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
    }

    // We can't kill a detached process easily without PID, but we can kill by port
    isGatewayRunning = false;

    try {
        await invoke('kill_port', { port: GATEWAY_PORT });
    } catch { }
}

async function isPortFree(port: number): Promise<boolean> {
    try {
        await fetch(`http://localhost:${port}`, {
            signal: AbortSignal.timeout(500),
        });
        return false; // port responded = not free
    } catch (e: any) {
        // Connection refused = port is free
        return true;
    }
}

async function handleCrash(apiKey: string, provider: string): Promise<void> {
    crashes++;
    console.log(`[OpenClaw] Crash check #${crashes}`);

    if (crashes <= 3) {
        await sleep(crashes * 2000); // backoff: 2s, 4s, 6s
        try {
            await startGateway(apiKey, provider);
            const status = await waitForGateway(15000);
            if (status === 'ready') {
                crashes = 0;
                return;
            }
        } catch (e) {
            console.error('[OpenClaw] Restart failed:', e);
        }
    }

    crashes = 0;
    // Notify user after 3 failed restarts
    try {
        sendNotification({
            title: 'ClawDesk needs attention',
            body: 'The AI engine stopped unexpectedly. Click to restart.',
        });
    } catch { }
}

function startHealthCheck(apiKey: string, provider: string): void {
    if (healthCheckInterval) clearInterval(healthCheckInterval);

    healthCheckInterval = setInterval(async () => {
        // Only check if we think it should be running
        if (!isGatewayRunning) return;

        const alive = await pingGateway();
        if (!alive) {
            console.log('[OpenClaw] Health check failed, restarting...');
            // It died
            await handleCrash(apiKey, provider);
        }
    }, 30000); // every 30 seconds
}

export function getGatewayUrl(): string {
    return `http://localhost:${GATEWAY_PORT}`;
}
