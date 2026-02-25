import { useState, useEffect, useRef } from 'react';
import { pingGateway, getGatewayUrl } from '../lib/gateway';
import SettingsScreen, { AdvancedOptions } from './SettingsScreen';
import CommandModal from '../components/CommandModal';
import { listen } from '@tauri-apps/api/event';

interface ChatScreenProps {
    onOpenSettings: () => void;
}

export default function ChatScreen({ onOpenSettings }: ChatScreenProps) {
    const [reconnecting, setReconnecting] = useState(false);
    const [pendingCommand, setPendingCommand] = useState<{ id: string, cmd: string, impact?: string } | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const gatewayUrl = getGatewayUrl();

    // Monitor gateway health for focus/resume
    useEffect(() => {
        async function checkOnFocus() {
            const alive = await pingGateway();
            if (!alive) {
                setReconnecting(true);
                const maxWait = 15000;
                const start = Date.now();
                while (Date.now() - start < maxWait) {
                    await new Promise(r => setTimeout(r, 1000));
                    const ok = await pingGateway();
                    if (ok) {
                        setReconnecting(false);
                        if (iframeRef.current) {
                            iframeRef.current.src = gatewayUrl;
                        }
                        return;
                    }
                }
                setReconnecting(false);
            }
        }

        window.addEventListener('focus', checkOnFocus);
        return () => window.removeEventListener('focus', checkOnFocus);
    }, [gatewayUrl]);

    // Listen for command confirmation requests from the gateway
    useEffect(() => {
        const unlisten = listen('exec_confirm', (event: any) => {
            const { id, cmd, impact } = event.payload;
            setPendingCommand({ id, cmd, impact });
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    const handleCommandResponse = async (approved: boolean) => {
        if (!pendingCommand) return;
        // Send response back to gateway via a custom tauri command or fetch
        // For now, we assume a tauri command 'respond_to_exec'
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('respond_to_exec', { id: pendingCommand.id, approved });
        setPendingCommand(null);
    };

    return (
        <div className="screen chat-screen">
            {reconnecting && (
                <div className="reconnecting-banner">
                    <span className="spinner small"></span>
                    <span>Reconnecting...</span>
                </div>
            )}

            {pendingCommand && (
                <CommandModal
                    command={pendingCommand.cmd}
                    impact={pendingCommand.impact}
                    onAllow={() => handleCommandResponse(true)}
                    onDeny={() => handleCommandResponse(false)}
                />
            )}

            <div className="chat-toolbar">
                <div className="toolbar-brand">
                    <img src="/assets/logo.png" alt="Logo" style={{ height: '18px', width: 'auto', marginRight: '8px' }} />
                    <span>ClawDesk</span>
                    <span className="toolbar-status"></span>
                </div>
                <div className="toolbar-spacer" />
                <button
                    className="toolbar-btn settings-btn"
                    title="Settings"
                    onClick={onOpenSettings}
                >
                    ⚙️ Settings
                </button>
            </div>

            <iframe
                ref={iframeRef}
                className="chat-iframe"
                src={gatewayUrl}
                title="ClawDesk Chat"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
        </div>
    );
}
