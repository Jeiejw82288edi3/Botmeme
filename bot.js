import makeWASocket, {
    useMultiFileAuthState
} from '@whiskeysockets/baileys';

import qrcode from 'qrcode-terminal';
import pino from 'pino';

const CHANNEL_URL =
    'https://whatsapp.com/channel/0029Vb79gScDzgT3Mj0Ahw34';

async function startBot() {
    const { state, saveCreds } =
        await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ qr, connection }) => {
        if (qr) {
            console.log('Naskenuj QR kód v WhatsAppu:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('WhatsApp připojen!');

            try {
                const inviteCode = CHANNEL_URL
                    .split('/')
                    .pop()
                    .split('?')[0];

                const channel = await sock.newsletterMetadata(
                    'invite',
                    inviteCode
                );

                console.log('Název kanálu:', channel?.name);
                console.log('ID kanálu:', channel?.id);
            } catch (error) {
                console.error(
                    'Nepodařilo se načíst kanál:',
                    error.message
                );
            }
        }

        if (connection === 'close') {
            console.log('WhatsApp spojení bylo ukončeno.');
        }
    });
}

startBot().catch(console.error);
