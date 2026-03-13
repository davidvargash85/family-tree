import { useMemo, useState, useRef, forwardRef, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DEFAULT_MIN = new Date(1900, 0, 1);
const DEFAULT_MAX = new Date(2030, 11, 31);

const DISPLAY_FORMAT = "MM/dd/yyyy";

function parseValue(value) {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISOString(date) {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format 8 digits as MM/DD/YYYY e.g. 02132022 -> 02/13/2022 */
function maskDigitsToDateString(digits) {
  const d = digits.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Parse MM/DD/YYYY to Date or null (month 1-12, day 1-31) */
function parseMDY(str) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  return date;
}

/** Format Date to MM/DD/YYYY for display */
function formatMDY(date) {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}/${d}/${y}`;
}

function MaskedDateInputInner(
  { value, onChange, onClick, onBlur: onBlurProp, inputStyle, error, onCommitOnBlur, ...rest },
  ref
) {
  const [localValue, setLocalValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pendingDisplayRef = useRef("");
  const justCommittedRef = useRef(false);
  if (value != null && value !== "") {
    pendingDisplayRef.current = "";
    justCommittedRef.current = false;
  } else if (value === "" && !justCommittedRef.current) {
    pendingDisplayRef.current = "";
  }
  const displayValue = isTyping
    ? localValue
    : (value != null && value !== "" ? value : pendingDisplayRef.current || "");

  console.log("[DateField] MaskedInput", {
    valueProp: value,
    isTyping,
    localValue,
    pendingDisplay: pendingDisplayRef.current || "(empty)",
    displayValue,
    justCommitted: justCommittedRef.current,
  });

  const handleChange = useCallback(
    (e) => {
      const raw = e.target.value;
      if (raw === "") {
        setIsTyping(false);
        setLocalValue("");
        pendingDisplayRef.current = "";
        onChange(null);
        console.log("[DateField] cleared (typed)");
        return;
      }
      setIsTyping(true);
      const masked = maskDigitsToDateString(raw);
      setLocalValue(masked);
      if (masked.length === 10) {
        const date = parseMDY(masked);
        if (date) {
          justCommittedRef.current = true;
          pendingDisplayRef.current = masked;
          setIsTyping(false);
          setLocalValue("");
          onChange(date);
          console.log("[DateField] date selected (typed)", { masked, date: date.toISOString().slice(0, 10) });
        }
      }
    },
    [onChange]
  );

  const handleBlur = useCallback(
    (e) => {
      const v = isTyping ? localValue : (e.target.value || "").trim();
      console.log("[DateField] blur", { value: v, isTyping });
      if (v.length === 10) {
        const date = parseMDY(v);
        if (date) {
          justCommittedRef.current = true;
          pendingDisplayRef.current = v;
          setIsTyping(false);
          setLocalValue("");
          onCommitOnBlur?.();
          onChange(date);
          console.log("[DateField] date committed on blur", { masked: v, date: date.toISOString().slice(0, 10) });
        }
      } else {
        setIsTyping(false);
        setLocalValue("");
      }
      onBlurProp?.(e);
    },
    [localValue, isTyping, onChange, onBlurProp]
  );

  const handleFocus = useCallback(() => {
    console.log("[DateField] focus (picker opening)", { valueProp: value });
    setIsTyping(true);
    setLocalValue(value != null ? value : "");
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onClick={onClick}
      placeholder="MM/DD/YYYY"
      className={rest.className ?? ""}
      style={{ ...inputStyle, ...(rest.style || {}) }}
      aria-invalid={error}
      {...rest}
      onBlur={handleBlur}
    />
  );
}

const MaskedDateInput = forwardRef(MaskedDateInputInner);

export default function DateField({
  id,
  label,
  value,
  onChange,
  placeholder = "Optional",
  minDate = DEFAULT_MIN,
  maxDate = DEFAULT_MAX,
  style = {},
  error = false,
  openUp = false,
}) {
  const selected = useMemo(() => parseValue(value), [value]);
  const openToDate = selected ?? new Date();
  const committedOnBlurRef = useRef(false);

  console.log("[DateField] render", {
    valueProp: value,
    selected: selected ? selected.toISOString().slice(0, 10) : null,
    openToDate: openToDate.toISOString().slice(0, 10),
  });

  const handleChange = useCallback(
    (date) => {
      if (date == null) {
        // Defer applying null so our blur handler can run first and set committedOnBlurRef
        queueMicrotask(() => {
          if (!committedOnBlurRef.current) {
            console.log("[DateField] date selected", { date: null, iso: "" });
            onChange("");
          } else {
            console.log("[DateField] ignoring spurious null from DatePicker (blur commit)");
          }
          committedOnBlurRef.current = false;
        });
        return;
      }
      // Do not clear committedOnBlurRef here: the DatePicker may send null next (on calendar
      // close), and the microtask must still see the ref true so we don't overwrite the value.
      const iso = toISOString(date);
      console.log("[DateField] date selected", { date: date.toISOString().slice(0, 10), iso });
      onChange(iso);
    },
    [onChange]
  );

  const onCommitOnBlur = useCallback(() => {
    committedOnBlurRef.current = true;
  }, []);

  const inputStyle = useMemo(
    () => ({
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      width: "100%",
      boxSizing: "border-box",
      ...(error ? { borderColor: "#dc2626" } : {}),
      ...style,
    }),
    [error, style]
  );

  const customInput = useMemo(
    () => (
      <MaskedDateInput
        inputStyle={inputStyle}
        error={error}
        className="date-field-input"
        onCommitOnBlur={onCommitOnBlur}
      />
    ),
    [inputStyle, error, onCommitOnBlur]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label != null && (
        <label htmlFor={id} style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
          {label}
        </label>
      )}
      <DatePicker
        id={id}
        selected={selected}
        onChange={handleChange}
        openToDate={openToDate}
        placeholderText={placeholder}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat={DISPLAY_FORMAT}
        showYearDropdown
        showMonthDropdown
        scrollableYearDropdown
        scrollableMonthYearDropdown
        yearDropdownItemNumber={maxDate.getFullYear() - minDate.getFullYear() + 1}
        isClearable
        customInput={customInput}
        popperPlacement={openUp ? "top-start" : undefined}
      />
    </div>
  );
}
