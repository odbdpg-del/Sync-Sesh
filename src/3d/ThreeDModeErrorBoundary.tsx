import { Component, type ReactNode } from "react";

interface ThreeDModeErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
}

interface ThreeDModeErrorBoundaryState {
  hasError: boolean;
}

export class ThreeDModeErrorBoundary extends Component<ThreeDModeErrorBoundaryProps, ThreeDModeErrorBoundaryState> {
  state: ThreeDModeErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ThreeDModeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
