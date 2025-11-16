# QR Code Parent Linking - Quick API Reference

## 🔗 Link Parent by QR Code

**The simplest way for a second parent to join!**

### Endpoint
```
POST /children/link-parent
```

### Authentication
```
Authorization: Bearer YOUR_PARENT_TOKEN
```

### Request Body
```json
{
  "qrCode": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

### Success Response (200)
```json
{
  "message": "Successfully linked to child",
  "child": {
    "_id": "654abc123...",
    "firstName": "Tommy",
    "lastName": "Doe",
    "parent": {
      "_id": "dad_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "dad@example.com"
    },
    "linkedParents": [
      {
        "_id": "mom_id",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "mom@example.com"
      }
    ],
    "qrCode": "a1b2c3d4e5f6...",
    "status": "ACTIVE"
  }
}
```

### Error Responses

| Status | Message | Reason |
|--------|---------|--------|
| 404 | Child with this QR code not found | Invalid/wrong QR code |
| 403 | You are already the main parent of this child | Cannot link to own child |
| 403 | You are already linked to this child | Already linked before |
| 403 | Only parents can link to children | User is not a PARENT role |

### cURL Example
```bash
curl -X POST http://localhost:3000/children/link-parent \
  -H "Authorization: Bearer MOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrCode": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"}'
```

### JavaScript Example
```javascript
const linkToChild = async (qrCode) => {
  const response = await fetch('http://localhost:3000/children/link-parent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ qrCode })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Linked!', data.child.firstName);
  } else {
    console.error('❌ Error:', data.message);
  }
};
```

---

## 🔓 Unlink Self from Child

### Endpoint
```
DELETE /children/:childId/unlink-parent
```

### Authentication
```
Authorization: Bearer YOUR_PARENT_TOKEN
```

### Success Response (200)
```json
{
  "message": "Successfully unlinked from child"
}
```

### cURL Example
```bash
curl -X DELETE http://localhost:3000/children/654abc123.../unlink-parent \
  -H "Authorization: Bearer MOM_TOKEN"
```

---

## 🔓 Unlink Specific Parent (Main Parent/Admin Only)

### Endpoint
```
DELETE /children/:childId/unlink-parent/:parentId
```

### Authentication
```
Authorization: Bearer MAIN_PARENT_OR_ADMIN_TOKEN
```

### Success Response (200)
```json
{
  "message": "Successfully unlinked parent from child"
}
```

### cURL Example
```bash
curl -X DELETE http://localhost:3000/children/654abc.../unlink-parent/parent_id \
  -H "Authorization: Bearer DAD_TOKEN"
```

---

## 🎯 Complete Flow

```javascript
// 1. Mom registers
const registerResponse = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'mom@example.com',
    password: 'SecurePass123!',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'PARENT'
  })
});
const { access_token } = await registerResponse.json();

// 2. Mom scans QR code (from camera or manual entry)
const qrCode = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // Scanned from dad's app

// 3. Mom links to child
const linkResponse = await fetch('/children/link-parent', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ qrCode })
});

const { message, child } = await linkResponse.json();
console.log(message); // "Successfully linked to child"
console.log(child.firstName); // "Tommy"

// 4. Mom can now access everything
const childrenResponse = await fetch('/children', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const children = await childrenResponse.json();
console.log(children); // [{ firstName: "Tommy", ... }]
```

---

## ✨ What Happens After Linking?

Once mom scans the QR code and links:

1. ✅ **Added to linkedParents array**
   - Mom's user ID added to child's `linkedParents`

2. ✅ **Chat room created**
   - Automatic parent-child chat room
   - Mom can message the child

3. ✅ **Danger zone notifications**
   - Mom receives all entry/exit alerts
   - Email + SMS (if configured)

4. ✅ **Full access granted**
   - View child location
   - Update child info
   - Create danger zones
   - All parent capabilities

---

## 🔒 Security Notes

- ✅ Only users with `PARENT` role can link
- ✅ QR code must exist and be valid
- ✅ Cannot link to same child twice
- ✅ Cannot link to child you already own as main parent
- ✅ JWT authentication required
- ✅ All database operations are atomic

---

## 📱 Mobile App Integration

### React Native Example
```jsx
import { Camera } from 'expo-camera';

const LinkChildScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    try {
      const response = await fetch('http://api.weldiwin.app/children/link-parent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrCode: data })
      });

      const result = await response.json();
      
      if (response.ok) {
        Alert.alert('Success!', `Linked to ${result.child.firstName}`);
        navigation.navigate('Children');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to link to child');
    }
  };

  return (
    <Camera
      onBarCodeScanned={handleBarCodeScanned}
      style={{ flex: 1 }}
    />
  );
};
```

### Display QR Code (Dad's App)
```jsx
import QRCode from 'react-native-qrcode-svg';

const ChildProfileScreen = ({ child }) => {
  return (
    <View>
      <Text>Share with family members:</Text>
      <QRCode
        value={child.qrCode}
        size={200}
      />
      <Button
        title="Share QR Code"
        onPress={() => Share.share({ message: child.qrCode })}
      />
    </View>
  );
};
```

---

## 🧪 Testing

```bash
# Test QR linking
curl -X POST http://localhost:3000/children/link-parent \
  -H "Authorization: Bearer $MOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrCode": "test_qr_code_123"}'

# Expected: 200 OK with child data

# Test duplicate link (should fail)
curl -X POST http://localhost:3000/children/link-parent \
  -H "Authorization: Bearer $MOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrCode": "test_qr_code_123"}'

# Expected: 403 Forbidden "You are already linked to this child"

# Test unlink
curl -X DELETE http://localhost:3000/children/$CHILD_ID/unlink-parent \
  -H "Authorization: Bearer $MOM_TOKEN"

# Expected: 200 OK "Successfully unlinked from child"
```

---

## 💡 Pro Tips

1. **QR Code Display**: Show QR code in child's profile for easy sharing
2. **Offline QR**: Allow saving QR code as image to share via other apps
3. **Manual Entry**: Provide text input fallback if camera fails
4. **Confirmation**: Show success modal with child info after linking
5. **Permissions**: Request camera permission before showing scanner
6. **Error Handling**: Show user-friendly messages for all error cases

---

Need help? Check the full guide: [PARENT_LINKING_GUIDE.md](../PARENT_LINKING_GUIDE.md)

