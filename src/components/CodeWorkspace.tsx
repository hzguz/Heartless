import { useEffect, useRef } from 'react';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, keymap, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { CharCategory, EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, bracketMatching, foldGutter, syntaxHighlighting, HighlightStyle, defaultHighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import {
  search,
  searchKeymap,
  highlightSelectionMatches,
  gotoLine,
  SearchQuery,
  setSearchQuery,
  getSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  closeSearchPanel,
  SearchCursor,
  RegExpCursor,
} from '@codemirror/search';
import type { Panel } from '@codemirror/view';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import type { LanguageSupport } from '@codemirror/language';
import { loadLanguageSupport } from '@/lib/languageDetect';
import { useTabsStore } from '@/state/tabsStore';
import { useThemeStore } from '@/state/themeStore';
import type { Tab } from '@/types';

interface Props {
  tab: Tab;
  onEditorReady: (editor: null) => void;
}

// VSCode Dark+ inspired palette
const darkHighlight = HighlightStyle.define([
  { tag: t.keyword,                color: '#569cd6' },           // blue — if, for, return, class
  { tag: t.controlKeyword,         color: '#c586c0' },           // purple — if, else, switch
  { tag: t.operatorKeyword,        color: '#569cd6' },
  { tag: t.definitionKeyword,      color: '#569cd6' },           // const, let, var, function
  { tag: t.moduleKeyword,          color: '#c586c0' },           // import, export
  { tag: t.string,                 color: '#ce9178' },           // orange — strings
  { tag: t.special(t.string),      color: '#ce9178' },
  { tag: t.number,                 color: '#b5cea8' },           // light green — numbers
  { tag: t.bool,                   color: '#569cd6' },           // blue — true/false
  { tag: t.null,                   color: '#569cd6' },
  { tag: t.comment,                color: '#6a9955', fontStyle: 'italic' }, // green — comments
  { tag: t.blockComment,           color: '#6a9955', fontStyle: 'italic' },
  { tag: t.lineComment,            color: '#6a9955', fontStyle: 'italic' },
  { tag: t.function(t.variableName), color: '#dcdcaa' },         // yellow — function names
  { tag: t.function(t.definition(t.variableName)), color: '#dcdcaa' },
  { tag: t.definition(t.variableName), color: '#9cdcfe' },       // light blue — variable defs
  { tag: t.variableName,           color: '#9cdcfe' },           // light blue — variables
  { tag: t.propertyName,           color: '#9cdcfe' },
  { tag: t.definition(t.propertyName), color: '#9cdcfe' },
  { tag: t.className,              color: '#4ec9b0' },           // teal — class names
  { tag: t.typeName,               color: '#4ec9b0' },
  { tag: t.typeOperator,           color: '#569cd6' },
  { tag: t.tagName,                color: '#4ec9b0' },           // teal — HTML tags
  { tag: t.angleBracket,           color: '#808080' },           // grey — < >
  { tag: t.attributeName,          color: '#9cdcfe' },           // light blue — HTML attrs
  { tag: t.attributeValue,         color: '#ce9178' },           // orange — attr values
  { tag: t.operator,               color: '#d4d4d4' },
  { tag: t.punctuation,            color: '#d4d4d4' },
  { tag: t.separator,              color: '#d4d4d4' },
  { tag: t.bracket,                color: '#ffd700' },           // yellow brackets
  { tag: t.squareBracket,          color: '#da70d6' },           // purple brackets
  { tag: t.paren,                  color: '#da70d6' },
  { tag: t.namespace,              color: '#4ec9b0' },
  { tag: t.meta,                   color: '#808080' },
  { tag: t.invalid,                color: '#f44747', textDecoration: 'underline' },
  { tag: t.self,                   color: '#569cd6' },
  { tag: t.atom,                   color: '#569cd6' },
  { tag: t.regexp,                 color: '#d16969' },
  { tag: t.escape,                 color: '#d7ba7d' },
  { tag: t.color,                  color: '#ce9178' },
]);

// GitHub Light inspired palette — muted, elegant, high contrast
const lightHighlight = HighlightStyle.define([
  { tag: t.keyword,                color: '#cf222e' },           // red — keywords
  { tag: t.controlKeyword,         color: '#cf222e' },
  { tag: t.operatorKeyword,        color: '#cf222e' },
  { tag: t.definitionKeyword,      color: '#cf222e' },           // const, let, var
  { tag: t.moduleKeyword,          color: '#cf222e' },           // import, export
  { tag: t.string,                 color: '#0a3069' },           // dark blue — strings
  { tag: t.special(t.string),      color: '#0a3069' },
  { tag: t.number,                 color: '#0550ae' },           // blue — numbers
  { tag: t.bool,                   color: '#0550ae' },
  { tag: t.null,                   color: '#0550ae' },
  { tag: t.comment,                color: '#6e7781', fontStyle: 'italic' }, // grey — comments
  { tag: t.blockComment,           color: '#6e7781', fontStyle: 'italic' },
  { tag: t.lineComment,            color: '#6e7781', fontStyle: 'italic' },
  { tag: t.function(t.variableName), color: '#8250df' },         // purple — function names
  { tag: t.function(t.definition(t.variableName)), color: '#8250df' },
  { tag: t.definition(t.variableName), color: '#24292f' },       // text — variable defs
  { tag: t.variableName,           color: '#24292f' },
  { tag: t.propertyName,           color: '#0550ae' },           // blue — properties
  { tag: t.definition(t.propertyName), color: '#8250df' },
  { tag: t.className,              color: '#953800' },           // orange — class names
  { tag: t.typeName,               color: '#953800' },
  { tag: t.typeOperator,           color: '#cf222e' },
  { tag: t.tagName,                color: '#116329' },           // green — HTML tags
  { tag: t.angleBracket,           color: '#24292f' },
  { tag: t.attributeName,          color: '#0550ae' },           // blue — attrs
  { tag: t.attributeValue,         color: '#0a3069' },           // dark blue — values
  { tag: t.operator,               color: '#cf222e' },
  { tag: t.punctuation,            color: '#24292f' },
  { tag: t.separator,              color: '#24292f' },
  { tag: t.bracket,                color: '#24292f' },
  { tag: t.squareBracket,          color: '#24292f' },
  { tag: t.paren,                  color: '#24292f' },
  { tag: t.namespace,              color: '#953800' },
  { tag: t.meta,                   color: '#6e7781' },
  { tag: t.invalid,                color: '#cf222e', textDecoration: 'underline' },
  { tag: t.self,                   color: '#cf222e' },
  { tag: t.atom,                   color: '#0550ae' },
  { tag: t.regexp,                 color: '#0a3069' },
  { tag: t.escape,                 color: '#0550ae' },
  { tag: t.color,                  color: '#0a3069' },
  { tag: t.heading,                color: '#0550ae', fontWeight: 'bold' },
  { tag: t.strong,                 fontWeight: 'bold' },
  { tag: t.emphasis,               fontStyle: 'italic' },
  { tag: t.link,                   color: '#0a3069', textDecoration: 'underline' },
]);

const ICON_REPLACE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 16-4 4 4 4"></path><path d="M5 3a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h13"></path><path d="m10 8 4-4-4-4"></path><path d="M19 21a4 4 0 0 0 4-4v-4a4 4 0 0 0-4-4H6"></path></svg>';
const ICON_PREV = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
const ICON_NEXT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
const ICON_CLOSE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
const ICON_CHEVRON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
const ICON_CASE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4-12 4 12"></path><path d="M4.5 12h5"></path><path d="M14 16v-5a3 3 0 1 1 6 0v5"></path><path d="M14 14h6"></path></svg>';
const ICON_WORD = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"></path><path d="M5 17V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10"></path><path d="M5 12h6"></path><path d="M15 17V9a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v8"></path><path d="M15 13h4"></path></svg>';
const ICON_REGEX = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3v10"></path><path d="m12.67 5.5 8.66 5"></path><path d="m12.67 10.5 8.66-5"></path><path d="M9 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"></path></svg>';

/**
 * Mirrors CodeMirror's own whole-word rule (`insideWordBoundaries` in
 * @codemirror/search): a match counts only when the characters immediately
 * outside it are not word characters. Without this the counter disagrees with
 * what findNext actually navigates.
 */
function isWholeWordMatch(state: EditorState, from: number, to: number): boolean {
  const check = state.charCategorizer(from);
  const beforeOk = from === 0 || check(state.sliceDoc(from - 1, from)) !== CharCategory.Word;
  const afterOk = to === state.doc.length || check(state.sliceDoc(to, to + 1)) !== CharCategory.Word;
  return beforeOk && afterOk;
}

function countMatches(state: EditorState, query: SearchQuery): number {
  if (!query.search) return 0;
  try {
    let count = 0;
    const doc = state.doc;
    if (query.regexp) {
      const cursor = new RegExpCursor(doc, query.search, {
        ignoreCase: !query.caseSensitive,
      });
      while (!cursor.next().done) {
        if (!query.wholeWord || isWholeWordMatch(state, cursor.value.from, cursor.value.to)) count++;
      }
    } else {
      const cursor = new SearchCursor(
        doc,
        query.search,
        0,
        doc.length,
        query.caseSensitive ? undefined : (s) => s.toLowerCase(),
      );
      while (!cursor.next().done) {
        if (!query.wholeWord || isWholeWordMatch(state, cursor.value.from, cursor.value.to)) count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

function createSearchPanel(view: EditorView): Panel {
  const dom = document.createElement('div');
  dom.className = 'cm-heartless-search';

  const row1 = document.createElement('div');
  row1.className = 'cm-hs-row';
  const row2 = document.createElement('div');
  row2.className = 'cm-hs-row cm-hs-row-replace';

  // Toggle button (expand/collapse replace row)
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'cm-hs-icon-btn cm-hs-toggle';
  toggleBtn.type = 'button';
  toggleBtn.title = 'Toggle Replace';
  toggleBtn.innerHTML = ICON_CHEVRON;

  // Search field wrapper
  const searchWrap = document.createElement('div');
  searchWrap.className = 'cm-hs-field';

  const searchInput = document.createElement('input');
  searchInput.className = 'cm-hs-input';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search';
  searchInput.setAttribute('main-field', 'true');

  const counter = document.createElement('span');
  counter.className = 'cm-hs-counter';
  counter.textContent = 'No results';

  // Inline toggles inside the search field
  const caseToggle = document.createElement('button');
  caseToggle.type = 'button';
  caseToggle.className = 'cm-hs-flag';
  caseToggle.title = 'Match Case (Alt+C)';
  caseToggle.innerHTML = ICON_CASE;

  const wordToggle = document.createElement('button');
  wordToggle.type = 'button';
  wordToggle.className = 'cm-hs-flag';
  wordToggle.title = 'Match Whole Word (Alt+W)';
  wordToggle.innerHTML = ICON_WORD;

  const regexToggle = document.createElement('button');
  regexToggle.type = 'button';
  regexToggle.className = 'cm-hs-flag';
  regexToggle.title = 'Use Regular Expression (Alt+R)';
  regexToggle.innerHTML = ICON_REGEX;

  searchWrap.append(searchInput, counter, caseToggle, wordToggle, regexToggle);

  // Nav buttons
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'cm-hs-icon-btn';
  prevBtn.title = 'Previous Match (Shift+Enter)';
  prevBtn.innerHTML = ICON_PREV;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'cm-hs-icon-btn';
  nextBtn.title = 'Next Match (Enter)';
  nextBtn.innerHTML = ICON_NEXT;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'cm-hs-icon-btn cm-hs-close';
  closeBtn.title = 'Close (Esc)';
  closeBtn.innerHTML = ICON_CLOSE;

  row1.append(toggleBtn, searchWrap, prevBtn, nextBtn, closeBtn);

  // --- Replace row ---
  const replaceWrap = document.createElement('div');
  replaceWrap.className = 'cm-hs-field';

  const replaceInput = document.createElement('input');
  replaceInput.className = 'cm-hs-input';
  replaceInput.type = 'text';
  replaceInput.placeholder = 'Replace';

  replaceWrap.append(replaceInput);

  const replaceBtn = document.createElement('button');
  replaceBtn.type = 'button';
  replaceBtn.className = 'cm-hs-text-btn';
  replaceBtn.title = 'Replace Next';
  replaceBtn.innerHTML = ICON_REPLACE;

  const replaceAllBtn = document.createElement('button');
  replaceAllBtn.type = 'button';
  replaceAllBtn.className = 'cm-hs-text-btn';
  replaceAllBtn.title = 'Replace All';
  replaceAllBtn.textContent = 'All';

  // Spacer to align with toggle button on row1
  const spacer = document.createElement('div');
  spacer.className = 'cm-hs-spacer';

  row2.append(spacer, replaceWrap, replaceBtn, replaceAllBtn);

  dom.append(row1, row2);

  let replaceOpen = false;
  const setReplaceOpen = (open: boolean) => {
    replaceOpen = open;
    dom.classList.toggle('cm-hs-replace-open', open);
    toggleBtn.classList.toggle('cm-hs-toggle-open', open);
  };
  setReplaceOpen(false);

  // --- Query state and sync ---
  const commit = () => {
    const q = new SearchQuery({
      search: searchInput.value,
      replace: replaceInput.value,
      caseSensitive: caseToggle.classList.contains('cm-hs-flag-on'),
      wholeWord: wordToggle.classList.contains('cm-hs-flag-on'),
      regexp: regexToggle.classList.contains('cm-hs-flag-on'),
    });
    view.dispatch({ effects: setSearchQuery.of(q) });
    updateCounter(q);
  };

  const updateCounter = (q?: SearchQuery) => {
    const query = q ?? getSearchQuery(view.state);
    if (!query.search) {
      counter.textContent = '';
      counter.classList.remove('cm-hs-counter-empty');
      searchInput.classList.remove('cm-hs-invalid');
      return;
    }
    // Validate regex
    if (query.regexp) {
      try { new RegExp(query.search); }
      catch {
        counter.textContent = 'Invalid';
        counter.classList.add('cm-hs-counter-empty');
        searchInput.classList.add('cm-hs-invalid');
        return;
      }
    }
    searchInput.classList.remove('cm-hs-invalid');
    const total = countMatches(view.state, query);
    counter.textContent = total === 0 ? 'No results' : `${total} ${total === 1 ? 'match' : 'matches'}`;
    counter.classList.toggle('cm-hs-counter-empty', total === 0);
  };

  // Initial value from existing query
  const initial = getSearchQuery(view.state);
  if (initial.search) searchInput.value = initial.search;
  if (initial.caseSensitive) caseToggle.classList.add('cm-hs-flag-on');
  if (initial.wholeWord) wordToggle.classList.add('cm-hs-flag-on');
  if (initial.regexp) regexToggle.classList.add('cm-hs-flag-on');
  updateCounter(initial);

  // --- Event wiring ---
  searchInput.addEventListener('input', commit);
  replaceInput.addEventListener('input', commit);

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) findPrevious(view); else findNext(view);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchPanel(view);
      view.focus();
    }
  });
  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      replaceNext(view);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchPanel(view);
      view.focus();
    }
  });

  const toggleFlag = (btn: HTMLButtonElement) => {
    btn.classList.toggle('cm-hs-flag-on');
    commit();
  };
  caseToggle.addEventListener('click', () => toggleFlag(caseToggle));
  wordToggle.addEventListener('click', () => toggleFlag(wordToggle));
  regexToggle.addEventListener('click', () => toggleFlag(regexToggle));

  // Alt+C/W/R shortcuts while the panel is focused
  dom.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'c') { e.preventDefault(); toggleFlag(caseToggle); }
    else if (k === 'w') { e.preventDefault(); toggleFlag(wordToggle); }
    else if (k === 'r') { e.preventDefault(); toggleFlag(regexToggle); }
  });

  prevBtn.addEventListener('click', () => { findPrevious(view); });
  nextBtn.addEventListener('click', () => { findNext(view); });
  closeBtn.addEventListener('click', () => { closeSearchPanel(view); view.focus(); });
  toggleBtn.addEventListener('click', () => setReplaceOpen(!replaceOpen));
  replaceBtn.addEventListener('click', () => { replaceNext(view); });
  replaceAllBtn.addEventListener('click', () => { replaceAll(view); });

  return {
    top: true,
    dom,
    mount() {
      requestAnimationFrame(() => {
        searchInput.focus();
        searchInput.select();
      });
    },
    update(update) {
      if (update.docChanged || update.transactions.some((tr) => tr.effects.some((e) => e.is(setSearchQuery)))) {
        updateCounter();
      }
    },
  };
}

