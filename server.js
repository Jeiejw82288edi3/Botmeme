import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'

console.log('START BOT')
const phone = process.env.PHONE_NUMBER?.replace(/\D/g,'')
console.log('PHONE:', phone)

if (!phone) { console.log('CHYBI PHONE_NUMBER'); process.exit(0) }

const { state, saveCreds } = await useMultiFileAuthState('./auth')

const sock = makeWASocket({
  auth: state,
  logger: P({ level: 'silent' }),
  browser: ['Ubuntu','Chrome','20.0.0']
})

sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', async (u) => {
  console.log('Conn update:', u.connection, u.lastDisconnect?.error?.message || '')
})

await new Promise(r => setTimeout(r, 3000))

if (!sock.authState.creds.registered) {
  console.log('Zadavam pairing code pro', phone)
  try {
    await new Promise(r => setTimeout(r, 2000))
    const code = await sock.requestPairingCode(phone)
    console.log('===========================')
    console.log('KOD:', code)
    console.log('WhatsApp -> Propojena zarizeni -> Propojit s cislem')
    console.log('===========================')
  } catch (e) {
    console.log('Pairing error:', e.toString())
    console.log('Zkus znovu Run workflow za 1 min')
  }
}

setTimeout(()=>{ console.log('KONEC'); process.exit(0)}, 115000)
