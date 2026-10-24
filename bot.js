import makeWASocket, {
    useMultiFileAuthState
} from '@whiskeysockets/baileys';

import pino from 'pino';

const CHANNEL_URL =
    'https://whatsapp.com/channel/0029Vb79gScDzgT3Mj0Ahw34';

async function startBot() {
    const { state, saveCreds } =
        await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
            console.log('WhatsApp připojen!');

            try {
               7o const invite = CHANNEL_URL
                    .split('/channel/')[1]
                    .split(/[?#]/)[0];

                const channel = await sock.newsletterMetadata(
                    'invite',
                    invite
                );

                console.log('Kanál:', channel.name);
                console.log('ID:', channel.id);
            } catch (error) {
                console.log('Chyba:', error.message);
            }

            await saveCreds();
            setTimeout(() => process.exit(0), 2000);
        }
    });

    if (!state.creds.registered) {
        const phone = process.env.WA_PHONE_NUMBER;

        if (!phone) throw new Error('Chybí telefonní číslo');

        const code = await sock.requestPairingCode(phone);
        console.log('PÁROVACÍ KÓD:', code);
    }
}

startBot().catch(console.error);
