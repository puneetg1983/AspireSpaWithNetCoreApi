import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { InteractionStatus, RedirectRequest } from '@azure/msal-browser';

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
  loading = false;
  error = '';
  
  private readonly _destroying$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
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

    // Get the API URL from environment or use default
    // Using the Aspire-configured API service endpoint
    const apiUrl = 'https://apiservice.dev.localhost:7001/weatherforecast';

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
