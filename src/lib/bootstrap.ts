// ============================================================
// bootstrap.ts — First-time setup: Node.js + OpenClaw install
// ============================================================

import { invoke } from '@tauri-apps/api/core';
import { getOpenClawVersion } from './config';

type ProgressCallback = (msg: string, pct: number) => void;

const NODE_VERSION = '22.14.0';

// Platform-specific download URLs for Node.js
function getNodeDownloadUrl(): string {
    // We detect platform on Rust side, but for URL building we need it here too
    const isWindows = navigator.userAgent.includes('Windows');
    const isMac = navigator.userAgent.includes('Mac');

    if (isWindows) {
        return `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
    } else if (isMac) {
        // Detect ARM vs Intel
        return `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`;
    } else {
        return `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz`;
    }
}

async function getNodeDir(): Promise<string> {
    const appDir = await invoke('get_app_data_dir') as string;
    return `${appDir}\\node`;
}

async function getEngineDir(): Promise<string> {
    const appDir = await invoke('get_app_data_dir') as string;
    return `${appDir}\\engine`;
}

export async function getNodePath(): Promise<string> {
    const platform = await invoke('get_platform') as string;
    const nodeDir = await getNodeDir();
    if (platform === 'windows') {
        return `${nodeDir}\\node.exe`;
    }
    return `${nodeDir}/bin/node`;
}

export async function getNpmPath(): Promise<string> {
    const platform = await invoke('get_platform') as string;
    const nodeDir = await getNodeDir();
    if (platform === 'windows') {
        return `${nodeDir}\\npm.cmd`;
    }
    return `${nodeDir}/bin/npm`;
}

export async function getOpenClawPath(): Promise<string> {
    const platform = await invoke('get_platform') as string;
    const engineDir = await getEngineDir();
    const bin = platform === 'windows' ? 'openclaw.cmd' : 'openclaw';
    if (platform === 'windows') {
        return `${engineDir}\\node_modules\\.bin\\${bin}`;
    }
    return `${engineDir}/node_modules/.bin/${bin}`;
}

async function isSetupDone(): Promise<boolean> {
    try {
        const openclawPath = await getOpenClawPath();
        return await invoke('file_exists', { path: openclawPath }) as boolean;
    } catch {
        return false;
    }
}

async function checkNodeInstalled(): Promise<boolean> {
    try {
        const nodePath = await getNodePath();
        const exists = await invoke('file_exists', { path: nodePath }) as boolean;
        if (!exists) return false;

        // Check version
        const result = await invoke('run_sync_command', {
            cmd: nodePath,
            args: ['--version'],
        }) as string;
        const major = parseInt(result.replace('v', '').split('.')[0]);
        return major >= 22;
    } catch {
        return false;
    }
}

// Check if system Node.js is available (user might already have it)
async function checkSystemNode(): Promise<string | null> {
    try {
        const platform = await invoke('get_platform') as string;
        const cmd = platform === 'windows' ? 'node' : 'node';
        const result = await invoke('run_sync_command', {
            cmd: cmd,
            args: ['--version'],
        }) as string;
        const major = parseInt(result.trim().replace('v', '').split('.')[0]);
        if (major >= 22) {
            return cmd; // System node is good enough
        }
    } catch { }
    return null;
}

export async function bootstrap(onProgress: ProgressCallback): Promise<void> {
    // Already set up? Skip everything.
    if (await isSetupDone()) {
        onProgress('Already set up!', 100);
        return;
    }

    const appDir = await invoke('get_app_data_dir') as string;
    await invoke('ensure_dir', { path: appDir });

    // Step 1: Check/install Node.js
    onProgress('Checking for Node.js...', 5);

    let nodePath: string;
    let npmCmd: string;

    // First check if system Node.js works
    const systemNode = await checkSystemNode();
    if (systemNode) {
        onProgress('Found Node.js on your system', 20);
        nodePath = systemNode;
        npmCmd = 'npm';
    } else if (await checkNodeInstalled()) {
        onProgress('Found Node.js', 20);
        nodePath = await getNodePath();
        const nodeDir = await getNodeDir();
        npmCmd = `${nodeDir}\\npm.cmd`;
    } else {
        // Download Node.js
        onProgress('Downloading Node.js...', 10);
        const platform = await invoke('get_platform') as string;
        const nodeDir = await getNodeDir();
        await invoke('ensure_dir', { path: nodeDir });

        if (platform === 'windows') {
            // Use PowerShell to download and extract Node.js
            const url = getNodeDownloadUrl();
            const zipPath = `${appDir}\\node.zip`;

            // Download
            await invoke('run_sync_command', {
                cmd: 'powershell',
                args: [
                    '-NoProfile', '-Command',
                    `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}' -UseBasicParsing`
                ],
            });
            onProgress('Extracting Node.js...', 18);

            // Extract
            await invoke('run_sync_command', {
                cmd: 'powershell',
                args: [
                    '-NoProfile', '-Command',
                    `Expand-Archive -Path '${zipPath}' -DestinationPath '${appDir}\\node_temp' -Force`
                ],
            });

            // Move contents out of nested folder
            const innerDir = `${appDir}\\node_temp\\node-v${NODE_VERSION}-win-x64`;
            await invoke('run_sync_command', {
                cmd: 'cmd',
                args: ['/c', `xcopy /E /Y /I "${innerDir}\\*" "${nodeDir}\\"`],
            });

            // Cleanup
            try {
                await invoke('run_sync_command', {
                    cmd: 'cmd',
                    args: ['/c', `rmdir /S /Q "${appDir}\\node_temp" && del "${zipPath}"`],
                });
            } catch { } // cleanup failures are fine
        }

        onProgress('Node.js installed', 25);
        nodePath = await getNodePath();
        npmCmd = `${nodeDir}\\npm.cmd`;
    }

    // Step 2: Install OpenClaw
    onProgress('Installing AI engine (this may take a few minutes)...', 30);
    const engineDir = await getEngineDir();
    await invoke('ensure_dir', { path: engineDir });

    const version = getOpenClawVersion();

    // Initialize package.json in engine dir if not exists
    const pkgJsonPath = `${engineDir}\\package.json`;
    const pkgExists = await invoke('file_exists', { path: pkgJsonPath }) as boolean;
    if (!pkgExists) {
        await invoke('write_file', {
            path: pkgJsonPath,
            content: JSON.stringify({ name: 'clawdesk-engine', version: '1.0.0', private: true }, null, 2),
        });
    }

    // npm install openclaw
    try {
        await invoke('run_sync_command', {
            cmd: npmCmd,
            args: ['install', `openclaw@${version}`, '--no-audit', '--no-fund'],
            cwd: engineDir,
        });
    } catch (e: any) {
        throw new Error(`Failed to install OpenClaw: ${e}`);
    }

    onProgress('AI engine installed!', 90);
    onProgress('Setup complete!', 100);
}
