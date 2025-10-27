# Social Media Poster API

A RESTful API server for automated social media posting using signed-in browser sessions on VMs.

## 💡 What is This?

This API allows you to automate social media posts (Instagram, etc.) by leveraging browser sessions where you're already logged in. Perfect for VM deployments where you maintain signed-in accounts.

**How it works:**
1. Deploy on a Linux VM
2. Connect via RDP to sign into your social media accounts in the browser
3. Use the API to automate posts with those signed-in sessions
4. No credentials stored - uses your existing browser sessions

## 🏗️ Architecture

```
├── app.ts                          # Express application
├── index.ts                        # Server entry point
├── config.ts                       # Configuration manager
├── controllers/                    # Business logic
├── routes/                         # API endpoints
├── middleware/                     # Error handling
├── lib/                           # Core services
├── setup-linux.sh                  # Initial setup script
├── update-server.sh                # Update & restart script
├── fix-browser-display.sh          # Fix browser display issues
└── config-browser.sh               # Configure browser paths
```

## 🚀 Setup (Linux VM)

### Step 1: Run Setup Script

SSH into your Linux VM and run:

```bash
chmod +x setup-linux.sh
./setup-linux.sh
```

This installs:
- Node.js (LTS)
- Brave Browser
- System dependencies
- Server packages

### Step 2: Connect via RDP

Install and configure RDP on your VM:

```bash
# Install RDP server (Ubuntu/Debian)
sudo apt install xrdp
sudo systemctl enable xrdp
sudo systemctl start xrdp

# Allow RDP through firewall
sudo ufw allow 3389/tcp
```

Connect from your local machine:
- **Windows**: Use built-in Remote Desktop Connection
- **Mac**: Download Microsoft Remote Desktop from App Store
- **Linux**: Use Remmina or similar

### Step 3: Sign Into Social Media Accounts

Once connected via RDP:

1. Open Brave browser on the VM
2. Navigate to Instagram (or other platforms)
3. Sign in with "Remember me" checked
4. Close browser (session is saved)

### Step 4: Configure & Start API

```bash
# Start the server
npm run dev:watch

# In another terminal, configure browser paths (only needed once)
./config-browser.sh
```

The API is now ready at `http://localhost:3000`

**Note:** Browser configuration is automatically saved to `browser-config.json` and persists across restarts. You only need to run `config-browser.sh` once!

## 📡 API Endpoints

### Browser Configuration
Configure which browser session to use (saved persistently):

```bash
POST /api/browser/config     # Set config (saved to file)
GET  /api/browser/config     # Get current config
DELETE /api/browser/config   # Clear config (deletes file)
```

### Instagram Posting
Post to Instagram using signed-in session:

```bash
POST /api/instagram/post              # Upload image file
POST /api/instagram/post-with-path    # Use image from server path
```

## 📖 Usage Example

### Configure Browser (Run Once)

The `config-browser.sh` script does this automatically, or manually:

```bash
curl -X POST http://YOUR_VM_IP:3000/api/browser/config \
  -H "Content-Type: application/json" \
  -d '{
    "executablePath": "/usr/bin/brave-browser",
    "userDataDir": "/home/YOUR_USER/.config/BraveSoftware/Brave-Browser"
  }'
```

### Post to Instagram

```bash
curl -X POST http://YOUR_VM_IP:3000/api/instagram/post \
  -F "image=@photo.jpg" \
  -F "caption=Automated post from my VM! 🚀"
```

## 🎨 Features

- ✅ Uses existing browser sessions (no credential storage)
- ✅ VM-friendly deployment
- ✅ RESTful API with TypeScript
- ✅ File upload or server-side file path support
- ✅ Automated setup script for Linux
- ✅ Persistent browser configuration (survives restarts)
- ✅ CORS enabled for remote access
- ✅ Automatic file cleanup

## 📝 Integration Examples

### Python

```python
import requests

VM_URL = "http://your-vm-ip:3000"

# Post to Instagram
files = {'image': open('photo.jpg', 'rb')}
data = {'caption': 'Automated post! 🚀'}
response = requests.post(f'{VM_URL}/api/instagram/post', files=files, data=data)
print(response.json())
```

### Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const VM_URL = 'http://your-vm-ip:3000';

const form = new FormData();
form.append('image', fs.createReadStream('photo.jpg'));
form.append('caption', 'Automated post! 🚀');

const response = await axios.post(`${VM_URL}/api/instagram/post`, form, {
  headers: form.getHeaders()
});
console.log(response.data);
```

### cURL

```bash
curl -X POST http://your-vm-ip:3000/api/instagram/post \
  -F "image=@photo.jpg" \
  -F "caption=Automated post! 🚀"
```

## 📊 API Response Format

### Success
```json
{
  "success": true,
  "message": "Posted to Instagram successfully",
  "data": {
    "caption": "Automated post! 🚀",
    "imageSize": 1234567
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Browser configuration not set"
}
```

## 🔐 Security Considerations

- **No authentication by default** - Add auth middleware if exposing publicly
- **CORS enabled** - Restrict origins in production
- **No credential storage** - Uses browser sessions only
- **Firewall rules** - Use SSH tunneling or VPN for secure access

## 🚦 Best Practices

1. **VM Setup**: Use a dedicated VM for each social media account
2. **RDP Security**: Use strong passwords and consider SSH tunneling
3. **Rate Limiting**: Don't post too frequently (wait 1-2 minutes between posts)
4. **File Handling**: Clean up uploaded files (handled automatically)
5. **Browser Sessions**: Keep browser logged in with "Remember me"

## 🐛 Troubleshooting

### Cannot connect via RDP
```bash
# Check if xrdp is running
sudo systemctl status xrdp

# Check firewall
sudo ufw status
```

### Browser configuration not set
```bash
# Run the config script
./config-browser.sh

# Or manually configure
curl -X POST http://localhost:3000/api/browser/config -H "Content-Type: application/json" -d '{"executablePath":"/usr/bin/brave-browser","userDataDir":"/home/YOUR_USER/.config/BraveSoftware/Brave-Browser"}'
```

### Browser fails to launch (ERROR: Failed to launch browser)
```bash
# Install virtual display support
./fix-browser-display.sh

# Or manually install Xvfb
sudo apt-get install -y xvfb
xvfb-run --auto-servernum npm start
```

### Instagram session expired
- Connect via RDP
- Open Brave browser
- Log into Instagram again with "Remember me" checked

### Port 3000 already in use
```bash
# Change port in the server or kill existing process
lsof -ti:3000 | xargs kill -9
```

## 🔧 Server Management

### Update Server

To update the server with latest code:

```bash
chmod +x update-server.sh
./update-server.sh
```

This script will:
- Stop the running server
- Pull latest code (if using git)
- Install dependencies
- Rebuild the project
- Restart the server

### Fix Browser Display Issues

If you get "Failed to launch browser" errors:

```bash
chmod +x fix-browser-display.sh
./fix-browser-display.sh
```

This installs Xvfb (virtual display) so the browser can run without GUI/RDP.

### Development

```bash
# Development with auto-reload
npm run dev:watch

# Build for production
npm run build

# Run production
npm start
```

## 📝 Notes

- Built with Express, TypeScript, and Puppeteer
- Tested on Ubuntu 20.04/22.04 LTS
- Works with Brave, Chrome, or Chromium
- Can be extended for other social media platforms

---

**Need help?** Check the setup script logs or open an issue.

