import { MessageContent, MessageButton, TemplateElement, QuickReply, FacebookMessageType, ImageFullContent, OptInContent, UtilityContent } from "@/types/messages";

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
        const element: any = {
          title: elem.title || undefined,
          subtitle: elem.subtitle || undefined,
          image_url: elem.image_url || undefined,
          buttons: processButtons(elem.buttons)
        };
        // Only add default_action if it has a valid URL
        if (elem.default_action?.url) {
          element.default_action = {
            type: "web_url",
            url: elem.default_action.url,
            webview_height_ratio: elem.default_action.webview_height_ratio || "full"
          };
        }
        payload.message.attachment = {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [element]
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
            text: elem.title || undefined,
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
            elements: content.elements.map(elem => {
              const element: any = {
                title: elem.title || undefined,
                subtitle: elem.subtitle || undefined,
                image_url: elem.image_url || undefined,
                buttons: processButtons(elem.buttons)
              };
              // Only add default_action if it has a valid URL
              if (elem.default_action?.url) {
                element.default_action = {
                  type: "web_url",
                  url: elem.default_action.url,
                  webview_height_ratio: elem.default_action.webview_height_ratio || "full"
                };
              }
              return element;
            })
          }
        };
      }
      addQuickReplies();
      break;

    case 'quick_replies':
      payload.message.text = content.text || undefined;
      addQuickReplies();
      break;

    case 'opt_in':
      // Facebook one_time_notif_req template
      if (content.opt_in) {
        payload.message.attachment = {
          type: "template",
          payload: {
            template_type: "one_time_notif_req",
            title: content.opt_in.title || "Souhaitez-vous recevoir nos mises à jour ?",
            payload: content.opt_in.payload || "OPT_IN_YES"
          }
        };
      }
      break;

    case 'utility':
      // Facebook Utility Message template (supports TEXT/IMAGE/VIDEO/DOCUMENT headers, footer, multiple buttons)
      if (content.utility) {
        const util = content.utility;
        const components: any[] = [];
        
        // Header component
        const headerFormat = util.header_format || (util.header_text ? 'TEXT' : 'NONE');
        if (headerFormat === 'TEXT' && util.header_text) {
          const headerParams = extractTemplateParams(util.header_text, util.example_values);
          if (headerParams.length > 0) {
            components.push({ type: "header", parameters: headerParams });
          }
        } else if (headerFormat === 'IMAGE' && util.header_image_url) {
          components.push({ 
            type: "header", 
            parameters: [{ type: "image", image: { link: util.header_image_url } }] 
          });
        } else if (headerFormat === 'VIDEO' && util.header_image_url) {
          components.push({ 
            type: "header", 
            parameters: [{ type: "video", video: { link: util.header_image_url } }] 
          });
        } else if (headerFormat === 'DOCUMENT' && util.header_image_url) {
          components.push({ 
            type: "header", 
            parameters: [{ type: "document", document: { link: util.header_image_url } }] 
          });
        }
        
        // Body component
        if (util.body_text) {
          const bodyParams = extractTemplateParams(util.body_text, util.example_values);
          if (bodyParams.length > 0) {
            components.push({ type: "body", parameters: bodyParams });
          }
        }
        
        // Buttons component (new multi-button support)
        if (util.buttons && util.buttons.length > 0) {
          util.buttons.forEach((btn, btnIdx) => {
            if (btn.type === 'URL' && btn.url) {
              const urlMatch = btn.url.match(/\{\{(\d+)\}\}/);
              if (urlMatch) {
                const idx = parseInt(urlMatch[1]) - 1;
                components.push({
                  type: "button",
                  sub_type: "url",
                  index: btnIdx.toString(),
                  parameters: [{ type: "text", text: util.example_values?.[idx] || "" }]
                });
              }
            } else if (btn.type === 'POSTBACK' && btn.payload) {
              // POSTBACK buttons — payload may contain {{N}} params resolved at send time
              // No additional parameters needed in the send payload for postback buttons
            }
          });
        }
        // Legacy single-button support (backward compat)
        else if (util.button_type === 'url' && util.button_url) {
          const urlMatch = util.button_url.match(/\{\{(\d+)\}\}/);
          if (urlMatch) {
            const idx = parseInt(urlMatch[1]) - 1;
            components.push({
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: util.example_values?.[idx] || "" }]
            });
          }
        } else if (util.button_type === 'postback' && util.button_payload) {
          const payloadMatch = util.button_payload.match(/\{\{(\d+)\}\}/);
          if (payloadMatch) {
            const idx = parseInt(payloadMatch[1]) - 1;
            components.push({
              type: "button",
              sub_type: "quick_reply",
              index: "0",
              parameters: [{ type: "payload", payload: util.example_values?.[idx] || "" }]
            });
          }
        }

        // Build the utility payload
        payload.messaging_type = "UTILITY";
        payload.message = {
          template: {
            name: util.template_name,
            language: { code: util.language || "en" },
            ...(components.length > 0 ? { components } : {})
          }
        };
      }
      break;

    case 'image_full':
      // Generate array of 2 messages: image first, then text+buttons
      if (content.image_full) {
        const messages: any[] = [];
        
        // First message: the full image as attachment
        messages.push({
          recipient: { id: "{{PSID}}" },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: content.image_full.image_url,
                is_reusable: true
              }
            }
          }
        });
        
        // Second message: text with buttons (if any)
        if (content.image_full.text || (content.image_full.buttons && content.image_full.buttons.length > 0)) {
          const secondMsg: any = {
            recipient: { id: "{{PSID}}" },
            message: {}
          };
          
          if (content.image_full.buttons && content.image_full.buttons.length > 0) {
            // Use button template if we have buttons
            secondMsg.message.attachment = {
              type: "template",
              payload: {
                template_type: "button",
                text: content.image_full.text || "👆",
                buttons: processButtons(content.image_full.buttons)
              }
            };
          } else {
            // Just text if no buttons
            secondMsg.message.text = content.image_full.text;
          }
          
          // Add quick replies to the last message
          if (content.quick_replies && content.quick_replies.length > 0) {
            secondMsg.message.quick_replies = content.quick_replies.map(qr => ({
              content_type: qr.content_type || "text",
              title: qr.title,
              payload: qr.payload || qr.title,
              ...(qr.image_url ? { image_url: qr.image_url } : {})
            }));
          }
          
          messages.push(secondMsg);
        }
        
        // Return array of messages instead of single payload
        return { _multi_message: true, messages };
      }
      break;
  }

  return payload;
}

