# BOLTEST - Azure DevOps Test Case Manager

**Made by Gon Shaul Lavan**

> It's simple to take the next step ☁️

A modern, cloud-based test case management tool that integrates with **Azure DevOps REST API v5.0** and TFS On-Premises.

## ✨ Features

- 🔗 **Azure DevOps API v5.0 Integration** - Full support for cloud and on-premises
- ✅ **Create Test Cases** - With steps, expected results, and attachments
- 📊 **Dashboard** - Real-time statistics and activity tracking
- 📋 **Test Case Management** - View, edit, and delete test cases
- 🎯 **API Executor** - Built-in REST API testing tool
- 📝 **Bulk Edit Mode** - Edit multiple test steps efficiently
- 📄 **Templates** - Pre-built test case templates
- 🎨 **Modern UI** - Beautiful gradient design with Tailwind CSS
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ (for local development)
- Azure DevOps account OR TFS On-Premises server
- Personal Access Token (PAT) with Test & Work Items permissions

### Installation

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   The app will automatically open at `http://localhost:3000`

## 🔐 Setup Azure DevOps Connection

### For Azure DevOps Cloud:

1. Go to [dev.azure.com](https://dev.azure.com)
2. Click your profile icon → **Personal access tokens**
3. Click **+ New Token**
4. Give it a name (e.g., "BOLTEST")
5. Select scopes:
   - ✅ **Test** (Read, write, & manage)
   - ✅ **Work Items** (Read, write, & manage)
6. Click **Create** and copy the token
7. In BOLTEST login page:
   - Organization URL: `https://dev.azure.com/yourorganization`
   - Project Name: Your project name
   - PAT Token: Paste your token

### For TFS On-Premises:

1. Access your TFS server
2. Go to **User Settings** → **Personal Access Tokens**
3. Create a new token with Test & Work Items permissions
4. In BOLTEST login page:
   - Select **TFS On-Premises**
   - Organization URL: `http://your-tfs-server:8080/tfs/DefaultCollection`
   - Project Name: Your project name
   - PAT Token: Paste your token

## 📚 API Version

This application uses **Azure DevOps REST API version 5.0**:

```javascript
api-version=5.0
```

Supported endpoints:
- `/wit/workitems` - Create/read/update/delete work items
- `/wit/wiql` - Query work items
- `/test/plans` - Get test plans
- And more...

## 📁 Project Structure

```
BOLTEST/
├── public/
│   ├── index.html          # Main HTML file
│   └── js/
│       ├── azure-api.js    # Azure DevOps API v5.0 integration
│       └── app.js          # Main application logic
├── package.json            # Dependencies
└── README.md              # This file
```

## 🎯 Usage

### Creating a Test Case

1. Click **Create Test Case** in the sidebar
2. Fill in the details:
   - Title
   - Description
   - State (Design/Active/Closed)
   - Priority (1-4)
   - Area Path & Iteration Path
   - Tags
3. Add test steps:
   - Click **➕ Add Step**
   - Enter Action and Expected Result
   - Optionally add attachments
4. Click **💾 Save Test Case to Azure DevOps**

### Using Templates

1. Click **📄 Templates** in sidebar
2. Choose a template:
   - User Login Flow
   - API Endpoint Test
   - Regression Test
3. Template will auto-fill the form

### Bulk Edit Mode

1. In create form, click **📝 Bulk Edit (Raw Mode)**
2. Paste formatted text or use manual edit
3. Supported formats:
   ```
   Step 1:
     Action: Click login button
     Expected: User is logged in
   
   Step 2:
     Action: Verify dashboard
     Expected: Dashboard displays correctly
   ```

### API Executor

1. Click **🎯 API Executor** in sidebar
2. Select method (GET/POST/PUT/DELETE)
3. Enter URL
4. Add headers and body (optional)
5. Click **🚀 Send**
6. View response with status, headers, and body

## 🔒 Security

- PAT tokens are stored in **session storage** only
- Never logged or transmitted to third parties
- Tokens are cleared when you close the browser
- Direct API calls to Azure DevOps (no proxy server)

## 🌐 Deployment

### Option 1: Static Hosting (Recommended)

Deploy to any static hosting service:

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=public
```

**Azure Static Web Apps:**
```bash
az staticwebapp create --name boltest --resource-group myResourceGroup
```

### Option 2: Simple HTTP Server

```bash
npm start
```

Then access at `http://localhost:3000`

## 🔁 TFS Proxy (Option A)

If you're using TFS on‑prem and encounter CORS/TLS issues, run a dedicated proxy on port 3001.

1. Set environment variables (optional):

```powershell
$env:TFS_URL = "https://tlvtfs03.ciosus.com/tfs/Epos"
$env:PAT_TOKEN = "<YOUR_PAT>"
```

2. Start the proxy:

```powershell
npm run proxy
```

3. Call the proxy from the frontend instead of TFS directly:

```js
fetch('http://localhost:3001/api/testcases', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify([
      { op: 'add', path: '/fields/System.Title', value: 'Proxy Test Case' },
      { op: 'add', path: '/fields/System.TeamProject', value: '<ProjectName>' }
   ])
});
```

### Option 3: GitHub Pages

1. Push to GitHub
2. Go to repository Settings → Pages
3. Select branch and `/public` folder
4. Save and get your URL

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Tailwind CSS (CDN)
- **Fonts**: Inter (Google Fonts)
- **API**: Azure DevOps REST API v5.0
- **Storage**: Session Storage (no backend needed)

## 📝 Features Breakdown

### Dashboard
- Total test cases count
- Active test cases count
- Design test cases count
- Recent activity feed

### Test Case Creation
- Drag & drop step reordering
- Image attachments
- Auto-save drafts
- Template support
- Bulk edit mode

### Test Case List
- View all test cases
- Filter by state/priority
- Delete test cases
- Real-time sync with Azure DevOps

### API Executor
- REST API testing
- Request templates
- Response visualization
- Copy/download responses

## 🤝 Support

For issues or questions:
- Check Azure DevOps API documentation
- Verify PAT token permissions
- Ensure network connectivity to Azure DevOps

## 📄 License

MIT License - Feel free to use and modify!

## 👨‍💻 Author

**Gon Shaul Lavan**

Made with ❤️ for QA teams everywhere

---

**BOLTEST** - *It's simple to take the next step* ☁️
