import { MessageContent, MessageButton, TemplateElement, QuickReply, FacebookMessageType } from "@/types/messages";

/**
 * Generate Facebook Messenger API JSON payload from MessageContent
 */
export function generateMessengerPayload(content: MessageContent): any {
  const payload: any = {
    recipient: { id: "{{PSID}}" },
    message: {}
  };

  // Add quick replies if present
  const addQuickReplies = () => {
    if (content.quick_replies && content.quick_replies.length > 0) {
      payload.message.quick_replies = content.quick_replies.map(qr => ({
        content_type: qr.content_type || "text",
        title: qr.title,
        payload: qr.payload || qr.title,
        ...(qr.image_url ? { image_url: qr.image_url } : {})
      }));
    }
  };

  // Process buttons - convert empty URLs to postback
  const processButtons = (buttons: MessageButton[] | undefined): any[] | undefined => {
    if (!buttons || buttons.length === 0) return undefined;
    return buttons.map(btn => {
      if (btn.type === 'web_url') {
        if (!btn.url || btn.url.trim() === '') {
          return { type: "postback", title: btn.title, payload: btn.payload || btn.title };
        }
        return { 
          type: "web_url", 
          url: btn.url, 
          title: btn.title,
          ...(btn.webview_height_ratio ? { webview_height_ratio: btn.webview_height_ratio } : {})
        };
      }
      if (btn.type === 'phone_number') {
        return { type: "phone_number", title: btn.title, payload: btn.payload };
      }
      if (btn.type === 'postback') {
        return { type: "postback", title: btn.title, payload: btn.payload || btn.title };
      }
      return btn;
    });
  };

  switch (content.message_type) {
    case 'text':
      payload.message.text = content.text || "";
      addQuickReplies();
      break;

    case 'generic':
      if (content.elements && content.elements.length > 0) {
        const elem = content.elements[0];
        payload.message.attachment = {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: elem.title,
              subtitle: elem.subtitle || undefined,
              image_url: elem.image_url || undefined,
              default_action: elem.default_action,
              buttons: processButtons(elem.buttons)
            }]
          }
        };
      }
      addQuickReplies();
      break;

    case 'button':
      if (content.elements && content.elements.length > 0) {
        const elem = content.elements[0];
        payload.message.attachment = {
          type: "template",
          payload: {
            template_type: "button",
            text: elem.title,
            buttons: processButtons(elem.buttons) || []
          }
        };
      }
      addQuickReplies();
      break;

    case 'media':
      if (content.media_element) {
        payload.message.attachment = {
          type: "template",
          payload: {
            template_type: "media",
            elements: [{
              media_type: content.media_element.media_type,
              url: content.media_element.url || undefined,
              attachment_id: content.media_element.attachment_id || undefined,
              buttons: processButtons(content.media_element.buttons)
            }]
          }
        };
      }
      addQuickReplies();
      break;

    case 'carousel':
      if (content.elements && content.elements.length > 0) {
        payload.message.attachment = {
          type: "template",
          payload: {
            template_type: "generic",
            elements: content.elements.map(elem => ({
              title: elem.title,
              subtitle: elem.subtitle || undefined,
              image_url: elem.image_url || undefined,
              default_action: elem.default_action,
              buttons: processButtons(elem.buttons)
            }))
          }
        };
      }
      addQuickReplies();
      break;

    case 'quick_replies':
      payload.message.text = content.text || "Choose an option:";
      addQuickReplies();
      break;
  }

  return payload;
}

/**
 * Parse Facebook Messenger API JSON payload to MessageContent
 */
