# Package.json Update Required

## Add Dependency

Add `sqlite3` to your `package.json`:

```bash
npm install sqlite3 --save
```

Or manually add to `package.json`:

```json
{
  "dependencies": {
    "sqlite3": "^5.1.6",
    ...other dependencies
  }
}
```

Then run:
```bash
npm install
```

## Verify Installation

Test that sqlite3 is working:

```bash
node -e "const sqlite3 = require('sqlite3'); console.log('✓ sqlite3 ready')"
```

Expected output:
```
✓ sqlite3 ready
```

---

## Your package.json should have:

```json
{
  "name": "boltest-backend",
  "version": "1.0.0",
  "description": "BolTest Backend with Two-Way Attachment Sync",
  "dependencies": {
    "express": "^4.x.x",
    "sqlite3": "^5.1.6",
    "axios": "^1.x.x",
    "cors": "^2.x.x",
    ... other dependencies
  },
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    ... other scripts
  }
}
```

---

## Done! ✅

Now you can:
```bash
npm run dev
# Should see:
# [AttachmentSync] Initializing two-way sync system...
# [AttachmentSync] Database initialized
# [AttachmentSync] Routes registered: /api/sync/*
```
