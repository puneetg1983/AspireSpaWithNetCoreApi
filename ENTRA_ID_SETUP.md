# Entra ID App Registration Configuration Guide

## Quick Setup Checklist

### App Registration Basics
- **Client ID**: `1d922779-2742-4cf2-8c82-425cf2c60aa8`
- **Type**: Single Entra ID App for both SPA and API
- **Authentication Type**: Public Client (PKCE) - No Secrets

---

## Configuration Steps

### 1. ⚙️ Expose an API

Navigate to: **App Registration → Expose an API**

**Application ID URI**: `api://1d922779-2742-4cf2-8c82-425cf2c60aa8`

**Add a scope**:
```
Scope name: access_as_user
Who can consent: Admins and users
Admin consent display name: Access API as user
Admin consent description: Allows the app to access the API on behalf of the signed-in user
User consent display name: Access API as you
User consent description: Allows the app to access the API on your behalf
State: Enabled
```

---

### 2. 🔐 Authentication

Navigate to: **App Registration → Authentication**

**Platform Configuration**:
- Platform Type: **Single-page application (SPA)**
- Redirect URIs: 
  - Development: `http://localhost:4200`
  - Production: `https://your-production-domain.com`

**Implicit grant and hybrid flows**:
- ✅ Access tokens (used for implicit flows)
- ✅ ID tokens (used for implicit and hybrid flows)

**Advanced settings**:
- ✅ Allow public client flows: **Yes**

---

### 3. 🔑 API Permissions

Navigate to: **App Registration → API Permissions**

**Required Permissions**:

| API | Permission | Type | Admin Consent |
|-----|-----------|------|---------------|
| Microsoft Graph | openid | Delegated | No |
| Microsoft Graph | profile | Delegated | No |
| Your API (1d922779-...) | access_as_user | Delegated | Optional |

**Add Permission Steps**:
1. Click "+ Add a permission"
2. Select **My APIs** tab
3. Select your app (1d922779-2742-4cf2-8c82-425cf2c60aa8)
4. Select **Delegated permissions**
5. Check ✅ **access_as_user**
6. Click **Add permissions**

**Optional**: Click "Grant admin consent for [Your Tenant]"

---

### 4. 👥 Supported Account Types

Navigate to: **App Registration → Authentication → Supported account types**

Choose one:
- ✅ **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
- Single tenant (if restricting to your org only)
- Personal Microsoft accounts (if needed)

---

### 5. 📋 Token Configuration (REQUIRED for MISE)

Navigate to: **App Registration → Token configuration**

**CRITICAL - Required for MISE Authentication**:
- ✅ **`idtyp`** - Token type identifier (REQUIRED by MISE)

**Optional claims to add**:
- `email` - User's email address
- `preferred_username` - User's preferred username
- `family_name` - User's last name
- `given_name` - User's first name

**Steps to add `idtyp` claim**:
1. Click **+ Add optional claim**
2. Select **Access** token type
3. Check ✅ **idtyp**
4. Click **Add**

---

### 6. 🔧 App Manifest Configuration (REQUIRED for MISE)

Navigate to: **App Registration → Manifest**

**CRITICAL - Update these manifest properties**:

```json
{
  "accessTokenAcceptedVersion": 2,
  "optionalClaims": {
    "idToken": [],
    "accessToken": [
      {
        "name": "idtyp",
        "source": null,
        "essential": false,
        "additionalProperties": [
          "include_user_token"
        ]
      }
    ],
    "saml2Token": []
  }
}
```

**Explanation**:
- `accessTokenAcceptedVersion: 2` - Issues v2.0 tokens (required for MISE)
- `idtyp` optional claim - Identifies token type (required by MISE to distinguish app vs user tokens)

Without these settings, MISE will fail with error:
```
MISE12021: The 'idtyp' claim is required but was not present in the token
```

---

## Verification Checklist

Before running the application, verify:

- [ ] **Application ID URI** is set to `api://1d922779-2742-4cf2-8c82-425cf2c60aa8`
- [ ] **Scope** `access_as_user` is created and enabled
- [ ] **SPA Platform** is configured with redirect URI `http://localhost:4200`
- [ ] **Access tokens** and **ID tokens** are enabled
- [ ] **Public client flows** are allowed
- [ ] **API Permission** for `access_as_user` is added
- [ ] **Supported account types** is configured correctly

---

## Testing the Configuration

### Test in Azure Portal

1. Go to **App Registration → Authentication**
2. Click **Try it** under "Redirect URIs"
3. Follow the login flow
4. Verify successful authentication

### Test Token Acquisition

Use the Angular app:
1. Click "Sign In with Microsoft"
2. Complete authentication
3. Click "View Token (Console)"
4. Verify token contains:
   - `aud`: `1d922779-2742-4cf2-8c82-425cf2c60aa8`
   - `scp`: `access_as_user`
   - `iss`: `https://login.microsoftonline.com/{tenantId}/v2.0`

---

## Common Configuration Issues

### Issue: "AADSTS650053: The application asked for scope that does not exist"
**Cause**: The `access_as_user` scope is not created or not exposed
**Fix**: Go to "Expose an API" and create the scope

### Issue: "AADSTS50011: Redirect URI mismatch"
**Cause**: The redirect URI in the app doesn't match the registered URI
**Fix**: Add `http://localhost:4200` to SPA platform redirect URIs

### Issue: "AADSTS700016: Application not found"
**Cause**: Incorrect Client ID
**Fix**: Verify you're using `1d922779-2742-4cf2-8c82-425cf2c60aa8`

### Issue: API returns 401 even with valid token
**Cause**: Audience mismatch or scope not included
**Fix**: 
1. Check API is validating audience as ClientId
2. Verify token contains `scp: access_as_user`
3. Ensure Angular requests the API scope during login

---

## Production Recommendations

### Security
- [ ] Enable **Conditional Access** policies
- [ ] Configure **Token lifetime** policies
- [ ] Enable **Continuous Access Evaluation (CAE)**
- [ ] Implement **Multi-Factor Authentication (MFA)**

### Monitoring
- [ ] Enable **Sign-in logs** monitoring
- [ ] Set up **Alerts** for unusual activity
- [ ] Review **Consent grants** regularly

### Deployment
- [ ] Add production redirect URIs
- [ ] Update Angular app with production URLs
- [ ] Configure production API endpoints
- [ ] Test in production environment before go-live

---

## Quick Reference - Configuration Summary

```json
{
  "clientId": "1d922779-2742-4cf2-8c82-425cf2c60aa8",
  "authority": "https://login.microsoftonline.com/common",
  "redirectUri": "http://localhost:4200",
  "apiScope": "api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user",
  "scopes": [
    "openid",
    "profile",
    "api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user"
  ],
  "audience": "1d922779-2742-4cf2-8c82-425cf2c60aa8"
}
```

---

## Additional Resources

- [Microsoft Identity Platform Best Practices](https://docs.microsoft.com/azure/active-directory/develop/identity-platform-integration-checklist)
- [Single-page application: App registration](https://docs.microsoft.com/azure/active-directory/develop/scenario-spa-app-registration)
- [Protected web API: App registration](https://docs.microsoft.com/azure/active-activity/develop/scenario-protected-web-api-app-registration)
