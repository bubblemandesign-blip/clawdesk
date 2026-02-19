// ============================================================
// store.ts — Secure local storage for API key and settings
// ============================================================

import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;

async function getStore(): Promise<Store> {
    if (!store) {
        store = await Store.load('clawdesk-settings.json');
    }
    return store;
}

export async function saveApiKey(key: string): Promise<void> {
    const s = await getStore();
    await s.set('api_key', key);
    await s.save();
}

export async function getApiKey(): Promise<string | null> {
    const s = await getStore();
    return (await s.get<string>('api_key')) ?? null;
}

export async function saveProvider(provider: string): Promise<void> {
    const s = await getStore();
    await s.set('provider', provider);
    await s.save();
}

export async function getProvider(): Promise<string | null> {
    const s = await getStore();
    return (await s.get<string>('provider')) ?? null;
}

export async function saveSetupComplete(complete: boolean): Promise<void> {
    const s = await getStore();
    await s.set('setup_complete', complete);
    await s.save();
}

export async function isSetupComplete(): Promise<boolean> {
    const s = await getStore();
    return (await s.get<boolean>('setup_complete')) ?? false;
}

export async function clearAll(): Promise<void> {
    const s = await getStore();
    await s.clear();
    await s.save();
}
