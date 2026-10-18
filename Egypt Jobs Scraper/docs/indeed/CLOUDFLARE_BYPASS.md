# Cloudflare Bypass Strategy: The "Human Handshake"

## 🛡️ The Problem: Cloudflare WAF

Indeed uses Cloudflare, a Web Application Firewall (WAF), to block automated scrapers. Just "clicking like a human" is not enough because Cloudflare checks deeper implementation details.

### How Cloudflare Detects Bots

1.  **TLS Fingerprinting (JA3/JA4)**
    *   **What it is**: When your browser connects to HTTPS, it sends a specifics "Client Hello" packet.
    *   **The Trap**: Standard Python libraries (`requests`, `urllib`) and standard Selenium send a "Hello" packet that screams "I am a script!". Cloudflare blocks this instantly, before you even load the page.
    *   **Our Solution**: We use **`undetected-chromedriver`**. It patches the binary to send a "Client Hello" identical to a real Chrome browser.

2.  **JavaScript Environment Variables**
    *   **The Trap**: Standard Selenium leaves variables like `navigator.webdriver = true`.
    *   **Our Solution**: Python UC automatically patches these out.

3.  **Behavioral Analysis**
    *   **The Trap**: Inhuman mouse movements or instant typing.
    *   **Our Solution**: We use random delays and natural scrolling.

4.  **IP Reputation & Stateful Blocking**
    *   **The Trap**: Even with the bypass, if you make too many requests, Indeed flags your "Browser Profile" (cookies, cache, local storage).
    *   **Our Solution**: **Profile Rotation**. When a block is detected, we don't just wait. We **delete the profile directory**. This forces a fresh session, making us look like a new user from the same ISP.

## 🏗️ Our Architecture

We use a **Hybrid Approach** to get the best of both worlds:

*   **Node.js Manager**: Handles the 24/7 loop, job queue, database, and error recovery.
*   **Python Worker**: Acts as a "dumb browser" that just follows orders. It handles the low-level Cloudflare evasion because Python's `undetected-chromedriver` is currently best-in-class for this.

## 🚀 Future Scaling

To scale further, we can:
1.  **Multiple Workers**: Run 3-4 Python workers in parallel (requires strong CPU).
2.  **Residential Proxies**: Use rotating residential IPs to avoid IP-based blocks.
3.  **Browser Farm**: Move the Python workers to a separate server cluster.
