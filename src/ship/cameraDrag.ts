/**
 * Shared flag between the ChaseCamera drag-to-orbit handler and the station
 * click-to-travel handler: a drag that moved past the threshold sets `moved`, so
 * the click that ends the drag doesn't also fire an autopilot. Reset on each
 * pointer-down.
 */
export const cameraDrag = { moved: false }
