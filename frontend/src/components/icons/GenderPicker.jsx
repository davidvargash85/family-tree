import { GenderIcon } from "./GenderIcon.jsx";
import { Button } from "../ui";

const pickerStyles = {
  wrap: { display: "flex", gap: 8, alignItems: "center" },
  option: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#6b7280",
  },
  optionSelected: {
    borderColor: "#1e3a5f",
    backgroundColor: "#f0f4f8",
    color: "#1e3a5f",
  },
};

/**
 * Two-button icon picker for gender. Click to select, click again to deselect.
 * No selection = unspecified.
 * @param {string} value - "" | "male" | "female"
 * @param {(value: string) => void} onChange
 * @param {number} [iconSize] - size of Mars/Venus icons
 */
export function GenderPicker({ value, onChange, iconSize = 22, id, "aria-label": ariaLabel }) {
  const handleClick = (gender) => {
    onChange(value === gender ? "" : gender);
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel ?? "Gender"}
      style={pickerStyles.wrap}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Male (click again to clear)"
        aria-label={value === "male" ? "Male, selected. Click to clear" : "Male"}
        aria-pressed={value === "male"}
        style={{
          ...pickerStyles.option,
          ...(value === "male" ? pickerStyles.optionSelected : {}),
        }}
        onClick={() => handleClick("male")}
      >
        <GenderIcon variant="male" size={iconSize} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Female (click again to clear)"
        aria-label={value === "female" ? "Female, selected. Click to clear" : "Female"}
        aria-pressed={value === "female"}
        style={{
          ...pickerStyles.option,
          ...(value === "female" ? pickerStyles.optionSelected : {}),
        }}
        onClick={() => handleClick("female")}
      >
        <GenderIcon variant="female" size={iconSize} />
      </Button>
    </div>
  );
}
