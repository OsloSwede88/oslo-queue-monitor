import { useMemo } from 'react';
import './FlightTimeline.css';

function FlightTimeline({ flightData }) {
  // Calculate flight progress and stage
  const flightProgress = useMemo(() => {
    if (!flightData) return { stage: 'scheduled', progress: 0 };

    const now = Date.now();
    const departure = new Date(
      flightData.actualDeparture || flightData.scheduledDeparture
    ).getTime();
    const arrival = new Date(
      flightData.estimatedArrival || flightData.scheduledArrival
    ).getTime();

    // Not departed yet
    if (now < departure) {
      return { stage: 'scheduled', progress: 0 };
    }

    // Already landed
    if (now > arrival) {
      return { stage: 'landed', progress: 100 };
    }

    // In flight - calculate progress
    const totalTime = arrival - departure;
    const elapsed = now - departure;
    const progress = Math.min(Math.max((elapsed / totalTime) * 100, 0), 100);

    // Determine stage based on progress
    let stage;
    if (progress < 5) stage = 'boarding';
    else if (progress < 95) stage = 'enRoute';
    else stage = 'arriving';

    return { stage, progress };
  }, [flightData]);

  const { stage, progress } = flightProgress;

  // Get node state (completed, active, upcoming)
  const getNodeState = (nodeName) => {
    const nodeProgress = {
      departed: 0,
      enRoute: 50,
      arrived: 100,
    };

    if (progress >= nodeProgress[nodeName]) return 'completed';
    if (Math.abs(progress - nodeProgress[nodeName]) < 10) return 'active';
    return 'upcoming';
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format ETA
  const formatETA = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'Arrived';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get status label
  const getStatusLabel = () => {
    switch (stage) {
      case 'scheduled':
        return 'Scheduled';
      case 'boarding':
        return 'Boarding';
      case 'enRoute':
        return 'In Flight';
      case 'arriving':
        return 'Approaching';
      case 'landed':
        return 'Landed';
      default:
        return flightData?.status || 'Unknown';
    }
  };

  if (!flightData) return null;

  const isActive = stage === 'enRoute' || stage === 'boarding' || stage === 'arriving';

  return (
    <div className="flight-timeline">
      {/* Header with Status and ETA */}
      <div className="timeline-header">
        <span className={`timeline-status status-${stage}`}>
          {isActive && <span className="live-dot"></span>}
          {getStatusLabel()}
          {isActive && stage === 'enRoute' && (
            <span className="progress-badge">{Math.round(progress)}%</span>
          )}
        </span>
        <span className="timeline-eta text-secondary">
          {isActive
            ? `ETA: ${formatETA(flightData.estimatedArrival || flightData.scheduledArrival)}`
            : stage === 'scheduled'
            ? `Departs: ${formatTime(flightData.scheduledDeparture)}`
            : stage === 'landed'
            ? `Arrived: ${formatTime(flightData.actualArrival || flightData.estimatedArrival)}`
            : ''}
        </span>
      </div>

      {/* Progress Track and Nodes */}
      <div className="timeline-track-container">
        <div className="timeline-track">
          {/* Animated Progress Fill */}
          <div
            className="timeline-progress"
            style={{ width: `${progress}%` }}
          ></div>

          {/* Departure Node */}
          <div
            className={`timeline-node ${getNodeState('departed')}`}
            style={{ left: '0%' }}
          >
            <div className="node-ring"></div>
            <div className="timeline-label">
              <span className="timeline-label-text">Departed</span>
              <span className="timeline-time text-tertiary">
                {formatTime(flightData.actualDeparture || flightData.scheduledDeparture)}
              </span>
            </div>
          </div>

          {/* En Route Node */}
          <div
            className={`timeline-node ${getNodeState('enRoute')}`}
            style={{ left: '50%' }}
          >
            <div className="node-ring"></div>
            <div className="timeline-label">
              <span className="timeline-label-text">En Route</span>
            </div>
          </div>

          {/* Arrival Node */}
          <div
            className={`timeline-node ${getNodeState('arrived')}`}
            style={{ left: '100%' }}
          >
            <div className="node-ring"></div>
            <div className="timeline-label">
              <span className="timeline-label-text">Arrived</span>
              <span className="timeline-time text-tertiary">
                {formatTime(flightData.estimatedArrival || flightData.scheduledArrival)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightTimeline;
