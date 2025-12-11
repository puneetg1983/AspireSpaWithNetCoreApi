# On-Behalf-Of (OBO) Flow Setup Guide

This document explains how to configure the OBO (On-Behalf-Of) flow between the ApiService and BackendServiceAcceptingToken using **Federated Credentials with Managed Identity** (no client secrets required).

## Architecture Overview

```
┌─────────────────────┐
│   Angular SPA       │
│  (MSAL.js + PKCE)   │
└─────────┬───────────┘
          │ Token A (audience: 1d922779-...)
          ▼
┌─────────────────────────────────────────┐
│   ApiService                            │
│  (MISE + M.I.Web)                       │
│  ClientId: 1d922779-...                 │
│  Uses: Managed Identity for OBO         │
│  (AspireOboTestManagedIdentity)         │
└─────────┬───────────────────────────────┘
          │ OBO Token Exchange (Federated Credential)
          │ Token B (audience: 626cfb4f-...)
          ▼
┌─────────────────────┐
│BackendServiceAccept-│
│     ingToken        │
│  ClientId: 626cfb4f-│
└─────────────────────┘
```

## Key Difference: Token Forwarding vs OBO

| Aspect | Token Forwarding | OBO Flow |
|--------|-----------------|----------|
| **Target API** | Same Entra App | Different Entra App |
| **Token Used** | Original user token | New exchanged token |
| **Audience** | Same (1d922779-...) | Different (626cfb4f-...) |
| **Client Credential** | Not required | **Federated Credential (Managed Identity)** |
| **Complexity** | Simple | More complex |

## Why Federated Credentials?

Using **Federated Credentials with Managed Identity** instead of client secrets provides:

- ✅ **No secrets to manage** - No expiration, no rotation needed
- ✅ **More secure** - No secrets in code, config, or environment variables
- ✅ **Azure-native** - Uses Azure's built-in identity infrastructure
- ✅ **Workload identity federation** - Modern approach recommended by Microsoft

## Services in This Solution

| Service | Entra App Client ID | Purpose |
|---------|---------------------|---------|
| Angular SPA | 1d922779-2742-4cf2-8c82-425cf2c60aa8 | User authentication |
| ApiService | 1d922779-2742-4cf2-8c82-425cf2c60aa8 | Middle-tier API (OBO initiator) |
| BackendProtectedService | 1d922779-2742-4cf2-8c82-425cf2c60aa8 | Same token forwarding |
| **BackendServiceAcceptingToken** | **626cfb4f-3edb-4ec4-9cd0-64126cfaea3b** | **OBO token target** |

### Managed Identity

| Name | Client ID | Purpose |
|------|-----------|---------|
| obo-managed-identity (Aspire-created) | 6944dfb0-2143-4a53-8990-c0e3cd9670fe | Federated credential for OBO |

---

## Entra ID Configuration Steps

### Step 1: Create a User-Assigned Managed Identity

