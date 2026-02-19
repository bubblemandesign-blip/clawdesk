// ============================================================
// config.ts — Progressive Trust Security & Engine Config
// ============================================================

import { invoke } from '@tauri-apps/api/core';

const OPENCLAW_VERSION = '2026.2.14'; // PINNED SECURITY VERSION

const MODELS: Record<string, string> = {
    anthropic: 'anthropic/claude-3-5-sonnet-20240620', // Recommended production model
    openai: 'openai/gpt-4o',
    google: 'google/gemini-1.5-pro',
    groq: 'openai/llama3-70b-8192',
};

const BASE_URLS: Record<string, string> = {
    groq: 'https://api.groq.com/openai/v1',
};

export function getOpenClawVersion(): string {
    return OPENCLAW_VERSION;
}

export function detectProvider(key: string): string {
    if (key.startsWith('sk-ant-')) return 'anthropic';
    if (key.startsWith('gsk_')) return 'groq';
    if (key.startsWith('AIza')) return 'google';
    if (key.startsWith('sk-')) return 'openai';
    return 'unknown';
}

export async function writeConfig(apiKey: string, advancedOptions?: any): Promise<void> {
    const provider = detectProvider(apiKey);
    if (provider === 'unknown') throw new Error('UNRECOGNIZED_KEY');

    const home = await invoke('get_home_dir') as string;
    const configDir = `${home}/.openclaw`;
    const configPath = `${configDir}/openclaw.json`;

    await invoke('ensure_dir', { path: configDir });

    // Build the security toolPolicy based on advancedOptions
    const isAdvancedFiles = advancedOptions?.fullFileSystem || false;
    const isAdvancedBrowser = advancedOptions?.browserWithLogin || false;
    const isAutoApprove = advancedOptions?.autoApproveSafe || false;

    const config: any = {
        agent: {
            model: MODELS[provider],
        },
        agents: {
            defaults: {
                maxConcurrent: 4,
                subagents: { maxConcurrent: 8 },
                sandbox: { mode: 'non-main' },

                // PROGRESSIVE TRUST SECURITY MODEL
                toolPolicy: {
                    read: {
                        mode: isAdvancedFiles ? 'allow' : 'sandbox',
                        allowedPaths: isAdvancedFiles ? [] : [
                            "~/Documents",
                            "~/Downloads",
                            "~/Desktop"
                        ],
                        blockedPaths: isAdvancedFiles ? [] : [
                            "~/.ssh",
                            "~/.aws",
                            "~/.config",
                            "~/.*"
                        ]
                    },
                    write: {
                        mode: isAdvancedFiles ? 'allow' : 'sandbox',
                        allowedPaths: isAdvancedFiles ? [] : [
                            "~/Documents/ClawDesk",
                            "~/Desktop"
                        ]
                    },
                    exec: {
                        mode: "confirm-each",
                        allowlist: isAutoApprove ? ["ls", "pwd", "cat", "echo", "grep"] : [],
                        blocklist: ["rm", "dd", "sudo", "chmod", "curl", "wget", "ssh"]
                    },
                    browser: {
                        mode: isAdvancedBrowser ? "default" : "isolated-profile",
                        clearOnExit: !isAdvancedBrowser,
                        allowCookies: isAdvancedBrowser,
                        blockedDomains: isAdvancedBrowser ? [] : [
                            "*login*",
                            "*signin*",
                            "*.bank.*",
                            "*paypal*"
                        ]
                    },
                    memory: "allow"
                },

                skillPolicy: {
                    builtInSkills: "allow",
                    thirdPartySkills: advancedOptions?.skillAutoInstall ? "allow" : "confirm"
                }
            },
        },
        gateway: {
            port: 18789,
            bind: 'loopback',
        },
        channels: {
            webchat: { enabled: true },
        },
    };

    if (BASE_URLS[provider]) {
        config.agent.connection = { baseUrl: BASE_URLS[provider] };
    }

    // Auto-detect browser
    const chromePath = await invoke('detect_chrome') as string | null;
    if (chromePath) {
        config.browser = {
            enabled: true,
            executablePath: chromePath,
            defaultProfile: 'clawdesk_safe',
            profiles: {
                clawdesk_safe: { cdpPort: 18792 },
            },
        };
    }

    await invoke('write_file', {
        path: configPath,
        content: JSON.stringify(config, null, 2),
    });
}

export async function setupWorkspace(): Promise<void> {
    const home = await invoke('get_home_dir') as string;
    const ws = `${home}/.openclaw/workspace`;
    await invoke('ensure_dir', { path: `${ws}/skills` });

    // Initial SOUL.md with persona
    const soulPath = `${ws}/SOUL.md`;
    if (!(await invoke('file_exists', { path: soulPath }))) {
        await invoke('write_file', {
            path: soulPath,
            content: `You are ClawDesk, a high-tech robotic lobster assistant.
- Use the word "Claw" or lobster-related metaphors occasionally in a professional/cool way.
- Your goal is to help the user with file management, terminal commands, and browsing.
- You operate under a Progressive Trust security model. If you don't have access to a path, explain why nicely.`,
        });
    }
}
