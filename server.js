const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');

const app = express();
const port = process.env.PORT || 3000; 
let qrHtml = 'Menyiapkan QR Code... Refresh halaman ini dalam beberapa detik.';

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }) 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if(qr) {
            const qrImage = await qrcode.toDataURL(qr);
            qrHtml = `<img src="${qrImage}" alt="QR Code" style="width:250px;"/><br><p>Silakan Scan dengan WhatsApp (Tautkan Perangkat)</p>`;
        }
        if(connection === 'close') {
            qrHtml = 'Koneksi terputus. Sistem sedang mencoba menghubungkan kembali...';
            connectToWhatsApp();
        } else if(connection === 'open') {
            qrHtml = '<h2 style="color:green;">✅ WhatsApp Gateway Berhasil Terhubung!</h2><p>Bot Anda sudah aktif.</p>';
        }
    });

    // Fitur balas pesan otomatis (Auto-reply Ping)
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if(!msg.key.fromMe && m.type === 'notify') {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            if(text.toLowerCase() === 'ping') {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! Bot aktif dari Back4App 🚀' });
            }
        }
    });
}

app.get('/', (req, res) => {
    res.send(`<div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                <h1>WhatsApp Gateway</h1>
                ${qrHtml}
              </div>`);
});

app.listen(port, () => {
    console.log('Web server berjalan pada port ' + port);
    connectToWhatsApp();
});
