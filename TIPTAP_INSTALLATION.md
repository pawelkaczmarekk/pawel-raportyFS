# Tiptap Email Editor - Installation Guide

## 📦 Installation Required

Before you can use the new email editor with Tiptap, you need to install the required packages.

### Step 1: Fix npm cache (if needed)

If you encounter npm cache permission errors, run:

```bash
sudo chown -R 501:20 "/Users/macminim4/.npm"
```

### Step 2: Install Tiptap packages

Run this command in the `partner-reports` directory:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-link
```

Or with yarn:

```bash
yarn add @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-link
```

## 📋 Package Details

- **@tiptap/react** - Core Tiptap editor for React
- **@tiptap/starter-kit** - Basic editing features (bold, italic, lists, etc.)
- **@tiptap/extension-color** - Text color support
- **@tiptap/extension-text-style** - Text styling support
- **@tiptap/extension-underline** - Underline text
- **@tiptap/extension-link** - Link support

## ✨ Features Implemented

### 1. **EmailEditorModal Component**
   - Beautiful modal popup for email editing
   - Rich text editor with Tiptap
   - Full HTML email editing support
   - Real-time preview

### 2. **Toolbar Features**
   - **Text Formatting**: Bold, Italic, Underline
   - **Headings**: H1, H2, H3
   - **Lists**: Bullet lists, Numbered lists
   - **Blockquotes**: Quote formatting
   - **Undo/Redo**: Full history support

### 3. **Integration with All Report Types**
   - ✅ Weekly Reports
   - ✅ Monthly Reports
   - ✅ Opinion Requests

### 4. **New API Endpoints**

#### Weekly Reports (Already existed)
- `POST /api/reports/weekly/generate` - Generate report preview
- `POST /api/reports/weekly/send` - Send edited report

#### Monthly Reports (New)
- `POST /api/reports/monthly/generate` - Generate report preview
- `POST /api/reports/monthly/send` - Send edited report

#### Opinion Requests (New)
- `POST /api/reports/opinion/generate` - Generate email preview
- `POST /api/reports/opinion/send` - Send edited email

## 🎨 UI/UX Improvements

1. **Two-Step Process**:
   - Step 1: Generate report (AI creates content)
   - Step 2: Review and edit in modal before sending

2. **Visual Feedback**:
   - Success messages after generation
   - Loading states
   - Clear call-to-action buttons

3. **Modal Design**:
   - Full-screen modal overlay
   - Gradient header with email details
   - Subject line display
   - Recipient email display
   - Cancel and Send buttons

## 🚀 Usage

1. Fill in the report form (Weekly/Monthly/Opinion)
2. Click "Wygeneruj podgląd" to generate AI content
3. Click "Otwórz edytor i wyślij raport" to open the editor modal
4. Edit the content using the rich text editor
5. Click "Wyślij email" to send

## 🔧 Customization

The editor can be customized in `components/EmailEditorModal.tsx`:
- Add more toolbar buttons
- Change editor extensions
- Modify styling
- Add custom features

## 📝 File Structure

```
partner-reports/
├── components/
│   ├── EmailEditorModal.tsx       # Main editor modal component
│   ├── EmailEditorStyles.css      # Tiptap editor styles
│   ├── WeeklyReportTab.tsx        # Updated with modal
│   ├── MonthlyReportTab.tsx       # Updated with modal
│   └── OpinionRequestTab.tsx      # Updated with modal
├── app/
│   ├── api/
│   │   └── reports/
│   │       ├── weekly/
│   │       │   ├── generate/route.ts
│   │       │   └── send/route.ts
│   │       ├── monthly/
│   │       │   ├── generate/route.ts  # NEW
│   │       │   └── send/route.ts      # NEW
│   │       └── opinion/
│   │           ├── generate/route.ts  # NEW
│   │           └── send/route.ts      # NEW
│   └── layout.tsx                # Updated with CSS import
└── TIPTAP_INSTALLATION.md        # This file
```

## 🐛 Troubleshooting

### Issue: Tiptap packages not found
**Solution**: Make sure you've run the npm install command above

### Issue: Styles not loading
**Solution**: Check that `EmailEditorStyles.css` is imported in `app/layout.tsx`

### Issue: Modal not opening
**Solution**: Check browser console for errors, ensure all Tiptap packages are installed

## 📚 Resources

- [Tiptap Documentation](https://tiptap.dev)
- [Tiptap React Guide](https://tiptap.dev/installation/react)
- [Tiptap Extensions](https://tiptap.dev/extensions)





