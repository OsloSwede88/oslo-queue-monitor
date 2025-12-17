import { chromium } from 'playwright';

class AvinorScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.lastQueueTime = null;
  }

  async init() {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    console.log('[Scraper] Initialized browser');
  }

  async scrapeQueueTime() {
    try {
      await this.init();

      console.log('[Scraper] Navigating to Avinor Oslo flights page...');
      await this.page.goto('https://www.avinor.no/flyplass/oslo/flytider/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for the queue time element to appear
      await this.page.waitForSelector('text=/Estimert ventetid i sikkerhetskontrollen/i', {
        timeout: 10000
      });

      // Extract the queue time text
      const queueTimeElement = await this.page.locator('text=/Estimert ventetid i sikkerhetskontrollen/i').first();
      const queueTimeText = await queueTimeElement.textContent();

      console.log('[Scraper] Found queue time text:', queueTimeText);

      // Parse the queue time
      const queueData = this.parseQueueTime(queueTimeText);
      this.lastQueueTime = queueData;

      return queueData;
    } catch (error) {
      console.error('[Scraper] Error scraping queue time:', error.message);

      // Return last known value if available
      if (this.lastQueueTime) {
        return { ...this.lastQueueTime, error: 'Using cached data' };
      }

      return {
        text: 'Unavailable',
        minutes: null,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  parseQueueTime(text) {
    // Text format: "Estimert ventetid i sikkerhetskontrollen: mindre enn 15 min"
    const match = text.match(/(?:mindre enn|mer enn|ca\.?)\s*(\d+)\s*min/i);

    let minutes = null;
    let displayText = 'Unknown';

    if (match) {
      minutes = parseInt(match[1], 10);
      displayText = text.split(':')[1]?.trim() || text;
    } else if (text.includes('mindre enn')) {
      // If no specific number, assume less than the mentioned value
      minutes = 15; // Default to 15 for "mindre enn 15 min"
      displayText = text.split(':')[1]?.trim() || 'mindre enn 15 min';
    } else {
      displayText = text.split(':')[1]?.trim() || text;
    }

    return {
      text: displayText,
      minutes: minutes,
      timestamp: new Date().toISOString(),
      airport: 'OSL',
      location: 'Oslo Airport'
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('[Scraper] Browser closed');
    }
  }
}

export default AvinorScraper;
