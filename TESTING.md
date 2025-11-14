# WeldiWin Backend Testing Guide

## ✅ What We've Verified So Far:
1. **Build Process**: ✅ Successfully compiles without errors
2. **MongoDB Atlas Configuration**: ✅ Updated and TypeScript errors fixed
3. **Environment Setup**: ✅ Environment files created

## 🧪 Complete Testing Checklist

### 1. Local Development Testing

#### Start the Development Server:
```bash
cd weldiwinbackend
npm run start:dev
```

#### Test Basic Connectivity:
```bash
# Test if server is running
curl http://localhost:3005

# Should return: "Hello World!"
```

#### Test API Endpoints:

**Register a new user:**
```bash
curl -X POST http://localhost:3005/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "role": "PARENT"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3005/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

**Test Protected Endpoint (use token from login):**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3005/users/profile
```

### 2. MongoDB Atlas Connection Testing

#### Check MongoDB Connection:
- Look for connection logs in the console when starting the server
- Successful registration/login confirms database connectivity
- Check your MongoDB Atlas dashboard for new connections

#### Verify Data in Atlas:
1. Go to MongoDB Atlas dashboard
2. Browse Collections → weldiwin database
3. Check `users` collection for test data

### 3. Production Build Testing

#### Build for Production:
```bash
npm run build
```

#### Test Production Build Locally:
```bash
npm run start:prod
```

### 4. Vercel Deployment Testing

#### Deploy to Vercel:
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel --prod
```

#### Set Environment Variables in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `MONGODB_URI`: `mongodb+srv://weldiwin:2020nono@weldiwinapp.oghejew.mongodb.net/weldiwin?retryWrites=true&w=majority&appName=WELDIWINAPP`
   - `JWT_SECRET`: `your-super-secure-jwt-secret-key-change-in-production`
   - `NODE_ENV`: `production`

#### Test Deployed API:
```bash
# Replace YOUR_VERCEL_URL with your actual Vercel URL
curl https://YOUR_VERCEL_URL.vercel.app

# Test registration on production
curl -X POST https://YOUR_VERCEL_URL.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prod@example.com",
    "password": "prodpass123",
    "firstName": "Prod",
    "lastName": "User",
    "role": "PARENT"
  }'
```

### 5. MongoDB Atlas Security Checklist

#### Verify Network Access:
1. MongoDB Atlas → Network Access
2. Ensure `0.0.0.0/0` is allowed (for Vercel) OR add Vercel's IP ranges
3. Check that your connection string is correct

#### Database Access:
1. MongoDB Atlas → Database Access
2. Verify user `weldiwin` has read/write permissions
3. Confirm password is correct

### 6. API Testing with Postman/Insomnia

#### Import this collection for comprehensive testing:

**Base URL**: `http://localhost:3005` (local) or `https://your-app.vercel.app` (production)

**Endpoints to test:**
1. `POST /auth/register` - User registration
2. `POST /auth/login` - User login
3. `GET /users/profile` - Get user profile (requires auth)
4. `GET /users` - Get all users (requires auth)
5. `POST /children` - Create child (requires parent auth)
6. `GET /children` - Get children (requires auth)

### 7. Error Scenarios to Test

#### Test Error Handling:
```bash
# Test missing environment variable (should fail gracefully)
# Test invalid MongoDB URI
# Test invalid JWT token
# Test unauthorized access
```

### 8. Performance Testing

#### Load Testing (optional):
```bash
# Install artillery for load testing
npm install -g artillery

# Create artillery config and test
artillery quick --count 10 --num 5 http://localhost:3005
```

## 🚨 Common Issues & Solutions

### Issue: "MONGODB_URI environment variable is required"
**Solution**: Ensure `.env` file exists with correct MongoDB URI

### Issue: "Cannot connect to MongoDB"
**Solutions**:
- Check MongoDB Atlas network access settings
- Verify connection string format
- Ensure database user has correct permissions

### Issue: Vercel deployment fails
**Solutions**:
- Ensure all environment variables are set in Vercel
- Check build logs in Vercel dashboard
- Verify `vercel.json` configuration

### Issue: CORS errors in production
**Solution**: Set `FRONTEND_URL` environment variable in Vercel

## ✅ Success Indicators

- ✅ Server starts without errors
- ✅ MongoDB connection established
- ✅ User registration works
- ✅ JWT authentication works
- ✅ Protected routes require authentication
- ✅ Vercel deployment successful
- ✅ Production API responds correctly

## 📊 Monitoring

### Check these regularly:
1. MongoDB Atlas metrics and alerts
2. Vercel function logs and analytics
3. API response times
4. Error rates

---

**Next Steps After Testing:**
1. Set up monitoring and alerts
2. Configure production logging
3. Set up CI/CD pipeline
4. Add rate limiting
5. Set up backup strategies

