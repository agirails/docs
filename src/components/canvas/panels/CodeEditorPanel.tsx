/* ============================================
   Code Editor Panel Component
   ============================================

   Phase 2: Full Monaco Editor with syntax highlighting,
   editing capabilities, and action buttons.
   ============================================ */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Agent } from '../../../lib/canvas/types';
import { getTemplate } from '../../../lib/canvas/templates';
import { getCanvasSDKTypes } from '../../../lib/canvas/sdk-types';
import { copyTextToClipboard } from '../../../lib/canvas/share';

interface CodeEditorPanelProps {
  agent: Agent | null;
  onCodeChange: (agentId: string, code: string) => void;
  onClose: () => void;
}

let didConfigureMonaco = false;

export function CodeEditorPanel({ agent, onCodeChange, onClose }: CodeEditorPanelProps) {
  const [code, setCode] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const editorRef = useRef<any>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef('');
  const pendingSaveRef = useRef<{ agentId: string; code: string } | null>(null);

  // Use ref for onCodeChange to avoid effect re-runs
  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;

  const flushPendingSave = useCallback((showSavedIndicator = true) => {
    const pending = pendingSaveRef.current;
    if (!pending) return;

    setSaveState('saving');
    onCodeChangeRef.current(pending.agentId, pending.code);
    pendingSaveRef.current = null;

    if (showSavedIndicator) {
      // Brief "saving" then "saved" indicator
      if (saveIndicatorTimerRef.current) {
        clearTimeout(saveIndicatorTimerRef.current);
      }
      saveIndicatorTimerRef.current = setTimeout(() => {
        setSaveState('saved');
      }, 100);
    } else {
      setSaveState('saved');
    }
  }, []); // No dependencies - uses refs

  // Track previous agent id to detect when editor closes
  const prevAgentIdRef = useRef<string | null>(null);

  // Initialize code when agent changes OR flush when editor closes
  useEffect(() => {
    const prevAgentId = prevAgentIdRef.current;
    const currentAgentId = agent?.id ?? null;

    if (currentAgentId && currentAgentId !== prevAgentId) {
      // New agent opened - initialize code from agent
      setCode(agent!.code);
      codeRef.current = agent!.code;
      setCopyState('idle');
    } else if (!currentAgentId && prevAgentId) {
      // Editor was closed (agent went from something to null) - flush pending changes
      flushPendingSave();
    }

    prevAgentIdRef.current = currentAgentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]); // Only run when agent ID changes, not when code changes

  // Handle editor mount
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    // Ensure editor gets focus immediately (prevents key events going to canvas/ReactFlow).
    editor.focus();

    // Configure Monaco once (avoid accumulating duplicate extra libs per open/close).
    if (!didConfigureMonaco) {
      didConfigureMonaco = true;

      // Add Canvas SDK type definitions for autocomplete
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        getCanvasSDKTypes(),
        'canvas-sdk.d.ts'
      );

      // Enable suggestions
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        checkJs: true, // Enable TypeScript-style checking for JS
        strict: true, // Enable strict mode checks
        noImplicitAny: false, // Allow implicit any (ctx API doesn't have full types)
        noUnusedLocals: true, // Warn about unused variables
        noUnusedParameters: false, // Don't warn about unused params (common in callbacks)
        typeRoots: ['node_modules/@types'],
      });
    }
  };

  // Handle code changes with debouncing
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || '';
      setCode(newCode);
      codeRef.current = newCode;

      // Mark as unsaved immediately
      setSaveState('unsaved');

      // Debounce state updates (300ms)
      if (!agent) return;

      // If user switches agents and starts typing quickly, don't drop the previous agent's pending save.
      if (
        debounceTimerRef.current &&
        pendingSaveRef.current &&
        pendingSaveRef.current.agentId !== agent.id
      ) {
        flushPendingSave(false);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      pendingSaveRef.current = { agentId: agent.id, code: newCode };
      debounceTimerRef.current = setTimeout(() => {
        flushPendingSave(true);
        debounceTimerRef.current = null;
      }, 300);
    },
    [agent, flushPendingSave]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Flush last edit if user closes quickly (< debounce window)
      flushPendingSave(false);

      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }

      if (saveIndicatorTimerRef.current) {
        clearTimeout(saveIndicatorTimerRef.current);
        saveIndicatorTimerRef.current = null;
      }
    };
  }, [flushPendingSave]);

  // Explicit save handler (immediate, bypasses debounce)
  const handleSave = useCallback(() => {
    // Cancel any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If there's a pending save, flush it
    if (pendingSaveRef.current) {
      flushPendingSave(true);
    } else if (agent) {
      // No pending save, but save current code anyway
      setSaveState('saving');
      onCodeChangeRef.current(agent.id, codeRef.current);
      if (saveIndicatorTimerRef.current) {
        clearTimeout(saveIndicatorTimerRef.current);
      }
      saveIndicatorTimerRef.current = setTimeout(() => {
        setSaveState('saved');
      }, 100);
    }
  }, [agent, flushPendingSave]);

  // Copy code to clipboard
  const handleCopy = async () => {
    const ok = await copyTextToClipboard(codeRef.current, { timeoutMs: 500 });

    setCopyState(ok ? 'copied' : 'error');

    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => setCopyState('idle'), 2000);
  };

  // Reset to template default
  const handleReset = () => {
    if (!agent) return;

    // Cancel any pending debounced save, otherwise it can overwrite the reset.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingSaveRef.current = null;

    const template = getTemplate(agent.templateId);
    if (template) {
      const defaultCode = template.defaultCode;
      setCode(defaultCode);
      codeRef.current = defaultCode;
      onCodeChange(agent.id, defaultCode);
    }
  };

  // Format code (uses Monaco's built-in formatter)
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  if (!agent) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className="cv-code-editor-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="cv-code-editor-panel">
        {/* Header */}
        <div className="cv-code-editor__header">
          <div className="cv-code-editor__title-section">
            <span className="cv-code-editor__icon">{agent.icon}</span>
            <div>
              <h3 className="cv-code-editor__title">{agent.name}</h3>
              <p className="cv-code-editor__subtitle">{agent.type} agent</p>
            </div>
          </div>

          <button
            className="cv-code-editor__close"
            onClick={onClose}
            aria-label="Close code editor"
          >
            ×
          </button>
        </div>

        {/* Action Bar */}
        <div className="cv-code-editor__actions">
          <div className="cv-code-editor__actions-left">
            <span className="cv-code-editor__language-tag">JavaScript</span>
            {/* Save status indicator */}
            <span className={`cv-code-editor__save-status cv-code-editor__save-status--${saveState}`}>
              {saveState === 'unsaved' && (
                <>
                  <span className="cv-code-editor__unsaved-dot" />
                  Unsaved
                </>
              )}
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Saved
                </>
              )}
            </span>
          </div>
          <div className="cv-code-editor__actions-right">
            {/* Prominent Save button */}
            <button
              onClick={handleSave}
              className={`cv-code-action-btn cv-save-btn ${saveState === 'unsaved' ? 'cv-save-btn--unsaved' : ''}`}
              title="Save code (Ctrl+S)"
              aria-label="Save code"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save
            </button>
            <button
              onClick={handleFormat}
              className="cv-code-action-btn"
              title="Format code"
              aria-label="Format code"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
            <button
              onClick={handleReset}
              className="cv-code-action-btn"
              title="Reset to template"
              aria-label="Reset to template"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button onClick={handleCopy} className="cv-code-action-btn cv-copy-btn">
              {copyState === 'copied' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ color: 'var(--cv-success)' }}>Copied</span>
                </>
              ) : copyState === 'error' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span style={{ color: 'var(--cv-error)' }}>Failed</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div
          className="cv-code-editor__body"
          onKeyDown={(e) => {
            // Stop all keyboard events from propagating to ReactFlow/Canvas
            // This ensures space, arrows, and other keys work in the editor
            e.stopPropagation();

            // Handle Ctrl+S / Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
            }
          }}
          onKeyUp={(e) => {
            e.stopPropagation();
          }}
          onKeyPress={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="cv-monaco-wrapper">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
              }}
            />
          </div>
        </div>

        {/* Footer with metadata */}
        <div className="cv-code-editor__footer">
          <div className="cv-code-editor__metadata">
            <span className="cv-code-editor__meta-item">
              <span className="cv-code-editor__meta-label">Template:</span>{' '}
              {agent.templateId}
            </span>
            <span className="cv-code-editor__meta-item">
              <span className="cv-code-editor__meta-label">Lines:</span>{' '}
              {code.split('\n').length}
            </span>
            <span className="cv-code-editor__meta-item">
              <span className="cv-code-editor__meta-label">Characters:</span>{' '}
              {code.length}
            </span>
          </div>
          <div className="cv-code-editor__disclaimer">
            Sandbox runtime (ctx.*) for learning. For production SDK, see{' '}
            <a href="/docs/sdk/quick-start" target="_blank" rel="noopener noreferrer">
              SDK docs
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
