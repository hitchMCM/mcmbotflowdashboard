# MCM BotFlow - Unified Message Architecture

## Overview

The MCM BotFlow Dashboard uses a **unified message architecture** where:
1. **Messages** are stored in a single global pool (`messages` table)
2. **Page Configurations** define how each page uses messages from the pool (`page_configs` table)

This architecture allows:
- Sharing messages across multiple Facebook pages
- Flexible configuration per page (random, fixed, or ordered selection)
- Category-based organization (welcome, response, sequence, broadcast, standard)

---

## Database Schema

### Core Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TABLES                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐     ┌────────────────────────────┐
│          pages             │     │         messages           │
├────────────────────────────┤     ├────────────────────────────┤
│ id (uuid) PK               │     │ id (uuid) PK               │
│ fb_page_id (text) UNIQUE   │     │ name (text) NOT NULL       │
│ name (text)                │     │ category (text)            │
│ user_id (text)             │     │   - 'welcome'              │
│ access_token_encrypted     │     │   - 'response'             │
│ is_active (boolean)        │     │   - 'sequence'             │
│ subscribers_count          │     │   - 'broadcast'            │
│ created_at (timestamptz)   │     │   - 'standard'             │
└────────────────────────────┘     │ title (text)               │
              │                    │ subtitle (text)            │
              │                    │ text_content (text)        │
              │                    │ image_url (text)           │
              │                    │ buttons (jsonb)            │
              │                    │ weight (1-10)              │
              │                    │ is_active (boolean)        │
              │                    │ is_global (boolean)        │
              │                    │ day_number (int) *sequence │
              │                    │ message_order (int)        │
              │                    │ default_delay_hours        │
              │                    │ sent_count (int)           │
              │                    │ delivered_count (int)      │
              │                    │ read_count (int)           │
              │                    │ clicked_count (int)        │
              │                    │ created_at (timestamptz)   │
              │                    │ updated_at (timestamptz)   │
              │                    └────────────────────────────┘
              │
              │ (1:N)
              ▼
┌────────────────────────────┐
│       page_configs         │
├────────────────────────────┤
│ id (uuid) PK               │
│ page_id (uuid) FK          │ ──► pages.id
│ category (text)            │     (same as messages)
│ name (text)                │     e.g., "Job Response"
│ selected_message_ids[]     │ ──► messages.id[]
│ selection_mode (text)      │
│   - 'random'               │
│   - 'fixed'                │
│   - 'ordered'              │
│ fixed_message_id (uuid)    │ ──► messages.id
│ messages_count (int)       │
│ delay_hours[] (int[])      │     (for sequences)
│ scheduled_time (time)      │     (for broadcasts)
│ trigger_keywords[] (text[])│     (for responses)
│ is_enabled (boolean)       │
│ times_triggered (int)      │
│ created_at (timestamptz)   │
│ updated_at (timestamptz)   │
│                            │
│ UNIQUE(page_id, category,  │
│        name)               │
└────────────────────────────┘
```

---

## Selection Modes

### Random Mode
- System picks randomly from `selected_message_ids[]`
- Uses weighted selection (higher weight = higher probability)
- Good for: A/B testing, variety

### Fixed Mode
- Always uses `fixed_message_id`
- Consistent experience
- Good for: Specific campaigns, branded messages

### Ordered Mode
- Sends messages in sequence order
- Uses position parameter
- Good for: Onboarding sequences, courses

---

## Functions (RPC)

### Get Messages

```sql
-- Get welcome message for a page
SELECT * FROM get_page_welcome(page_id UUID);

-- Get response message for a keyword
SELECT * FROM get_page_response(page_id UUID, keyword TEXT);

-- Get sequence message for day/order
SELECT * FROM get_page_sequence(page_id UUID, day INTEGER, order INTEGER);

-- Get broadcast message
SELECT * FROM get_page_broadcast(page_id UUID, config_name TEXT);

-- Get standard message
SELECT * FROM get_page_standard(page_id UUID);

-- Get message from any config
SELECT * FROM get_config_message(config_id UUID, position INTEGER);
```

### Manage Configurations

```sql
-- Create or update a page config
SELECT upsert_page_config(
    p_page_id UUID,
    p_category TEXT,           -- 'welcome', 'response', etc.
    p_name TEXT,               -- config name
    p_selected_message_ids UUID[],
    p_selection_mode TEXT,     -- 'random', 'fixed', 'ordered'
    p_fixed_message_id UUID,
    p_trigger_keywords TEXT[],
    p_delay_hours INTEGER[],
    p_scheduled_time TIME,
    p_messages_count INTEGER,
    p_is_enabled BOOLEAN
);

