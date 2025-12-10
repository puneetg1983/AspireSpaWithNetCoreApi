# MISE Authentication Fix - Required Steps

## Problem
```
MISE12021: The 'idtyp' claim is required but was not present in the token
```

## Root Cause
MISE (Microsoft Identity Service Essentials) requires v2.0 access tokens with the `idtyp` claim. Your current Entra ID app is issuing v1.0 tokens without this claim.

## Solution - 3 Steps

### Step 1: Update App Manifest to v2.0 Tokens
1. Go to **Azure Portal** → **Entra ID** → **App Registrations**
2. Select your app: `1d922779-2742-4cf2-8c82-425cf2c60aa8`
3. Click **Manifest** in the left menu
4. Find `accessTokenAcceptedVersion` (around line 10-15)
5. Change from `null` or `1` to `2`:
   ```json
   "accessTokenAcceptedVersion": 2,
   ```
6. Click **Save** at the top

### Step 2: Add idtyp Optional Claim
1. In the same app registration, click **Token configuration**
2. Click **+ Add optional claim**
3. Select token type: **Access**
4. Scroll down and check the box: ✅ **idtyp**
5. Click **Add**
6. If prompted about Microsoft Graph permissions, click **Add** to continue

### Step 3: Verify Manifest (Optional)
1. Go back to **Manifest**
2. Find the `optionalClaims` section
3. Verify it looks like this:
   ```json
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
   },
   ```

## Testing the Fix

1. **Clear browser cache and tokens**:
   - Open browser DevTools (F12)
   - Application tab → Local Storage → Clear
   - Or use incognito/private browsing

2. **Restart your application**:
   ```powershell
   cd c:\source\aspire\AuthSpa2
   aspire run
   ```

3. **Sign in again** at `http://localhost:4200`

4. **Verify the token** (click "View Token" button):
   - Look for `"idtyp": "user"` in the token claims
   - Look for `"ver": "2.0"` confirming v2.0 token

## Expected Results

After these changes:
- ✅ No more `MISE12021` errors
- ✅ Authentication will succeed
- ✅ Protected API calls will work
- ✅ User identity will be displayed correctly

## Still Getting Errors?

### Geneva Telemetry Warnings
You may still see Geneva telemetry warnings like:
```
Failed to instantiate AuditLogger.
System.TypeInitializationException: The type initializer for 'OpenTelemetry.Exporter.Geneva.ReentrantExportProcessor`1' threw an exception.
```

**These are non-fatal** and only affect internal Microsoft telemetry. They won't prevent authentication from working. To suppress them, you can add to `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.Identity.ServiceEssentials": "Warning",
      "OpenTelemetry.Exporter.Geneva": "None"
    }
  }
}
```

## Why This Happens

- **v1.0 tokens**: Legacy format, doesn't include `idtyp` claim
- **v2.0 tokens**: Modern format with enhanced claims including `idtyp`
- **MISE requirement**: Needs `idtyp` to distinguish between app tokens and user tokens for security

## References
- [MISE idtyp claim documentation](https://aka.ms/mise/claims/idtyp)
- [Microsoft Identity Platform token versions](https://learn.microsoft.com/entra/identity-platform/access-tokens)
