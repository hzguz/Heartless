import { create } from 'zustand';
import type { Language } from '@/types';

const dictionary = {
  en: {
    'panel.files': 'Files',
    'panel.snippets': 'Snippets',
    'panel.settings': 'Settings',

    'files.empty': 'Empty folder',
    'files.noFolder': 'No folder opened',
    'files.openFolder': 'Open folder',
    'files.close': 'Close',
    'files.newFile': 'New file',
    'files.newFolder': 'New folder',
    'files.refresh': 'Refresh',
    'files.collapseAll': 'Collapse all',
    'files.createFailed': 'Could not create “{name}” — it may already exist.',

    'snippets.placeholder': 'Save selection…',
    'snippets.save': 'Save',
    'snippets.empty.title': 'No snippets yet',
    'snippets.empty.body': 'Select text and save it above to reuse later.',
    'snippets.saved': 'Saved',

    'settings.appearance': 'Appearance',
    'settings.behavior': 'Behavior',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.theme.system': 'System',
    'settings.theme.light': 'Light',
    'settings.theme.cream': 'Cream',
    'settings.theme.dark': 'Dark',
    'settings.minimal': 'Minimal mode',
    'settings.minimal.desc': 'Hide the activity bar; settings move next to the editor switcher.',
    'settings.theme.editor': 'Color Editor',
    'settings.theme.reset': 'Reset',
    'settings.theme.export': 'Export theme',
    'settings.theme.import': 'Import theme',

    'status.words': 'words',
    'status.unsaved': 'unsaved',
    'status.editSource': 'Edit source',
    'status.showPreview': 'Preview',

    'context.open': 'Open',
    'context.openAsRoot': 'Open as Root',
    'context.rename': 'Rename',
    'context.delete': 'Delete',
    'context.reveal': 'Reveal in OS',
    'context.copyPath': 'Copy Path',
  },
  pt: {
    'panel.files': 'Arquivos',
    'panel.snippets': 'Snippets',
    'panel.settings': 'Configurações',

    'files.empty': 'Pasta vazia',
    'files.noFolder': 'Nenhuma pasta aberta',
    'files.openFolder': 'Abrir pasta',
    'files.close': 'Fechar',
    'files.newFile': 'Novo arquivo',
    'files.newFolder': 'Nova pasta',
    'files.refresh': 'Atualizar',
    'files.collapseAll': 'Recolher tudo',
    'files.createFailed': 'Não foi possível criar “{name}” — talvez já exista.',

    'snippets.placeholder': 'Salvar seleção…',
    'snippets.save': 'Salvar',
    'snippets.empty.title': 'Nenhum snippet ainda',
    'snippets.empty.body': 'Selecione um texto e salve acima para reutilizar depois.',
    'snippets.saved': 'Salvo',

    'settings.appearance': 'Aparência',
    'settings.behavior': 'Comportamento',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.theme.system': 'Sistema',
    'settings.theme.light': 'Claro',
    'settings.theme.cream': 'Creme',
    'settings.theme.dark': 'Escuro',
    'settings.minimal': 'Modo minimal',
    'settings.minimal.desc': 'Esconde a barra lateral; configurações vão para o lado do alternador.',
    'settings.theme.editor': 'Editor de cores',
    'settings.theme.reset': 'Resetar',
    'settings.theme.export': 'Exportar tema',
    'settings.theme.import': 'Importar tema',

    'status.words': 'palavras',
    'status.unsaved': 'não salvo',
    'status.editSource': 'Editar código',
    'status.showPreview': 'Visualizar',

    'context.open': 'Abrir',
    'context.openAsRoot': 'Abrir como raiz',
    'context.rename': 'Renomear',
    'context.delete': 'Excluir',
    'context.reveal': 'Mostrar no SO',
    'context.copyPath': 'Copiar caminho',
  },
  ja: {
    'panel.files': 'ファイル',
    'panel.snippets': 'スニペット',
    'panel.settings': '設定',

    'files.empty': '空のフォルダ',
    'files.noFolder': 'フォルダが開かれていません',
    'files.openFolder': 'フォルダを開く',
    'files.close': '閉じる',
    'files.newFile': '新規ファイル',
    'files.newFolder': '新規フォルダ',
    'files.refresh': '更新',
    'files.collapseAll': 'すべて折りたたむ',
    'files.createFailed': '「{name}」を作成できませんでした。すでに存在する可能性があります。',

    'snippets.placeholder': '選択範囲を保存…',
    'snippets.save': '保存',
    'snippets.empty.title': 'スニペットがまだありません',
    'snippets.empty.body': 'テキストを選択して上で保存すると、後で再利用できます。',
    'snippets.saved': '保存しました',

    'settings.appearance': '外観',
    'settings.behavior': '動作',
    'settings.language': '言語',
    'settings.theme': 'テーマ',
    'settings.theme.system': 'システム',
    'settings.theme.light': 'ライト',
    'settings.theme.cream': 'クリーム',
    'settings.theme.dark': 'ダーク',
    'settings.minimal': 'ミニマルモード',
    'settings.minimal.desc': 'アクティビティバーを非表示にします。設定はエディタ切替の隣に移動します。',
    'settings.theme.editor': 'カラーエディタ',
    'settings.theme.reset': 'リセット',
    'settings.theme.export': 'テーマをエクスポート',
    'settings.theme.import': 'テーマをインポート',

    'status.words': '語',
    'status.unsaved': '未保存',
    'status.editSource': 'ソースを編集',
    'status.showPreview': 'プレビュー',

    'context.open': '開く',
    'context.openAsRoot': 'ルートとして開く',
    'context.rename': '名前を変更',
    'context.delete': '削除',
    'context.reveal': 'OS で表示',
    'context.copyPath': 'パスをコピー',
  },
} as const;

export type TranslationKey = keyof typeof dictionary['en'];

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
}));

export function useT(): (key: TranslationKey) => string {
  const language = useI18nStore((s) => s.language);
  return (key) => dictionary[language][key] ?? dictionary.en[key] ?? key;
}
