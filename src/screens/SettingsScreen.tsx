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
}

export default function SettingsScreen({ onClose, onSave, currentOptions }: SettingsScreenProps) {
    const [options, setOptions] = useState<AdvancedOptions>(currentOptions);
    const [confirmedRisks, setConfirmedRisks] = useState(false);

    const toggle = (key: keyof AdvancedOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const hasChanges = JSON.stringify(options) !== JSON.stringify(currentOptions);

    return (
        <div className="settings-overlay">
            <div className="settings-card glass-panel">
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="settings-content">
                    <div className="security-summary">
                        <div className="security-badge safe">
                            <span className="icon">🔒</span>
                            Security Level: {Object.values(options).some(v => v) ? 'Custom' : 'Protected (Default)'}
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
                </div>

                <div className="settings-footer">
                    <label className="risk-confirm">
                        <input
                            type="checkbox"
                            checked={confirmedRisks}
                            onChange={(e) => setConfirmedRisks(e.target.checked)}
                        />
                        <span>I understand the risks of these settings.</span>
                    </label>
                    <button
                        className="save-btn"
                        disabled={!confirmedRisks || !hasChanges}
                        onClick={() => onSave(options)}
                    >
                        Apply Changes & Restart Engine
                    </button>
                </div>
            </div>
        </div>
    );
}
