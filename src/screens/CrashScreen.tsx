import React from 'react';

interface CrashScreenProps {
    error: Error | string;
    reset?: () => void;
}

export default function CrashScreen({ error, reset }: CrashScreenProps) {
    const errorMsg = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? null : error.stack;

    return (
        <div className="screen crash-screen" style={{
            background: '#000',
            color: '#fff',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div className="crash-card" style={{
                maxWidth: '600px',
                width: '100%',
                padding: '40px',
                background: '#0a0a0a',
                border: '1px solid #222',
                borderTop: '3px solid #ff4d00',
                borderRadius: '12px'
            }}>
                <div className="crash-icon" style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>ClawDesk failed to launch</h1>
                <p style={{ color: '#888', marginBottom: '24px', fontSize: '15px' }}>
                    Something went wrong during initialization. This might be due to a configuration issue or a missing dependency.
                </p>

                <div className="error-box" style={{
                    background: '#000',
                    border: '1px solid #1a1a1a',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    marginBottom: '24px'
                }}>
                    <strong style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Technical Details:</strong>
                    <code style={{ fontSize: '13px', color: '#ff5555', wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace' }}>
                        {errorMsg}
                    </code>
                    {stack && (
                        <pre style={{
                            fontSize: '11px',
                            color: '#444',
                            marginTop: '12px',
                            maxHeight: '100px',
                            overflow: 'auto',
                            borderTop: '1px solid #111',
                            paddingTop: '8px'
                        }}>
                            {stack}
                        </pre>
                    )}
                </div>

                <div className="crash-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    {reset && (
                        <button
                            onClick={reset}
                            style={{
                                background: '#fff',
                                color: '#000',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Retry Launch
                        </button>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'transparent',
                            color: '#888',
                            border: '1px solid #333',
                            padding: '10px 24px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Restart App
                    </button>
                </div>

                <p style={{ marginTop: '24px', fontSize: '12px', color: '#444' }}>
                    If this persists, please check your internet connection or report it on GitHub.
                </p>
            </div>
        </div>
    );
}