function buildTheme(isDark: boolean): Extension {
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '13px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Consolas, ui-monospace, monospace",
      fontWeight: '450',
      fontVariantLigatures: 'common-ligatures contextual',
      fontFeatureSettings: '"calt" 1, "liga" 1',
      backgroundColor: 'var(--color-paper)',
      color: 'var(--color-text)',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.65',
      letterSpacing: '0.01em',
    },
    '.cm-content': {
      padding: '28px 0 80px',
      caretColor: 'var(--color-accent)',
    },
    '.cm-line': { padding: '0 24px', position: 'relative', zIndex: '1' },
    '.cm-cursor': { borderLeftColor: 'var(--color-accent)', borderLeftWidth: '2px' },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.28)' : 'rgba(206,66,66,0.18)',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.28)' : 'rgba(206,66,66,0.18)',
    },
    '.cm-activeLine': { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' },
    '.cm-activeLineGutter': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
      color: 'var(--color-text-secondary)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-paper)',
      borderRight: '1px solid var(--color-subtle)',
      color: 'var(--color-muted)',
      minWidth: '52px',
      fontVariantNumeric: 'tabular-nums',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 12px 0 10px',
      fontSize: '11.5px',
      fontWeight: '400',
    },
    '.cm-foldGutter': { width: '18px' },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '.cm-fold-marker': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '14px',
      height: '100%',
      color: 'var(--color-muted)',
      opacity: '0.6',
      transition: 'opacity 0.12s ease, color 0.12s ease',
      cursor: 'pointer',
    },
    '.cm-foldGutter .cm-gutterElement:hover .cm-fold-marker': {
      opacity: '1',
      color: 'var(--color-text)',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
      color: 'var(--color-text-secondary)',
      borderRadius: '4px',
      padding: '0 6px',
      margin: '0 2px',
      fontSize: '11px',
      fontWeight: '500',
      cursor: 'pointer',
    },
    '.cm-foldPlaceholder:hover': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)',
      color: 'var(--color-text)',
    },
    '.cm-matchingBracket': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.22)' : 'rgba(206,66,66,0.14)',
      outline: 'none',
      borderRadius: '2px',
    },
    '.cm-nonmatchingBracket': {
      color: '#cf222e',
      backgroundColor: 'transparent',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-surface-2)',
      borderRadius: '6px',
      fontSize: '12px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
      padding: '4px 10px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))',
      color: 'var(--color-text)',
    },
    '.cm-panels': {
      backgroundColor: 'transparent',
      color: 'var(--color-text)',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: 'none',
    },
    // --- Custom Heartless search panel ---
    '.cm-heartless-search': {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '8px 10px 8px 8px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-subtle)',
      boxShadow: isDark
        ? '0 4px 12px -6px rgba(0,0,0,0.55)'
        : '0 4px 12px -8px rgba(0,0,0,0.18)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
    '.cm-hs-row': {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    '.cm-hs-row-replace': {
      display: 'none',
    },
    '.cm-heartless-search.cm-hs-replace-open .cm-hs-row-replace': {
      display: 'flex',
    },
    '.cm-hs-spacer': {
      width: '22px',
      flexShrink: 0,
    },
    '.cm-hs-field': {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      backgroundColor: 'var(--color-paper)',
      border: '1px solid var(--color-subtle)',
      borderRadius: '5px',
      padding: '0 4px 0 8px',
      height: '28px',
      transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
    },
    '.cm-hs-field:focus-within': {
      borderColor: 'var(--color-accent)',
      boxShadow: `0 0 0 2px ${isDark ? 'rgba(206,66,66,0.18)' : 'rgba(206,66,66,0.12)'}`,
    },
    '.cm-hs-input': {
      flex: '1',
      minWidth: '0',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'var(--color-text)',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: '12.5px',
      padding: '0',
      height: '100%',
    },
    '.cm-hs-input::placeholder': {
      color: 'var(--color-muted)',
    },
    '.cm-hs-input.cm-hs-invalid': {
      color: '#cf222e',
    },
    '.cm-hs-counter': {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: '11px',
      color: 'var(--color-text-secondary)',
      whiteSpace: 'nowrap',
      padding: '0 6px',
      borderLeft: '1px solid var(--color-subtle)',
      marginLeft: '4px',
    },
    '.cm-hs-counter:empty': {
      display: 'none',
    },
    '.cm-hs-counter.cm-hs-counter-empty': {
      color: 'var(--color-muted)',
    },
    '.cm-hs-flag': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      color: 'var(--color-muted)',
      cursor: 'pointer',
      padding: '0',
      transition: 'background-color 0.12s ease, color 0.12s ease',
    },
    '.cm-hs-flag:hover': {
      backgroundColor: 'var(--color-surface-2)',
      color: 'var(--color-text)',
    },
    '.cm-hs-flag.cm-hs-flag-on': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.22)' : 'rgba(206,66,66,0.14)',
      color: 'var(--color-accent)',
    },
    '.cm-hs-flag.cm-hs-flag-on:hover': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.32)' : 'rgba(206,66,66,0.2)',
    },
    '.cm-hs-icon-btn': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '26px',
      flexShrink: 0,
      background: 'transparent',
      border: 'none',
      borderRadius: '5px',
      color: 'var(--color-text-secondary)',
      cursor: 'pointer',
      padding: '0',
      transition: 'background-color 0.12s ease, color 0.12s ease, transform 0.12s ease',
    },
    '.cm-hs-icon-btn:hover': {
      backgroundColor: 'var(--color-surface-2)',
      color: 'var(--color-text)',
    },
    '.cm-hs-icon-btn:active': {
      backgroundColor: 'var(--color-subtle)',
    },
    '.cm-hs-toggle': {
      color: 'var(--color-muted)',
    },
    '.cm-hs-toggle svg': {
      transition: 'transform 0.18s ease',
      transform: 'rotate(-90deg)',
    },
    '.cm-hs-toggle.cm-hs-toggle-open svg': {
      transform: 'rotate(0deg)',
    },
    '.cm-hs-close:hover': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.2)' : 'rgba(206,66,66,0.12)',
      color: 'var(--color-accent)',
    },
    '.cm-hs-text-btn': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '26px',
      height: '26px',
      flexShrink: 0,
      backgroundColor: 'transparent',
      border: '1px solid var(--color-subtle)',
      borderRadius: '5px',
      color: 'var(--color-text-secondary)',
      fontSize: '11.5px',
      fontWeight: '500',
      cursor: 'pointer',
      padding: '0 8px',
      transition: 'background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease',
    },
    '.cm-hs-text-btn:hover': {
      backgroundColor: 'var(--color-surface-2)',
      borderColor: 'var(--color-accent)',
      color: 'var(--color-text)',
    },
    '.cm-hs-text-btn:active': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.2)' : 'rgba(206,66,66,0.12)',
    },
    // Hide the default search panel's residual styles if any leak through
    '.cm-button': { display: 'none' },
    '.cm-textfield': { display: 'none' },
    '.cm-selectionMatch': {
      backgroundColor: isDark ? 'rgba(206,66,66,0.18)' : 'rgba(206,66,66,0.12)',
    },
    '.cm-indent-markers': {
      '--indent-marker-bg-color': isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      '--indent-marker-active-bg-color': isDark ? 'rgba(206,66,66,0.35)' : 'rgba(206,66,66,0.22)',
    },
    '.cm-line > .cm-indent-markers': {
      zIndex: '0',
    },
  }, { dark: isDark });
}

