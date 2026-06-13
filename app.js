import { createClient } from "https://esm.sh/@supabase/supabase-js"

// 🔥 PASTE MO KEYS MO DITO
const supabaseUrl = "https://omljhzenihgidoegfiqx.supabase.co"
const supabaseKey = "sb_publishable_Jn2n5ukGCJe356ZUWuZMnw_jwBgz2EU"

const supabase = createClient(supabaseUrl, supabaseKey)

// HTML elements
const messageInput = document.getElementById("message")
const postBtn = document.getElementById("postBtn")
const feed = document.getElementById("feed")

// =====================
// LOAD MESSAGES
// =====================
async function loadMessages() {
    const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("likes", { ascending: false })
    .order("created_at", { ascending: false })

    if (error) {
        console.log(error)
        return
    }

    feed.innerHTML = ""

    data.forEach(msg => {
        feed.innerHTML += `
            <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg mb-3">

                <p class="text-lg mb-3">${msg.message}</p>

                <div class="flex items-center justify-between text-sm text-gray-400">

                    <button class="like-btn bg-pink-600 px-3 py-1 rounded hover:bg-pink-500"
                        data-id="${msg.id}">
                        ❤️ Like
                    </button>

                    <span>❤️ ${msg.likes || 0} likes</span>

                </div>

            </div>
        `
    })

    attachLikeEvents()
}

// =====================
// POST MESSAGE
// =====================
postBtn.addEventListener("click", async () => {

    const text = messageInput.value

    if (!text) return

    const { error } = await supabase
        .from("messages")
        .insert([
            { message: text, likes: 0 }
        ])

    if (error) {
        console.log(error)
        return
    }

    messageInput.value = ""
    loadMessages()
})

// =====================
// LIKE FUNCTION
// =====================
async function attachLikeEvents() {
    const buttons = document.querySelectorAll(".like-btn")

    buttons.forEach(btn => {
        btn.onclick = async () => {

            const id = Number(btn.getAttribute("data-id"))

            console.log("CLICKED ID:", id)

            const { data, error } = await supabase
                .from("messages")
                .select("likes")
                .eq("id", id)
                .single()

            if (error) {
                console.log(error)
                return
            }

            const currentLikes = data.likes ?? 0

            const { data: updateData, error: updateError } = await supabase
                .from("messages")
                .update({ likes: currentLikes + 1 })
                .eq("id", id)
                .select()

            console.log("UPDATE RESULT:", updateData)
            console.log("UPDATE ERROR:", updateError)

            loadMessages()
        }
    })
}
// =====================
// INITIAL LOAD
// =====================
loadMessages()

// =====================
// REALTIME (auto refresh)
// =====================
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