1. Go to [Azure Portal](https://portal.azure.com) → **Managed Identities**
2. Click **Create**
3. Configure:
   - **Subscription**: Your subscription
   - **Resource group**: Your resource group
   - **Region**: Your region
   - **Name**: `AspireOboTestManagedIdentity`
4. Click **Review + create** → **Create**
5. **Note the Object ID**: `6944dfb0-2143-4a53-8990-c0e3cd9670fe`

### Step 2: Configure Federated Credential on Original App (1d922779-...)

1. Go to **Azure Portal** → Microsoft Entra ID → App registrations
2. Select your app: **TestService2ServiceMise** (1d922779-2742-4cf2-8c82-425cf2c60aa8)
3. Go to **Certificates & secrets** → **Federated credentials** tab
4. Click **Add credential**
5. Configure:
   - **Federated credential scenario**: `Managed Identity`
   - **Select managed identity**: Choose `AspireOboTestManagedIdentity`
   - **Name**: `ClientCredentialAspireOboTestManagedIdentity`
   - **Description**: `Federated credential for OBO flow using Managed Identity`
   - **Audience**: `api://AzureADTokenExchange` (default)
6. Click **Add**

The configuration will show:
- **Issuer**: `https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0`
- **Subject identifier**: `6944dfb0-2143-4a53-8990-c0e3cd9670fe` (Managed Identity Client ID)

### Step 3: Configure the OBO Target App (626cfb4f-...)

1. Go to **Azure Portal** → Microsoft Entra ID → App registrations
2. Select or create app: **626cfb4f-3edb-4ec4-9cd0-64126cfaea3b**

#### 3a. Configure Authentication
- **Supported account types**: Accounts in this organizational directory only (Single tenant)

#### 3b. Expose an API (Create a Scope)

1. Go to **Expose an API**
2. Set **Application ID URI** (if not set):
   - Click "Set" → Use default: `api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b`
3. **Add a scope**:
   - Scope name: `access_as_user`
   - Who can consent: **Admins and users**
   - Admin consent display name: `Access BackendServiceAcceptingToken as user`
   - Admin consent description: `Allows ApiService to access BackendServiceAcceptingToken on behalf of the signed-in user`
   - User consent display name: `Access BackendServiceAcceptingToken`
   - User consent description: `Allows the app to access BackendServiceAcceptingToken on your behalf`
   - State: **Enabled**

#### 3c. Configure Token Version (CRITICAL for MISE)

1. Go to **Manifest**
2. Find `"accessTokenAcceptedVersion"` and set it to `2`:
   ```json
   "accessTokenAcceptedVersion": 2
   ```
3. Find `"optionalClaims"` and ensure `idtyp` is included:
   ```json
   "optionalClaims": {
       "accessToken": [
           {
               "name": "idtyp",
               "source": null,
               "essential": false,
               "additionalProperties": []
           }
       ]
   }
   ```
4. Click **Save**

### Step 4: Grant API Permission (Original App → OBO Target App)

1. Go back to the **original app** (1d922779-...)
2. Go to **API permissions**
3. Click **Add a permission**
4. Select **My APIs** → Select **626cfb4f-3edb-4ec4-9cd0-64126cfaea3b**
5. Select **Delegated permissions**
6. Check `access_as_user`
7. Click **Add permissions**
8. Click **Grant admin consent for [your tenant]** (if you have admin rights)

### Step 5: Pre-authorize ApiService (Optional but Recommended)

This allows OBO flow without requiring user consent for the downstream API.

1. Go to the **OBO target app** (626cfb4f-...)
2. Go to **Expose an API**
3. Under **Authorized client applications**, click **Add a client application**
4. Enter Client ID: `1d922779-2742-4cf2-8c82-425cf2c60aa8` (ApiService)
5. Check the scope: `api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b/access_as_user`
6. Click **Add application**

---

## Configuration Files

### ApiService/appsettings.json

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "microsoft.onmicrosoft.com",
    "TenantId": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "ClientId": "1d922779-2742-4cf2-8c82-425cf2c60aa8",
    "Audience": "1d922779-2742-4cf2-8c82-425cf2c60aa8",
    "ClientCredentials": [
      {
        "SourceType": "SignedAssertionFromManagedIdentity",
        "ManagedIdentityClientId": "6944dfb0-2143-4a53-8990-c0e3cd9670fe",
        "TokenExchangeUrl": "api://AzureADTokenExchange"
      }
    ]
  },
  "DownstreamApi": {
    "Scopes": [ "api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b/.default" ],
    "BaseUrl": "https+http://backendserviceacceptingtoken"
  }
}
```

**Key Configuration Explained:**

| Property | Value | Description |
|----------|-------|-------------|
| `SourceType` | `SignedAssertionFromManagedIdentity` | Uses Managed Identity for authentication |
| `ManagedIdentityClientId` | `6944dfb0-2143-4a53-8990-c0e3cd9670fe` | Client ID of the Managed Identity |
| `TokenExchangeUrl` | `api://AzureADTokenExchange` | Standard audience for federated token exchange |

### BackendServiceAcceptingToken/appsettings.json

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "microsoft.onmicrosoft.com",
    "TenantId": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "ClientId": "626cfb4f-3edb-4ec4-9cd0-64126cfaea3b",
    "Audience": "626cfb4f-3edb-4ec4-9cd0-64126cfaea3b"
  }
}
```

---

## OBO Flow with Federated Credentials Explained

### What Happens When You Click "Call OBO Service"

1. **Angular SPA** sends request to `ApiService/obodata` with Token A
   - Token A has audience: `1d922779-2742-4cf2-8c82-425cf2c60aa8`

2. **ApiService** validates Token A using MISE
   - Checks signature, expiration, audience, issuer

3. **ApiService** acquires Managed Identity token
   - Gets a token from the Managed Identity (e6e5de68-...)
   - Audience: `api://AzureADTokenExchange`

4. **ApiService** performs OBO token exchange with Azure AD:
   ```
   POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   
   grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
   client_id=1d922779-...
   client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
   client_assertion=<Managed Identity Token>  ← Instead of client_secret
   assertion=<Token A>
   scope=api://626cfb4f-.../.default
   requested_token_use=on_behalf_of
   ```

5. **Azure AD** validates the federated credential:
   - Verifies the Managed Identity token's issuer and subject
   - Matches against the federated credential configuration
   - Returns Token B

6. **Azure AD** returns Token B:
   - Token B has audience: `626cfb4f-3edb-4ec4-9cd0-64126cfaea3b`
   - Token B contains original user's claims

7. **ApiService** calls `BackendServiceAcceptingToken/api/obodata` with Token B

8. **BackendServiceAcceptingToken** validates Token B using MISE
   - Validates against its own audience (626cfb4f-...)

---

## Local Development Considerations

### Running Locally Without Managed Identity

When running locally on your development machine, you may not have access to the Managed Identity. Options:

