'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface EmailEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (content: string) => void;
  initialContent: string;
  subject: string;
  recipientEmail: string;
  isSending: boolean;
}

export default function EmailEditorModal({
  isOpen,
  onClose,
  onSend,
  initialContent,
  subject,
  recipientEmail,
  isSending,
}: EmailEditorModalProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] max-w-none px-4 py-3 text-black prose-headings:text-black prose-p:text-black prose-li:text-black prose-strong:text-black',
      },
    },
    immediatelyRender: false,
  });

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (editor) {
      const html = editor.getHTML();
      onSend(html);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>✉️</span>
              <span>Edytuj email przed wysłaniem</span>
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Do: <span className="font-medium">{recipientEmail}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors disabled:opacity-50"
            aria-label="Zamknij"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Subject */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Temat:</span> {subject}
          </p>
        </div>

        {/* Toolbar */}
        {editor && (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex flex-wrap gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('bold')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Pogrubienie (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('italic')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Kursywa (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('underline')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Podkreślenie (Ctrl+U)"
            >
              <u>U</u>
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-1 my-auto"></div>
            
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Nagłówek 1"
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Nagłówek 2"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Nagłówek 3"
            >
              H3
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-1 my-auto"></div>
            
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('bulletList')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Lista punktowana"
            >
              •  Lista
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('orderedList')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Lista numerowana"
            >
              1. Lista
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-1 my-auto"></div>
            
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                editor.isActive('blockquote')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Cytat"
            >
              " Cytat
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-1 my-auto"></div>
            
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Cofnij (Ctrl+Z)"
            >
              ↶ Cofnij
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Ponów (Ctrl+Y)"
            >
              ↷ Ponów
            </button>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto bg-white">
          <EditorContent editor={editor} className="h-full" />
        </div>

        {/* Footer with actions */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <span>💡</span>
              <span>Edytuj treść, a następnie kliknij "Wyślij email"</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anuluj
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Wysyłanie...</span>
                </>
              ) : (
                <>
                  <span>📧</span>
                  <span>Wyślij email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}







