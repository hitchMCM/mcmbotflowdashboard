import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePage } from '@/contexts/PageContext';
import { UtilityContent } from '@/types/messages';
import { PERSONALIZATION_TAGS } from '@/components/ui/TagAutocompleteTextarea';

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
// Friendly Tag ↔ Numbered Variable Conversion
// =====================================================================================

/**
 * Mapping from friendly tag names to param_label values and default examples.
 * This is the single source of truth for tag → field mapping.
 */
export const FRIENDLY_TAG_MAP: Record<string, { param_label: string; example: string }> = {
  'FullName':  { param_label: 'full_name',  example: 'John Doe' },
  'FirstName': { param_label: 'first_name', example: 'John' },
  'LastName':  { param_label: 'last_name',  example: 'Doe' },
};

/** Regex that matches friendly tags like {{FirstName}}, {{FullName}}, {{LastName}} */
const FRIENDLY_TAG_REGEX = /\{\{(FullName|FirstName|LastName)\}\}/g;

/** Regex that matches numbered tags like {{1}}, {{2}} */
const NUMBERED_TAG_REGEX = /\{\{(\d+)\}\}/g;

/**
 * Count distinct variables (friendly OR numbered) across all text fields.
 * Returns the list of unique variable keys in order of first appearance.
 * e.g. ["FirstName", "FullName"] or ["1", "2"] — never mixed.
 */
export function extractOrderedVariables(texts: string[]): string[] {
  const allText = texts.join(' ');
  const seen = new Set<string>();
  const ordered: string[] = [];

  // First check for friendly tags
  const friendlyMatches = allText.matchAll(FRIENDLY_TAG_REGEX);
  for (const m of friendlyMatches) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ordered.push(m[1]);
    }
  }

  // Also check for numbered tags (user might mix or use old style)
  const numberedMatches = allText.matchAll(NUMBERED_TAG_REGEX);
  for (const m of numberedMatches) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ordered.push(m[1]);
    }
  }

  return ordered;
}

/**
 * Convert friendly tags to numbered Meta format.
 * e.g. "Hello {{FirstName}}, order for {{FullName}}" → "Hello {{1}}, order for {{2}}"
 * Returns: { text, varMap } where varMap maps position → friendly tag key
 */
export function convertFriendlyToNumbered(
  text: string,
  variableOrder: string[]
): string {
  let result = text;
  variableOrder.forEach((key, idx) => {
    // Only replace friendly tags (not already numbered)
    if (FRIENDLY_TAG_MAP[key]) {
      const friendlyPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(friendlyPattern, `{{${idx + 1}}}`);
    }
  });
  return result;
}

/**
 * Build param_labels array from the ordered variable list.
 * Friendly tags get their param_label; numbered tags keep their existing label.
 */
export function buildParamLabelsFromVars(
  variableOrder: string[],
  existingLabels?: string[]
): string[] {
  return variableOrder.map((key, idx) => {
    if (FRIENDLY_TAG_MAP[key]) {
      return FRIENDLY_TAG_MAP[key].param_label;
    }
    // Numbered var — keep existing label if any
    return existingLabels?.[idx] || '';
  });
}

/**
 * Build default example values from the ordered variable list.
 * Friendly tags get smart defaults; numbered tags keep existing or fallback.
 */
