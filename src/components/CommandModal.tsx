interface CommandModalProps {
    command: string;
    impact?: string;
    onAllow: () => void;
    onDeny: () => void;
}

export default function CommandModal({ command, impact, onAllow, onDeny }: CommandModalProps) {
    return (
        <div className="modal-overlay">
            <div className="modal-card glass-panel command-modal">
                <div className="modal-header">
                    <span className="bot-icon">🤖</span>
                    <h3>AI wants to run a command</h3>
                </div>

                <div className="command-box">
                    <code>{command}</code>
                </div>

                {impact && (
                    <div className="impact-warning">
                        <span className="warn-icon">⚠️</span>
                        <div className="impact-text">
                            <strong>Potential Impact:</strong>
                            <p>{impact}</p>
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="deny-btn" onClick={onDeny}>Deny</button>
                    <button className="allow-btn primary" onClick={onAllow}>Allow Once</button>
                </div>
            </div>
        </div>
    );
}
