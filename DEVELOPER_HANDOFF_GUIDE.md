# Website Development & Deployment Guide

This guide covers daily development workflows, content updates via Supabase, and deployment procedures for **INI Network** and **Vngle** websites.

---

## 1. Content Management: Removing/Updating Contacts (Supabase)

Contact information is managed dynamically via Supabase. **No code changes or site redeployments are required** to update or remove contacts.

### Steps to Remove a Contact:
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard) and select the **`ini.network`** project (see handoff credentials for access).
2. Click on **Table Editor** in the left sidebar.
3. Select the **`contacts`** table.
4. Search for the contact by name using the search bar.
5. Select the row (check the box on the far left) and click **Delete row** (or hit the `Delete` key).
6. Confirm deletion. The live website automatically updates immediately without redeployment.

---

## 2. Standard Development Workflow (INI Network)

Use this workflow for regular feature development, bug fixes, and style updates.

### Prerequisites
- **Node.js** (LTS version recommended)
- **Git**
- **Code Editor** (e.g., Antigravity IDE, Cursor, or VS Code)

### Setup & Local Testing
```bash
# 1. Clone the repository (first time only)
git clone <repo-url>
cd <repo-folder>

# 2. Pull latest changes before starting work
git pull

# 3. Install dependencies (if newly cloned or package.json changed)
npm install

# 4. Launch local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to verify changes.

### Saving & Pushing Changes
Once tested and verified locally:
```bash
# Stage changes
git add .

# Commit with a descriptive message
git commit -m "Your descriptive commit message"

# Push to GitHub
git push
```
> Pushing to `main` on GitHub triggers an automatic deployment on Vercel for standard configurations.

---

## 3. Vngle Website Deployment (Vercel CLI Workaround)

### Why this is needed:
Deploying across multiple personal or shared accounts without a paid Vercel Pro team seat can cause authorization errors. To bypass this, we use the **Vercel CLI** while temporarily disconnecting local Git metadata so Vercel does not block the deployment based on Git owner identity.

### Initial Tool Setup
If not already installed, install the Vercel CLI and log in:
```bash
npm install -g vercel
vercel login
```

### Deployment Steps (Run in this exact sequence)

1. **Push your changes to GitHub first:**
   ```bash
   git add .
   git commit -m "Your update description"
   git push
   ```

2. **Temporarily hide your `.git` folder:**
   ```bash
   mv .git .git-temp
   ```

3. **Deploy using the Vercel CLI:**
   - **For Preview Deployment:**
     ```bash
     vercel
     ```
   - **For Production Deployment:**
     ```bash
     vercel --prod
     ```
   *(Note: If the command stalls or fails on the first run, run it a second time).*

4. **RESTORE your `.git` folder immediately (CRITICAL):**
   ```bash
   mv .git-temp .git
   ```
   > ⚠️ **Important:** Do not forget this step! Restoring `.git` is essential for standard Git tracking and future commits to work.

5. **Verify Deployment:**
   - Check the live URL output in your terminal.
   - Or open the [Vercel Dashboard](https://vercel.com/dashboard) and inspect the **Deployments** tab.

---

## 4. Quick Command Reference

| Action | Command | When to Use |
| :--- | :--- | :--- |
| **Get latest changes** | `git pull` | Start of each work session |
| **Run local site** | `npm run dev` | Local development (`localhost:3000`) |
| **Commit updates** | `git add . && git commit -m "..."` | Saving your work |
| **Push code** | `git push` | Syncing to GitHub / triggering INI deploy |
| **Hide git folder** | `mv .git .git-temp` | Before running Vngle Vercel CLI |
| **Deploy preview** | `vercel` | Vngle preview deployment |
| **Deploy production**| `vercel --prod` | Vngle production deployment |
| **Restore git folder**| `mv .git-temp .git` | Immediately after Vercel CLI run |

---

## 5. Further References
- [`README.md`](/INI-platform/README.md) – Project overview and component architecture.
- [`INI_SITE_DEVELOPER_GUIDE.md`](/INI-platform/INI_SITE_DEVELOPER_GUIDE.md) – Next.js App Router rules, Tailwind styling philosophy, and third-party integrations.