export function buildExampleValuesFromVars(
  variableOrder: string[],
  existingValues?: string[]
): string[] {
  return variableOrder.map((key, idx) => {
    if (FRIENDLY_TAG_MAP[key]) {
      // Use existing value if user already typed one, otherwise use default
      const existing = existingValues?.[idx]?.trim();
      return existing || FRIENDLY_TAG_MAP[key].example;
    }
    return existingValues?.[idx] || '';
  });
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

  // ── Convert friendly tags → numbered BEFORE building components ──
  // Collect all text fields to determine global variable order
  const buttonTexts = (utility.buttons || []).map(b => (b.url || '') + ' ' + (b.payload || '')).join(' ');
  const allTexts = [
    utility.header_text || '',
    utility.body_text || '',
    buttonTexts,
    utility.button_url || '',
    utility.button_payload || '',
  ];
  const variableOrder = extractOrderedVariables(allTexts);
  const hasFriendlyTags = variableOrder.some(k => !!FRIENDLY_TAG_MAP[k]);

  // Create a working copy with friendly tags converted to numbered
  const u = { ...utility };
  if (hasFriendlyTags) {
    if (u.header_text) u.header_text = convertFriendlyToNumbered(u.header_text, variableOrder);
    if (u.body_text) u.body_text = convertFriendlyToNumbered(u.body_text, variableOrder);
    if (u.button_url) u.button_url = convertFriendlyToNumbered(u.button_url, variableOrder);
    if (u.button_payload) u.button_payload = convertFriendlyToNumbered(u.button_payload, variableOrder);
    if (u.buttons) {
      u.buttons = u.buttons.map(btn => ({
        ...btn,
        url: btn.url ? convertFriendlyToNumbered(btn.url, variableOrder) : btn.url,
        payload: btn.payload ? convertFriendlyToNumbered(btn.payload, variableOrder) : btn.payload,
      }));
    }
    // Also build proper example values from the friendly tag mapping
    u.example_values = buildExampleValuesFromVars(variableOrder, utility.example_values);
  }

  // HEADER component (optional) — supports TEXT, IMAGE, VIDEO, DOCUMENT
  const headerFormat = u.header_format || (u.header_text?.trim() ? 'TEXT' : 'NONE');
  
  if (headerFormat === 'TEXT' && u.header_text?.trim()) {
    const headerComponent: MetaTemplateComponent = {
      type: 'HEADER',
      format: 'TEXT',
      text: u.header_text.trim(),
    };
    const headerVarCount = (u.header_text.match(/\{\{\d+\}\}/g) || []).length;
    if (headerVarCount > 0) {
      headerComponent.example = {
        header_text: ensureExamples(u.example_values || [], headerVarCount),
      };
    }
    components.push(headerComponent);
  } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) && u.header_media_handle) {
    // For template CREATION: include the media handle so Meta stores the image.
    const headerComp: MetaTemplateComponent = {
      type: 'HEADER',
      format: headerFormat as 'IMAGE' | 'VIDEO' | 'DOCUMENT',
      example: {
        header_handle: [u.header_media_handle],
      },
    };
    if (u.header_text?.trim()) {
      headerComp.text = u.header_text.trim();
      const headerVarCount = (u.header_text.match(/\{\{\d+\}\}/g) || []).length;
      if (headerVarCount > 0) {
        headerComp.example!.header_text = ensureExamples(u.example_values || [], headerVarCount);
      }
    }
    components.push(headerComp);
  }
  // Note: IMAGE/VIDEO/DOCUMENT headers are skipped if no media handle is provided

  // BODY component (required)
  const bodyComponent: MetaTemplateComponent = {
    type: 'BODY',
    text: u.body_text,
  };
  const bodyVarMatches = u.body_text.match(/\{\{\d+\}\}/g) || [];
  if (bodyVarMatches.length > 0) {
    const headerVarCount = (u.header_text?.match(/\{\{\d+\}\}/g) || []).length;
    const bodyExamples = ensureExamples(
      (u.example_values || []).slice(headerVarCount),
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
  const validButtons = (u.buttons || []).filter(btn => btn.text?.trim());
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
  else if (u.button_type && u.button_text) {
    const button: MetaTemplateButton = {
      type: u.button_type === 'url' ? 'URL' : 'POSTBACK',
      text: u.button_text,
    };
    if (u.button_type === 'url' && u.button_url) {
      button.url = u.button_url;
      const urlVarCount = (u.button_url.match(/\{\{\d+\}\}/g) || []).length;
      if (urlVarCount > 0) {
        button.example = { url_suffix_example: 'https://example.com/orders/1234' };
      }
    }
    if (u.button_type === 'postback' && u.button_payload) {
      button.payload = u.button_payload;
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
      // Compute actual variable count from the body text to avoid stale param_labels
      const allBodyTexts = [
        utility.header_text || '',
        utility.body_text || '',
        (utility.buttons || []).map(b => (b.url || '') + ' ' + (b.payload || '')).join(' '),
        utility.button_url || '',
        utility.button_payload || '',
      ];
      const actualVarOrder = extractOrderedVariables(allBodyTexts);
      const actualVarCount = actualVarOrder.length;

      const metaTemplate: Record<string, any> = {
        template_name: (utility.template_name || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''),
        template_language: utility.language || 'en',
        template_status: result.status || 'PENDING',
        template_id: result.template_id || null,
        rejection_reason: result.rejection_reason || null,
        submitted_at: new Date().toISOString(),
        // Track WHICH Facebook page this template was submitted under.
        // This is the key that prevents cross-page error 100: if a template was
        // approved under facebook_page_id "111", it cannot be sent from page "222".
        facebook_page_id: currentPage?.facebook_page_id || null,
        components: buildTemplateComponents(utility),
        example_values: actualVarCount > 0 ? (utility.example_values || []).slice(0, actualVarCount) : [],
        param_labels: actualVarCount > 0 ? (utility.param_labels || []).slice(0, actualVarCount) : [],
      };

      // 3. Merge into messenger_payload — also stamp _facebook_page_id at the top level
      //    so the utilityMessages filter can exclude cross-page templates
      const updatedPayload = {
        ...existingPayload,
        _facebook_page_id: currentPage?.facebook_page_id || existingPayload._facebook_page_id || null,
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
  }, [currentPage]);

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
