import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { PulsoPost, Profile } from "../../core/social/Pulso";
import { monogramDataUri } from "../../core/art/Avatar";
import { Glyph } from "../ui/Glyph";
import "./pulso.css";

interface Props {
  kernel: VirtualKernel;
}

type Tab = "feed" | "buscar" | "perfil" | "notis";

const LEAK_LABEL: Record<string, string> = {
  password: "contraseña",
  pet: "mascota",
  work: "trabajo",
  birthday: "cumpleaños",
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
  const [scope, setScope] = useState<"all" | "following">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // El mundo vivo: cuando pasa una noticia, refrescamos el feed (posts nuevos).
  useEffect(() => {
    const bump = () => force((n) => n + 1);
    const unsub = kernel.events.subscribe("world.news.created", bump);
    return () => unsub();
  }, [kernel]);

  const trends = kernel.pulso.trending(8);
  let feed = kernel.pulso.feed(40, scope);
  if (tagFilter) feed = feed.filter((p) => p.text.toLowerCase().includes(tagFilter));
  feed = feed.slice(0, 30);
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
        <button
          data-on={tab === "perfil"}
          onClick={() => setTab("perfil")}
          disabled={!profile}
          title={profile ? "Tu perfil" : "Abrí un perfil desde el feed o la búsqueda"}
        >
          Perfil
        </button>
        <button
          data-on={tab === "notis"}
          onClick={() => setTab("notis")}
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <Glyph name="bell" size={14} /> Notis{kernel.pulso.unreadNotifications() > 0 ? ` (${kernel.pulso.unreadNotifications()})` : ""}
        </button>
        <span className="pulso__me">Seguís a {kernel.pulso.followingCount()}</span>
      </div>

      {tab === "notis" && (
        <div className="pulso__list">
          {kernel.pulso.notifications().length === 0 && (
            <p className="pulso__empty">Sin notificaciones. Comentá en un post y te responden.</p>
          )}
          {kernel.pulso.notifications().map((n, i) => (
            <div key={i} className="pulso__post">
              <p className="pulso__text">
                <strong>{n.author}</strong> te respondió: {n.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "feed" && (
        <>
          <div style={feedBar}>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={scope === "all" ? segOn : seg} onClick={() => setScope("all")}>Explorar</button>
              <button
                style={scope === "following" ? segOn : seg}
                onClick={() => setScope("following")}
                title={kernel.pulso.followingCount() === 0 ? "Todavía no seguís a nadie" : ""}
              >
                Siguiendo{kernel.pulso.followingCount() > 0 ? ` (${kernel.pulso.followingCount()})` : ""}
              </button>
            </div>
          </div>

          {trends.length > 0 && (
            <div style={trendWrap}>
              <span style={{ ...trendTitle, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Glyph name="trend" size={15} /> Tendencias
              </span>
              {trends.map((t) => (
                <button
                  key={t.tag}
                  style={tagFilter === t.tag.replace(/^#/, "").toLowerCase() ? trendChipOn : trendChip}
                  onClick={() => {
                    const clean = t.tag.toLowerCase();
                    setTagFilter((cur) => (cur === clean ? null : clean));
                  }}
                >
                  {t.tag} <span style={{ opacity: 0.6 }}>{t.count}</span>
                </button>
              ))}
            </div>
          )}

          {tagFilter && (
            <div style={{ padding: "0 12px", marginBottom: 6, fontSize: 12.5, color: "#8b98a5" }}>
              Filtrando por <strong style={{ color: "#7cc4ff" }}>{tagFilter}</strong>{" "}
              <button style={clearBtn} onClick={() => setTagFilter(null)}>✕ limpiar</button>
            </div>
          )}

          <div className="pulso__list">
            {feed.length === 0 && (
              <p className="pulso__empty">
                {scope === "following"
                  ? "No seguís a nadie todavía. Buscá gente y seguila para armar tu feed."
                  : tagFilter
                    ? "Nada con ese tema por ahora."
                    : "El mundo está tranquilo. En un rato habrá movimiento."}
              </p>
            )}
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                kernel={kernel}
                bump={() => force((n) => n + 1)}
                onOpen={() => openProfile(post.authorId)}
              />
            ))}
          </div>
        </>
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
          kernel={kernel}
          bump={() => force((n) => n + 1)}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  onOpen,
  kernel,
  bump,
}: {
  post: PulsoPost;
  onOpen: () => void;
  kernel: VirtualKernel;
  bump: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const liked = kernel.pulso.hasLiked(post.id);
  const comments = kernel.pulso.commentsFor(post.id);
  const thread = kernel.pulso.threadFor(post);

  const sendComment = () => {
    if (!draft.trim()) return;
    kernel.pulso.comment(post.id, draft, post.authorName);
    setDraft("");
    bump();
  };

  return (
    <div className={`pulso__post${post.leak ? " pulso__post--leak" : ""}`}>
      <div className="pulso__post-head">
        <button className="pulso__author" onClick={onOpen}>
          <img
            className="pulso__avatar"
            src={monogramDataUri(post.authorId || post.authorName, post.authorName, 40)}
            alt=""
            width={36}
            height={36}
          />
          <span>
            <strong>{post.authorName}</strong> <span>{post.handle}</span>
          </span>
        </button>
        <span className="pulso__ago">
          {post.daysAgo === 0 ? "hoy" : `hace ${post.daysAgo}d`}
        </span>
      </div>
      <p className="pulso__text">{post.text}</p>
      <div className="pulso__meta">
        <button
          className="pulso__like"
          aria-pressed={liked}
          onClick={() => { kernel.pulso.toggleLike(post.id); bump(); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: liked ? "#ff6b81" : "inherit",
            font: "inherit",
            padding: 0,
          }}
        >
          <Glyph name="heart" size={15} /> {kernel.pulso.likeCountFor(post)}
        </button>
        <button
          className="pulso__like"
          onClick={() => setOpen((o) => !o)}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "inherit", font: "inherit", padding: 0 }}
        >
          <Glyph name="comment" size={15} /> {comments.length + thread.length > 0 ? comments.length + thread.length : ""}
        </button>
        {post.leak && (
          <span
            className="pulso__leak"
            title="Dato aprovechable para OSINT — lo que la persona dejó ver sin querer"
          >
            <Glyph name="search" size={13} />
            <span className="pulso__leak-k">{LEAK_LABEL[post.leak]}</span>
            <code>{post.leakValue}</code>
          </span>
        )}
      </div>
      {open && (
        <div className="pulso__comments" style={{ marginTop: 8 }}>
          {thread.map((r, i) => (
            <div key={`t${i}`} style={{ fontSize: 13, padding: "2px 0", color: "#c3ccd6" }}>
              <strong>{r.author}</strong> <span style={{ opacity: 0.6 }}>{r.handle}</span>: {r.text}
            </div>
          ))}
          {comments.map((c, i) => (
            <div key={i} style={{ fontSize: 13, padding: "2px 0" }}>
              <strong>{c.author}:</strong> {c.text}
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input
              className="pulso__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
              placeholder="Comentá…"
              style={{ flex: 1 }}
            />
            <button className="pulso__follow" onClick={sendComment}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ p, onOpen }: { p: Profile; onOpen: () => void }) {
  return (
    <button className="pulso__row" onClick={onOpen}>
      <img className="pulso__avatar" src={monogramDataUri(p.id || p.name, p.name, 40)} alt="" width={36} height={36} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span><strong>{p.name}</strong> <span>{p.handle}</span></span>
        <span className="pulso__row-bio">{p.bio}</span>
      </span>
    </button>
  );
}

function ProfileView({
  profile,
  following,
  onFollow,
  kernel,
  bump,
}: {
  profile: Profile;
  following: boolean;
  onFollow: () => void;
  kernel: VirtualKernel;
  bump: () => void;
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
          <PostCard key={post.id} post={post} kernel={kernel} bump={bump} onOpen={() => {}} />
        ))}
      </div>
    </div>
  );
}

const feedBar: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px 4px" };
const seg: CSSProperties = { background: "transparent", color: "#8b98a5", border: "1px solid #2b3d4e", borderRadius: 999, padding: "5px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 };
const segOn: CSSProperties = { ...seg, background: "rgba(124,196,255,0.15)", color: "#7cc4ff", borderColor: "#3a6ea5" };
const trendWrap: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "4px 12px 10px" };
const trendTitle: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#e8b04b", marginRight: 2 };
const trendChip: CSSProperties = { background: "#111820", color: "#9fb0c0", border: "1px solid #1b2733", borderRadius: 999, padding: "4px 10px", fontSize: 12, cursor: "pointer" };
const trendChipOn: CSSProperties = { ...trendChip, background: "rgba(124,196,255,0.15)", color: "#7cc4ff", borderColor: "#3a6ea5" };
const clearBtn: CSSProperties = { background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 12, padding: 0 };
