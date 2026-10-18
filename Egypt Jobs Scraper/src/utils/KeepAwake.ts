import { exec, ChildProcess } from 'child_process';
import * as os from 'os';

/**
 * Keep Awake Utility
 * Prevents the system from going to sleep while the scraper is running
 * Works on Windows by using PowerShell to prevent sleep
 */

export class KeepAwake {
    private static instance: KeepAwake;
    private isActive: boolean = false;
    private keepAliveInterval: NodeJS.Timeout | null = null;
    private readonly KEEP_ALIVE_INTERVAL_MS = 60000; // 1 minute

    private constructor() { }

    static getInstance(): KeepAwake {
        if (!KeepAwake.instance) {
            KeepAwake.instance = new KeepAwake();
        }
        return KeepAwake.instance;
    }

    /**
     * Start preventing system sleep
     */
    start(): void {
        if (this.isActive) {
            console.log('[KeepAwake] Already active');
            return;
        }

        this.isActive = true;
        console.log('[KeepAwake] 💡 Preventing system sleep...');

        // Set power settings on Windows
        if (os.platform() === 'win32') {
            this.setWindowsPowerSettings();
        }

        // Start periodic activity to prevent sleep
        this.keepAliveInterval = setInterval(() => {
            this.sendKeepAliveSignal();
        }, this.KEEP_ALIVE_INTERVAL_MS);

        // Initial signal
        this.sendKeepAliveSignal();
    }

    /**
     * Stop preventing system sleep
     */
    stop(): void {
        if (!this.isActive) return;

        this.isActive = false;
        console.log('[KeepAwake] 💤 Allowing system sleep again');

        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }

        // Restore power settings on Windows
        if (os.platform() === 'win32') {
            this.restoreWindowsPowerSettings();
        }
    }

    /**
     * Send a keep-alive signal to prevent sleep
     */
    private sendKeepAliveSignal(): void {
        if (os.platform() === 'win32') {
            // Use PowerShell to send a display-on signal
            exec(
                'powershell -Command "[System.Windows.Forms.Cursor]::Position = [System.Windows.Forms.Cursor]::Position"',
                { windowsHide: true },
                (error) => {
                    // Silently ignore errors - this is just a keep-alive signal
                }
            );

            // Alternative: Use SetThreadExecutionState to prevent sleep
            exec(
                'powershell -Command "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class PowerHelper { [DllImport(\\"kernel32.dll\\")] public static extern uint SetThreadExecutionState(uint esFlags); }\'; [PowerHelper]::SetThreadExecutionState(0x80000003)"',
                { windowsHide: true },
                (error) => {
                    // Silently ignore errors
                }
            );
        } else if (os.platform() === 'darwin') {
            // macOS: Use caffeinate command
            exec('caffeinate -u -t 120', { windowsHide: true });
        } else {
            // Linux: Use xdotool or similar
            exec('xdotool mousemove_relative 0 0 2>/dev/null || true', { windowsHide: true });
        }
    }

    /**
     * Set Windows power settings to never sleep
     */
    private setWindowsPowerSettings(): void {
        // Prevent display from turning off
        exec(
            'powercfg -change -monitor-timeout-ac 0',
            { windowsHide: true },
            (error) => {
                if (error) {
                    console.log('[KeepAwake] Note: Could not change monitor timeout (requires admin)');
                }
            }
        );

        // Prevent system sleep
        exec(
            'powercfg -change -standby-timeout-ac 0',
            { windowsHide: true },
            (error) => {
                if (error) {
                    console.log('[KeepAwake] Note: Could not change standby timeout (requires admin)');
                }
            }
        );
    }

    /**
     * Restore Windows power settings to defaults
     */
    private restoreWindowsPowerSettings(): void {
        // Restore to 10 minutes for monitor
        exec('powercfg -change -monitor-timeout-ac 10', { windowsHide: true });
        // Restore to 30 minutes for standby
        exec('powercfg -change -standby-timeout-ac 30', { windowsHide: true });
    }

    /**
     * Check if keep-awake is currently active
     */
    isRunning(): boolean {
        return this.isActive;
    }
}

export const keepAwake = KeepAwake.getInstance();
