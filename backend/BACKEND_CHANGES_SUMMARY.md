# ✅ BACKEND CHANGES - RECREATED

**Date:** November 5, 2025  
**Status:** Ready to commit

---

## 📋 FILES CHANGED

### **New File:**
- ✅ `src/middlewares/userAuth.ts` - Unified auth middleware

### **Modified Files:**
- ✅ `src/routes/users.ts` - Uses `requireUser`, changed to `req.userId`
- ✅ `src/routes/wishlist.ts` - Uses `requireUser`, already uses `req.userId`
- ✅ `src/routes/cart.ts` - Uses `requireUser`, changed to `req.userId`

---

## 🔍 WHAT WAS FIXED

### **Critical Bug:**
Routes were treating JWT Bearer tokens as Firebase ID tokens!

```typescript
// ❌ BEFORE - in wishlist.ts, cart.ts:
if (authHeader.startsWith("Bearer ")) {
  const idToken = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(idToken); // WRONG!
  // Tries to verify JWT as Firebase token → Fails!
}
```

### **The Fix:**
Created unified middleware that correctly verifies JWT tokens:

```typescript
// ✅ NOW - in userAuth.ts:
const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
// Correctly verifies JWT Bearer tokens!
```

---

## 🎯 CHANGES BREAKDOWN

### **1. Created `src/middlewares/userAuth.ts`**

```typescript
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    await connectDB();
    
    const token = extractToken(req); // Checks Authorization header first, then cookie
    if (!token) {
      return res.status(401).json({ message: "No session" });
    }

    // ✅ Verify JWT (NOT Firebase token!)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const uidStr = extractUid(decoded);
    
    if (!uidStr) {
      return res.status(401).json({ message: "Invalid session" });
    }

    // Set userId for downstream handlers
    req.userId = new Types.ObjectId(String(uidStr));
    req.userRole = decoded.role === "admin" ? "admin" : "user";
    
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
```

**Features:**
- ✅ Checks `Authorization: Bearer` header first
- ✅ Falls back to cookie for backward compatibility
- ✅ Correctly verifies JWT tokens
- ✅ Sets `req.userId` and `req.userRole`

---

### **2. Updated `src/routes/users.ts`**

**Before:**
```typescript
router.use(async (req, res, next) => {
  // 50+ lines of custom auth logic
  const token = req.cookies?.[COOKIE_NAME];
  // ... complex logic ...
  (req as any).session = decoded;
  next();
});

router.get("/me", async (req, res) => {
  const { uid } = (req as any).session as JWTPayload;
  const user = await User.findById(uid);
});
```

**After:**
```typescript
router.use(requireUser); // One line!

router.get("/me", async (req, res) => {
  const userId = req.userId!; // Set by requireUser
  const user = await User.findById(userId);
});
```

---

### **3. Updated `src/routes/wishlist.ts`**

**Before:**
```typescript
router.use(async (req, res, next) => {
  // Custom auth with Firebase token bug
  if (authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken); // ❌ WRONG!
  }
});
```

**After:**
```typescript
router.use(requireUser); // ✅ Correct JWT verification
```

---

### **4. Updated `src/routes/cart.ts`**

**Same fix as wishlist.ts:**
- Replaced 50+ lines of custom auth
- Changed `(req as any).session.uid` → `req.userId!`
- All 5 route handlers updated

---

## ✅ BENEFITS

| Before | After |
|--------|-------|
| Each route has custom auth (duplicate code) | One unified middleware |
| Bearer tokens treated as Firebase ID tokens | Bearer tokens treated as JWT (correct!) |
| `(req as any).session.uid` (untyped) | `req.userId!` (typed) |
| Creates new user on every request | Authenticates existing users |
| 200+ lines of auth code | 90 lines total |

---

## 🧪 TESTING

```bash
# Test with Bearer token
curl -H "Authorization: Bearer <jwt_token>" \
  http://localhost:5000/api/users/me

# Should return user data ✅
```

---

## 🚀 READY TO COMMIT

**Commit message:**
```bash
git add .
git commit -m "Fix: Unified auth middleware with correct JWT Bearer token handling

- Created src/middlewares/userAuth.ts for consistent auth across routes
- Fixed critical bug: routes were treating JWT Bearer tokens as Firebase ID tokens
- Updated users, wishlist, cart routes to use requireUser middleware  
- Standardized on req.userId instead of req.session.uid

FIXES: Bearer token authentication, prevents user creation on every request"
```

---

**Status:** ✅ All changes recreated and ready to commit!