-- Add/remove keywords (for responses)
SELECT add_config_keyword(config_id UUID, keyword TEXT);
SELECT remove_config_keyword(config_id UUID, keyword TEXT);

-- Add/remove messages from selection
SELECT add_config_message(config_id UUID, message_id UUID);
SELECT remove_config_message(config_id UUID, message_id UUID);
```

---

## Frontend Components

### Types (`src/types/messages.ts`)

```typescript
type MessageCategory = 'welcome' | 'response' | 'sequence' | 'broadcast' | 'standard';
type SelectionMode = 'random' | 'fixed' | 'ordered';

interface Message {
  id: string;
  name: string;
  category: MessageCategory;
  title: string | null;
  subtitle: string | null;
  text_content: string | null;
  image_url: string | null;
  buttons: any[];
  weight: number;
  is_active: boolean;
  is_global: boolean;
  // ... stats, timestamps
}

interface PageConfig {
  id: string;
  page_id: string;
  category: MessageCategory;
  name: string;
  selected_message_ids: string[];
  selection_mode: SelectionMode;
  fixed_message_id: string | null;
  trigger_keywords: string[];
  delay_hours: number[];
  scheduled_time: string | null;
  is_enabled: boolean;
  // ... stats, timestamps
}
```

### Hooks (`src/hooks/useMessages.ts`)

```typescript
// Manage global message pool
const { messages, createMessage, updateMessage, deleteMessage } = useMessages(category?);

// Manage per-page configurations
const { 
  configs, 
  upsertConfig, 
  deleteConfig,
  addKeyword,
  removeKeyword,
  addMessage,
  removeMessage,
  setMode 
} = usePageConfigs(pageId, category?);
```

### Components

- `ConfigCard` - Display a configuration card with actions
- `ConfigDialog` - Create/edit configuration dialog
- `ConfigurationV2` - Main configuration page using unified architecture

---

## Migration from Old Architecture

The migration script (`20260108_unified_message_architecture.sql`):

1. Creates `messages` and `page_configs` tables
2. Migrates data from old tables:
   - `welcome_messages` → `messages` (category: 'welcome')
   - `response_messages` → `messages` (category: 'response')
   - `sequence_messages` → `messages` (category: 'sequence')
   - `broadcast_messages` → `messages` (category: 'broadcast')
   - `standard_messages` → `messages` (category: 'standard')
3. Migrates old config tables to `page_configs`
4. Creates RPC functions and views

### Old Tables (Deprecated)

These tables are kept for backward compatibility but should not be used:
- `welcome_messages`
- `response_messages`
- `sequence_messages`
- `broadcast_messages`
- `standard_messages`
- `page_welcome_config`
- `page_response_config`
- `page_sequence_config`
- `page_broadcast_config`
- `page_standard_config`
- `response_keywords`
- `page_standard_messages`

---

## Example Usage

### Create a Welcome Config

```typescript
// Using hook
const { upsertConfig } = usePageConfigs(pageId, 'welcome');

await upsertConfig({
  page_id: pageId,
  category: 'welcome',
  name: 'Default Welcome',
  selection_mode: 'random',
  selected_message_ids: ['msg-1', 'msg-2', 'msg-3'],
  messages_count: 1,
});
```

### Create a Response Config

```typescript
await upsertConfig({
  page_id: pageId,
  category: 'response',
  name: 'Job Inquiry',
  selection_mode: 'fixed',
  fixed_message_id: 'msg-job-info',
  trigger_keywords: ['job', 'emploi', 'work', 'travail'],
});
```

### Create a Sequence Config

```typescript
await upsertConfig({
  page_id: pageId,
  category: 'sequence',
  name: 'Onboarding',
  selection_mode: 'ordered',
  selected_message_ids: ['msg-day1', 'msg-day2', 'msg-day3'],
  delay_hours: [0, 24, 48],  // 0h, 24h, 48h delays
});
```

---

## n8n Integration

When calling from n8n workflows:

```javascript
// Get welcome message for a page
const { data } = await supabase.rpc('get_page_welcome', { 
  p_page_id: pageId 
});

// Get response message
const { data } = await supabase.rpc('get_page_response', {
  p_page_id: pageId,
  p_keyword: userMessage.toLowerCase()
});

// Get sequence message
const { data } = await supabase.rpc('get_page_sequence', {
  p_page_id: pageId,
  p_day: currentDay,
  p_order: messageOrder
});
```

---

## Benefits of Unified Architecture

1. **Simplicity**: 2 main tables instead of 10+
2. **Flexibility**: Any message can be used by any page
3. **Scalability**: Easy to add new categories
4. **Maintainability**: Single codebase for all message types
5. **Analytics**: Unified stats across all categories
6. **Sharing**: Messages shared across pages (no duplication)
