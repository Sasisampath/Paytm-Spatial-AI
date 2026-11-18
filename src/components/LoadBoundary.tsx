import { Component, type ReactNode } from "react";
/** A lazy chunk or WebGL failure must not blank the rest of the experience. */
export class LoadBoundary extends Component<
  { children: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="load-error" role="alert">
        <strong>{this.props.label} could not load.</strong>
        <p>Check your connection, then reload the experience to try again.</p>
        <a href="/">Reload experience ↗</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
