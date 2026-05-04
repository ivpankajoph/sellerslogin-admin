function EyeIcon({ hidden = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {hidden ? (
        <>
          <path d="m4 4 16 16" />
          <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
          <path d="M8.5 5.7A10.8 10.8 0 0 1 12 5c5.2 0 8.5 5 9.4 6.6a1 1 0 0 1 0 .8 16.3 16.3 0 0 1-2.7 3.4" />
          <path d="M15.5 18.3a10.8 10.8 0 0 1-3.5.7c-5.2 0-8.5-5-9.4-6.6a1 1 0 0 1 0-.8 16 16 0 0 1 4-4.5" />
        </>
      ) : (
        <>
          <path d="M2.6 11.6a1 1 0 0 0 0 .8C3.5 14 6.8 19 12 19s8.5-5 9.4-6.6a1 1 0 0 0 0-.8C20.5 10 17.2 5 12 5s-8.5 5-9.4 6.6Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function PasswordField({
  value,
  onChange,
  showPassword,
  onTogglePassword,
  placeholder = "Enter password",
  autoComplete = "current-password",
}) {
  return (
    <div className="relative">
      <input
        className="field pr-12"
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ui-muted transition hover:bg-[rgba(21,128,61,0.08)] hover:text-ui-strong"
        onClick={onTogglePassword}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        <EyeIcon hidden={showPassword} />
      </button>
    </div>
  );
}

export default PasswordField;
