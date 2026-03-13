/**
 * Shared z-index scale for the app. Use these so overlays stack predictably.
 * Higher values render on top. Add new layers here instead of magic numbers.
 */
export const zIndex = {
  /** In-context dropdowns (e.g. search results list inside a form). */
  dropdown: 1,
  /** Floating popovers (e.g. member detail popover on the tree). */
  popover: 1000,
  /** Modal overlay and dialog. */
  modal: 1100,
  /** Full-screen or secondary modals (e.g. photo viewer) above standard modals. */
  modalElevated: 1200,
  /** Portaled datepicker / pickers that must appear above modals. */
  datepicker: 1300,
};
