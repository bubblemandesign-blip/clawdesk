import { useState, useEffect, useRef } from 'react';
import React from 'react';

interface OnboardingScreenProps {
    onStart: (apiKey: string) => void;
    error: string;
    loading: boolean;
}

// Detect provider from key prefix
function detectProviderName(key: string): string | null {
    if (key.startsWith('sk-ant-')) return 'Anthropic';
    if (key.startsWith('gsk_')) return 'Groq';
    if (key.startsWith('AIza')) return 'Google';
    if (key.startsWith('sk-') && key.length > 10) return 'OpenAI';
    return null;
}

function getKeyHelpUrl(key: string): string {
    if (key.startsWith('sk-ant-')) return 'https://console.anthropic.com/keys';
    if (key.startsWith('gsk_')) return 'https://console.groq.com/keys';
    if (key.startsWith('sk-')) return 'https://platform.openai.com/api-keys';
    if (key.startsWith('AIza')) return 'https://aistudio.google.com/app/apikey';
    return 'https://console.anthropic.com/keys';
}

export default function OnboardingScreen({ onStart, error, loading }: OnboardingScreenProps) {
    const [key, setKey] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const provider = detectProviderName(key);
    const isValid = key.length > 20;

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').trim();
        setKey(pasted);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isValid && !loading) {
            onStart(key);
        }
    }

    return (
        <div className="screen onboarding-screen">
            <div className="onboarding-card">
                <div className="logo-section">
                    <div className="logo-icon">
                        <img src="/assets/logo.png" alt="Logo" style={{ width: '80px', height: 'auto' }} />
                    </div>
                    <h1 className="app-title">ClawDesk</h1>
                    <p className="app-subtitle">Your AI assistant. On your computer. Private.</p>
                    <p className="app-tagline">Powered by OpenClaw</p>
                </div>

                <form onSubmit={handleSubmit} className="key-form">
                    <div className="input-group">
                        <label htmlFor="api-key" className="input-label">
                            AI Access Key
                        </label>
                        <div className="input-wrapper">
                            <input
                                ref={inputRef}
                                id="api-key"
                                type="password"
                                className={`key-input ${error ? 'input-error' : ''}`}
                                placeholder="sk-ant-api03-..."
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                onPaste={handlePaste}
                                disabled={loading}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {provider && (
                                <span className="provider-badge">{provider}</span>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <span className="error-icon">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="start-button"
                        disabled={!isValid || loading}
                    >
                        {loading ? (
                            <span className="button-loading">
                                <span className="spinner"></span>
                                Checking...
                            </span>
                        ) : (
                            'Start ClawDesk →'
                        )}
                    </button>

                    <a
                        href={getKeyHelpUrl(key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="help-link"
                        onClick={(e) => {
                            e.preventDefault();
                            import('@tauri-apps/plugin-opener').then(m => m.openUrl(getKeyHelpUrl(key)));
                        }}
                    >
                        Where do I get this? →
                    </a>
                </form>
            </div>
        </div>
    );
}
