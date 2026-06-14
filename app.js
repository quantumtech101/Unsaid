import { createClient } from "https://esm.sh/@supabase/supabase-js"

// ─── Supabase ────────────────────────────────────────────────
const supabase = createClient(
  "https://omljhzenihgidoegfiqx.supabase.co",
  "sb_publishable_Jn2n5ukGCJe356ZUWuZMnw_jwBgz2EU"
)

// ─── State ───────────────────────────────────────────────────
let currentFilter = "recent"
let pendingNewPosts = false
let cachedMessages = []
let cachedReplies  = []
let likedIds = new Set(JSON.parse(localStorage.getItem("likedIds") || "[]"))

// ─── Username ────────────────────────────────────────────────
let username = localStorage.getItem("username")
if (!username) {
  username = "Ghost_" + Math.floor(Math.random() * 9999)
  localStorage.setItem("username", username)
}

// ─── Elements ────────────────────────────────────────────────
const feed          = document.getElementById("feed")
const emptyState    = document.getElementById("empty-state")
const messageInput  = document.getElementById("message")
const postBtn       = document.getElementById("post-btn")
const newBanner     = document.getElementById("new-banner")
const userBadge     = document.getElementById("user-badge")
const composeAvatar = document.getElementById("compose-avatar")
const charRingFill  = document.querySelector("#char-ring .fill")
const charRemaining = document.getElementById("char-remaining")
const tabs          = document.querySelectorAll(".tab-btn")
const themeToggle   = document.getElementById("theme-toggle")
const themeIcon     = document.getElementById("theme-icon")
const nameModal     = document.getElementById("name-modal")
const nameInput     = document.getElementById("name-input")
const nameSaveBtn   = document.getElementById("name-save-btn")

