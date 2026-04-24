# Test Credentials for Thumbnail Maker

## Ready-to-Use Test Accounts

### 🔐 Login Credentials (All use same password for simplicity)

| **Username** | **Email** | **Password** | **Display Name** |
|--------------|-----------|--------------|------------------|
| tester1 | `tester1@example.com` | `Test123!` | Tester One |
| tester2 | `tester2@example.com` | `Test123!` | Tester Two |
| tester3 | `tester3@example.com` | `Test123!` | Tester Three |

## 🚀 Quick Access

**Frontend URL**: http://localhost:8556
**Backend API**: http://localhost:8550

## 📁 Pre-created Projects

Each tester already has a default project created:

- **tester1**: "Tester1 Default Project" 
- **tester2**: "Tester2 Default Project"
- **tester3**: "Tester3 Default Project"

## 🎯 Testing Instructions

1. Go to http://localhost:8556
2. Click "Login" 
3. Use any of the credentials above
4. You'll be logged in with a project ready to use
5. Start creating thumbnails immediately!

## 🔑 API Tokens (if needed for direct testing)

### Tester1 Token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlY2RmMDVkYy0zOTFiLTQyNzktOWU2Mi05MjVmZmZhODg5NTQiLCJlbWFpbCI6InRlc3RlcjFAZXhhbXBsZS5jb20iLCJzZXNzaW9uSWQiOiIwOTc0MTE0NTA4Yzc2ZTRlZjE3ZGIxNmZkNmY5NDJhYjFiZWYwYWFmZWI1NzY1MGZiODk4YWE2M2E4ZTRjODY2IiwiaWF0IjoxNzYwMTc2MDM2LCJleHAiOjE3NjAxNzY5MzZ9.iv87LpSE0WKqQ2Rxk5SyHRtSokTkaGGXsRWs-DcyFpc
```

### Tester2 Token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ODcxMWU0NC03Y2Y0LTRlYzMtOTQ3NC00OWU4NmM1NjA0NTkiLCJlbWFpbCI6InRlc3RlcjJAZXhhbXBsZS5jb20iLCJzZXNzaW9uSWQiOiJiZmMwOGM4YjY2ZmQ1YTFlMjk1M2NmZjMzOTJkZGMyMDAyMmE2ODZjYjViZTFmMjU5YzcwYTIyZWQwMmI0OGM0IiwiaWF0IjoxNzYwMTc2MDQ2LCJleHAiOjE3NjAxNzY5NDZ9.ZukLZO9vxGY2qDW1PAfslkutDE7OCgZOfgfauWzG5-M
```

### Tester3 Token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZWQyM2YwNi04ZDViLTQzOGUtYTVlNS0wNjllYjQ4ZWI3ZGMiLCJlbWFpbCI6InRlc3RlcjNAZXhhbXBsZS5jb20iLCJzZXNzaW9uSWQiOiI1NWRjMjg4MzhhY2VmY2QxNDU0MGI3MmEyMGU5NTBlNjM5NzlhZjZkNmVmM2JiYzZjYjg2OWFhODIzOGI1YzA2IiwiaWF0IjoxNzYwMTc2MDU2LCJleHAiOjE3NjAxNzY5NTZ9.uoKadzP3kMEQk6TvwZcmUbo-5e15-xCSbptw_DJF9fM
```

## 📝 Example API Test

Test thumbnail generation with tester1:

```bash
curl -X POST http://localhost:8550/api/thumbnails/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TESTER1_TOKEN]" \
  -d '{"prompt": "Your thumbnail idea here", "style": "bold", "projectId": "c85e531d-038a-4f88-86d9-5e840e23edce"}'
```

## ⚡ Password Rules

The password `Test123!` meets all requirements:
- At least 8 characters ✅
- One uppercase letter (T) ✅ 
- One lowercase letter (est) ✅
- One digit (123) ✅
- One special character (!) ✅

---
*Created: 2025-10-11*  
*Status: Active and ready for testing*
