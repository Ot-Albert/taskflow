import { useRef } from "react";

/**
 * Circular avatar with image or initials fallback.
 * When `editable` is true, clicking triggers a file upload.
 */
export default function ProfileAvatar({
  avatarUrl,
  initials,
  fullName,
  editable = false,
  onUpload,
  onRemove,
  size = "md",
  saving = false,
}) {
  const inputRef = useRef(null);

  function handleClick() {
    if (editable && !saving) inputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      await onUpload(file);
    }
    // Reset so selecting the same file again still fires change.
    e.target.value = "";
  }

  const sizeClass = `profile-avatar--${size}`;

  return (
    <div className={`profile-avatar ${sizeClass}`}>
      <button
        type="button"
        className="profile-avatar__button"
        onClick={handleClick}
        disabled={!editable || saving}
        aria-label={
          editable
            ? `Change profile picture for ${fullName}`
            : `Profile picture for ${fullName}`
        }
        title={editable ? "Click to change picture" : undefined}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="profile-avatar__img"
          />
        ) : (
          <span className="profile-avatar__initials" aria-hidden="true">
            {initials}
          </span>
        )}
        {editable && !saving && (
          <span className="profile-avatar__overlay">
            <span className="profile-avatar__overlay-icon">📷</span>
          </span>
        )}
        {saving && (
          <span className="profile-avatar__spinner" aria-label="Saving" />
        )}
      </button>
      {editable && inputRef && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="profile-avatar__input"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      {editable && avatarUrl && !saving && (
        <button
          type="button"
          className="profile-avatar__remove"
          onClick={onRemove}
          aria-label="Remove profile picture"
          title="Remove picture"
        >
          ✕
        </button>
      )}
    </div>
  );
}
