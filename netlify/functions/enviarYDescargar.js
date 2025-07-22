import fetch from 'node-fetch';

export async function handler(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': 'https://front-altai.netlify.app',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: 'Method Not Allowed',
        };
    }

    try {
        const body = JSON.parse(event.body);

        const requiredFields = ['first_name', 'last_name', 'phone', 'email'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `El campo ${field} es obligatorio.` }),
                };
            }
        }

        // Validar reCAPTCHA
        const recaptchaToken = body['g-recaptcha-response'];
        if (!recaptchaToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No reCAPTCHA token' }),
            };
        }

        // Validar checkbox de aviso
        if (!body.aviso || !(body.aviso === true || body.aviso === 'true' || body.aviso === 'on')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Debes aceptar el aviso de privacidad.' }),
            };
        }

        // Verificar token reCAPTCHA directamente (sin variable de entorno)
        const secretKey = '6LeYyF4rAAAAAB2gm91IIiD9RQYgSkBrbkkkpWSy';
        const params = new URLSearchParams();
        params.append('secret', secretKey);
        params.append('response', recaptchaToken);

        const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            body: params,
        });

        const recaptchaJson = await recaptchaRes.json();

        if (!recaptchaJson.success) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'reCAPTCHA inválido' }),
            };
        }

        // Enviar datos a Salesforce
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Formulario enviado correctamente',
                pdfUrl: 'https://javer.com.mx/descargables/1748907914225.pdf',
            }),
        };
    } catch (error) {
        console.error('Error en función enviarYDescargar:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error interno del servidor' }),
        };
    }
}