#### Option 1: Run in Azure (Recommended for Testing OBO)
Deploy to Azure Container Apps, App Service, or use Azure Dev Tunnels with a VM that has the Managed Identity assigned.

#### Option 2: Use Azure CLI Credential (Development Fallback)
Update the configuration to allow fallback to Azure CLI credentials:

```json
{
  "AzureAd": {
    "ClientCredentials": [
      {
        "SourceType": "SignedAssertionFromManagedIdentity",
        "ManagedIdentityClientId": "6944dfb0-2143-4a53-8990-c0e3cd9670fe",
        "TokenExchangeUrl": "api://AzureADTokenExchange"
      }
    ]
  }
}
```

For local development, ensure you're signed into Azure CLI:
```bash
az login
```

#### Option 3: Add Client Secret as Fallback (Not Recommended)
You can add a client secret as a fallback credential, but this defeats the purpose of using federated credentials.

---

## Troubleshooting

### Error: "AADSTS65001: The user or administrator has not consented"

**Solution**: Grant admin consent for the API permission:
1. Go to original app → API permissions
2. Click "Grant admin consent"

### Error: "AADSTS70021: No matching federated identity record found"

**Solution**: The federated credential configuration doesn't match:
1. Verify the Managed Identity Object ID matches the configuration
2. Check that the federated credential exists on the app registration
3. Ensure the audience is `api://AzureADTokenExchange`

### Error: "ManagedIdentityCredential authentication unavailable"

**Solution**: The Managed Identity is not available in the current environment:
1. Ensure you're running in Azure with the Managed Identity assigned
2. For local development, use Azure CLI fallback or deploy to Azure

### Error: "AADSTS700024: Client assertion is not within its valid time range"

**Solution**: Ensure server time is synchronized.

### Error: "AADSTS500011: The resource principal was not found"

**Solution**: The OBO target app (626cfb4f-...) doesn't exist or isn't properly configured:
1. Verify the app exists in your tenant
2. Ensure "Expose an API" has Application ID URI set
3. Ensure the scope exists

### Error: "MISE: Missing idtyp claim"

**Solution**: Configure the OBO target app's manifest:
```json
"accessTokenAcceptedVersion": 2,
"optionalClaims": {
    "accessToken": [{ "name": "idtyp", ... }]
}
```

### Error: "401 Unauthorized" from BackendServiceAcceptingToken

**Solution**: 
1. Check audience in appsettings.json matches the app's Client ID
2. Verify the OBO token was acquired successfully (check ApiService logs)
3. Ensure MISE is configured correctly

---

## Security Considerations

1. **No Secrets Required**: 
   - Federated credentials eliminate the need for client secrets
   - No secrets to rotate or manage
   - No risk of secret exposure in code or logs

2. **Managed Identity Security**:
   - Managed Identity is tied to Azure resources
   - Access is controlled via Azure RBAC
   - Credentials are automatically managed by Azure

3. **Token Validation**:
   - Both services use MISE for token validation
   - MISE validates signature, audience, issuer, and expiration
   - The `idtyp` claim ensures it's a user token (not app-only)

4. **Least Privilege**:
   - Only expose necessary scopes
   - Only grant necessary permissions
   - Pre-authorize known clients

---

## Testing the OBO Flow

1. Start the Aspire solution:
   ```bash
   cd AuthSpa2.AppHost
   dotnet run
   ```

2. Open the Angular SPA (https://localhost:4200)

3. Sign in with your Microsoft account

4. Click **"Call OBO Service"**

5. You should see:
   - Response from BackendServiceAcceptingToken
   - User information preserved through OBO flow
   - Different audience information in the response

**Note**: For local development, the Managed Identity may not be available. Deploy to Azure or use alternative credentials for testing.

---

## Azure Deployment with Managed Identity

When deploying to Azure (e.g., Container Apps, App Service):

1. **Assign the Managed Identity** to your compute resource:
   ```bash
   # For Container Apps
   az containerapp identity assign \
     --name your-api-service \
     --resource-group your-rg \
     --user-assigned 6944dfb0-2143-4a53-8990-c0e3cd9670fe
   ```

2. The `ManagedIdentityClientId` in configuration should match the Managed Identity's **Object ID**

3. The federated credential on the app registration validates the Managed Identity's token

---

## References

- [Microsoft identity platform and OAuth 2.0 On-Behalf-Of flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow)
- [Workload identity federation](https://learn.microsoft.com/en-us/azure/active-directory/develop/workload-identity-federation)
- [Configure a user-assigned managed identity to trust an external identity provider](https://learn.microsoft.com/en-us/azure/active-directory/develop/workload-identity-federation-create-trust-user-assigned-managed-identity)
- [Microsoft.Identity.Web - Client credentials](https://github.com/AzureAD/microsoft-identity-web/wiki/client-credentials)
- [Call a web API from another web API](https://learn.microsoft.com/en-us/azure/active-directory/develop/scenario-web-api-call-api-overview)