function buildExtensions(
  isDark: boolean,
  onUpdate: (content: string) => void,
  lang: LanguageSupport | null,
): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    foldGutter({
      markerDOM: (open) => {
        const el = document.createElement('span');
        el.className = 'cm-fold-marker';
        el.innerHTML = open
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
        return el;
      },
    }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
    drawSelection(),
    rectangularSelection(),
    crosshairCursor(),
    indentationMarkers({ hideFirstIndent: true }),
    search({ top: true, createPanel: createSearchPanel }),
    highlightSelectionMatches(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...closeBracketsKeymap,
      ...searchKeymap,
      { key: 'Ctrl-g', run: gotoLine },
      { key: 'Cmd-g', run: gotoLine },
      indentWithTab,
    ]),
    buildTheme(isDark),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onUpdate(update.state.doc.toString());
    }),
    EditorView.lineWrapping,
    ...(lang ? [lang] : []),
  ];
}

export function CodeWorkspace({ tab, onEditorReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const destroyedRef = useRef(false);
  const updateContent = useTabsStore((s) => s.updateContent);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isInternalUpdate = useRef(false);
  // Keep refs stable for use inside effects without re-running them
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const tabIdRef = useRef(tab.id);
  tabIdRef.current = tab.id;

  const applyState = (view: EditorView, doc: string, lang: LanguageSupport | null, sel?: EditorState['selection']) => {
    const exts = buildExtensions(isDarkRef.current, (content) => {
      isInternalUpdate.current = true;
      updateContent(tabIdRef.current, content);
    }, lang);
    const state = EditorState.create({ doc, extensions: exts, selection: sel });
    view.setState(state);
  };

  // Mount on tab change (parent sets key={tab.id})
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    destroyedRef.current = false;
    const view = new EditorView({ parent: el });
    viewRef.current = view;
    applyState(view, tab.content, null);

    if (tab.filePath) {
      void loadLanguageSupport(tab.filePath).then((lang) => {
        if (destroyedRef.current) return;
        applyState(view, view.state.doc.toString(), lang, view.state.selection);
      });
    }

    onEditorReady(null);
    return () => {
      destroyedRef.current = true;
      view.destroy();
      viewRef.current = null;
      onEditorReady(null);
    };
  // tab.id change handled by key prop — intentionally omit other deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  // Sync external content changes (reload from disk, snippet insert, etc.)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
    const current = view.state.doc.toString();
    if (current !== tab.content) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: tab.content } });
    }
  }, [tab.content]);

  // Re-apply theme when dark/light toggles
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc.toString();
    const sel = view.state.selection;
    applyState(view, doc, null, sel);
    if (tab.filePath) {
      void loadLanguageSupport(tab.filePath).then((lang) => {
        if (destroyedRef.current) return;
        applyState(view, view.state.doc.toString(), lang, view.state.selection);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="app-scrollbar flex-1 min-h-0 overflow-hidden"
      style={{ height: '100%' }}
    />
  );
}
