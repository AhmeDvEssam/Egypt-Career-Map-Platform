import * as dns from 'dns';
import * as https from 'https';

/**
 * Network Health Check Utility
 * Monitors internet connectivity and waits for recovery when disconnected
 */

export class NetworkHealthCheck {
    private static instance: NetworkHealthCheck;
    private isOnline: boolean = true;
    private consecutiveFailures: number = 0;
    private readonly MAX_FAILURES_BEFORE_OFFLINE = 3;
    private readonly CHECK_INTERVAL_MS = 5000; // 5 seconds
    private readonly RECOVERY_CHECK_INTERVAL_MS = 10000; // 10 seconds when offline

    private constructor() { }

    static getInstance(): NetworkHealthCheck {
        if (!NetworkHealthCheck.instance) {
            NetworkHealthCheck.instance = new NetworkHealthCheck();
        }
        return NetworkHealthCheck.instance;
    }

    /**
     * Check if the network is available by trying to resolve DNS
     */
    async checkNetwork(): Promise<boolean> {
        return new Promise((resolve) => {
            // Try DNS resolution first (fastest)
            dns.resolve('linkedin.com', (err) => {
                if (!err) {
                    resolve(true);
                    return;
                }

                // Fallback: Try HTTPS request to Google
                const req = https.get('https://www.google.com', { timeout: 5000 }, (res) => {
                    resolve(res.statusCode === 200 || res.statusCode === 301);
                });

                req.on('error', () => resolve(false));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });
            });
        });
    }

    /**
     * Wait for network recovery if offline
     * Returns true when network is back, false if interrupted
     */
    async waitForNetwork(): Promise<boolean> {
        const online = await this.checkNetwork();

        if (online) {
            if (!this.isOnline) {
                console.log('[Network] ✅ Connection restored!');
            }
            this.isOnline = true;
            this.consecutiveFailures = 0;
            return true;
        }

        this.consecutiveFailures++;

        if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_OFFLINE) {
            if (this.isOnline) {
                console.log('\n[Network] ⚠️ Internet connection lost!');
                console.log('[Network] 🔄 Waiting for connection to restore...');
                this.isOnline = false;
            }

            // Wait and retry
            let waitTime = 0;
            while (true) {
                await new Promise(r => setTimeout(r, this.RECOVERY_CHECK_INTERVAL_MS));
                waitTime += this.RECOVERY_CHECK_INTERVAL_MS / 1000;

                const recovered = await this.checkNetwork();
                if (recovered) {
                    console.log(`[Network] ✅ Connection restored after ${waitTime}s!`);
                    this.isOnline = true;
                    this.consecutiveFailures = 0;
                    return true;
                }

                // Log every 30 seconds
                if (waitTime % 30 === 0) {
                    console.log(`[Network] ⏳ Still waiting... (${waitTime}s elapsed)`);
                }
            }
        }

        return true; // Not yet in offline mode
    }

    /**
     * Check if a specific error is network-related
     */
    static isNetworkError(error: any): boolean {
        const errorString = error?.toString() || '';
        const networkErrors = [
            'ERR_NAME_NOT_RESOLVED',
            'ERR_INTERNET_DISCONNECTED',
            'ERR_NETWORK_CHANGED',
            'ERR_CONNECTION_TIMED_OUT',
            'ERR_CONNECTION_REFUSED',
            'ERR_CONNECTION_RESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ECONNRESET',
            'net::ERR_',
            'TimeoutError'
        ];

        return networkErrors.some(e => errorString.includes(e));
    }

    /**
     * Execute a function with network retry logic
     * Waits for network recovery and retries the operation
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        operationName: string = 'Operation'
    ): Promise<T | null> {
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check network before operation
                await this.waitForNetwork();

                return await operation();
            } catch (error: any) {
                lastError = error;

                if (NetworkHealthCheck.isNetworkError(error)) {
                    console.log(`[Network] ⚠️ ${operationName} failed (Attempt ${attempt}/${maxRetries}): Network error`);

                    // Wait for network recovery
                    await this.waitForNetwork();

                    if (attempt < maxRetries) {
                        console.log(`[Network] 🔄 Retrying ${operationName}...`);
                        await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
                    }
                } else {
                    // Non-network error, throw immediately
                    throw error;
                }
            }
        }

        console.log(`[Network] ❌ ${operationName} failed after ${maxRetries} attempts`);
        return null;
    }

    getStatus(): { online: boolean; consecutiveFailures: number } {
        return {
            online: this.isOnline,
            consecutiveFailures: this.consecutiveFailures
        };
    }
}

export const networkHealth = NetworkHealthCheck.getInstance();
