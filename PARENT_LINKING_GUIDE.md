# Parent Linking via QR Code - Complete Guide

## 📱 Overview

The QR code-based parent linking feature allows a second parent (e.g., mom) to easily link themselves to a child by simply scanning the child's QR code. This eliminates the need for manual ID entry and provides a seamless onboarding experience.

## ✨ Key Features

✅ **Easy Linking**: Mom scans child's QR code → Instant access  
✅ **Automatic Room Creation**: Chat room created automatically  
✅ **Equal Access**: Both parents get full access to child info  
✅ **Shared Notifications**: Both receive danger zone alerts  
✅ **Simple Unlinking**: Parents can unlink themselves anytime  
✅ **Security**: Only verified parents can link  

## 🎯 Use Case: Mom Links to Child

### Scenario
Dad creates an account and registers his child. Mom wants to be added as a second parent to receive notifications and monitor the child.

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────┐
│  1. Dad creates account and registers child         │
│     Child gets unique QR code: "a1b2c3d4e5f6..."   │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  2. Mom creates her own parent account              │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  3. Dad shares child's QR code with Mom             │
│     (via app, screenshot, or display QR in app)     │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  4. Mom scans QR code in her app                    │
│     POST /children/link-parent                      │
│     { "qrCode": "a1b2c3d4e5f6..." }                │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  ✅ Mom is now linked!                              │
│  - Child appears in her children list               │
│  - Chat room created                                │
│  - Receives all notifications                       │
│  - Can create danger zones                          │
└─────────────────────────────────────────────────────┘
```

## 🔧 API Endpoints

### 1. Link Parent by QR Code

**Endpoint:** `POST /children/link-parent`  
**Role:** PARENT only  
**Description:** Link yourself to a child by scanning their QR code

#### Request
```bash
POST /children/link-parent
Authorization: Bearer MOM_TOKEN
Content-Type: application/json

