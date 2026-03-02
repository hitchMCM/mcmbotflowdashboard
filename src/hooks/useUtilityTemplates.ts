import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePage } from '@/contexts/PageContext';
import { UtilityContent } from '@/types/messages';

// =====================================================================================
// Meta Graph API - Utility Message Templates
// Full lifecycle: Create → Submit to Meta → Handle Response → Save to DB → Display
// =====================================================================================

const META_GRAPH_API_VERSION = 'v25.0';
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export type UtilityTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';

export interface UtilityTemplateResult {
  success: boolean;
  template_id?: string;
  status?: UtilityTemplateStatus;
  rejection_reason?: string;
  error?: string;
  warning?: string;
}

interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: { body_text?: string[][]; header_text?: string[]; header_handle?: string[] };
  buttons?: MetaTemplateButton[];
}

interface MetaTemplateButton {
  type: 'URL' | 'POSTBACK';
  text: string;
  url?: string;
  payload?: string;           // For POSTBACK buttons (can include {{N}} params)
  example?: Record<string, string> | string[] | string;  // url_suffix_example for URL buttons
}

interface MetaCreateTemplateResponse {
  id: string;
  status: string;
  category?: string;
}

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    error_data?: any;
    fbtrace_id?: string;
  };
}

// =====================================================================================
// STEP 2 & 3: Build Meta API payload from utility content
// =====================================================================================

/**
 * Ensure example values are never empty — Meta rejects empty example strings.
 */
function ensureExamples(values: string[], count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const val = values?.[i]?.trim();
    result.push(val || `example_${i + 1}`);
  }
  return result;
}

function buildTemplateComponents(utility: UtilityContent): MetaTemplateComponent[] {
  const components: MetaTemplateComponent[] = [];

  // HEADER component (optional) — supports TEXT, IMAGE, VIDEO, DOCUMENT
  const headerFormat = utility.header_format || (utility.header_text?.trim() ? 'TEXT' : 'NONE');
  
  if (headerFormat === 'TEXT' && utility.header_text?.trim()) {
    const headerComponent: MetaTemplateComponent = {
      type: 'HEADER',
      format: 'TEXT',
      text: utility.header_text.trim(),
    };
    const headerVarCount = (utility.header_text.match(/\{\{\d+\}\}/g) || []).length;
    if (headerVarCount > 0) {
      headerComponent.example = {
        header_text: ensureExamples(utility.example_values || [], headerVarCount),
      };
    }
    components.push(headerComponent);
  } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) && utility.header_media_handle) {
    // For Messenger Platform: IMAGE/VIDEO/DOCUMENT headers must NOT have a `text` field.
    // Only provide the format + example with the media handle.
    // (The `text` field is WhatsApp-only and causes Meta error on Messenger.)
    components.push({
      type: 'HEADER',
      format: headerFormat as 'IMAGE' | 'VIDEO' | 'DOCUMENT',
      example: {
        header_handle: [utility.header_media_handle],
      },
    });
  }
  // Note: IMAGE/VIDEO/DOCUMENT headers are skipped if no media handle is provided

  // BODY component (required)
  const bodyComponent: MetaTemplateComponent = {
    type: 'BODY',
    text: utility.body_text,
  };
  const bodyVarMatches = utility.body_text.match(/\{\{\d+\}\}/g) || [];
  if (bodyVarMatches.length > 0) {
    const headerVarCount = (utility.header_text?.match(/\{\{\d+\}\}/g) || []).length;
    const bodyExamples = ensureExamples(
      (utility.example_values || []).slice(headerVarCount),
      bodyVarMatches.length
    );
    bodyComponent.example = {
      body_text: [bodyExamples],
    };
  }
  components.push(bodyComponent);

  // NOTE: FOOTER is NOT supported by Messenger Platform message_templates.
  // Messenger only allows: HEADER, BODY, BUTTONS.
  // Footer text is stored locally but never sent to Meta.

  // BUTTONS component — Messenger supports URL and POSTBACK buttons
  // Only include buttons that have text (Meta rejects empty button text)
  const validButtons = (utility.buttons || []).filter(btn => btn.text?.trim());
  if (validButtons.length > 0) {
    const metaButtons: MetaTemplateButton[] = validButtons.map(btn => {
      const metaBtn: MetaTemplateButton = {
        type: btn.type,
        text: btn.text.trim(),
      };
      if (btn.type === 'URL' && btn.url?.trim()) {
        metaBtn.url = btn.url.trim();
        const urlVarCount = (btn.url.match(/\{\{\d+\}\}/g) || []).length;
        if (urlVarCount > 0) {
          metaBtn.example = { url_suffix_example: btn.example || 'https://example.com/orders/1234' };
        }
      }
      if (btn.type === 'POSTBACK') {
        metaBtn.payload = btn.payload?.trim() || btn.text.trim().toLowerCase().replace(/\s+/g, '_');
      }
      return metaBtn;
    });
    components.push({
      type: 'BUTTONS',
      buttons: metaButtons,
    });
  }
  // Legacy single-button support (backward compat)
  else if (utility.button_type && utility.button_text) {
    const button: MetaTemplateButton = {
      type: utility.button_type === 'url' ? 'URL' : 'POSTBACK',
      text: utility.button_text,
    };
    if (utility.button_type === 'url' && utility.button_url) {
      button.url = utility.button_url;
      const urlVarCount = (utility.button_url.match(/\{\{\d+\}\}/g) || []).length;
      if (urlVarCount > 0) {
        button.example = { url_suffix_example: 'https://example.com/orders/1234' };
      }
    }
    if (utility.button_type === 'postback' && utility.button_payload) {
      button.payload = utility.button_payload;
    }
    components.push({
      type: 'BUTTONS',
      buttons: [button],
    });
  }

  return components;
}

