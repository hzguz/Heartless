import {
  File as FileIcon,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Braces,
  Hash,
  Image as ImageIcon,
  Palette,
  Terminal,
  Cog,
  Lock,
  Package,
  Atom,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface IconStyle {
  Icon: LucideIcon;
  color: string;
}

const SPECIAL_FILE_ICONS: Record<string, IconStyle> = {
  'package.json':         { Icon: Package,  color: '#c25a40' },
  'package-lock.json':    { Icon: Lock,     color: '#9aa0a6' },
  'yarn.lock':            { Icon: Lock,     color: '#9aa0a6' },
  'pnpm-lock.yaml':       { Icon: Lock,     color: '#9aa0a6' },
  '.env':                 { Icon: Lock,     color: '#d6c46a' },
  '.env.local':           { Icon: Lock,     color: '#d6c46a' },
  'tsconfig.json':        { Icon: Cog,      color: '#6aa3e8' },
  'tsconfig.node.json':   { Icon: Cog,      color: '#6aa3e8' },
  'vite.config.ts':       { Icon: Cog,      color: '#a597d6' },
  'tailwind.config.ts':   { Icon: Palette,  color: '#6fc1e0' },
  'postcss.config.js':    { Icon: Cog,      color: '#d67ab5' },
  'readme.md':            { Icon: FileText, color: '#9aa0a6' },
};

const EXT_ICONS: Record<string, IconStyle> = {
  '.ts':       { Icon: FileCode,  color: '#6aa3e8' },
  '.tsx':      { Icon: Atom,      color: '#6aa3e8' },
  '.js':       { Icon: FileCode,  color: '#d6c46a' },
  '.jsx':      { Icon: Atom,      color: '#d6c46a' },
  '.mjs':      { Icon: FileCode,  color: '#d6c46a' },
  '.cjs':      { Icon: FileCode,  color: '#d6c46a' },
  '.json':     { Icon: FileJson,  color: '#d6c46a' },
  '.css':      { Icon: Hash,      color: '#7ac4d6' },
  '.scss':     { Icon: Hash,      color: '#d67ab5' },
  '.html':     { Icon: FileCode,  color: '#e4796b' },
  '.htm':      { Icon: FileCode,  color: '#e4796b' },
  '.xml':      { Icon: FileCode,  color: '#e4796b' },
  '.yaml':     { Icon: Braces,    color: '#a597d6' },
  '.yml':      { Icon: Braces,    color: '#a597d6' },
  '.toml':     { Icon: Braces,    color: '#a597d6' },
  '.md':       { Icon: FileText,  color: '#cf6464' },
  '.markdown': { Icon: FileText,  color: '#cf6464' },
  '.txt':      { Icon: FileText,  color: '#9aa0a6' },
  '.py':       { Icon: FileCode,  color: '#5fa9d6' },
  '.rs':       { Icon: FileCode,  color: '#d6a36a' },
  '.go':       { Icon: FileCode,  color: '#6fc1e0' },
  '.java':     { Icon: FileCode,  color: '#c25a40' },
  '.c':        { Icon: FileCode,  color: '#6aa3e8' },
  '.cpp':      { Icon: FileCode,  color: '#6aa3e8' },
  '.h':        { Icon: FileCode,  color: '#a597d6' },
  '.sh':       { Icon: Terminal,  color: '#9aa0a6' },
  '.png':      { Icon: ImageIcon, color: '#7ac4d6' },
  '.jpg':      { Icon: ImageIcon, color: '#7ac4d6' },
  '.jpeg':     { Icon: ImageIcon, color: '#7ac4d6' },
  '.gif':      { Icon: ImageIcon, color: '#7ac4d6' },
  '.svg':      { Icon: ImageIcon, color: '#d6a36a' },
  '.webp':     { Icon: ImageIcon, color: '#7ac4d6' },
  '.bmp':      { Icon: ImageIcon, color: '#7ac4d6' },
  '.ico':      { Icon: ImageIcon, color: '#7ac4d6' },
  '.pdf':      { Icon: FileText,  color: '#e4796b' },
  '.docx':     { Icon: FileText,  color: '#6aa3e8' },
  '.doc':      { Icon: FileText,  color: '#6aa3e8' },
  '.zip':      { Icon: Layers,    color: '#9aa0a6' },
  '.php':      { Icon: FileCode,  color: '#a597d6' },
  '.type':     { Icon: FileType,  color: '#6aa3e8' },
};

export function getFileIconStyle(name: string): IconStyle {
  const lower = name.toLowerCase();
  if (SPECIAL_FILE_ICONS[lower]) return SPECIAL_FILE_ICONS[lower];
  const dot = lower.lastIndexOf('.');
  if (dot >= 0) {
    const ext = lower.slice(dot);
    if (EXT_ICONS[ext]) return EXT_ICONS[ext];
  }
  return { Icon: FileIcon, color: 'var(--color-text-secondary)' };
}
