import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'

console.log('START PAIRING FIX')
let phone = process.env.PHONE_NUMBER?.replace(/\D/g,'')
console.log('PHONE:', phone)
if (!phone) { console.log('Chybi PHONE_NUMBER v Secrets!'); process.exit(0) }

const { state, saveCreds } = await useMultiFileAuthState('./auth')
const sock = makeWASocket({
  auth: state,
  logger: P({ level: 'silent' }),
  browser: ['Ubuntu','Chrome','120.0.0']
})
sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', (u) => {
  console.log('Status:', u.connection || 'qr/pairing', u.lastDisconnect?.error?.toString()?.slice(0,100) || '')
})

await new Promise(r => setTimeout(r, 5000))

if (!sock.authState.creds.registered) {
  for (let i=1; i<=5; i++) {
    try {
      console.log(`Pokus ${i}/5 o kod...`)
      const code = await sock.requestPairingCode(phone)
      console.log('================================')
      console.log(`KOD ${i}: ${code}`)
      console.log('Zadej BEZ pomlcky, rychle do 30s!')
      console.log('================================')
      await new Promise(r => setTimeout(r, 35000))
    } catch (e) {
      console.log('Pokus fail:', e.toString().slice(0,200))
      await new Promise(r => setTimeout(r, 5000))
    }
  }
}
setTimeout(()=>{ console.log('KONEC'); process.exit(0)}, 250000)
