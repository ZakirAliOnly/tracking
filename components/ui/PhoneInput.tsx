"use client";

export const PHONE_DIGITS = 11;

/** Keeps only digits and never more than a full phone number's worth. */
export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_DIGITS);
}

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (digits: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
};

/**
 * Phone entry is fixed at 11 digits everywhere — letters, spaces and dashes are
 * dropped as they are typed and the field stops accepting input at 11.
 */
export function PhoneInput({
  name,
  value,
  defaultValue,
  onChange,
  required,
  placeholder = "03001234567",
  className,
  inputRef,
}: Props) {
  const isControlled = value !== undefined;

  return (
    <input
      ref={inputRef}
      name={name}
      type="tel"
      inputMode="numeric"
      autoComplete="off"
      maxLength={PHONE_DIGITS}
      pattern="\d{11}"
      required={required}
      placeholder={placeholder}
      className={className}
      {...(isControlled ? { value } : { defaultValue })}
      onChange={(e) => {
        const digits = sanitizePhone(e.target.value);
        // Uncontrolled fields still need the rejected characters removed
        if (!isControlled) e.target.value = digits;
        onChange?.(digits);
      }}
    />
  );
}
