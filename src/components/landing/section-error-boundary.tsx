/**
 * Per-section error boundary — catches render errors in individual landing page sections.
 * A broken section fails silently (renders null) rather than crashing the whole page.
 */
"use client";
import { Component, ReactNode, ErrorInfo } from "react";

interface Props { children: ReactNode; sectionType?: string; }
interface State { hasError: boolean; }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary] Section "${this.props.sectionType}" crashed:`, error, info);
  }
  render() {
    if (this.state.hasError) return null; // silent fail — don't crash the page
    return this.props.children;
  }
}
