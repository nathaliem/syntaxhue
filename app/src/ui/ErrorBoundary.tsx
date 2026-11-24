import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearSavedTheme } from "../state";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Last line of defence: if rendering throws, show a way back instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // React already reports the error to the console; nothing else to do here until we have a logger.
  }

  render() {
    if (this.state.error) {
      return (
        <CrashScreen
          message={this.state.error.message}
          onReload={() => location.reload()}
          onFresh={() => {
            clearSavedTheme();
            location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}

export function CrashScreen({
  message,
  onReload,
  onFresh,
}: {
  message: string;
  onReload: () => void;
  onFresh: () => void;
}) {
  return (
    <main className="crash" role="alert">
      <div className="crash-card">
        <h1>Something went wrong</h1>
        <p>Hueprint hit an unexpected error. Your last saved theme is still stored in this browser.</p>
        <div className="crash-actions">
          <button className="btn primary" onClick={onReload}>
            Reload with last saved theme
          </button>
          <button className="btn" onClick={onFresh}>
            Start with a new theme
          </button>
        </div>
        <p className="crash-hint">
          If it keeps happening after a reload, start with a new theme. This replaces the saved one.
        </p>
        {message && <pre className="crash-detail">{message}</pre>}
      </div>
    </main>
  );
}
