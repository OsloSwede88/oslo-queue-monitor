class FlightMonitor {
  constructor() {
    this.subscriptions = new Map(); // flightNumber -> {data, subscribers}
    this.monitoringInterval = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.apiKey = process.env.AIRLABS_API_KEY;
  }

  // Add a subscription
  addSubscription(flightNumber, wsClient, flightData) {
    console.log(`[FlightMonitor] Adding subscription for ${flightNumber}`);

    if (!this.subscriptions.has(flightNumber)) {
      this.subscriptions.set(flightNumber, {
        lastData: flightData,
        subscribers: new Set()
      });
    }

    this.subscriptions.get(flightNumber).subscribers.add(wsClient);

    // Start monitoring if not already running
    if (!this.monitoringInterval) {
      this.startMonitoring();
    }

    return true;
  }

  // Remove a subscription
  removeSubscription(flightNumber, wsClient) {
    console.log(`[FlightMonitor] Removing subscription for ${flightNumber}`);

    if (this.subscriptions.has(flightNumber)) {
      const sub = this.subscriptions.get(flightNumber);
      sub.subscribers.delete(wsClient);

      // Remove flight if no more subscribers
      if (sub.subscribers.size === 0) {
        this.subscriptions.delete(flightNumber);
        console.log(`[FlightMonitor] No more subscribers for ${flightNumber}, removed from monitoring`);
      }
    }

    // Stop monitoring if no subscriptions
    if (this.subscriptions.size === 0 && this.monitoringInterval) {
      this.stopMonitoring();
    }
  }

  // Remove all subscriptions for a client
  removeClient(wsClient) {
    console.log('[FlightMonitor] Removing client from all subscriptions');
    for (const [flightNumber, sub] of this.subscriptions.entries()) {
      this.removeSubscription(flightNumber, wsClient);
    }
  }

  // Start monitoring all subscribed flights
  startMonitoring() {
    console.log('[FlightMonitor] Starting flight monitoring service');
    this.monitoringInterval = setInterval(() => {
      this.checkAllFlights();
    }, this.checkInterval);

    // Check immediately
    this.checkAllFlights();
  }

  // Stop monitoring
  stopMonitoring() {
    console.log('[FlightMonitor] Stopping flight monitoring service');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Check all subscribed flights
  async checkAllFlights() {
    console.log(`[FlightMonitor] Checking ${this.subscriptions.size} subscribed flights`);

    for (const [flightNumber, sub] of this.subscriptions.entries()) {
      try {
        await this.checkFlight(flightNumber, sub);
      } catch (error) {
        console.error(`[FlightMonitor] Error checking flight ${flightNumber}:`, error);
      }
    }
  }

  // Check a single flight
  async checkFlight(flightNumber, subscription) {
    if (!this.apiKey || this.apiKey === 'your_airlabs_api_key_here') {
      console.error('[FlightMonitor] AirLabs API key not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://airlabs.co/api/v9/flight?api_key=${this.apiKey}&flight_iata=${flightNumber}`
      );

      if (!response.ok) {
        console.error(`[FlightMonitor] API error for ${flightNumber}: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (!data.response || data.response.length === 0) {
        console.log(`[FlightMonitor] No data found for ${flightNumber}`);
        return;
      }

      const currentFlight = data.response[0];
      const changes = this.detectChanges(subscription.lastData, currentFlight);

      if (changes.length > 0) {
        console.log(`[FlightMonitor] Changes detected for ${flightNumber}:`, changes);
        this.notifySubscribers(flightNumber, subscription.subscribers, changes, currentFlight);

        // Update last known data
        subscription.lastData = currentFlight;
      }
    } catch (error) {
      console.error(`[FlightMonitor] Error fetching flight ${flightNumber}:`, error);
    }
  }

  // Detect changes between old and new flight data (AirLabs format)
  detectChanges(oldData, newData) {
    const changes = [];

    // Check flight status
    if (oldData.status !== newData.status) {
      changes.push({
        type: 'status',
        field: 'Flight Status',
        old: oldData.status,
        new: newData.status,
        icon: '📊'
      });
    }

    // Check departure gate
    if (oldData.dep_gate !== newData.dep_gate && newData.dep_gate) {
      changes.push({
        type: 'gate',
        field: 'Departure Gate',
        old: oldData.dep_gate || 'Not assigned',
        new: newData.dep_gate,
        icon: '🚪'
      });
    }

    // Check arrival gate
    if (oldData.arr_gate !== newData.arr_gate && newData.arr_gate) {
      changes.push({
        type: 'gate',
        field: 'Arrival Gate',
        old: oldData.arr_gate || 'Not assigned',
        new: newData.arr_gate,
        icon: '🚪'
      });
    }

    // Check departure terminal
    if (oldData.dep_terminal !== newData.dep_terminal && newData.dep_terminal) {
      changes.push({
        type: 'terminal',
        field: 'Departure Terminal',
        old: oldData.dep_terminal || 'Not assigned',
        new: newData.dep_terminal,
        icon: '🏢'
      });
    }

    // Check arrival terminal
    if (oldData.arr_terminal !== newData.arr_terminal && newData.arr_terminal) {
      changes.push({
        type: 'terminal',
        field: 'Arrival Terminal',
        old: oldData.arr_terminal || 'Not assigned',
        new: newData.arr_terminal,
        icon: '🏢'
      });
    }

    // Check for delays
    const oldDelay = oldData.delayed || 0;
    const newDelay = newData.delayed || 0;
    if (newDelay > oldDelay) {
      changes.push({
        type: 'delay',
        field: 'Departure Delay',
        old: `${oldDelay} min`,
        new: `${newDelay} min`,
        icon: '⏰'
      });
    }

    // Check departure time changes
    if (oldData.dep_estimated !== newData.dep_estimated && newData.dep_estimated) {
      changes.push({
        type: 'time',
        field: 'Estimated Departure',
        old: oldData.dep_estimated || oldData.dep_time,
        new: newData.dep_estimated,
        icon: '🕐'
      });
    }

    // Check arrival time changes
    if (oldData.arr_estimated !== newData.arr_estimated && newData.arr_estimated) {
      changes.push({
        type: 'time',
        field: 'Estimated Arrival',
        old: oldData.arr_estimated || oldData.arr_time,
        new: newData.arr_estimated,
        icon: '🕐'
      });
    }

    return changes;
  }

  // Notify all subscribers of changes
  notifySubscribers(flightNumber, subscribers, changes, currentFlight) {
    const message = {
      type: 'flight-update',
      flightNumber: flightNumber,
      changes: changes,
      flightData: {
        status: currentFlight.status,
        departure: {
          gate: currentFlight.dep_gate,
          terminal: currentFlight.dep_terminal,
          estimated: currentFlight.dep_estimated,
          scheduled: currentFlight.dep_time
        },
        arrival: {
          gate: currentFlight.arr_gate,
          terminal: currentFlight.arr_terminal,
          estimated: currentFlight.arr_estimated,
          scheduled: currentFlight.arr_time
        }
      },
      timestamp: new Date().toISOString()
    };

    // Send to all subscribers
    for (const client of subscribers) {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(message));
          console.log(`[FlightMonitor] Sent update to subscriber for ${flightNumber}`);
        } catch (error) {
          console.error('[FlightMonitor] Error sending to subscriber:', error);
        }
      }
    }
  }
}

export default FlightMonitor;
