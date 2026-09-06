import { useMemo, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { PulsoPost, Profile } from "../../core/social/Pulso";
import "./pulso.css";

interface Props {
  kernel: VirtualKernel;
}

type Tab = "feed" | "buscar" | "perfil";

const LEAK_LABEL: Record<string, string> = {
  password: "🔑 contraseña",
  pet: "🐶 mascota",
  work: "🏢 trabajo",
  birthday: "🎂 cumpleaños",
};

/**
 * Pulso — la red social del mundo, dentro de ÑANDE.
 *
 * Muestra el feed de los habitantes, permite seguir gente y ver perfiles.
 * Y resalta las FILTRACIONES: cuando un NPC deja escapar su contraseña, su
 * mascota o su trabajo, aparece marcado — eso es OSINT aprovechable. La
 * clave que ves acá es la misma que abre su sitio.
 */
export default function PulsoView({ kernel }: Props) {
  const [tab, setTab] = useState<Tab>("feed");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [, force] = useState(0);

  const feed = useMemo(() => kernel.pulso.feed(30), [kernel]);
  const results = query.trim() ? kernel.pulso.search(query) : [];
  const profile = selected ? kernel.pulso.profile(selected) : null;

  function openProfile(id: string) {
    setSelected(id);
    setTab("perfil");
  }

  function toggleFollow(id: string) {
    if (kernel.pulso.isFollowing(id)) kernel.pulso.unfollow(id);
    else kernel.pulso.follow(id);
    force((n) => n + 1);
  }

  return (
    <div className="pulso">
      <div className="pulso__tabs">
        <button data-on={tab === "feed"} onClick={() => setTab("feed")}>Feed</button>
        <button data-on={tab === "buscar"} onClick={() => setTab("buscar")}>Buscar gente</button>
        <button data-on={tab === "perfil"} onClick={() => setTab("perfil")} disabled={!profile}>
          Perfil
        </button>
        <span className="pulso__me">Seguís a {kernel.pulso.followingCount()}</span>
      </div>

      {tab === "feed" && (
        <div className="pulso__list">
          {feed.map((post) => (
            <PostCard key={post.id} post={post} onOpen={() => openProfile(post.authorId)} />
          ))}
        </div>
      )}

      {tab === "buscar" && (
        <div className="pulso__search">
          <input
            className="pulso__input"
            placeholder="Buscar por nombre o @handle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="pulso__list">
            {results.map((p) => (
              <ProfileRow key={p.id} p={p} onOpen={() => openProfile(p.id)} />
            ))}
            {query.trim() && results.length === 0 && (
              <p className="pulso__empty">Nadie con ese nombre.</p>
            )}
          </div>
        </div>
      )}

      {tab === "perfil" && profile && (
        <ProfileView
          profile={profile}
          following={kernel.pulso.isFollowing(profile.id)}
          onFollow={() => toggleFollow(profile.id)}
        />
      )}
    </div>
  );
}

function PostCard({ post, onOpen }: { post: PulsoPost; onOpen: () => void }) {
  return (
    <div className={`pulso__post${post.leak ? " pulso__post--leak" : ""}`}>
      <div className="pulso__post-head">
        <button className="pulso__author" onClick={onOpen}>
          <strong>{post.authorName}</strong> <span>{post.handle}</span>
        </button>
        <span className="pulso__ago">
          {post.daysAgo === 0 ? "hoy" : `hace ${post.daysAgo}d`}
        </span>
      </div>
      <p className="pulso__text">{post.text}</p>
      <div className="pulso__meta">
        <span>♥ {post.likes}</span>
        {post.leak && (
          <span className="pulso__leak" title="Información aprovechable (OSINT)">
            filtró {LEAK_LABEL[post.leak]}: <code>{post.leakValue}</code>
          </span>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ p, onOpen }: { p: Profile; onOpen: () => void }) {
  return (
    <button className="pulso__row" onClick={onOpen}>
      <strong>{p.name}</strong> <span>{p.handle}</span>
      <span className="pulso__row-bio">{p.bio}</span>
    </button>
  );
}

function ProfileView({
  profile,
  following,
  onFollow,
}: {
  profile: Profile;
  following: boolean;
  onFollow: () => void;
}) {
  const leaks = profile.posts.filter((p) => p.leak);
  return (
    <div className="pulso__profile">
      <div className="pulso__profile-head">
        <div>
          <div className="pulso__profile-name">{profile.name}</div>
          <div className="pulso__profile-handle">{profile.handle}</div>
          <div className="pulso__profile-bio">{profile.bio}</div>
          <div className="pulso__profile-followers">
            {profile.followers.toLocaleString()} seguidores
          </div>
        </div>
        <button
          className={`pulso__follow${following ? " on" : ""}`}
          onClick={onFollow}
        >
          {following ? "Siguiendo" : "Seguir"}
        </button>
      </div>

      {leaks.length > 0 && (
        <div className="pulso__osint">
          <strong>🔍 OSINT — lo que dejó ver</strong>
          <ul>
            {leaks.map((l) => (
              <li key={l.id}>
                {LEAK_LABEL[l.leak!]}: <code>{l.leakValue}</code>
                {l.leak === "password" && (
                  <span className="pulso__osint-tip">
                    {" "}— probá esta clave en su sitio, sin crackear
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pulso__list">
        {profile.posts.map((post) => (
          <PostCard key={post.id} post={post} onOpen={() => {}} />
        ))}
      </div>
    </div>
  );
}
