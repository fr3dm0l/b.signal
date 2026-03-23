// worker.js — b.signal v3
// Speichert: Timestamp | Email | Sektor

async function getGoogleAccessToken(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const signingInput = `${encode({alg:"RS256",typ:"JWT"})}.${encode({iss:sa.client_email,scope:"https://www.googleapis.com/auth/spreadsheets",aud:"https://oauth2.googleapis.com/token",exp:now+3600,iat:now})}`;
  const pemContents = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s/g,"");
  const binaryDer = Uint8Array.from(atob(pemContents),(c)=>c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8",binaryDer.buffer,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5",cryptoKey,new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`});
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function getEmailHTML(sektor) {
  const region = sektor && sektor !== "unbekannt"
    ? `mit einer kleinen Gruppe von Partnern für den Sektor ${sektor}`
    : `mit einer kleinen Gruppe von Partnern in ausgewählten deutschen Städten`;
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>b.signal</title><style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Source+Sans+3:wght@300;400&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{background-color:#F5F2EC;font-family:'Source Sans 3',Georgia,sans-serif;font-weight:300;color:#1a1a18;-webkit-font-smoothing:antialiased}.wrapper{max-width:560px;margin:0 auto;padding:48px 24px}.header{border-bottom:1px solid #1a1a18;padding-bottom:20px;margin-bottom:40px;display:flex;align-items:baseline;gap:8px}.logo{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;font-size:22px;letter-spacing:0.02em;color:#1a1a18}.logo-dot{color:#FF7F50}.issue-line{margin-left:auto;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888880}.signal-bar{display:flex;align-items:center;gap:10px;margin-bottom:32px}.signal-dot{width:6px;height:6px;background:#FF7F50;border-radius:50%;flex-shrink:0}.signal-label{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#888880}.headline{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;font-size:34px;line-height:1.2;letter-spacing:0.01em;color:#1a1a18;margin-bottom:28px}.headline em{font-style:italic;color:#FF7F50}.rule{border:none;border-top:1px solid #d8d4cc;margin:28px 0}.body-text{font-size:15px;line-height:1.75;color:#3a3a36;margin-bottom:20px}.next-block{border-left:2px solid #FF7F50;padding:16px 20px;margin:32px 0;background:#FAF8F4}.next-label{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#FF7F50;margin-bottom:10px}.next-item{font-size:14px;line-height:1.8;color:#3a3a36}.signature{margin-top:36px}.sig-name{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:18px;color:#1a1a18;margin-bottom:4px}.sig-title{font-size:12px;letter-spacing:0.08em;color:#888880}.footer{border-top:1px solid #d8d4cc;margin-top:48px;padding-top:20px;display:flex;justify-content:space-between;align-items:center}.footer-left{font-size:11px;color:#aaa89e;letter-spacing:0.04em}.footer-right{font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;color:#ccc9c0;letter-spacing:0.06em}</style></head><body><div class="wrapper"><div class="header"><span class="logo">b<span class="logo-dot">.</span>signal</span><span class="issue-line">Pilot</span></div><div class="signal-bar"><div class="signal-dot"></div><span class="signal-label">Signal empfangen</span></div><h1 class="headline">Ihr Platz ist<br><em>reserviert.</em></h1><hr class="rule"><p class="body-text">Wir haben Ihre Anfrage erhalten und Ihre E-Mail-Adresse in unsere Pilot-Liste aufgenommen. Der Zugang zu b.signal ist bewusst begrenzt — wir arbeiten zunächst ${region}.</p><p class="body-text">Sobald Ihr Zugang aktiviert wird, erhalten Sie eine separate Nachricht mit den nächsten Schritten.</p><div class="next-block"><div class="next-label">Was als nächstes passiert</div><div class="next-item">— Wir prüfen Ihre Anfrage manuell</div><div class="next-item">— Sie erhalten Zugang innerhalb von 7 Tagen</div><div class="next-item">— Onboarding-Call auf Wunsch möglich</div></div><p class="body-text">Bei Fragen antworten Sie einfach auf diese E-Mail.</p><div class="signature"><div class="sig-name">Das b.signal Team</div><div class="sig-title">bsignal.de</div></div><div class="footer"><span class="footer-left">Sie erhalten diese E-Mail, weil Sie sich auf bsignal.de registriert haben.</span><span class="footer-right">b.signal</span></div></div></body></html>`;
}

var worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    const { email, sektor } = await request.json();
    const region = sektor || "unbekannt";
    const SHEET_ID = "1fzNqztKDhZHJEzPbLkbgARlzo3huDxcxPiY8su1t1xo";

    // 1. Google Sheets speichern
    try {
      const accessToken = await getGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:C:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[new Date().toISOString(), email, region]] }),
      });
    } catch (e) { console.error("Sheets error:", e); }

    // 2. E-Mail senden
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "b.signal <onboarding@resend.dev>",
        to: email,
        subject: "Ihr Platz ist reserviert — b.signal",
        html: getEmailHTML(region),
      }),
    });

    const sendData = await sendRes.json();
    return new Response(JSON.stringify({ success: !!sendData.id }), {
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  },
};

export { worker_default as default };
