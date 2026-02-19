interface LoadingScreenProps {
    msg: string;
    pct: number;
}

export default function LoadingScreen({ msg, pct }: LoadingScreenProps) {
    return (
        <div className="screen loading-screen">
            <div className="loading-card">
                <div className="logo-icon logo-pulse">🦞</div>
                <h2 className="loading-title">Setting up ClawDesk</h2>

                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                    </div>
                    <div className="progress-info">
                        <span className="progress-msg">{msg}</span>
                        <span className="progress-pct">{Math.round(pct)}%</span>
                    </div>
                </div>

                {pct < 50 && (
                    <p className="loading-note">
                        First-time setup takes 2-3 minutes.<br />
                        This only happens once.
                    </p>
                )}
            </div>
        </div>
    );
}
