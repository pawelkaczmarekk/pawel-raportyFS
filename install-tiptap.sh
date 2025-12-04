#!/bin/bash

echo "🚀 Installing Tiptap Email Editor packages..."
echo ""

# Fix npm cache permissions if needed
if [ ! -w "$HOME/.npm" ]; then
  echo "⚠️  npm cache permission issue detected. Fixing..."
  sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
fi

# Install packages
echo "📦 Installing Tiptap packages..."
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-link

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Tiptap packages installed successfully!"
  echo ""
  echo "🎉 You can now use the email editor modal in your app!"
  echo ""
  echo "📚 Read TIPTAP_INSTALLATION.md for more details."
else
  echo ""
  echo "❌ Installation failed. Please check the errors above."
  echo ""
  echo "Try running manually:"
  echo "npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-link"
fi





