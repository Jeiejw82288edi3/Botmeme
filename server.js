import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'
import fetch from 'node-fetch'

const PHONE = process.env.PHONE_NUMBER?.replace(/\D/g,'') // <-- CISLO KAMOSE
const CHANNEL_NAME = 'Vtipy A Memes'
const CODE = 'LUCKY123'
const POSTED_FILE = './auth/posted.json'

console.log(`Kanál: ${CHANNEL_NAME} - 24 followers`)
console.log(`Cislo: ${PHONE}`)

let posted = []
try { if (fs.existsSync(POSTED_FILE)) posted = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8')) } catch {}
const savePosted = (id) => {
  posted.push(id)
  if (posted.length > 1000) posted = posted.slice(-1000)
  fs.writeFileSync(POSTED_FILE, JSON.stringify(posted))
}

async function getMeme() {
  const subs = ['czechmemes','czech','Slovakia','cesky','czechcirclejerk']
  const sub = subs[Math.floor(Math.random()*subs.length)]
  try {
    const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=100`, { headers: { 'User-Agent': 'LuckyJelenBot/1.0' } })
    const data = await r.json()
    const posts = data.data.children.map(c=>c.data).filter(p=> p.post_hint==='image' && p.url?.match(/\.(jpg|png|jpeg|webp)$/) && !posted.includes(p.id) && !p.over_18)
    if (!posts.length) return null
    const m = posts[Math.floor(Math.random()*posts.length)]
    return { id: m.id, url: m.url, title: m.title }
  } catch(e){ console.log('Reddit err', e.message); return null }
}

const { state, saveCreds } = await useMultiFileAuthState('./auth')
const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: false, browser: ['Ubuntu','Chrome','120'] })
sock.ev.on('creds.update', saveCreds)

let CHANNEL_JID = null

sock.ev.on('connection.update', async ({ connection }) => {
  if (!state.creds.registered && PHONE) {
    await new Promise(r=>setTimeout(r,3000))
    try { await sock.requestPairingCode(PHONE, CODE); console.log(`>>> NA KAMOSOVO MOBILU ZADEJ: ${CODE} <<<`) } catch{}
  }
  if (connection === 'open') {
    console.log('✅ PROPOJENO NA KAMOSOVO UCTU!')

    // automaticky najde kanal Vtipy A Memes
    sock.ev.on('chats.set', async ({chats}) => {
      for (const c of chats) {
        if (c.name?.toLowerCase().includes('vtipy') && c.name?.toLowerCase().includes('memes')) {
          CHANNEL_JID = c.id
          console.log(`✅ NASLO KANAL: ${c.name} = ${c.id}`)
        }
      }
    })

    // zalozni vypis
    setTimeout(async () => {
      try {
        const groups = await sock.groupFetchAllParticipating()
        for (let id in groups) {
          console.log(`GROUP: ${groups[id].subject} -> ${id}`)
          if (groups[id].subject?.toLowerCase().includes('vtipy')) CHANNEL_JID = id
        }
      } catch{}
    }, 4000)

    const postuj = async () => {
      if (!CHANNEL_JID) { console.log('Cekam na JID kanalu Vtipy A Memes...'); return }
      const meme = await getMeme()
      if (!meme) { console.log('Zadne nove meme'); return }
      
      // s podpisem -LuckyJelen jak chces
      const caption = `${meme.title}\n\n-LuckyJelen`
      
      try {
        await sock.sendMessage(CHANNEL_JID, { image: { url: meme.url }, caption })
        savePosted(meme.id)
        console.log(`✅ POSLANO do Vtipy A Memes: ${meme.id}`)
      } catch(e){ console.log('Chyba posilani:', e.message, 'JID:', CHANNEL_JID) }
    }

    // prvni hned po 10s
    setTimeout(postuj, 10000)
    
    // pak 1-2x denne = 10-14h nahodne
    const plan = () => {
      const h = 10 + Math.random()*4
      console.log(`Dalsi meme za ${h.toFixed(1)}h`)
      setTimeout(async()=>{ await postuj(); plan() }, h*3600*1000)
    }
    plan()
  }
})

setTimeout(()=>{}, 999999999)
