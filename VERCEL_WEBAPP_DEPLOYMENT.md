# Vercel Web App Deployment Guide

## 🚀 Deploying via Vercel Dashboard (Web App)

### Step 1: Prepare Your Repository

1. **Push your code to GitHub/GitLab/Bitbucket:**
   ```bash
   git add .
   git commit -m "Configure for MongoDB Atlas and Vercel deployment"
   git push origin main
   ```

### Step 2: Connect to Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub/GitLab/Bitbucket account
3. Click **"New Project"**
4. **Import** your `backednwildiwin` repository
5. Select the `weldiwinbackend` folder as the root directory

### Step 3: Configure Project Settings

#### Framework Preset:
- **Framework**: Other
- **Root Directory**: `weldiwinbackend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Build & Development Settings:
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Development Command: npm run start:dev
```

### Step 4: Set Environment Variables

In the Vercel dashboard, go to **Settings → Environment Variables** and add:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://weldiwin:2020nono@weldiwinapp.oghejew.mongodb.net/weldiwin?retryWrites=true&w=majority&appName=WELDIWINAPP` | Production, Preview, Development |
| `JWT_SECRET` | `your-super-secure-jwt-secret-key-change-in-production-2024` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `NODE_ENV` | `development` | Development |

**Important**: 
- Click **"Add"** after each variable
- Select all environments (Production, Preview, Development) for each variable
- Make sure to use a strong, unique JWT_SECRET

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for the build process to complete
3. Vercel will provide you with a deployment URL

### Step 6: Test Your Deployment

Once deployed, test your API endpoints:

```bash
# Replace YOUR_VERCEL_URL with your actual deployment URL
curl https://YOUR_VERCEL_URL.vercel.app

# Test registration
curl -X POST https://YOUR_VERCEL_URL.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "role": "PARENT"
  }'

# Test login
curl -X POST https://YOUR_VERCEL_URL.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

## 🔧 Vercel Dashboard Configuration

### Project Settings to Verify:

1. **General Settings:**
   - Project Name: `weldiwin-backend` (or your preferred name)
   - Framework: Other
   - Root Directory: `weldiwinbackend`

2. **Build & Development Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Functions:**
   - Runtime: Node.js 18.x (default)
   - Memory: 1024 MB (default)
   - Max Duration: 30s (configured in vercel.json)

### Environment Variables Setup:

#### Required Variables:
```
MONGODB_URI = mongodb+srv://weldiwin:2020nono@weldiwinapp.oghejew.mongodb.net/weldiwin?retryWrites=true&w=majority&appName=WELDIWINAPP
JWT_SECRET = your-super-secure-jwt-secret-key-change-in-production-2024
NODE_ENV = production (for Production environment)
```

#### Optional Variables:
```
FRONTEND_URL = https://your-frontend-app.vercel.app (if you have a frontend)
PORT = 3000 (Vercel handles this automatically)
```

## 🚨 Common Issues & Solutions

### Issue: Build Fails
**Check:**
- Root directory is set to `weldiwinbackend`
- Build command is `npm run build`
- All dependencies are in package.json

### Issue: Function Timeout
**Solution:**
- Increase timeout in vercel.json (already configured to 30s)
- Optimize database queries

### Issue: Environment Variables Not Working
**Solutions:**
- Ensure variables are set for all environments
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Issue: MongoDB Connection Fails
**Solutions:**
- Verify MongoDB Atlas allows connections from 0.0.0.0/0
- Check connection string format
- Ensure database user has correct permissions

## 📊 Monitoring Your Deployment

### Vercel Dashboard Features:
1. **Functions Tab**: Monitor serverless function performance
2. **Analytics**: Track API usage and performance
3. **Logs**: View real-time function logs
4. **Deployments**: See deployment history and rollback if needed

### MongoDB Atlas Monitoring:
1. Check connection metrics in Atlas dashboard
2. Monitor database operations
3. Set up alerts for unusual activity

## 🔄 Continuous Deployment

Once connected to your Git repository:
- **Automatic deployments** on every push to main branch
- **Preview deployments** for pull requests
- **Rollback capability** to previous deployments

## ✅ Success Checklist

- [ ] Repository connected to Vercel
- [ ] Root directory set to `weldiwinbackend`
- [ ] Build command configured correctly
- [ ] All environment variables added
- [ ] Deployment successful
- [ ] API endpoints responding
- [ ] MongoDB Atlas connection working
- [ ] Authentication flow working

## 🎯 Next Steps After Deployment

1. **Custom Domain**: Add your custom domain in Vercel settings
2. **SSL Certificate**: Automatically provided by Vercel
3. **Analytics**: Enable Vercel Analytics for monitoring
4. **Alerts**: Set up MongoDB Atlas alerts
5. **Frontend Integration**: Connect your frontend to the deployed API

---

**Your API will be available at**: `https://your-project-name.vercel.app`

**Swagger Documentation** (if enabled): Available in development mode only for security

