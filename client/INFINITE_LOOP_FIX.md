# 🔴 INFINITE REDIRECT LOOP - COMPLETE FIX

**Issue:** Login page continuously refreshes with nested returnTo parameters  
**Status:** ✅ FIXED

---

## 🔍 ROOT CAUSES FOUND

### **1. Middleware Redirect Loop**
`src/middleware.ts` was checking protected routes but `/login` is public.

**Fix:** Ensure `/login` stays in PUBLIC array and sanitize returnTo parameters.

### **2. 401 Auto-Redirect on Login Page**
`src/lib/fetchWithAuth.ts` and `src/lib/api.ts` were redirecting to `/login` even when already on `/login`.

**Fix:** Check `window.location.pathname` before redirecting.

### **3. UserContext Calling API Without Token**
`src/context/UserContext.tsx` had an `onAuthChanged` event listener that didn't check for token before calling `fetchMe()`.

**Fix:** Add `hasToken()` check before making API calls.

---

## ✅ FILES FIXED

### **1. `src/middleware.ts`**
```typescript
// ✅ Added better returnTo sanitization
if (dest.includes("/login")) {
  dest = "/";
}
```

### **2. `src/lib/fetchWithAuth.ts`**
```typescript
// ✅ Don't redirect if already on login page!
if (response.status === 401 && typeof window !== "undefined") {
  if (!window.location.pathname.startsWith("/login")) {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }
}
```

### **3. `src/lib/api.ts`**
```typescript
// ✅ Don't redirect if already on login page!
if (res.status === 401) {
  if (typeof window !== "undefined") {
    clearToken();
    
    if (!window.location.pathname.startsWith("/login")) {
      const returnTo = window.location.pathname + window.location.search;
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
    }
  }
  throw new Error("Unauthorized");
}
```

### **4. `src/context/UserContext.tsx`**
```typescript
// ✅ Check token before fetching in onAuthChanged listener
const onAuthChanged = () => {
  void (async () => {
    // Only fetch if token exists
    if (!hasToken()) {
      safeSetUser(null);
      return;
    }
    
    try {
      const me = await fetchMe(false);
      safeSetUser(me);
    } catch {
      // ignore
    }
  })();
};
```

---

## 🎯 HOW IT WORKS NOW

### **Unauthenticated User Flow:**
1. User visits `/profile` (protected)
2. Middleware checks: No `tt_present` cookie
3. Middleware redirects: `/login?returnTo=/profile`
4. User lands on `/login`
5. UserContext checks: No token → Skip API call ✅
6. Login page loads normally ✅
7. **No infinite loop!** ✅

### **API 401 Handling:**
1. API returns 401
2. `fetchWithAuth` checks: `window.location.pathname`
3. If already on `/login` → **Don't redirect** ✅
4. If on other page → Redirect to `/login?returnTo=...` ✅

---

## 🧪 TESTING

### **Test 1: Direct /login access**
```
http://localhost:3000/login
```
**Expected:** Loads normally, no redirects ✅

### **Test 2: Protected page without auth**
```
http://localhost:3000/profile
```
**Expected:** Redirects to `/login?returnTo=/profile` ✅

### **Test 3: Login with returnTo**
```
http://localhost:3000/login?returnTo=/orders
```
**Expected:**  
- Loads login page ✅
- After login → Redirects to `/orders` ✅

---

## ✅ PREVENTION CHECKLIST

To prevent infinite loops in the future:

- [x] ✅ All 401 handlers check if already on `/login`
- [x] ✅ Middleware sanitizes returnTo to avoid `/login` nesting
- [x] ✅ Event listeners check `hasToken()` before API calls
- [x] ✅ LoginClient sanitizes returnTo parameters
- [x] ✅ UserContext checks token before all API calls

---

## 📊 SUMMARY

**Files Changed:** 4  
**Issues Fixed:** 3 critical redirect loops  
**Status:** ✅ Ready to test  
**Impact:** Login page now stable

---

**Test now:** Refresh http://localhost:3000/login  
Should load without infinite refresh! 🚀