export function parseMessengerPayload(json: any): MessageContent {
  const content: MessageContent = { message_type: 'text' };
  
  if (!json?.message) return content;

  const msg = json.message;

  // Parse quick replies
  if (msg.quick_replies && Array.isArray(msg.quick_replies)) {
    content.quick_replies = msg.quick_replies.map((qr: any) => ({
      content_type: qr.content_type || "text",
      title: qr.title,
      payload: qr.payload,
      image_url: qr.image_url
    }));
  }

  // Text message
  if (msg.text && !msg.attachment) {
    content.message_type = msg.quick_replies?.length ? 'quick_replies' : 'text';
    content.text = msg.text;
    return content;
  }

  // Template messages
  if (msg.attachment?.type === "template") {
    const payload = msg.attachment.payload;
    
    if (payload.template_type === "button") {
      content.message_type = 'button';
      content.elements = [{
        title: payload.text,
        buttons: payload.buttons?.map(parseButton) || []
      }];
      return content;
    }

    if (payload.template_type === "media") {
      content.message_type = 'media';
      const elem = payload.elements?.[0];
      if (elem) {
        content.media_element = {
          media_type: elem.media_type,
          url: elem.url,
          attachment_id: elem.attachment_id,
          buttons: elem.buttons?.map(parseButton)
        };
      }
      return content;
    }

    if (payload.template_type === "generic") {
      const elements = payload.elements || [];
      content.message_type = elements.length > 1 ? 'carousel' : 'generic';
      content.elements = elements.map((elem: any) => ({
        title: elem.title || "",
        subtitle: elem.subtitle,
        image_url: elem.image_url,
        default_action: elem.default_action,
        buttons: elem.buttons?.map(parseButton) || []
      }));
      return content;
    }
  }

  return content;
}

function parseButton(btn: any): MessageButton {
  return {
    type: btn.type || 'postback',
    title: btn.title || "",
    url: btn.url,
    payload: btn.payload,
    webview_height_ratio: btn.webview_height_ratio
  };
}

/**
 * Convert old format (from database) to MessageContent
 */
export function convertLegacyToMessageContent(data: {
  text_content?: string | null;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  buttons?: any[];
  messenger_payload?: any;
}): MessageContent {
  // Check for embedded _message_content (new format)
  if (data.messenger_payload?._message_content?.message_type) {
    return data.messenger_payload._message_content as MessageContent;
  }
  
  // If we have messenger_payload with the new format directly, parse it
  if (data.messenger_payload?.message_type) {
    return data.messenger_payload as MessageContent;
  }

  // If we have messenger_payload in old Facebook API format, try to parse it
  if (data.messenger_payload?.message) {
    return parseMessengerPayload(data.messenger_payload);
  }

  // Convert from legacy fields
  if (data.text_content) {
    return {
      message_type: 'text',
      text: data.text_content
    };
  }

  // Template (generic)
  return {
    message_type: 'generic',
    elements: [{
      title: data.title || "",
      subtitle: data.subtitle || undefined,
      image_url: data.image_url || undefined,
      buttons: (data.buttons || []).map(btn => ({
        type: btn.type || 'web_url',
        title: btn.title || "",
        url: btn.url,
        payload: btn.payload
      }))
    }]
  };
}

/**
 * Convert MessageContent to legacy database format for backward compatibility
 */
export function convertMessageContentToLegacy(content: MessageContent): {
  text_content: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  buttons: any[];
  messenger_payload: any;
} {
  const legacy = {
    text_content: null as string | null,
    title: null as string | null,
    subtitle: null as string | null,
    image_url: null as string | null,
    buttons: [] as any[],
    // Store both the MessageContent (for reloading) and Facebook format (for API)
    messenger_payload: {
      ...generateMessengerPayload(content),
      _message_content: content  // Store the full MessageContent for proper reload
    }
  };

  switch (content.message_type) {
    case 'text':
    case 'quick_replies':
      legacy.text_content = content.text || null;
      break;

    case 'generic':
    case 'button':
    case 'carousel':
      if (content.elements?.[0]) {
        legacy.title = content.elements[0].title || null;
        legacy.subtitle = content.elements[0].subtitle || null;
        legacy.image_url = content.elements[0].image_url || null;
        legacy.buttons = content.elements[0].buttons || [];
      }
      break;

    case 'media':
      if (content.media_element) {
        legacy.image_url = content.media_element.url || null;
        legacy.buttons = content.media_element.buttons || [];
      }
      break;
  }

  return legacy;
}

/**
 * Get a display name for a message based on its content
 */
export function getMessagePreviewText(content: MessageContent): string {
  switch (content.message_type) {
    case 'text':
    case 'quick_replies':
      return content.text?.substring(0, 50) || "Empty text";
    case 'generic':
    case 'carousel':
      return content.elements?.[0]?.title || "Untitled card";
    case 'button':
      return content.elements?.[0]?.title?.substring(0, 50) || "Button message";
    case 'media':
      return `${content.media_element?.media_type === 'video' ? 'Video' : 'Image'} message`;
    default:
      return "Message";
  }
}
