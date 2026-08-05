# 🚀 Complete Deployment Guide: GitHub, Vercel & Render

Follow this step-by-step guide to push your codebase to **GitHub**, deploy the **React Web-OS frontend** to **Vercel**, and deploy the **Python FastAPI backend** to **Render**.

---

## 📌 Step 1: Push Codebase to GitHub

Run the following commands in your project terminal:

```bash
# 1. Initialize Git (if not already initialized)
git init

# 2. Add all files
git add .

# 3. Create a commit
git commit -m "feat: complete Jarvis Web-OS, mobile close button fixes, Vercel & Render deployment configs"

# 4. Set main branch name
git branch -M main

# 5. Link your GitHub repository (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/Jarvis.git

# 6. Push code to GitHub
git push -u origin main
```

> 💡 *Note: If `origin` already exists, run `git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/Jarvis.git` before pushing.*

---

## 📌 Step 2: Deploy Backend to Render (Python FastAPI)

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your **GitHub** account and select the **Jarvis** repository.
3. Configure the Web Service settings:
   - **Name**: `jarvis-backend` (or your preferred name)
   - **Root Directory**: `jarvis_system`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment Variables** section, add your production keys:
   - `JARVIS_ALLOWED_ORIGINS`: `*` (or your Vercel URL, e.g. `https://your-jarvis-app.vercel.app`)
   - `GROQ_API_KEY`: *(Your Groq API key)*
   - `GEMINI_API_KEY`: *(Your Gemini API key)*
   - `DEEPGRAM_API_KEY`: *(Your Deepgram API key)*
   - `SARVAM_API_KEY`: *(Your Sarvam API key)*
5. Click **Create Web Service**.
6. Once deployed, copy your backend live URL (e.g., `https://jarvis-backend.onrender.com`).

---

## 📌 Step 3: Deploy Frontend to Vercel (React + Vite Web-OS)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
2. Import your **Jarvis** repository from GitHub.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `jarvis_web`
4. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://jarvis-backend.onrender.com` *(Replace with your actual Render service URL)*
5. Click **Deploy**.
6. Vercel will build and deploy your Web-OS frontend live!

---

## ✨ Features Included in this Release

- 📱 **Mobile UI Fix**: Close/Exit button is now fully visible and touch-friendly in Professor Mode and across all Web-OS workspaces.
- 🌐 **Vercel SPA Routing**: `vercel.json` rewrite rule handles instant deep linking.
- ⚡ **Render Support**: `render.yaml` blueprint with CORS & WebSocket compatibility enabled.
- 🔄 **Real-Time WebSockets**: Seamless bi-directional communication between Vercel web client and Render FastAPI backend.
