// ================================
// SUPABASE IMPORT
// ================================
import { createClient } from "https://esm.sh/@supabase/supabase-js"


// ================================
// SUPABASE CONNECTION
// ================================
const supabase = createClient(
    "https://omljhzenihgidoegfiqx.supabase.co",
    "sb_publishable_Jn2n5ukGCJe356ZUWuZMnw_jwBgz2EU"
)


// ================================
// DOM ELEMENTS
// ================================
const messageInput = document.getElementById("message")
const postBtn = document.getElementById("postBtn")
const feed = document.getElementById("feed")

const filterRecentBtn = document.getElementById("filterRecent")
const filterTrendingBtn = document.getElementById("filterTrending")


// ================================
// FILTER STATE
// ================================
let currentFilter = "recent"


// ================================
// USERNAME (LOCAL STORAGE)
// ================================
let username = localStorage.getItem("username")

if (!username) {
    username = generateName()
    localStorage.setItem("username", username)
}


// ================================
// TIME FORMAT
// ================================
function timeAgo(dateString) {

    const now = new Date()
    const past = new Date(dateString)

    const diff = Math.floor((now - past) / 1000)

    if (diff < 60) return "just now"

    const mins = Math.floor(diff / 60)
    if (mins < 60) return `${mins} min ago`

    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hr ago`

    const days = Math.floor(hours / 24)
    return `${days} day ago`
}


// ================================
// LOAD POSTS (FILTERED)
// ================================
async function loadMessages() {

    let query = supabase.from("messages").select("*")

    // ================================
    // FILTER SYSTEM
    // ================================
    if (currentFilter === "recent") {
        query = query.order("created_at", { ascending: false })
    }

    if (currentFilter === "trending") {
        query = query.order("likes", { ascending: false })
    }

    const { data, error } = await query

    if (error) {
        console.log("LOAD ERROR:", error)
        return
    }

    feed.innerHTML = ""

    data.forEach(msg => {

        feed.innerHTML += `
            <div class="bg-gray-800 border border-gray-700 p-4 rounded-xl">

                <!-- USER INFO -->
                <div class="flex justify-between text-xs text-gray-500 mb-2">

                    <span class="text-pink-400 font-semibold">
                        ${msg.username || "Anonymous"}
                    </span>

                    <span>
                        ${timeAgo(msg.created_at)}
                    </span>

                </div>

                <!-- MESSAGE -->
                <p class="text-lg mb-3">
                    ${msg.message}
                </p>

                <!-- ACTIONS -->
                <div class="flex items-center justify-between text-sm text-gray-400">

                    <button
                        class="like-btn bg-pink-600 px-3 py-1 rounded hover:bg-pink-500"
                        data-id="${msg.id}">
                        ❤️ Like
                    </button>

                    <span>❤️ ${msg.likes || 0}</span>

                </div>

            </div>
        `
    })
}


// ================================
// POST MESSAGE
// ================================
postBtn.addEventListener("click", async () => {

    const text = messageInput.value.trim()

    if (!text) return

    const { error } = await supabase
        .from("messages")
        .insert([{
            message: text,
            likes: 0,
            username: username
        }])

    if (error) {
        console.log(error)
        return
    }

    messageInput.value = ""
    loadMessages()
})


// ================================
// LIKE SYSTEM (SAFE)
// ================================
feed.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("like-btn")) return

    const btn = e.target
    const id = Number(btn.getAttribute("data-id"))

    if (btn.disabled) return
    btn.disabled = true

    // ================================
    // 🎨 ANIMATION TRIGGER
    // ================================
    btn.classList.add("like-animate")

    setTimeout(() => {
        btn.classList.remove("like-animate")
    }, 250)

    const { data, error } = await supabase
        .from("messages")
        .select("likes")
        .eq("id", id)
        .single()

    if (error) {
        btn.disabled = false
        return
    }

    const currentLikes = data.likes ?? 0

    const { error: updateError } = await supabase
        .from("messages")
        .update({ likes: currentLikes + 1 })
        .eq("id", id)

    if (updateError) {
        btn.disabled = false
        return
    }

    loadMessages()
})


// ================================
// FILTER EVENTS
// ================================
filterRecentBtn.onclick = () => {
    currentFilter = "recent"
    loadMessages()
}

filterTrendingBtn.onclick = () => {
    currentFilter = "trending"
    loadMessages()
}


// ================================
// USERNAME GENERATOR
// ================================
function generateName() {

    const prefixes = [
        "Ghost", "Silent", "Dark", "Void", "Shadow",
        "Lost", "Empty", "Night", "Echo", "Voidless"
    ]

    const randomNum = Math.floor(Math.random() * 900 + 100)

    const name = prefixes[Math.floor(Math.random() * prefixes.length)]

    return `${name}_${randomNum}`
}


// ================================
// INITIAL LOAD
// ================================
loadMessages()


// ================================
// REALTIME INSERTS
// ================================
supabase
    .channel('messages')
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        },
        () => {
            loadMessages()
        }
    )
    .subscribe()
