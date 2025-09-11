# Test Script for Creating Privileged Accounts

## Create Supervisor Account
```bash
curl -X POST http://localhost:3000/api/admin/create-privileged-account \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Supervisor",
    "email": "supervisor@test.com",
    "password": "password123",
    "phone": "9876543210",
    "address": "123 Admin Street",
    "role": "supervisor",
    "adminKey": "admin123"
  }'
```

## Create Admin Account
```bash
curl -X POST http://localhost:3000/api/admin/create-privileged-account \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Admin",
    "email": "admin@test.com",
    "password": "password123",
    "phone": "9876543211",
    "address": "456 Admin Avenue",
    "role": "admin",
    "adminKey": "admin123"
  }'
```

## Test Login with Different Roles

### Login as Citizen
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@test.com",
    "password": "password123",
    "role": "citizen"
  }'
```

### Login as Supervisor
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supervisor@test.com",
    "password": "password123",
    "role": "supervisor"
  }'
```

### Login as Admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "role": "admin"
  }'
```

## Test Registration (Citizens Only)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Citizen",
    "email": "citizen@test.com",
    "password": "password123",
    "phone": "9876543212",
    "address": "789 Citizen Lane"
  }'
```

## Expected Behaviors

1. **Registration**: Only creates citizen accounts
2. **Email/Phone Uniqueness**: Checks across all collections (citizens, supervisors, admins)
3. **Login**: Requires correct role selection
4. **Admin Creation**: Requires admin key for supervisor/admin accounts
