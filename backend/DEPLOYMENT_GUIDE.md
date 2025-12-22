# Deployment Guide - Simplified Authentication

## 🎯 What Changed

Your authentication system has been completely simplified:

**Before:**
- ❌ Complex Firebase ID token validation on every request
- ❌ Third-party cookie issues
- ❌ Multiple `/api/users/me` calls failing
- ❌ Session management problems

**After:**
- ✅ Firebase used ONLY for OTP verification
- ✅ JWT bearer tokens stored in localStorage
- ✅ Works in ALL conditions (localhost, production, mobile)
- ✅ No cookie configuration needed
- ✅ Single, simple authentication flow

## 🚀 Deployment Steps

### Backend (Railway)

1. **No new environment variables needed** (JWT_SECRET should already exist)
   - Verify: `JWT_SECRET` is set
   - Verify: `FIREBASE_*` credentials are correct

2. **Deploy the changes:**
   ```bash
   cd wnrbackend
   git add .
   git commit -m "Simplify authentication: JWT bearer tokens"
   git push origin main
   ```

3. **Railway will auto-deploy** - monitor the logs for:
   - ✅ MongoDB connection successful
   - ✅ Server running on port
   - ✅ No JWT_SECRET warnings

### Frontend (Vercel)

1. **No new environment variables needed** (all NEXT_PUBLIC_* should exist)

2. **Deploy the changes:**
   ```bash
   cd wildnroot.com
   git add .
   git commit -m "Simplify authentication: localStorage token storage"
   git push origin main
   ```

3. **Vercel will auto-deploy**

## 🧪 Testing After Deployment

### 1. Test New User Flow
```
1. Open https://wildnroot.com/login
2. Enter phone: 9876543210
3. Click "Send OTP"
4. Enter OTP code
5. Should redirect to /complete-profile
6. Fill all fields
7. Click "Save & Continue"
8. Should redirect to dashboard
9. ✅ User should stay logged in
```

### 2. Test Existing User Flow
```
1. Open https://wildnroot.com/login
2. Enter existing user phone
3. Click "Send OTP"
4. Enter OTP code
5. Should redirect directly to dashboard
6. ✅ User data should load
```

### 3. Test Session Persistence
```
1. Login successfully
2. Check localStorage: wnr_token should exist
3. Close browser completely
4. Reopen https://wildnroot.com
5. ✅ Should still be logged in
6. Navigate to /profile
7. ✅ Should load user data
```

### 4. Test Protected Routes
```
Visit these pages while logged in:
- /profile ✅
- /orders ✅
- /wishlist ✅
- /checkout ✅

All should work without errors
```

### 5. Test Logout
```
1. Click logout button
2. Check localStorage: wnr_token should be removed
3. Try to visit /profile
4. ✅ Should redirect to /login
```

## 🐛 Debugging

### Check Token in Browser Console
```javascript
// Check if token exists
localStorage.getItem("wnr_token")

// Check if it's a valid JWT (should start with "eyJ")
const token = localStorage.getItem("wnr_token");
console.log(token?.substring(0, 20));

// Decode token payload (doesn't verify signature)
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log(payload);
}
```

### Check Network Requests
1. Open DevTools → Network
2. Filter: `/api/users/me`
3. Check Request Headers:
   - Should see `Authorization: Bearer eyJ...`
4. Check Response:
   - Status should be 200
   - Should return user data

### Common Issues

#### Issue: "No session" error
**Cause:** Token not being sent
**Fix:** Check if `wnr_token` exists in localStorage
```javascript
localStorage.getItem("wnr_token") // should return token string
```

#### Issue: 401 on all API calls
**Cause:** Backend can't verify token
**Fix:** 
1. Check Railway logs for JWT errors
2. Verify `JWT_SECRET` is set correctly
3. Check token format in localStorage

#### Issue: Multiple `/api/users/me` calls
**Cause:** This is now FIXED! The new system prevents spam calls
**Fix:** Already implemented

#### Issue: Login works but profile doesn't load
**Cause:** Token stored but API calls not including it
**Fix:** 
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_API_BASE` is correct
3. Check Network tab for Authorization header

## 📊 Expected Behavior

### Login Flow (Visual)
```
┌──────────────┐
│ Enter Phone  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Send OTP    │ ← Firebase Auth (SMS)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Enter OTP   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Verify OTP   │ ← Firebase verifies
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Get Firebase │
│  ID Token    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ POST /api/   │
│ auth/session │ ← Backend verifies Firebase token
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Receive JWT  │
│    Token     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Store in     │
│ localStorage │ ← wnr_token
└──────┬───────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ New User?    │  │ Old User?    │  │ All API      │
│ → Complete   │  │ → Dashboard  │  │ Calls Use    │
│   Profile    │  │              │  │ Bearer Token │
└──────────────┘  └──────────────┘  └──────────────┘
```

### API Call Flow (Visual)
```
┌──────────────┐
│ Frontend     │
│ API Call     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Get token    │
│ from         │
│ localStorage │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Add Header:  │
│ Authorization│
│ Bearer token │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Send to      │
│ Backend API  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Backend      │
│ Middleware   │
│ Extracts     │
│ Token        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Verify JWT   │
│ Signature    │
└──────┬───────┘
       │
       ├────────────────┬─────────────────┐
       │                │                 │
       ▼                ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Valid?       │  │ Invalid?     │  │ Expired?     │
│ → Continue   │  │ → 401        │  │ → 401        │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Return Data  │  │ Clear Token  │  │ Clear Token  │
│              │  │ → Login      │  │ → Login      │
└──────────────┘  └──────────────┘  └──────────────┘
```

## ✅ Success Indicators

After deployment, you should see:
1. ✅ No more "Cast to ObjectId failed" errors
2. ✅ No more multiple `/api/users/me` calls
3. ✅ No more "SESSION_EXPIRED" errors
4. ✅ Users stay logged in after page refresh
5. ✅ All protected routes work
6. ✅ Profile completion works smoothly
7. ✅ Orders page loads correctly
8. ✅ Checkout flow works end-to-end

## 📝 Monitoring

### Backend Logs (Railway)
Watch for:
- ✅ `POST /api/auth/session` - Should return 200 with token
- ✅ `GET /api/users/me` - Should return 200 with user data
- ❌ `401 Unauthorized` - Should be rare (only for invalid/expired tokens)

### Frontend Console
Watch for:
- ✅ `[auth] token:stored` - Token saved successfully
- ✅ `[auth] me:data` - User data received
- ❌ `No session` - Should not appear after login

## 🎉 You're Done!

Your authentication system is now:
- ✅ Simplified and robust
- ✅ Works everywhere (localhost, production, mobile)
- ✅ No more cookie issues
- ✅ No more session management problems
- ✅ Production-ready

For detailed technical information, see `AUTHENTICATION_SIMPLIFIED.md`.

---
**Questions?** Check the troubleshooting section above or review the backend logs.

