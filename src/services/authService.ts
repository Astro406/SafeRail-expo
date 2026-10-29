import { LocalStorageService } from './localStorageService';
import { UserProfile } from '../types';

export class AuthException extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthException';
    this.code = code;
  }
}

export type AuthStateListener = (user: UserProfile | null) => void;

export class AuthService {
  private storage: LocalStorageService;
  private _currentUser: UserProfile | null = null;
  private listeners: Set<AuthStateListener> = new Set();

  constructor(storage: LocalStorageService) {
    this.storage = storage;
  }

  get currentUser(): UserProfile | null {
    return this._currentUser;
  }

  get isAuthenticated(): boolean {
    return this._currentUser !== null;
  }

  async initialize(): Promise<void> {
    this._currentUser = this.storage.getCachedUser();
    this.notifyListeners();
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    listener(this._currentUser);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l(this._currentUser);
      } catch (e) {
        console.error('[AuthService] Listener error:', e);
      }
    });
  }

  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    if (this._currentUser?.isDemoUser) {
      return 'DEMO_OFFICER_TOKEN';
    }
    if (this._currentUser) {
      return 'dev-test-token';
    }
    return null;
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<UserProfile> {
    return this.signIn(email, password);
  }

  async registerWithEmailAndPassword(params: {
    displayName: string;
    email: string;
    password: string;
    stationCode?: string;
  }): Promise<UserProfile> {
    return this.register(params);
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      throw new AuthException('Email and password cannot be empty');
    }

    // Offline / Local authentication mode
    const profile: UserProfile = {
      uid: `local-user-${Math.abs(this.hashCode(cleanEmail))}`,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0].toUpperCase(),
      role: 'Screening Inspector',
      stationCode: 'NDLS - New Delhi Central',
      createdAt: new Date().toISOString(),
      isDemoUser: false,
    };

    this._currentUser = profile;
    await this.storage.cacheUser(profile);
    this.notifyListeners();
    return profile;
  }

  async register(params: {
    displayName: string;
    email: string;
    password: string;
    stationCode?: string;
  }): Promise<UserProfile> {
    const { displayName, email, password, stationCode } = params;
    const cleanEmail = email.trim();
    const cleanName = displayName.trim();

    if (!cleanEmail || !password || !cleanName) {
      throw new AuthException('All fields are required');
    }

    const profile: UserProfile = {
      uid: `local-user-${Math.abs(this.hashCode(cleanEmail))}`,
      email: cleanEmail,
      displayName: cleanName,
      role: 'Screening Inspector',
      stationCode: stationCode?.trim() || 'NDLS - New Delhi Central',
      createdAt: new Date().toISOString(),
      isDemoUser: false,
    };

    this._currentUser = profile;
    await this.storage.cacheUser(profile);
    this.notifyListeners();
    return profile;
  }

  async signInAsDemoOfficer(): Promise<UserProfile> {
    const demoProfile: UserProfile = {
      uid: 'demo-officer-01',
      email: 'inspector.demo@railsafe.indianrailways.gov.in',
      displayName: 'Officer Rajesh Kumar',
      role: 'Railway Security / RPF Inspector',
      stationCode: 'NDLS - New Delhi Central',
      createdAt: new Date().toISOString(),
      isDemoUser: true,
    };

    this._currentUser = demoProfile;
    await this.storage.cacheUser(demoProfile);
    this.notifyListeners();
    return demoProfile;
  }

  async signOut(): Promise<void> {
    this._currentUser = null;
    await this.storage.cacheUser(null);
    this.notifyListeners();
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