/**
 * Parse Facebook Messenger API JSON payload to MessageContent
 */
export function parseMessengerPayload(json: any): MessageContent {
  const content: MessageContent = { message_type: 'text' };
  
  // Handle multi-message format (image_full)
  if (json?._multi_message && json.messages) {
    const messages = json.messages;
    if (messages.length >= 1) {
      const firstMsg = messages[0]?.message;
      const secondMsg = messages[1]?.message;
      
      // Check if first is image attachment
      if (firstMsg?.attachment?.type === 'image') {
        content.message_type = 'image_full';
        content.image_full = {
          image_url: firstMsg.attachment.payload?.url || '',
          text: '',
          buttons: []
        };
        
        // Parse second message for text and buttons
        if (secondMsg) {
          if (secondMsg.attachment?.payload?.template_type === 'button') {
            content.image_full.text = secondMsg.attachment.payload.text || '';
            content.image_full.buttons = secondMsg.attachment.payload.buttons?.map(parseButton) || [];
          } else if (secondMsg.text) {
            content.image_full.text = secondMsg.text;
          }
          
          // Parse quick replies
          if (secondMsg.quick_replies) {
            content.quick_replies = secondMsg.quick_replies.map((qr: any) => ({
              content_type: qr.content_type || "text",
              title: qr.title,
              payload: qr.payload,
              image_url: qr.image_url
            }));
          }
        }
        
        return content;
      }
    }
  }
  
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

    if (payload.template_type === "one_time_notif_req") {
      content.message_type = 'opt_in';
      content.opt_in = {
        title: payload.title || "",
        payload: payload.payload || "OPT_IN_YES"
      };
      return content;
    }
  }

  // Utility message (has message.template instead of message.attachment)
  if (msg.template?.name) {
    content.message_type = 'utility';
    content.utility = {
      template_name: msg.template.name,
      language: msg.template.language?.code || 'en',
      header_format: 'NONE',
      header_text: '',
      body_text: '',
      footer_text: '',
      buttons: [],
      button_type: null,
      button_text: '',
      button_url: '',
      button_payload: '',
      example_values: []
    };
    // Extract example values from components
    if (msg.template.components) {
      for (const comp of msg.template.components) {
        if (comp.parameters) {
          for (const param of comp.parameters) {
            if (param.type === 'text' && param.text) {
              content.utility.example_values.push(param.text);
            }
          }
        }
      }
    }
    return content;
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
 * Extract template parameters from text with {{1}}, {{2}} placeholders
 * Returns array of parameter objects for the Facebook API
 */
function extractTemplateParams(text: string, exampleValues: string[] = []): any[] {
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];
  
  // Get unique sorted variable numbers
  const varNums = [...new Set(matches.map(m => parseInt(m.replace(/[{}]/g, ''))))].sort((a, b) => a - b);
  
  return varNums.map(num => ({
    type: "text",
    text: exampleValues[num - 1] || ""
  }));
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
    const stored = data.messenger_payload._message_content as MessageContent;
    // Ensure utility messages always have a utility object with defaults
    if (stored.message_type === 'utility' && !stored.utility) {
      stored.utility = {
        template_name: '',
        language: 'en',
        header_format: 'NONE',
        header_text: '',
        header_image_url: '',
        body_text: '',
        footer_text: '',
        buttons: [],
        example_values: [],
      };
    }
    return stored;
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

    case 'image_full':
      if (content.image_full) {
        legacy.image_url = content.image_full.image_url || null;
        legacy.text_content = content.image_full.text || null;
        legacy.buttons = content.image_full.buttons || [];
      }
      break;

    case 'opt_in':
      if (content.opt_in) {
        legacy.text_content = content.opt_in.title || null;
        legacy.buttons = [];
      }
      break;

    case 'utility':
      if (content.utility) {
        legacy.text_content = content.utility.body_text || null;
        legacy.title = content.utility.template_name || null;
        legacy.subtitle = content.utility.header_text || null;
        legacy.image_url = content.utility.header_image_url || null;
        legacy.buttons = [];
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
    case 'image_full':
      return content.image_full?.text?.substring(0, 50) || "Full image message";
    case 'opt_in':
      return content.opt_in?.title?.substring(0, 50) || "Opt-in message";
    case 'utility':
      return `[Utility] ${content.utility?.template_name || 'template'}: ${content.utility?.body_text?.substring(0, 40) || ''}`;
    default:
      return "Message";
  }
}
