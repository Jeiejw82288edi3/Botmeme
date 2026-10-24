import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys'
import fs from 'fs'
import axios from 'axios'

const PHONE = process.env.PHONE_NUMBER
const CHANNEL_ID = process.env.CHANNEL_ID
const SIGN = '-LuckyJelen'

async function getMeme() {
  let h = []
  try { 
    if (fs.existsSync('./h.json')) {
      h = JSON.parse(fs.readFileSync('./h.json'))
    }
  } catch {}
  
  const apis = [
    'https://www.reddit.com/r/czechmemes/new.json?limit=50',
    'https://www.reddit.com/r/SlovakiaMeme/new.json?limit=50'
  ]
  
  for (let api of apis) {
    try {
      const r = await axios.get(api, { headers: { 'User-Agent': 'LuckyJelen/1.0' } })
      for (let p of r.data.data.children) {
        let d = p.data
        if (h.includes(d.id) || d.over_18) continue
        
        let isV = d.is_video && d.media?.reddit_video?.duration <= 60
        let isI = d.url?.match(/\.(jpg|jpeg|png)$/)
        if (!isI && !isV) continue
        
        let url = isV ? d.media.reddit_video.fallback_url : d.url
        h.push(d.id)
        if (h.length > 500) h = h.slice(-500)
        fs.writeFileSync('./h.json', JSON.stringify(h))
        
        return { url, cap: `${d.title}\n\n${SIGN}`, isV }
      }
    } catch (e) {
      console.log('Reddit chyba', e.message)
    }
  }
  return null
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console.log)
    },
    printQRInTerminal: false,
    browser: ['LuckyJelen', 'Chrome', '1.0']
  })
  
  sock.ev.on('creds.update', saveCreds)

  if (!state.creds.registered) {
    await delay(3000)
    console.log('ZADAM KOD PRO CISLO:', PHONE)
    const code = await sock.requestPairingCode(PHONE)
    console.log('============================')
    console.log('KOD PRO WHATSAPP:', code)
    console.log('============================')
    console.log('Jdi do WhatsApp -> Propojena zarizeni -> Propojit pomoci tel. cisla')
    await delay(70000)
  }

  sock.ev.on('connection.update', async (u) => {
    const { connection } = u
    if (connection === 'open') {
      console.log('✅ PRIPOJENO!')
      
      if (!CHANNEL_ID) {
        console.log('CHYBI CHANNEL_ID - pridam vypis kanalu')
        try {
          const list = await sock.newsletterFetchAll()
          list.forEach(c => console.log(`${c.name} => ${c.id}`))
        } catch {}
      }
      
      try {
        const m = await getMeme()
        if (m && CHANNEL_ID) {
          if (m.isV) {
            await sock.sendMessage(CHANNEL_ID, { video: { url: m.url }, caption: m.cap })
          } else {
            await sock.sendMessage(CHANNEL_ID, { image: { url: m.url }, caption: m.cap })
          }
          console.log('✅ POSTNUTO:', m.cap)
        } else {
          console.log('Zadny meme nebo chybi CHANNEL_ID')
        }
      } catch (e) {
        console.log('Chyba post:', e.message)
      }
      
      await delay(5000)
      process.exit(0)
    }
  })
  
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (let mm of messages) {
      if (mm.key.remoteJid.includes('@newsletter')) {
        console.log('!!! TVOJE CHANNEL_ID:', mm.key.remoteJid)
      }
    }
  })
}

start()
