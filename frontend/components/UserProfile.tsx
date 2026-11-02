"use client";

const DUMMY_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="20" fill="#cfd8d4"/>
      <circle cx="20" cy="16" r="7" fill="#8a9a93"/>
      <path d="M6 36c1.5-8 8-12 14-12s12.5 4 14 12" fill="#8a9a93"/>
    </svg>
  `);

type ProfileProps = { name?: string | null; email?: string | null; image?: string | null };

export function UserProfile({ name, email, image }: ProfileProps) {
  return (
    <div className="user-profile">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image || DUMMY_AVATAR}
        alt={name || email || "User"}
        className="user-profile-avatar"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = DUMMY_AVATAR;
        }}
      />
      <div className="user-profile-meta">
        <div className="user-profile-name">{name || "Pengguna"}</div>
        <div className="user-profile-email">{email}</div>
      </div>
    </div>
  );
}