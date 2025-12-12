import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { InteractionStatus, RedirectRequest } from '@azure/msal-browser';
import { ConfigService } from './services/config.service';

/**
 * Main App Component with MSAL Authentication
 * Handles login, logout, and authenticated API calls
 */
@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  title = 'AuthSpa2 - Angular + MSAL + ASP.NET Core API';
  isAuthenticated = false;
  userName = '';
  weatherData: any = null;
  backendData: any = null;
  oboData: any = null;
  loading = false;
  loadingBackend = false;
  loadingObo = false;
  error = '';
  backendError = '';
  oboError = '';
  
  private readonly _destroying$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private configService: ConfigService
  ) {}

  async ngOnInit(): Promise<void> {
    // Ensure MSAL is initialized
    await this.authService.instance.initialize();
    
    // Handle redirect promise
    await this.authService.instance.handleRedirectPromise();
    
    // Check initial authentication state
    this.checkAuthentication();
    
    // Trigger change detection after async operations
    this.cdr.detectChanges();
    
    // Handle authentication status changes
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.checkAuthentication();
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }

  /**
   * Check if user is authenticated and get user info
   */
  checkAuthentication(): void {
    this.isAuthenticated = this.authService.instance.getAllAccounts().length > 0;
    
    if (this.isAuthenticated) {
      const account = this.authService.instance.getAllAccounts()[0];
      this.userName = account.name || account.username;
      console.log('User authenticated:', this.userName);
    }
  }

  /**
   * Login using redirect flow (PKCE / Authorization Code)
   * Requests scopes: openid, profile, and API access
   */
  login(): void {
    if (this.msalGuardConfig.authRequest) {
      this.authService.loginRedirect({
        ...this.msalGuardConfig.authRequest
      } as RedirectRequest);
    } else {
      this.authService.loginRedirect();
    }
  }

  /**
   * Logout and clear session
   */
  logout(): void {
    this.authService.logoutRedirect();
  }

  /**
   * Call the protected backend API with Bearer token
   * MSAL Interceptor automatically attaches the access token
   */
  callApi(): void {
    this.loading = true;
    this.error = '';
    this.weatherData = null;

    // Use the API URL from ConfigService (loaded from backend)
    const apiUrl = `${this.configService.apiUrl}/weatherforecast`;

    console.log('Calling API:', apiUrl);

    this.http.get<any>(apiUrl)
      .subscribe({
        next: (data) => {
          this.weatherData = data;
          this.loading = false;
          console.log('API Response:', data);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = `API Error: ${err.message || 'Unknown error'}`;
          this.loading = false;
          console.error('API call failed:', err);
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Call the backend protected service via ApiService with token forwarding
   * MSAL Interceptor automatically attaches the access token to ApiService
   * ApiService then forwards the token to BackendProtectedService
   */
  callBackendService(): void {
    this.loadingBackend = true;
    this.backendError = '';
    this.backendData = null;

    const apiUrl = `${this.configService.apiUrl}/backenddata`;

    console.log('Calling Backend Service via API:', apiUrl);

    this.http.get<any>(apiUrl)
      .subscribe({
        next: (data) => {
          this.backendData = data;
          this.loadingBackend = false;
          console.log('Backend Service Response:', data);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.backendError = `Backend API Error: ${err.message || 'Unknown error'}`;
          this.loadingBackend = false;
          console.error('Backend service call failed:', err);
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Call the OBO backend service via ApiService
   * This demonstrates the On-Behalf-Of (OBO) flow:
   * 1. User token is sent to ApiService
   * 2. ApiService exchanges user token for OBO token (different audience)
   * 3. OBO token is used to call BackendServiceAcceptingToken
   */
  callOboService(): void {
    this.loadingObo = true;
    this.oboError = '';
    this.oboData = null;

    const apiUrl = `${this.configService.apiUrl}/obodata`;

    console.log('Calling OBO Service via API:', apiUrl);

    this.http.get<any>(apiUrl)
      .subscribe({
        next: (data) => {
          this.oboData = data;
          this.loadingObo = false;
          console.log('OBO Service Response:', data);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.oboError = `OBO API Error: ${err.message || 'Unknown error'}`;
          this.loadingObo = false;
          console.error('OBO service call failed:', err);
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Manually acquire token to inspect it (for debugging)
   */
  async getToken(): Promise<void> {
    try {
      const result = await this.authService.instance.acquireTokenSilent({
        scopes: ['api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'],
        account: this.authService.instance.getAllAccounts()[0]
      });
      
      console.log('Access Token:', result.accessToken);
      console.log('Token expires:', result.expiresOn);
      alert('Token retrieved - check console for details');
    } catch (error) {
      console.error('Token acquisition failed:', error);
    }
  }
}
