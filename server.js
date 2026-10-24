import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'

const PHONE = process.env.PHONE_NUMBER?.replace(/\D/g,'')
const CHANNEL_NAME = 'Vtipy A Memes'
const CODE = 'LUCKY123'
const POSTED_FILE = './auth/posted.json'

console.log(`Bot pro kanal: ${CHANNEL_NAME}`)
console.log(`Cislo: ${PHONE}`)

let posted = []
try { if (fs.existsSync(POSTED_FILE)) posted = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8')) } catch {}
const savePosted = (id) => {
  fs.mkdirSync('./auth', { recursive: true })
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
    try { 
      await sock.requestPairingCode(PHONE, CODE)
      console.log(`>>> NA MOBILU ZADEJ KOD: ${CODE} <<<`)
    } catch{}
  }
  if (connection === 'open') {
    console.log('✅ PROPOJENO!')

    sock.ev.on('chats.set', ({chats}) => {
      for (const c of chats) {
        console.log(`CHAT: ${c.name} -> ${c.id}`)
        if (c.name?.toLowerCase().includes('vtipy') && c.name?.toLowerCase().includes('memes')) {
          CHANNEL_JID = c.id
          console.log(`✅ NASLO KANAL: ${c.name} = ${c.id}`)
        }
      }
    })

    const postuj = async () => {
      if (!CHANNEL_JID) { console.log('Cekam na JID...'); return }
      const meme = await getMeme()
      if (!meme) return
      const caption = `${meme.title}\n\n-LuckyJelen`
      try {
        await sock.sendMessage(CHANNEL_JID, { image: { url: meme.url }, caption })
        savePosted(meme.id)
        console.log(`✅ POSLANO: ${meme.id}`)
      } catch(e){ console.log('Chyba:', e.message) }
    }

    setTimeout(postuj, 15000)
    const plan = () => {
      const h = 10 + Math.random()*4
      console.log(`Dalsi meme za ${h.toFixed(1)}h`)
      setTimeout(async()=>{ await postuj(); plan() }, h*3600*1000)
    }
    plan()
  }
})

setTimeout(()=>{}, 999999999)
