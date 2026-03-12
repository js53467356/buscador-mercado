const axios = require('axios');
const fs = require('fs');

// Configuración desde variables de entorno (GitHub Secrets)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const HISTORY_FILE = 'last_ids.json';

// Configuración de búsqueda
const SEARCH_QUERY = "seiko 5";
const WALLAPOP_API_URL = `https://api.wallapop.com/api/v3/general/search?keywords=${encodeURIComponent(SEARCH_QUERY)}&latitude=40.416775&longitude=-3.703790`;

async function notifyTelegram(item) {
    const message = `⌚ *¡Nuevo Seiko 5 detectado!*\n\n` +
                    `💰 Precio: ${item.price.amount} ${item.price.currency}\n` +
                    `📝 ${item.title}\n` +
                    `🔗 [Ver en Wallapop](https://es.wallapop.com/item/${item.web_slug})`;
    
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error("Error enviando a Telegram:", error.response?.data || error.message);
    }
}

async function main() {
    try {
        // 1. Cargar historial de IDs previos
        let seenIds = [];
        if (fs.existsSync(HISTORY_FILE)) {
            seenIds = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        }

        // 2. Consultar Wallapop
        console.log(`Buscando "${SEARCH_QUERY}"...`);
        const response = await axios.get(WALLAPOP_API_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const items = response.data.search_objects || [];
        let newIds = [...seenIds];
        let foundNew = false;

        // 3. Filtrar novedades
        for (const item of items) {
            if (!seenIds.includes(item.id)) {
                console.log(`Nuevo anuncio encontrado: ${item.title}`);
                await notifyTelegram(item);
                newIds.push(item.id);
                foundNew = true;
            }
        }

        // 4. Guardar historial actualizado (máximo 200 IDs para no saturar)
        if (foundNew) {
            const updatedHistory = newIds.slice(-200); 
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2));
            console.log("Historial actualizado.");
        } else {
            console.log("No hay novedades.");
        }

    } catch (error) {
        console.error("Error en el proceso:", error.message);
    }
}

main();