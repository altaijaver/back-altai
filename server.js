import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Configura CORS para tu frontend (ajusta el origen)
app.use(cors({
    origin: 'https://front-altai.netlify.app', // Cambia si usas otro dominio frontend
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.options('/enviarYDescargar', (req, res) => {
    res.sendStatus(200);
});

app.post('/enviarYDescargar', async (req, res) => {
    try {
        const body = req.body;

        // Validar campos obligatorios
        const requiredFields = ['first_name', 'last_name', 'phone', 'email'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return res.status(400).json({ error: `El campo ${field} es obligatorio.` });
            }
        }

        // Validar reCAPTCHA
        const recaptchaToken = body['g-recaptcha-response'];
        if (!recaptchaToken) {
            return res.status(400).json({ error: 'No reCAPTCHA token' });
        }

        // Validar checkbox aviso
        if (!body.aviso || !(body.aviso === true || body.aviso === 'true' || body.aviso === 'on')) {
            return res.status(400).json({ error: 'Debes aceptar el aviso de privacidad.' });
        }

        // Verificar reCAPTCHA con Google
        const secretKey = '6LeYyF4rAAAAAB2gm91IIiD9RQYgSkBrbkkkpWSy'; // Pon tu clave secreta
        const params = new URLSearchParams();
        params.append('secret', secretKey);
        params.append('response', recaptchaToken);

        const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            body: params
        });
        const recaptchaJson = await recaptchaRes.json();

        if (!recaptchaJson.success) {
            return res.status(403).json({ error: 'reCAPTCHA inválido' });
        }

        // Enviar datos a Salesforce Web-to-Lead
        const salesforceUrl = 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8';
        const salesforceData = new URLSearchParams();

        const fieldsToSend = {
            oid: '00Do0000000b6Io',
            first_name: body.first_name,
            last_name: body.last_name,
            phone: body.phone,
            email: body.email,
            '00N3l00000Q7A54': body['00N3l00000Q7A54'],
            '00N3l00000Q7A57': body['00N3l00000Q7A57'],
            '00N3l00000Q7A4k': body['00N3l00000Q7A4k'],
        };

        for (const key in fieldsToSend) {
            if (fieldsToSend[key]) {
                salesforceData.append(key, fieldsToSend[key]);
            }
        }

        await fetch(salesforceUrl, {
            method: 'POST',
            body: salesforceData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        // Responder con URL de PDF para descargar y redirigir
        return res.status(200).json({
            message: 'Formulario enviado correctamente',
            pdfUrl: 'https://javer.com.mx/descargables/1748907914225.pdf',
        });

    } catch (error) {
        console.error('Error en enviarYDescargar:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
