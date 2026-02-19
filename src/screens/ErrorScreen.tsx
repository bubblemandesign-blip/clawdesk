interface ErrorScreenProps {
    msg: string;
    onRetry: () => void;
}

export default function ErrorScreen({ msg, onRetry }: ErrorScreenProps) {
    return (
        <div className="screen error-screen">
            <div className="error-card">
                <div className="error-icon-large">✕</div>
                <h2 className="error-title">Something went wrong</h2>
                <p className="error-message">{msg}</p>
                <button className="retry-button" onClick={onRetry}>
                    Try Again
                </button>
            </div>
        </div>
    );
}