{
  "qrCode": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

#### Success Response (200)
```json
{
  "message": "Successfully linked to child",
  "child": {
    "_id": "654abc123def456789012345",
    "firstName": "Tommy",
    "lastName": "Doe",
    "parent": {
      "_id": "parent_dad_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "dad@example.com"
    },
    "linkedParents": [
      {
        "_id": "parent_mom_id",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "mom@example.com"
      }
    ],
    "qrCode": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "location": {
      "lat": 33.5731,
      "lng": -7.6598,
      "updatedAt": "2025-11-15T10:30:00.000Z"
    },
    "status": "ACTIVE",
    "createdAt": "2025-11-15T09:00:00.000Z",
    "updatedAt": "2025-11-15T10:30:00.000Z"
  }
}
```

#### Error Responses

**404 - QR Code Not Found**
```json
{
  "statusCode": 404,
  "message": "Child with this QR code not found",
  "error": "Not Found"
}
```

**403 - Already Main Parent**
```json
{
  "statusCode": 403,
  "message": "You are already the main parent of this child",
  "error": "Forbidden"
}
```

**403 - Already Linked**
```json
{
  "statusCode": 403,
  "message": "You are already linked to this child",
  "error": "Forbidden"
}
```

---

### 2. Unlink Self from Child

**Endpoint:** `DELETE /children/:id/unlink-parent`  
**Role:** PARENT (self-unlink only)  
**Description:** Remove yourself from a child's linked parents

#### Request
```bash
DELETE /children/654abc123def456789012345/unlink-parent
Authorization: Bearer MOM_TOKEN
```

#### Success Response (200)
```json
{
  "message": "Successfully unlinked from child"
}
```

#### Error Responses

**403 - Cannot Unlink Main Parent**
```json
{
  "statusCode": 403,
  "message": "Cannot unlink main parent. Only linked parents can be removed.",
  "error": "Forbidden"
}
```

**403 - Not Linked**
```json
{
  "statusCode": 403,
  "message": "You are not linked to this child",
  "error": "Forbidden"
}
```

---

### 3. Unlink Specific Parent (Admin/Main Parent)

**Endpoint:** `DELETE /children/:childId/unlink-parent/:parentId`  
**Role:** Main PARENT or ADMIN  
**Description:** Remove a specific linked parent from a child

#### Request
```bash
DELETE /children/654abc123def456789012345/unlink-parent/parent_mom_id
Authorization: Bearer DAD_TOKEN
```

#### Success Response (200)
```json
{
  "message": "Successfully unlinked parent from child"
}
```

#### Error Responses

**403 - Not Authorized**
```json
{
  "statusCode": 403,
  "message": "Only the main parent or admin can unlink other parents",
  "error": "Forbidden"
}
```

**403 - Cannot Unlink Main Parent**
```json
{
  "statusCode": 403,
  "message": "Cannot unlink main parent",
  "error": "Forbidden"
}
```

---

## 📋 Complete Example Workflow

### Setup Phase

```bash
# ============================================
# STEP 1: Dad Creates Account & Child
# ============================================

# Dad registers
POST /auth/register
Content-Type: application/json
{
  "email": "dad@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "PARENT"
}
# Response: { "access_token": "dad_token_xyz..." }

# Dad logs in (if not auto-logged)
POST /auth/login
{
  "email": "dad@example.com",
  "password": "SecurePass123!"
}
# Response: { "access_token": "dad_token_xyz..." }

# Dad creates child
POST /children
Authorization: Bearer dad_token_xyz
Content-Type: application/json
{
  "firstName": "Tommy",
  "lastName": "Doe"
}
# Response includes qrCode: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

# ============================================
# STEP 2: Mom Creates Account
# ============================================

# Mom registers
POST /auth/register
Content-Type: application/json
{
  "email": "mom@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "PARENT"
}
# Response: { "access_token": "mom_token_abc..." }

# ============================================
# STEP 3: Mom Scans QR Code to Link
# ============================================

# Mom links to child using QR code
POST /children/link-parent
Authorization: Bearer mom_token_abc
Content-Type: application/json
{
  "qrCode": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
# Response: { "message": "Successfully linked to child", "child": {...} }

# ============================================
# STEP 4: Verify - Mom Can Now See Child
# ============================================

# Mom views her children
GET /children
Authorization: Bearer mom_token_abc
# Response: [{ "firstName": "Tommy", ... }]

# Mom views specific child
GET /children/654abc123def456789012345
Authorization: Bearer mom_token_abc
# Response: Full child details with location, etc.

# ============================================
# STEP 5: Both Parents Get Notifications
# ============================================

# When child location updates (triggers danger zone check)
PATCH /children/654abc123def456789012345/location
Authorization: Bearer child_or_parent_token
Content-Type: application/json
{
  "lat": 33.5731,
  "lng": -7.6598
}

# ✅ Both Dad AND Mom receive:
# - Email notification (if child enters/exits danger zone)
# - SMS notification (if configured)

# ============================================
# STEP 6: Mom Can Create Danger Zones
# ============================================

# Mom creates a danger zone
POST /danger-zones
Authorization: Bearer mom_token_abc
Content-Type: application/json
{
  "name": "School Area",
  "center": { "lat": 33.5731, "lng": -7.6598 },
  "radiusMeters": 300,
  "notifyOnEntry": true,
  "notifyOnExit": true
}
# Response: Created danger zone

# ============================================
# OPTIONAL: Unlink Later
# ============================================

# Mom unlinks herself
DELETE /children/654abc123def456789012345/unlink-parent
Authorization: Bearer mom_token_abc
# Response: { "message": "Successfully unlinked from child" }

# OR Dad removes Mom
DELETE /children/654abc123def456789012345/unlink-parent/parent_mom_id
Authorization: Bearer dad_token_xyz
# Response: { "message": "Successfully unlinked parent from child" }
```

---

## 🔐 Security & Permissions

### What Linked Parents CAN Do

✅ **View Child:**
- See child in their children list (`GET /children`)
- View child details (`GET /children/:id`)
- See child's current location

✅ **Update Child:**
- Update child information (`PATCH /children/:id`)
- Update child location (`PATCH /children/:id/location`)

✅ **Danger Zones:**
- Create danger zones for the child
- View all danger zones
- Update/delete their own danger zones
- Receive entry/exit notifications

✅ **Messaging:**
- Chat with the child (separate room for each parent)

✅ **Self-Management:**
- Unlink themselves from the child

### What Linked Parents CANNOT Do

❌ **Delete Child:** Only the main parent can delete
❌ **Change Main Parent:** Main parent is permanent
❌ **Unlink Other Parents:** Only main parent/admin can
❌ **View Other Parents' Private Info:** Privacy protected

---

## 🎨 UI/UX Recommendations

### For Mobile App

#### 1. QR Code Display (Dad's App)
```
┌───────────────────────────────┐
│  Tommy's Profile              │
│  ────────────────────────────│
│                               │
│  ┌─────────────────────────┐ │
│  │  [QR CODE IMAGE]        │ │
│  │                         │ │
│  │                         │ │
│  └─────────────────────────┘ │
│                               │
│  Share this QR code with      │
│  family members to link them  │
│                               │
│  [Share QR Code]  [Copy Code]│
└───────────────────────────────┘
```

#### 2. QR Scanner (Mom's App)
```
┌───────────────────────────────┐
│  Link to Child                │
│  ────────────────────────────│
│                               │
│  ┌─────────────────────────┐ │
│  │                         │ │
│  │   [CAMERA VIEWFINDER]   │ │
│  │                         │ │
│  │   Scan child's QR code  │ │
│  │                         │ │
│  └─────────────────────────┘ │
│                               │
│  OR                           │
│                               │
│  [Enter QR Code Manually]     │
└───────────────────────────────┘
```

#### 3. Success Screen
```
┌───────────────────────────────┐
│  ✅ Successfully Linked!      │
│  ────────────────────────────│
│                               │
│  You're now linked to:        │
│                               │
│  👶 Tommy Doe                 │
│                               │
│  You can now:                 │
│  • View Tommy's location      │
│  • Receive alerts             │
│  • Chat with Tommy            │
│  • Create danger zones        │
│                               │
│  [View Profile]  [Done]       │
└───────────────────────────────┘
```

### Implementation Tips

1. **QR Code Generation:**
   ```javascript
   import QRCode from 'qrcode';
   
   const generateQR = async (qrCodeText) => {
     return await QRCode.toDataURL(qrCodeText);
   };
   ```

2. **QR Code Scanning:**
   ```javascript
   import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
   
   const scanQR = async () => {
     const result = await BarcodeScanner.startScan();
     if (result.hasContent) {
       // Call API: POST /children/link-parent
       await linkParentByQr(result.content);
     }
   };
   ```

3. **Manual Entry Fallback:**
   ```javascript
   // If camera doesn't work, allow manual entry
   const manualLink = async (qrCode) => {
     await fetch('/children/link-parent', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ qrCode })
     });
   };
   ```

---

## 🧪 Testing

### Manual Test Script

```bash
#!/bin/bash

# Variables
API_URL="http://localhost:3000"
DAD_EMAIL="dad@test.com"
MOM_EMAIL="mom@test.com"
PASSWORD="Test123!"

echo "=== 1. Dad registers and creates child ==="
DAD_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DAD_EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"John\",\"lastName\":\"Doe\",\"role\":\"PARENT\"}")

DAD_TOKEN=$(echo $DAD_RESPONSE | jq -r '.access_token')
echo "Dad token: $DAD_TOKEN"

# Create child
CHILD_RESPONSE=$(curl -s -X POST $API_URL/children \
  -H "Authorization: Bearer $DAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Tommy","lastName":"Doe"}')

CHILD_ID=$(echo $CHILD_RESPONSE | jq -r '._id')
QR_CODE=$(echo $CHILD_RESPONSE | jq -r '.qrCode')
echo "Child ID: $CHILD_ID"
echo "QR Code: $QR_CODE"

echo -e "\n=== 2. Mom registers ==="
MOM_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MOM_EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"Jane\",\"lastName\":\"Doe\",\"role\":\"PARENT\"}")

MOM_TOKEN=$(echo $MOM_RESPONSE | jq -r '.access_token')
echo "Mom token: $MOM_TOKEN"

echo -e "\n=== 3. Mom links to child via QR ==="
LINK_RESPONSE=$(curl -s -X POST $API_URL/children/link-parent \
  -H "Authorization: Bearer $MOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qrCode\":\"$QR_CODE\"}")

echo $LINK_RESPONSE | jq '.'

echo -e "\n=== 4. Verify mom can see child ==="
curl -s -X GET $API_URL/children \
  -H "Authorization: Bearer $MOM_TOKEN" | jq '.'

echo -e "\n=== 5. Test unlink ==="
curl -s -X DELETE $API_URL/children/$CHILD_ID/unlink-parent \
  -H "Authorization: Bearer $MOM_TOKEN" | jq '.'

echo -e "\n✅ Test complete!"
```

---

## 📊 Database Changes

### Child Schema (Already Exists)
```typescript
{
  parent: ObjectId,              // Main parent (dad)
  linkedParents: [ObjectId],     // [mom, grandma, etc.]
  qrCode: String,                // "a1b2c3d4e5f6..."
  // ... other fields
}
```

### Automatic Side Effects

When a parent links via QR:
1. ✅ Added to `child.linkedParents` array
2. ✅ Chat room created automatically
3. ✅ All danger zones now monitor this child for new parent
4. ✅ New parent receives all future notifications

---

## 🎯 Benefits Over Manual Linking

| Feature | Manual ID Entry | QR Code Scan |
|---------|----------------|--------------|
| **Ease of Use** | ❌ Copy/paste IDs | ✅ One scan |
| **User Experience** | ❌ Error-prone | ✅ Seamless |
| **Speed** | ❌ ~1-2 minutes | ✅ ~5 seconds |
| **Error Rate** | ❌ High (typos) | ✅ Zero |
| **Mobile-Friendly** | ❌ Difficult | ✅ Native |
| **Privacy** | ⚠️ Exposing IDs | ✅ QR only |

---

## 🚀 Next Steps

### Recommended Enhancements

1. **QR Code Expiry** (Optional)
   - Add expiration date to QR codes
   - Regenerate QR codes periodically
   - Enhance security

2. **Approval Workflow** (Optional)
   - Main parent approves new linked parents
   - Notification sent to main parent
   - More control

3. **Link Invitation** (Alternative)
   - Dad sends invitation to Mom's email
   - Mom clicks link to auto-link
   - More secure for remote linking

4. **Audit Log** (Recommended)
   - Track when parents link/unlink
   - View history of linked parents
   - Compliance & security

---

## ✅ Summary

The QR code parent linking feature is **fully implemented and production-ready**. It provides a seamless way for multiple parents to link to a child and share monitoring responsibilities.

### Key Achievements:
✅ QR-based linking endpoint
✅ Self-unlink capability
✅ Admin/parent unlink others
✅ Automatic chat room creation
✅ Full danger zone integration
✅ Complete error handling
✅ Comprehensive documentation

Parents can now easily share child monitoring responsibilities with just a simple QR code scan! 🎉