// ─── Theme ───────────────────────────────────────────────────
const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
const SUN_SVG  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`

let isDark = localStorage.getItem("theme") !== "light"
function applyTheme() {
  document.body.classList.toggle("light", !isDark)
  themeToggle.innerHTML = isDark ? MOON_SVG : SUN_SVG
}
applyTheme()
themeToggle.addEventListener("click", () => {
  isDark = !isDark
  localStorage.setItem("theme", isDark ? "dark" : "light")
  applyTheme()
})

// ─── Avatar gradients ─────────────────────────────────────────
const GRADS = [
  "linear-gradient(135deg,#1d9bf0,#7856ff)",
  "linear-gradient(135deg,#f91880,#7856ff)",
  "linear-gradient(135deg,#00ba7c,#1d9bf0)",
  "linear-gradient(135deg,#ffd400,#f91880)",
  "linear-gradient(135deg,#ff7a00,#f91880)",
  "linear-gradient(135deg,#7856ff,#00ba7c)",
]
function grad(name = "") {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return GRADS[h % GRADS.length]
}

// ─── Init UI with username ────────────────────────────────────
function applyUsername() {
  userBadge.textContent = "@" + username
  composeAvatar.textContent = username.charAt(0).toUpperCase()
  composeAvatar.style.background = grad(username)
}
applyUsername()

userBadge.addEventListener("click", () => {
  nameInput.value = username
  nameModal.classList.add("open")
  nameInput.focus()
  nameInput.select()
})
nameSaveBtn.addEventListener("click", saveName)
nameInput.addEventListener("keydown", e => { if (e.key === "Enter") saveName() })
nameModal.addEventListener("click", e => { if (e.target === nameModal) nameModal.classList.remove("open") })

function saveName() {
  const v = nameInput.value.trim().replace(/\s+/g, "_").slice(0, 24)
  if (!v) return
  username = v
  localStorage.setItem("username", v)
  nameModal.classList.remove("open")
  applyUsername()
  toast("Handle updated!")
}

// ─── Toast ───────────────────────────────────────────────────
function toast(msg, duration = 2000) {
  const container = document.getElementById("toast-container")
  const el = document.createElement("div")
  el.className = "toast"
  el.textContent = msg
  container.appendChild(el)
  setTimeout(() => {
    el.classList.add("out")
    el.addEventListener("animationend", () => el.remove())
  }, duration)
}

// ─── Time ago ────────────────────────────────────────────────
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)    return "just now"
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// ─── Char counter ────────────────────────────────────────────
const MAX = 280
const CIRC = 2 * Math.PI * 9  // r=9 → 56.55

messageInput.addEventListener("input", () => {
  autoResize(messageInput)
  const len = messageInput.value.length
  const pct = Math.min(len / MAX, 1)
  const offset = CIRC * (1 - pct)
  charRingFill.style.strokeDashoffset = offset

  if (len > MAX - 30) {
    charRemaining.style.display = "block"
    charRemaining.textContent = MAX - len
    charRemaining.style.color = len > MAX ? "#f4212e" : len > MAX - 20 ? "#ffd400" : "#71767b"
  } else {
    charRemaining.style.display = "none"
  }

  charRingFill.style.stroke = len > MAX ? "#f4212e" : len > MAX - 20 ? "#ffd400" : "#1d9bf0"
  postBtn.disabled = len === 0 || len > MAX
})

function autoResize(el) {
  el.style.height = "auto"
  el.style.height = el.scrollHeight + "px"
}

// ─── Skeleton loader ─────────────────────────────────────────
function showSkeleton() {
  feed.innerHTML = Array.from({ length: 4 }, () => `
    <div class="skeleton-post">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-line" style="width:40%"></div>
        <div class="skeleton skeleton-line" style="width:85%"></div>
        <div class="skeleton skeleton-line" style="width:65%"></div>
        <div class="skeleton skeleton-line" style="width:30%"></div>
      </div>
    </div>
  `).join("")
}

// ─── Render feed ─────────────────────────────────────────────
function renderFeed(messages, replies) {
  cachedMessages = messages || []
  cachedReplies  = replies  || []

  if (!cachedMessages.length) {
    feed.innerHTML = ""
    emptyState.style.display = "flex"
    return
  }
  emptyState.style.display = "none"

  feed.innerHTML = cachedMessages.map((msg, i) => {
    const msgReplies = cachedReplies.filter(r => Number(r.message_id) === Number(msg.id))
    const isOwn  = msg.username === username
    const isLiked = likedIds.has(msg.id)

    const repliesHTML = msgReplies.map(r => `
      <div class="reply-item">
        <div class="avatar xs" style="background:${grad(r.username)}">
          ${r.username?.charAt(0).toUpperCase() || "A"}
        </div>
        <div class="reply-body">
          <div class="reply-name">${r.username}</div>
          <div class="reply-text">${r.reply}</div>
        </div>
      </div>
    `).join("")

    return `
    <div class="post-card" data-id="${msg.id}" style="animation-delay:${i * 25}ms">
      <div class="avatar" style="background:${grad(msg.username)}">
        ${msg.username?.charAt(0).toUpperCase() || "A"}
      </div>
      <div class="post-right">
        <div class="post-meta">
          <span class="post-name">${msg.username}</span>
          ${isOwn ? `<span class="you-pill">You</span>` : ""}
          <span class="post-dot">·</span>
          <span class="post-time">${timeAgo(msg.created_at)}</span>
          ${currentFilter === "trending" && msg.likes > 0
            ? `<span class="trending-pill"><span class="trending-dot"></span>Trending</span>` : ""}
        </div>

        <p class="post-body">${escHtml(msg.message)}</p>

        <div class="actions">
          <button class="act-btn reply-act reply-btn" data-id="${msg.id}" aria-label="Reply">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            ${msgReplies.length > 0 ? `<span>${msgReplies.length}</span>` : ""}
          </button>

          <button class="act-btn like-act like-btn ${isLiked ? "liked" : ""}" data-id="${msg.id}" aria-label="Like">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="${isLiked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.75">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>${msg.likes || 0}</span>
          </button>
        </div>

        <!-- Reply box -->
        <div class="reply-box" id="reply-box-${msg.id}">
          <div class="avatar xs" style="background:${grad(username)}">
            ${username.charAt(0).toUpperCase()}
          </div>
          <div class="reply-right">
            <textarea class="reply-textarea" id="reply-input-${msg.id}"
              placeholder="Post your reply" rows="1"></textarea>
            <div class="reply-footer">
              <button class="send-reply-btn" data-id="${msg.id}">Reply</button>
            </div>
          </div>
        </div>

        <!-- Replies -->
        ${msgReplies.length > 0 ? `
        <div class="replies-section">
          <button class="show-replies-btn" data-id="${msg.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            ${msgReplies.length} ${msgReplies.length === 1 ? "reply" : "replies"}
          </button>
          <div class="replies-list" id="replies-${msg.id}">
            ${repliesHTML}
          </div>
        </div>
        ` : ""}
      </div>
    </div>
    `
  }).join("")

  // re-attach auto-resize to all reply textareas
  feed.querySelectorAll(".reply-textarea").forEach(ta => {
    ta.addEventListener("input", () => autoResize(ta))
  })
}

function escHtml(s = "") {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}

// ─── Load ─────────────────────────────────────────────────────
async function loadMessages(showLoader = false) {
  if (showLoader) showSkeleton()

  let q = supabase.from("messages").select("*")
  q = currentFilter === "trending"
    ? q.order("likes", { ascending: false })
    : q.order("created_at", { ascending: false })

  const [{ data: messages }, { data: replies }] = await Promise.all([
    q,
    supabase.from("replies").select("*")
  ])

  renderFeed(messages, replies)
  pendingNewPosts = false
  newBanner.style.display = "none"
}

// ─── Post ─────────────────────────────────────────────────────
postBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim()
  if (!text || text.length > MAX) return

  postBtn.disabled = true
  postBtn.textContent = "Posting…"

  // Optimistic insert
  const tempId = "temp-" + Date.now()
  const optimistic = {
    id: tempId, message: text, likes: 0, username,
    created_at: new Date().toISOString()
  }
  const msgs = currentFilter === "recent"
    ? [optimistic, ...cachedMessages]
    : [...cachedMessages, optimistic]
  renderFeed(msgs, cachedReplies)

  messageInput.value = ""
  messageInput.style.height = "auto"
  charRingFill.style.strokeDashoffset = 0
  charRingFill.style.stroke = "#1d9bf0"
  charRemaining.style.display = "none"
  postBtn.textContent = "Post"

  const { error } = await supabase.from("messages").insert([{ message: text, likes: 0, username }])
  if (error) {
    toast("Failed to post. Try again.")
    renderFeed(cachedMessages, cachedReplies)
  } else {
    toast("Posted!")
    await loadMessages()
  }
})

// ─── Delegated events ─────────────────────────────────────────
feed.addEventListener("click", async e => {
  // ── Like ──
  const likeBtn = e.target.closest(".like-btn")
  if (likeBtn) {
    const id = Number(likeBtn.dataset.id)
    const already = likedIds.has(id)
    if (already) return // no unlike

    likedIds.add(id)
    localStorage.setItem("likedIds", JSON.stringify([...likedIds]))
    likeBtn.classList.add("liked", "like-pop")
    likeBtn.addEventListener("animationend", () => likeBtn.classList.remove("like-pop"), { once: true })

    const countEl = likeBtn.querySelector("span")
    if (countEl) countEl.textContent = Number(countEl.textContent) + 1

    const { data } = await supabase.from("messages").select("likes").eq("id", id).single()
    await supabase.from("messages").update({ likes: (data?.likes || 0) + 1 }).eq("id", id)
    toast("Liked!")
    return
  }

  // ── Reply toggle ──
  const replyBtn = e.target.closest(".reply-btn")
  if (replyBtn) {
    const id = replyBtn.dataset.id
    const box = document.getElementById(`reply-box-${id}`)
    box.classList.toggle("open")
    if (box.classList.contains("open")) {
      const ta = document.getElementById(`reply-input-${id}`)
      ta?.focus()
    }
    return
  }

  // ── Send reply ──
  const sendBtn = e.target.closest(".send-reply-btn")
  if (sendBtn) {
    const id = Number(sendBtn.dataset.id)
    const ta = document.getElementById(`reply-input-${id}`)
    const text = ta?.value.trim()
    if (!text) return

    sendBtn.disabled = true
    sendBtn.textContent = "Sending…"

    await supabase.from("replies").insert([{ message_id: id, reply: text, username }])
    toast("Reply posted!")
    await loadMessages()
    return
  }

  // ── Toggle replies ──
  const toggleBtn = e.target.closest(".show-replies-btn")
  if (toggleBtn) {
    const id = toggleBtn.dataset.id
    const list = document.getElementById(`replies-${id}`)
    list.classList.toggle("open")
    const open = list.classList.contains("open")
    const count = list.querySelectorAll(".reply-item").length
    const chevron = open
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`
    toggleBtn.innerHTML = `${chevron} ${open ? "Hide" : count} ${open ? (count === 1 ? "reply" : "replies") : (count === 1 ? "reply" : "replies")}`
    return
  }
})

