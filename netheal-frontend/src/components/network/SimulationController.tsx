import { Play, Square, RotateCcw, ZapOff, CheckCircle2, AlertTriangle, FastForward, ShieldAlert } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { EndpointSelector } from './EndpointSelector';

export function SimulationController() {
  const {
    failures,
    source,
    destination,
    routingMethod,
    setRoutingMethod,
    simulationState,
    currentHopIndex,
    simulationSpeed,
    setSimulationSpeed,
    runSimulation,
    stopSimulation,
    failLink,
    restoreLink,
    failRouter,
    restoreRouter,
    clearFailures,
    snapshot,
    simulationMessage,
  } = useNetwork();

  const { route, status } = snapshot;
  const isRunning = simulationState === 'running';
  const isCalculating = simulationState === 'calculating';
  const isBusy = isRunning || isCalculating;

  // Preset failure helpers for quick scenario testing
  const isR5R7Failed = failures.links.includes('R5-R7');
  const isR5Failed = failures.routers.includes('R5');
  const isR7Isolated = failures.links.includes('R5-R7') && failures.links.includes('R6-R7');

  const handleToggleR5R7 = async () => {
    if (isR5R7Failed) {
      await restoreLink('R5-R7');
    } else {
      await failLink('R5-R7');
    }
  };

  const handleToggleR5 = async () => {
    if (isR5Failed) {
      await restoreRouter('R5');
    } else {
      await failRouter('R5');
    }
  };

  const handleToggleIsolation = async () => {
    if (isR7Isolated) {
      await restoreLink('R5-R7');
      await restoreLink('R6-R7');
    } else {
      await failLink('R5-R7');
      await failLink('R6-R7');
    }
  };

  return (
    <div className="sim-controller">
      {/* 1. Endpoint & Algorithm Selectors */}
      <div className="sim-controller__top">
        <EndpointSelector idPrefix="sim-top" />

        <div className="sim-controller__algorithm">
          <label className="label">Routing Method</label>
          <div className="segmented" role="group" aria-label="Routing Method">
            <button
              type="button"
              className={routingMethod === 'bfs' ? 'is-active' : ''}
              onClick={() => setRoutingMethod('bfs')}
              disabled={isBusy}
            >
              BFS (Hops)
            </button>
            <button
              type="button"
              className={routingMethod === 'dijkstra' ? 'is-active' : ''}
              onClick={() => setRoutingMethod('dijkstra')}
              disabled={isBusy}
            >
              Dijkstra (Latency)
            </button>
            <button
              type="button"
              className={routingMethod === 'ml' ? 'is-active' : ''}
              onClick={() => setRoutingMethod('ml')}
              disabled={isBusy}
            >
              ML Quality-Assisted
            </button>
          </div>
        </div>
      </div>

      {/* 2. Simulation Execution Toolbar */}
      <div className="sim-controller__bar">
        <div className="sim-controller__actions">
          {!isRunning ? (
            <button
              type="button"
              className={`btn btn--primary btn--run ${isCalculating ? 'btn--loading' : ''}`}
              onClick={runSimulation}
              disabled={isCalculating}
            >
              <Play size={16} fill="currentColor" />
              {isCalculating ? 'Calculating Route…' : 'Run Simulation'}
            </button>
          ) : (
            <button type="button" className="btn btn--danger btn--run" onClick={stopSimulation}>
              <Square size={16} fill="currentColor" />
              Stop Simulation
            </button>
          )}

          <div className="speed-selector" title="Simulation animation speed">
            <FastForward size={14} className="muted" />
            <button
              type="button"
              className={`speed-btn ${simulationSpeed === 0.5 ? 'is-active' : ''}`}
              onClick={() => setSimulationSpeed(0.5)}
            >
              0.5x
            </button>
            <button
              type="button"
              className={`speed-btn ${simulationSpeed === 1.0 ? 'is-active' : ''}`}
              onClick={() => setSimulationSpeed(1.0)}
            >
              1x
            </button>
            <button
              type="button"
              className={`speed-btn ${simulationSpeed === 2.0 ? 'is-active' : ''}`}
              onClick={() => setSimulationSpeed(2.0)}
            >
              2x
            </button>
          </div>
        </div>

        {/* Status Indicator Badge */}
        <div className="sim-controller__status-pill">
          {simulationState === 'idle' && (
            <span className="pill pill--idle">Ready to Simulate</span>
          )}
          {simulationState === 'calculating' && (
            <span className="pill pill--calculating">Calculating Route from Backend…</span>
          )}
          {simulationState === 'running' && (
            <span className="pill pill--running">
              <span className="pulsing-dot" />
              Packet in Transit (Hop {Math.min(currentHopIndex + 1, route?.path.length || 1)} of{' '}
              {route?.path.length || 1})
            </span>
          )}
          {simulationState === 'completed' && (
            <span className="pill pill--completed">
              <CheckCircle2 size={13} /> Packet Delivered Successfully
            </span>
          )}
          {simulationState === 'failed' && (
            <span className="pill pill--failed">
              <AlertTriangle size={13} /> Simulation Blocked
            </span>
          )}
        </div>
      </div>

      {/* 3. Self-Healing Alert or Unreachable Banner */}
      {status === 'unreachable' && (
        <div className="sim-alert sim-alert--danger" role="alert">
          <ShieldAlert size={18} />
          <div>
            <strong>Destination Unreachable</strong>
            <p>
              {simulationMessage ||
                `No feasible route exists from ${source} to ${destination} under current network failures.`}
            </p>
          </div>
        </div>
      )}

      {status === 'rerouted' && (
        <div className="sim-alert sim-alert--reroute" role="status">
          <div className="sim-alert__icon">⚡</div>
          <div>
            <strong>Self-Healing Reroute Engaged</strong>
            <p>
              Network failure detected. NetHeal recalculated an alternative route avoiding failed components:
              <strong className="text-cyan"> {route?.path.join(' → ')}</strong>
            </p>
          </div>
        </div>
      )}

      {/* 4. Quick Demonstration Scenarios Bar */}
      <div className="quick-scenarios">
        <span className="quick-scenarios__label">Quick Demonstration Presets:</span>
        <div className="quick-scenarios__buttons">
          <button
            type="button"
            className={`btn btn--sm ${isR5R7Failed ? 'btn--active-danger' : 'btn--ghost'}`}
            onClick={handleToggleR5R7}
            disabled={isBusy}
            title="Fail link R5-R7 to force rerouting through R4-R6-R7"
          >
            <ZapOff size={13} /> {isR5R7Failed ? 'Restore Link R5–R7' : 'Fail Link R5–R7'}
          </button>
          <button
            type="button"
            className={`btn btn--sm ${isR5Failed ? 'btn--active-danger' : 'btn--ghost'}`}
            onClick={handleToggleR5}
            disabled={isBusy}
            title="Fail intermediate router R5 to force alternate route"
          >
            <ZapOff size={13} /> {isR5Failed ? 'Restore Router R5' : 'Fail Router R5'}
          </button>
          <button
            type="button"
            className={`btn btn--sm ${isR7Isolated ? 'btn--active-danger' : 'btn--ghost'}`}
            onClick={handleToggleIsolation}
            disabled={isBusy}
            title="Fail both R5-R7 and R6-R7 to test unreachable destination handling"
          >
            <ZapOff size={13} /> {isR7Isolated ? 'Restore R7 Links' : 'Disconnect R7 (Isolation)'}
          </button>
          {(failures.routers.length > 0 || failures.links.length > 0) && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={clearFailures}
              disabled={isBusy}
              title="Clear all failures and restore baseline healthy topology"
            >
              <RotateCcw size={13} /> Restore All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