// =====================================================================================
// Main Hook
// =====================================================================================

/**
 * Upload an image URL to Meta's Resumable Upload API via our server-side proxy.
 * The proxy runs on the Vite dev server (/meta-upload) and handles the download
 * + upload server-side to avoid CORS restrictions in the browser.
 */
async function uploadMediaToMeta(
  imageUrl: string,
  accessToken: string,
  mediaType: string = 'image/png'
): Promise<{ success: boolean; handle?: string; error?: string }> {
  try {
    console.log('[uploadMediaToMeta] Sending to server proxy:', imageUrl);
    
    const response = await fetch('/meta-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, accessToken, mimeType: mediaType }),
    });

    const data = await response.json();
    console.log('[uploadMediaToMeta] Proxy response:', data);

    if (data.success && data.handle) {
      return { success: true, handle: data.handle };
    } else {
      return { success: false, error: data.error || 'Upload failed via proxy' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown upload error';
    console.error('[uploadMediaToMeta] Proxy error:', msg);
    return { success: false, error: msg };
  }
}

export function useUtilityTemplates() {
  const { currentPage } = usePage();
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<UtilityTemplateResult | null>(null);

  // =====================================================================================
  // STEP 2 & 3: Submit template to Meta Graph API
  // =====================================================================================
  const submitTemplateToMeta = useCallback(async (
    utility: UtilityContent
  ): Promise<UtilityTemplateResult> => {
    if (!currentPage?.facebook_page_id) {
      return { success: false, error: 'No Facebook Page ID configured. Please configure your page first.' };
    }
    if (!currentPage?.access_token) {
      return { success: false, error: 'No access token found for this page. Please reconnect your page.' };
    }
    if (!utility.template_name?.trim()) {
      return { success: false, error: 'Template name is required.' };
    }
    if (!utility.body_text?.trim()) {
      return { success: false, error: 'Body text is required.' };
    }

    // If header is IMAGE/VIDEO/DOCUMENT with a URL but no media handle, upload via server proxy.
    const utilityToSubmit = { ...utility };
    let headerSkipped = false;
    const headerFormat = utility.header_format || 'NONE';
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) && utility.header_image_url?.trim() && !utility.header_media_handle) {
      console.log('[useUtilityTemplates] Uploading media via server proxy for header:', headerFormat, utility.header_image_url);
      const mimeType = headerFormat === 'IMAGE' ? 'image/png' 
        : headerFormat === 'VIDEO' ? 'video/mp4' 
        : 'application/pdf';
      const uploadResult = await uploadMediaToMeta(utility.header_image_url, currentPage.access_token, mimeType);
      if (!uploadResult.success) {
        // Upload failed — skip the header and warn user
        console.warn('[useUtilityTemplates] Media upload failed via proxy, submitting WITHOUT header:', uploadResult.error);
        utilityToSubmit.header_format = 'NONE';
        headerSkipped = true;
      } else {
        utilityToSubmit.header_media_handle = uploadResult.handle;
        console.log('[useUtilityTemplates] Got media handle from proxy:', uploadResult.handle);
      }
    }

    const components = buildTemplateComponents(utilityToSubmit);

    // Sanitize template name: only lowercase letters, numbers, underscores
    const sanitizedName = utility.template_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')   // Replace all non-allowed chars
      .replace(/_+/g, '_')           // Collapse multiple underscores
      .replace(/^_|_$/g, '');         // Trim leading/trailing underscores

    if (!sanitizedName) {
      return { success: false, error: 'Template name is invalid after sanitization (must contain letters/numbers).' };
    }

    // Build the Meta API payload
    const payload = {
      name: sanitizedName,
      category: 'UTILITY',
      language: utility.language || 'en',
      components,
    };

    console.log('[useUtilityTemplates] Submitting to Meta API:', JSON.stringify(payload, null, 2));

    try {
      // Pass access_token as query param (as per Meta docs examples)
      const url = `${META_GRAPH_BASE_URL}/${currentPage.facebook_page_id}/message_templates?access_token=${encodeURIComponent(currentPage.access_token)}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('[useUtilityTemplates] Meta API response:', data);

      // STEP 4: Handle Meta's response
      if (!response.ok) {
        const errorData = data as MetaErrorResponse;
        const err = errorData.error;
        // Build a detailed error message from all available fields
        const parts: string[] = [];
        if (err?.message) parts.push(err.message);
        if (err?.error_user_title) parts.push(`(${err.error_user_title})`);
        if (err?.error_user_msg) parts.push(err.error_user_msg);
        if (err?.error_data) parts.push(`Data: ${JSON.stringify(err.error_data)}`);
        const errorMessage = parts.join(' — ') || `HTTP ${response.status}: Unknown error`;
        console.error('[useUtilityTemplates] Meta API error (full):', JSON.stringify(data, null, 2));
        console.error('[useUtilityTemplates] Payload sent was:', JSON.stringify(payload, null, 2));
        return {
          success: false,
          status: 'REJECTED',
          rejection_reason: errorMessage,
          error: errorMessage,
        };
      }

      const successData = data as MetaCreateTemplateResponse;
      const status = (successData.status?.toUpperCase() || 'PENDING') as UtilityTemplateStatus;

      return {
        success: true,
        template_id: successData.id,
        status,
        warning: headerSkipped ? 'The header image could not be uploaded to Meta. The template was submitted without an image. Check the image URL and try again.' : undefined,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error while contacting Meta API';
      console.error('[useUtilityTemplates] Network error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [currentPage]);

  // =====================================================================================
  // STEP 5: Save template result to database
  // Stores Meta template metadata inside messenger_payload._meta_template
  // (the utility_template_* columns do NOT exist in the DB)
  // =====================================================================================
  const saveTemplateResult = useCallback(async (
    messageId: string,
    result: UtilityTemplateResult,
    utility: UtilityContent
  ): Promise<boolean> => {
    try {
      // 1. Read the current messenger_payload so we can merge
      const { data: current, error: readError } = await supabase
        .from('messages')
        .select('messenger_payload')
        .eq('id', messageId)
        .single();

      if (readError) {
        console.error('[useUtilityTemplates] Could not read current message:', readError);
        return false;
      }

      const existingPayload = (current?.messenger_payload as Record<string, any>) || {};

      // 2. Build _meta_template object
      const metaTemplate: Record<string, any> = {
        template_name: utility.template_name?.trim().toLowerCase().replace(/\s+/g, '_'),
        template_language: utility.language || 'en',
        template_status: result.status || 'PENDING',
        template_id: result.template_id || null,
        rejection_reason: result.rejection_reason || null,
        submitted_at: new Date().toISOString(),
        components: buildTemplateComponents(utility),
        example_values: utility.example_values || [],
        param_labels: utility.param_labels || [],
      };

      // 3. Merge into messenger_payload
      const updatedPayload = {
        ...existingPayload,
        _meta_template: metaTemplate,
      };

      console.log('[useUtilityTemplates] Saving _meta_template to DB:', metaTemplate);

      // 4. Write back only the messenger_payload column (which exists in DB)
      const { error } = await supabase
        .from('messages')
        .update({ messenger_payload: updatedPayload })
        .eq('id', messageId);

      if (error) {
        console.error('[useUtilityTemplates] DB save error:', error);
        return false;
      }

      console.log('[useUtilityTemplates] Saved to DB successfully');
      return true;
    } catch (err) {
      console.error('[useUtilityTemplates] Error saving to DB:', err);
      return false;
    }
  }, []);

  // =====================================================================================
  // Full flow: Submit + Save (Steps 2-5 combined)
  // =====================================================================================
  const createAndSubmitTemplate = useCallback(async (
    messageId: string,
    utility: UtilityContent
  ): Promise<UtilityTemplateResult> => {
    setSubmitting(true);
    setLastResult(null);

    try {
      // Step 2 & 3: Submit to Meta
      const result = await submitTemplateToMeta(utility);
      console.log('[useUtilityTemplates] submitTemplateToMeta result:', JSON.stringify(result));

      // Step 5: Save result to DB (regardless of success/failure)
      const saved = await saveTemplateResult(messageId, result, utility);
      if (!saved) {
        console.error('[useUtilityTemplates] WARNING: Meta result was NOT saved to DB! The status will be lost after refresh.');
      }

      // Step 6: Return result for UI display
      setLastResult(result);
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [submitTemplateToMeta, saveTemplateResult]);

  // =====================================================================================
  // Check template status from Meta API
  // =====================================================================================
  const checkTemplateStatus = useCallback(async (
    templateId: string
  ): Promise<UtilityTemplateResult> => {
    if (!currentPage?.access_token) {
      return { success: false, error: 'No access token available.' };
    }

    try {
      const url = `${META_GRAPH_BASE_URL}/${templateId}?fields=name,status,category,rejected_reason&access_token=${encodeURIComponent(currentPage.access_token)}`;
      const response = await fetch(url);

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Failed to check status' };
      }

      return {
        success: true,
        template_id: templateId,
        status: (data.status?.toUpperCase() || 'PENDING') as UtilityTemplateStatus,
        rejection_reason: data.rejected_reason,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, [currentPage]);

  // =====================================================================================
  // Delete template from Meta API
  // =====================================================================================
  const deleteTemplate = useCallback(async (
    templateName: string
  ): Promise<boolean> => {
    if (!currentPage?.facebook_page_id || !currentPage?.access_token) {
      return false;
    }

    try {
      const url = `${META_GRAPH_BASE_URL}/${currentPage.facebook_page_id}/message_templates?name=${templateName}&access_token=${encodeURIComponent(currentPage.access_token)}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [currentPage]);

  return {
    submitting,
    lastResult,
    createAndSubmitTemplate,
    checkTemplateStatus,
    deleteTemplate,
    clearResult: () => setLastResult(null),
  };
}
