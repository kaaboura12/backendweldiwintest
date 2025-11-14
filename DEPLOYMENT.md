# WeldiWin Backend - Vercel Deployment Guide

## MongoDB Atlas Setup

Your MongoDB Atlas connection string has been configured:
```
mongodb+srv://weldiwin:2020nono@weldiwinapp.oghejew.mongodb.net/weldiwin?retryWrites=true&w=majority&appName=WELDIWINAPP
```

## Vercel Environment Variables

Set these environment variables in your Vercel dashboard:

### Required Variables:
1. **MONGODB_URI**: `mongodb+srv://weldiwin:2020nono@weldiwinapp.oghejew.mongodb.net/weldiwin?retryWrites=true&w=majority&appName=WELDIWINAPP`
2. **JWT_SECRET**: `your-super-secure-jwt-secret-key-change-in-production`
3. **NODE_ENV**: `production`
4. **FRONTEND_URL**: `https://your-frontend-domain.vercel.app` (optional, for CORS)

### How to set environment variables in Vercel:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with its corresponding value

## Deployment Steps

1. **Build the project locally to test**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   npx vercel --prod
   ```

3. **Or connect your GitHub repository to Vercel for automatic deployments**

## Important Notes

- Swagger documentation is disabled in production for security
- CORS is configured to accept your frontend URL in production
- MongoDB connection includes proper retry and write concern settings for Atlas
- The application will run on the port provided by Vercel (usually 3000 in serverless)

## File Changes Made

1. **app.module.ts**: Updated MongoDB connection to use Atlas URI with proper options
2. **main.ts**: Added production-specific configurations (CORS, Swagger conditional)
3. **vercel.ts**: Updated serverless handler with proper validation pipes
4. **vercel.json**: Configured to use the built NestJS application
5. **env.example**: Created example environment file

## Security Recommendations

1. Change the JWT_SECRET to a strong, unique value
2. Ensure your MongoDB Atlas cluster has proper IP whitelist settings
3. Consider adding rate limiting for production
4. Monitor your MongoDB Atlas usage and set up alerts

## Troubleshooting

- If deployment fails, check the Vercel function logs
- Ensure all environment variables are set correctly
- Verify MongoDB Atlas connection string is accessible from Vercel's IP ranges
- Check that your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0) or add Vercel's IP ranges

