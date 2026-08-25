/**
 * Direct Integration with Meta WhatsApp Cloud API
 */

const getGraphApiUrl = () => {
  const version = process.env.META_API_VERSION || "v20.0";
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  if (!phoneId) {
    console.warn("⚠️ META_PHONE_NUMBER_ID is missing from environment variables!");
  }
  return `https://graph.facebook.com/${version}/${phoneId}/messages`;
};

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
  "Content-Type": "application/json"
});

/**
 * Send plain text message
 */
export async function sendWhatsAppText(to, text) {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log(`[DRY-RUN / NO META CREDENTIALS] WhatsApp Text to ${to}: ${text}`);
    return { dryRun: true, to, text };
  }

  const url = getGraphApiUrl();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) console.error("Meta WhatsApp API Error (Text):", data);
    return data;
  } catch (err) {
    console.error("Failed to send WhatsApp text message:", err);
    throw err;
  }
}

/**
 * Send interactive button message (up to 3 buttons)
 */
export async function sendWhatsAppInteractiveButtons(to, bodyText, buttons, headerText = "", footerText = "Weekend UX") {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log(`[DRY-RUN / NO META CREDENTIALS] WhatsApp Buttons to ${to}:`, { bodyText, buttons });
    return { dryRun: true, to, bodyText, buttons };
  }

  const url = getGraphApiUrl();
  const formattedButtons = buttons.slice(0, 3).map((btn) => ({
    type: "reply",
    reply: {
      id: btn.id,
      title: btn.title.slice(0, 20) // Meta max 20 chars limit
    }
  }));

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons: formattedButtons }
    }
  };

  if (headerText) payload.interactive.header = { type: "text", text: headerText };
  if (footerText) payload.interactive.footer = { text: footerText };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) console.error("Meta WhatsApp API Error (Buttons):", data);
    return data;
  } catch (err) {
    console.error("Failed to send WhatsApp interactive buttons:", err);
    throw err;
  }
}

/**
 * Send interactive List message (For 3+ options)
 */
export async function sendWhatsAppInteractiveList(to, bodyText, buttonTitle, sections, headerText = "", footerText = "Weekend UX") {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log(`[DRY-RUN / NO META CREDENTIALS] WhatsApp List to ${to}:`, { bodyText, sections });
    return { dryRun: true, to, bodyText, sections };
  }

  const url = getGraphApiUrl();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonTitle.slice(0, 20),
        sections: sections.map((sec) => ({
          title: sec.title.slice(0, 24),
          rows: sec.rows.map((row) => ({
            id: row.id,
            title: row.title.slice(0, 24),
            description: row.description ? row.description.slice(0, 72) : ""
          }))
        }))
      }
    }
  };

  if (headerText) payload.interactive.header = { type: "text", text: headerText };
  if (footerText) payload.interactive.footer = { text: footerText };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) console.error("Meta WhatsApp API Error (List):", data);
    return data;
  } catch (err) {
    console.error("Failed to send WhatsApp interactive list:", err);
    throw err;
  }
}
