import { useState } from 'react';

interface SettingsScreenProps {
    onClose: () => void;
    onSave: (options: AdvancedOptions) => void;
    currentOptions: AdvancedOptions;
}

export interface AdvancedOptions {
    fullFileSystem: boolean;
    browserWithLogin: boolean;
    autoApproveSafe: boolean;
    skillAutoInstall: boolean;
    telegramToken?: string;
    telegramChatId?: string;
}

export default function SettingsScreen({ onClose, onSave, currentOptions }: SettingsScreenProps) {
    const [options, setOptions] = useState<AdvancedOptions>(currentOptions);
    const [tab, setTab] = useState<'SECURITY' | 'TELEGRAM' | 'MOBILE'>('SECURITY');
    const [confirmedRisks, setConfirmedRisks] = useState(false);

    const toggle = (key: keyof AdvancedOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleInputChange = (key: keyof AdvancedOptions, value: string) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    const hasChanges = JSON.stringify(options) !== JSON.stringify(currentOptions);

    return (
        <div className="settings-overlay">
            <div className="settings-card glass-panel">
                <div className="settings-header">
                    <div className="settings-tabs">
                        <button className={`tab-btn ${tab === 'SECURITY' ? 'active' : ''}`} onClick={() => setTab('SECURITY')}>Security</button>
                        <button className={`tab-btn ${tab === 'TELEGRAM' ? 'active' : ''}`} onClick={() => setTab('TELEGRAM')}>Telegram</button>
                        <button className={`tab-btn ${tab === 'MOBILE' ? 'active' : ''}`} onClick={() => setTab('MOBILE')}>Mobile</button>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="settings-content">
                    {tab === 'SECURITY' && (
                        <>
                            <div className="security-summary">
                                <div className="security-badge safe">
                                    <span className="icon">🔒</span>
                                    Security Level: {Object.values(options).some(v => typeof v === 'boolean' && v) ? 'Custom' : 'Protected (Default)'}
                                </div>
                                <ul className="capability-list">
                                    <li>✅ Read Documents/Downloads/Desktop</li>
                                    <li>✅ Write to ClawDesk folder</li>
                                    <li>✅ Browse web (isolated, no login)</li>
                                    <li>{options.autoApproveSafe ? '✅ Auto-approve safe commands' : '⚠️ Run commands (asks first)'}</li>
                                </ul>
                            </div>

                            <div className="advanced-section">
                                <h3>⚙️ Advanced Mode (Power Users)</h3>
                                <p className="advanced-desc">Enabling these options bypasses safety sandboxes.</p>

                                <div className="toggle-group">
                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-title">Full file system access</span>
                                            <span className="toggle-warn">⚠️ AI can read/write ANY file on this computer.</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={options.fullFileSystem}
                                            onChange={() => toggle('fullFileSystem')}
                                        />
                                    </label>

                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-title">Browser with login</span>
                                            <span className="toggle-warn">⚠️ AI can access your Gmail, banks, and logged-in sessions.</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={options.browserWithLogin}
                                            onChange={() => toggle('browserWithLogin')}
                                        />
                                    </label>

                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-title">Auto-approve safe commands</span>
                                            <span className="toggle-warn">⚠️ ls, cat, pwd, echo run without asking.</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={options.autoApproveSafe}
                                            onChange={() => toggle('autoApproveSafe')}
                                        />
                                    </label>

                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-title">Third-party skills auto-install</span>
                                            <span className="toggle-warn">⚠️ Skills from ClawHub install without confirmation.</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={options.skillAutoInstall}
                                            onChange={() => toggle('skillAutoInstall')}
                                        />
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'TELEGRAM' && (
                        <div className="telegram-section">
                            <h3>🤖 Telegram Integration</h3>
                            <p className="advanced-desc">Chat with ClawDesk from your phone via Telegram.</p>

                            <div className="input-group">
                                <label>Bot Token</label>
                                <input
                                    type="password"
                                    placeholder="Enter your Telegram Bot Token"
                                    value={options.telegramToken || ''}
                                    onChange={(e) => handleInputChange('telegramToken', e.target.value)}
                                />
                                <span className="input-hint">Get one from @BotFather on Telegram.</span>
                            </div>

                            <div className="input-group" style={{ marginTop: '16px' }}>
                                <label>Allowed Chat ID (Your ID)</label>
                                <input
                                    type="text"
                                    placeholder="Enter your Chat ID"
                                    value={options.telegramChatId || ''}
                                    onChange={(e) => handleInputChange('telegramChatId', e.target.value)}
                                />
                                <span className="input-hint">Only messages from this ID will be processed. Get it from @userinfobot.</span>
                            </div>
                        </div>
                    )}

                    {tab === 'MOBILE' && (
                        <div className="mobile-section">
                            <h3>📱 Mobile Direct Access</h3>
                            <p className="advanced-desc">Open the ClawDesk web UI directly on your phone.</p>

                            <div className="connectivity-card">
                                <div className="step-item">
                                    <strong>Step 1:</strong> Connect phone to the same Wi-Fi.
                                </div>
                                <div className="step-item">
                                    <strong>Step 2:</strong> Install <strong>Tailscale</strong> (recommended) or use your local IP.
                                </div>
                                <div className="step-item">
                                    <strong>Step 3:</strong> Visit this URL on your phone:
                                    <div className="url-copy">
                                        <code>http://localhost:18789</code>
                                        <p>(Replace localhost with your computer's IP)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mobile-note">
                                💡 Using Telegram is easier for remote access! Use Direct Access only if you are on the same local network.
                            </div>
                        </div>
                    )}
                </div>

                <div className="settings-footer">
                    {tab === 'SECURITY' && (
                        <label className="risk-confirm">
                            <input
                                type="checkbox"
                                checked={confirmedRisks}
                                onChange={(e) => setConfirmedRisks(e.target.checked)}
                            />
                            <span>I understand the risks of these settings.</span>
                        </label>
                    )}
                    <button
                        className="save-btn"
                        disabled={(tab === 'SECURITY' && !confirmedRisks) || !hasChanges}
                        onClick={() => onSave(options)}
                    >
                        Apply Changes & Restart Engine
                    </button>
                </div>
            </div>
        </div>
    );
}
