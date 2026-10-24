import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'

console.log('START BOT')

const phone = process.env.PHONE_NUMBER
const channel = process.env.CHANNEL_ID

console.log('PHONE:', phone ? 'OK ' + phone : 'CHYBI - nastav v Secrets')
console.log('CHANNEL:', channel ? 'OK' : 'CHYBI')

if (!phone) {
  console.log('NENI NASTAVENE PHONE_NUMBER v Secrets -> koncim ale bez chyby')
  process.exit(0)
}

const { state, saveCreds } = await useMultiFileAuthState('./auth')

const sock = makeWASocket({
  auth: state,
  logger: P({ level: 'silent' }),
  printQRInTerminal: false
})

if (!sock.authState.creds.registered) {
  console.log('ZADAM PAIRING CODE...')
  try {
    const code = await sock.requestPairingCode(phone)
    console.log('================================')
    console.log('TVUJ KOD: ' + code)
    console.log('Zadej ho ve WhatsApp: Propojena zarizeni -> Propojit zarizeni -> Propojit s cislem')
    console.log('================================')
  } catch (e) {
    console.log('Chyba pairing:', e.message)
  }
}

sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', async (u) => {
  console.log('Connection:', u)
  if (u.connection === 'open') {
    console.log('PRIPOJENO!')
    if (channel) {
      try {
        await sock.sendMessage(channel, { text: 'Bot jede! Jelen Lucky 🦌' })
        console.log('Zprava odeslana do kanalu')
      } catch (e) { console.log('Chyba kanal:', e.message) }
    }
  }
})

sock.ev.on('messages.upsert', async (m) => {
  console.log('Prisla zprava', JSON.stringify(m.messages[0]?.message))
})

// aby to bezelo 2 minuty a pak skoncilo
setTimeout(() => {
  console.log('KONEC, ukladam auth')
  process.exit(0)
}, 120000)
