/**
 * Shared pointer state for mouse ship steering and click-vs-drag
 * discrimination (station travel ignores drags that moved past the threshold).
 */
export const pointerSteer = {
  moved: false,
  /** Accumulated yaw delta (rad) — consumed each frame by Ship. */
  yaw: 0,
  /** Accumulated pitch delta (rad) — consumed each frame by Ship. */
  pitch: 0,
  /** Cursor offset from screen centre, −1…1 (left/right, up/down). */
  cursorX: 0,
  cursorY: 0,
}
