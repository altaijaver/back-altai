import fetch from 'node-fetch';

export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {
        const body = JSON.parse(event.body);

        // Validar token reCAPTCHA
        const recaptchaToken = body['g-recaptcha-response'];
        if (!recaptchaToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No reCAPTCHA token' }),
            };
        }

        // Verifica token con Google
        const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Debes poner tu clave en Netlify env vars
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

        const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
        const recaptchaJson = await recaptchaRes.json();

        if (!recaptchaJson.success) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'reCAPTCHA verification failed' }),
            };
        }


        // Enviar datos a Salesforce WebToLead
        const salesforceUrl = 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8';

        // Construimos form data para Salesforce
        const salesforceData = new URLSearchParams();

        // Mapea los campos que enviaste en el frontend, excepto reCAPTCHA que no va a Salesforce
        const fieldsToSend = {
            oid: '00Do0000000b6Io',
            first_name: body.first_name,
            last_name: body.last_name,
            phone: body.phone,
            email: body.email,
            '00N3l00000Q7A54': body['00N3l00000Q7A54'], // FraccionamientoInterno
            '00N3l00000Q7A57': body['00N3l00000Q7A57'], // Fuente
            '00N3l00000Q7A4k': body['00N3l00000Q7A4k'], // Asunto
            // puedes agregar más campos si necesitas
        };

        for (const key in fieldsToSend) {
            if (fieldsToSend[key]) {
                salesforceData.append(key, fieldsToSend[key]);
            }
        }

        // POST a Salesforce
        const salesforceResponse = await fetch(salesforceUrl, {
            method: 'POST',
            body: salesforceData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        // Puedes validar salesforceResponse.status o content si quieres

        // Respuesta OK
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Formulario enviado correctamente',
                pdfUrl: 'https://javer.com.mx/descargables/1748907914225.pdf',
            }),
        };
    } catch (error) {
        console.error('Error en función enviarYDescargar:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor' }),
        };
    }
}
