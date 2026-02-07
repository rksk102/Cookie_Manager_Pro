# Cookie Manager Pro (Plasmo)

Advanced cookie management with whitelist/blacklist functionality and selective cookie clearing - Built with Plasmo Framework.

## Project Structure

```
Cookie_Manager_Pro_v1_0/
├── assets/              # Static assets (icons)
│   └── icon.svg        # Extension icon
├── components/          # React components
│   └── DomainManager.tsx  # Domain list management component
├── types/              # TypeScript type definitions
│   └── index.ts        # Shared types
├── popup.tsx           # Main popup UI (React)
├── background.ts       # Background service worker
├── store.ts            # Storage layer using @plasmohq/storage
├── style.css           # Global styles
├── package.json        # Project configuration
└── tsconfig.json       # TypeScript configuration
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder

## Features

- **Real-time Statistics**: View total and current site cookie counts
- **Whitelist Management**: Protect important domains from cookie clearing
- **Blacklist Management**: Target specific domains for cookie removal
- **Selective Clearing**: Clear cookies by site, all (except whitelist), or blacklist only
- **React-based UI**: Modern, responsive interface with smooth animations

## Plasmo Architecture

This project follows Plasmo's convention-based architecture:

- **Entry Points**: `popup.tsx` and `background.ts` are automatically detected
- **Storage**: Uses `@plasmohq/storage` for reactive state management
- **Manifest**: Automatically generated from `package.json` configuration
- **Hot Reload**: Changes are reflected immediately during development

## Development

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build for production
- `npm run package` - Package the extension