// ─── Double-tap to like (mobile) ─────────────────────────────
let lastTap = {}
feed.addEventListener("touchend", e => {
  const card = e.target.closest(".post-card")
  if (!card) return
  const id = card.dataset.id
  const now = Date.now()
  if (lastTap[id] && now - lastTap[id] < 300) {
    // double tap
    const likeBtn = card.querySelector(".like-btn")
    if (likeBtn && !likedIds.has(Number(id))) {
      // ripple
      const touch = e.changedTouches[0]
      const rect  = card.getBoundingClientRect()
      const ripple = document.createElement("div")
      ripple.className = "tap-ripple"
      ripple.style.cssText = `left:${touch.clientX - rect.left - 20}px;top:${touch.clientY - rect.top - 20}px;`
      card.style.position = "relative"
      card.appendChild(ripple)
      ripple.addEventListener("animationend", () => ripple.remove())
      likeBtn.click()
    }
    delete lastTap[id]
  } else {
    lastTap[id] = now
  }
}, { passive: true })

// ─── Filters ─────────────────────────────────────────────────
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.filter === currentFilter) return
    currentFilter = btn.dataset.filter
    tabs.forEach(b => b.classList.toggle("active", b === btn))
    loadMessages(true)
  })
})

// ─── New posts banner ─────────────────────────────────────────
newBanner.addEventListener("click", () => {
  loadMessages(false)
})

// ─── Real-time subscription ───────────────────────────────────
supabase
  .channel("messages-live")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
    if (payload.new.username === username) return // we already showed optimistically
    pendingNewPosts = true
    newBanner.style.display = "block"
  })
  .subscribe()

supabase
  .channel("replies-live")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies" }, () => {
    // silently refresh so reply counts stay up to date
    loadMessages()
  })
  .subscribe()

// ─── Boot ─────────────────────────────────────────────────────
loadMessages(true)
