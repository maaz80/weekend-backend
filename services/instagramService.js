import axios from "axios";

/**
 * Helper to get the active Instagram Page Access Token
 */
export const getInstagramPageToken = () => {
  return (
    process.env.INSTAGRAM_PAGE_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    ""
  ).trim();
};

/**
 * Helper to get active Meta API version
 */
export const getMetaApiVersion = () => {
  return process.env.META_API_VERSION || "v20.0";
};

/**
 * Fetch Instagram User Profile by Scoped ID (IGSID)
 * Note: Requires `instagram_manage_messages` or `instagram_basic` permission on Meta.
 */
export const getInstagramUserProfile = async (scopedId) => {
  const token = getInstagramPageToken();
  if (!token) {
    console.warn("⚠️ [Instagram Service] No Instagram Access Token configured in .env");
    return { name: "Instagram Visitor", username: "Instagram User", profile_pic: "" };
  }

  try {
    const version = getMetaApiVersion();
    const isInstagramToken = token.startsWith("IG");
    const baseUrl = isInstagramToken ? "https://graph.instagram.com" : "https://graph.facebook.com";
    const url = isInstagramToken
      ? `${baseUrl}/${version}/${scopedId}?fields=name,username,profile_pic`
      : `${baseUrl}/${version}/${scopedId}?fields=name,username,profile_pic&access_token=${token}`;
    const headers = isInstagramToken ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get(url, { headers, timeout: 8000 });

    return {
      name: response.data.name || response.data.username || "Instagram Visitor",
      username: response.data.username || "Instagram User",
      profile_pic: response.data.profile_pic || ""
    };
  } catch (error) {
    const errData = error.response?.data?.error || error.message;
    console.warn(`⚠️ [Instagram Service] Could not fetch profile for scopedId ${scopedId}:`, errData);
    return { name: "Instagram Visitor", username: "Instagram User", profile_pic: "" };
  }
};

/**
 * Fetch Facebook User Profile by Scoped ID (PSID)
 */
export const getFacebookUserProfile = async (scopedId) => {
  const token = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "").trim();
  const pageId = (process.env.FACEBOOK_PAGE_ID || "146170905256384").trim();

  if (!token) {
    return { name: "Facebook User", profile_pic: "" };
  }

  const version = getMetaApiVersion();

  // Method 1: Query Page's conversation thread participants (reliable in Development & Production mode)
  try {
    const convUrl = `https://graph.facebook.com/${version}/${pageId}/conversations?fields=participants,senders&access_token=${token}`;
    const convRes = await axios.get(convUrl, { timeout: 8000 });
    const convData = convRes.data?.data || [];

    for (const conv of convData) {
      const match =
        conv.participants?.data?.find((p) => p.id === scopedId) ||
        conv.senders?.data?.find((s) => s.id === scopedId);

      if (match && match.name && match.name !== "Weekend UX") {
        return {
          name: match.name,
          profile_pic: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.name)}&background=1877F2&color=fff`
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ [Facebook Service] Error querying conversations list:", err.message);
  }

  // Method 2: Fallback to direct PSID profile endpoint
  try {
    const directUrl = `https://graph.facebook.com/${version}/${scopedId}?fields=first_name,last_name,name,profile_pic&access_token=${token}`;
    const directRes = await axios.get(directUrl, { timeout: 6000 });
    const fullName = directRes.data.name || [directRes.data.first_name, directRes.data.last_name].filter(Boolean).join(" ");
    if (fullName) {
      return {
        name: fullName,
        profile_pic: directRes.data.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1877F2&color=fff`
      };
    }
  } catch {
    // Ignore fallback failure
  }

  return { name: "Facebook User", profile_pic: "https://ui-avatars.com/api/?name=FB&background=1877F2&color=fff" };
};

/**
 * Send Text Message (with optional Quick Reply buttons) via Instagram Messaging API
 */
export const sendInstagramText = async (recipientId, text, quickReplies = []) => {
  const token = getInstagramPageToken();
  if (!token) {
    console.warn("⚠️ [Instagram Service] Cannot send DM: No access token configured.");
    return null;
  }

  const version = getMetaApiVersion();
  const isInstagramToken = token.startsWith("IG");
  const baseUrl = isInstagramToken ? "https://graph.instagram.com" : "https://graph.facebook.com";
  const url = isInstagramToken
    ? `${baseUrl}/${version}/me/messages`
    : `${baseUrl}/${version}/me/messages?access_token=${token}`;

  const messagePayload = {
    text: text
  };

  // Add quick reply buttons if provided
  if (Array.isArray(quickReplies) && quickReplies.length > 0) {
    messagePayload.quick_replies = quickReplies.map((qr) => ({
      content_type: "text",
      title: qr.title.slice(0, 20), // Meta limit: 20 chars max for quick reply title
      payload: qr.payload || qr.title
    }));
  }

  const payload = {
    recipient: {
      id: recipientId
    },
    message: messagePayload
  };

  const headers = { "Content-Type": "application/json" };
  if (isInstagramToken) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(url, payload, {
      headers,
      timeout: 10000
    });
    console.log(`✅ [Instagram Service] Message sent successfully to ${recipientId}. Message ID:`, response.data?.message_id);
    return response.data;
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error(`❌ [Instagram Service] Error sending DM to ${recipientId}:`, JSON.stringify(errorDetails, null, 2));
    throw error;
  }
};

/**
 * Send Rich Generic Card with Buttons (e.g. Website Link, Demo Booking)
 */
export const sendInstagramCard = async (recipientId, { title, subtitle, imageUrl, buttons = [] }) => {
  const token = getInstagramPageToken();
  if (!token) return null;

  const version = getMetaApiVersion();
  const url = `https://graph.facebook.com/${version}/me/messages?access_token=${token}`;

  const element = {
    title: title.slice(0, 80),
    subtitle: subtitle ? subtitle.slice(0, 80) : undefined,
    image_url: imageUrl || undefined,
    buttons: buttons.slice(0, 3) // Meta limit: up to 3 buttons
  };

  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [element]
        }
      }
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error("❌ [Instagram Service] Error sending generic card:", error.response?.data || error.message);
    // Fallback to text message if template fails
    return sendInstagramText(recipientId, `${title}\n${subtitle || ""}`);
  }
};
