# Multi-Page Message Pool Architecture

## Overview
The MCM Botflow Dashboard now supports **multiple Facebook pages** with **global shared message pools** and **per-page configuration**. Users can:
1. Create messages once (globally available)
2. Configure each page independently (random or fixed message selection)
3. Customize timing and message assignments per page

## Architecture Layers

### Layer 1: Global Message Library
All messages created once and stored globally:
- Welcome messages
- Response messages (by keyword)
- Sequence messages (by day/order)
- Broadcast messages

### Layer 2: Per-Page Configuration
Each page can configure how to use messages:
- **Random Mode**: System picks randomly from global pool (weighted)
- **Fixed Mode**: Assign specific message to this page
- **Custom Timing**: For sequences, override default delay per page

---

## Key Changes

### 1. Database Architecture

#### New Table: `welcome_messages`
- **Purpose**: Pool of welcome messages (replaces single `welcome_message`)
- **Fields**:
  - `id`, `title`, `subtitle`, `image_url`, `buttons`, `text_content`, `message_type`
  - `is_enabled`: Enable/disable specific messages
  - `weight`: 1-10, higher = more likely to be picked
  - `is_global`: If true, available for all pages
  - `sent_count`, `delivered_count`, `read_count`: Stats tracking

#### Enhanced Tables:
- **`response_messages`**: Added `is_global`, stats, made `response_id` nullable
- **`sequence_messages`**: Added `is_global` flag  
- **`broadcasts` & `broadcast_messages`**: Added `is_global` flags
- **`pages`**: Enhanced with user_id, stats, activity tracking

### 2. Random Selection Functions (Legacy - Use Page-Specific Functions)

> **⚠️ DEPRECATED**: These functions are kept for backward compatibility. Use `get_page_*` functions instead.

#### `get_random_welcome_message()`
- Selects one message from enabled welcome messages
- Uses weighted random selection (weight 1-10)
- Only picks from global messages
- **REPLACED BY**: `get_page_welcome_message(page_id)`

#### `get_random_response_message()`
- Selects one message from enabled response messages
- Weighted random selection
- Independent of trigger (no parent response needed)
- **REPLACED BY**: `get_page_response_message(page_id, keyword)`

#### `get_random_sequence_message(p_day, p_order)`
- Selects one message for specific day/order combination
- Multiple messages can exist for same day/order
- Weighted random selection
- **REPLACED BY**: `get_page_sequence_message(page_id, day, order)`

#### `get_random_broadcast_message(p_broadcast_id)`
- Selects one message from broadcast's message pool
- Weighted random selection
- **REPLACED BY**: `get_page_broadcast_message(page_id, broadcast_id)`

---

### 3. Page-Specific Selection Functions (NEW)

These functions respect per-page configuration (random vs fixed mode).

#### `get_page_welcome_message(page_id UUID)`
- **Returns**: Welcome message for specific page
- **Logic**:
  1. Check if page has configuration in `page_welcome_config`
  2. If mode = 'fixed' → Return assigned message
  3. If mode = 'random' OR no config → Random weighted selection from global pool
- **Usage**: n8n workflows should call this with page_id

#### `get_page_sequence_message(page_id UUID, day INTEGER, order INTEGER)`
- **Returns**: Sequence message for specific page/day/order
- **Logic**:
  1. Check `page_sequence_config` for this page/day/order
  2. If mode = 'fixed' → Return assigned message with custom timing
  3. If mode = 'random' OR no config → Random weighted selection
- **Custom Timing**: If custom_delay_hours is set, overrides default delay

#### `get_page_broadcast_message(page_id UUID, broadcast_id UUID)`
- **Returns**: Broadcast message for specific page
- **Logic**:
  1. Check `page_broadcast_config` for this page/broadcast
  2. If mode = 'fixed' → Return assigned message
  3. If mode = 'random' OR no config → Random weighted selection

#### `get_page_response_message(page_id UUID, keyword TEXT)`
- **Returns**: Response message for specific page/keyword
- **Logic**:
  1. Check `page_response_config` for this page/keyword
  2. If mode = 'fixed' → Return assigned message
  3. If mode = 'random' OR no config → Random weighted selection

---

### 4. Configuration Tables

#### `page_welcome_config`
- **Purpose**: Configure welcome message mode per page
- **Fields**:
  - `page_id`: Which page
  - `mode`: 'random' or 'fixed'
  - `fixed_message_id`: If fixed, which message (NULL if random)
- **Constraint**: Each page can only have one welcome config

#### `page_sequence_config`
- **Purpose**: Configure sequence messages per page/day/order
- **Fields**:
  - `page_id`: Which page
  - `day_number`, `message_order`: Which sequence step
  - `mode`: 'random' or 'fixed'
  - `fixed_message_id`: If fixed, which message
  - `custom_delay_hours`: Override default timing (optional)
- **Constraint**: Each page can only have one config per day/order

#### `page_broadcast_config`
- **Purpose**: Configure broadcast messages per page
- **Fields**:
  - `page_id`: Which page
  - `broadcast_id`: Which broadcast
  - `mode`: 'random' or 'fixed'
  - `fixed_message_id`: If fixed, which message
- **Constraint**: Each page can only have one config per broadcast

#### `page_response_config`
- **Purpose**: Configure response messages per page/keyword
- **Fields**:
  - `page_id`: Which page
  - `keyword`: Which keyword triggers this
  - `mode`: 'random' or 'fixed'
  - `fixed_message_id`: If fixed, which message
- **Constraint**: Each page can only have one config per keyword

---

### 5. Helper Functions for Configuration

#### `set_page_welcome_mode(page_id UUID, mode TEXT, fixed_message_id UUID)`
- **Purpose**: Configure welcome mode for a page
- **Example**: 
  ```sql
  -- Set to random mode
  SELECT set_page_welcome_mode('page-uuid', 'random', NULL);
  
  -- Set to fixed mode with specific message
  SELECT set_page_welcome_mode('page-uuid', 'fixed', 'message-uuid');
  ```

#### `set_page_sequence_mode(page_id UUID, day INTEGER, order INTEGER, mode TEXT, fixed_message_id UUID, custom_delay_hours INTEGER)`
- **Purpose**: Configure sequence mode for page/day/order
- **Example**:
  ```sql
  -- Set Day 1, Order 1 to random mode
  SELECT set_page_sequence_mode('page-uuid', 1, 1, 'random', NULL, NULL);
  
  -- Set Day 2, Order 1 to fixed mode with custom 48-hour delay
  SELECT set_page_sequence_mode('page-uuid', 2, 1, 'fixed', 'message-uuid', 48);
  ```

#### `set_page_broadcast_mode(page_id UUID, broadcast_id UUID, mode TEXT, fixed_message_id UUID)`
- **Purpose**: Configure broadcast mode for a page
- **Example**:
  ```sql
  -- Set broadcast to fixed message
  SELECT set_page_broadcast_mode('page-uuid', 'broadcast-uuid', 'fixed', 'message-uuid');
  ```

#### `set_page_response_mode(page_id UUID, keyword TEXT, mode TEXT, fixed_message_id UUID)`
- **Purpose**: Configure response mode for page/keyword
- **Example**:
  ```sql
  -- Set keyword "price" to fixed message
  SELECT set_page_response_mode('page-uuid', 'price', 'fixed', 'message-uuid');
  ```

---

### 6. Frontend Architecture

#### Page Context (`/src/contexts/PageContext.tsx`)
- Global state for current page selection
- Loads all active pages from database
- Persists selection in localStorage
- Provides `usePage()` hook for components

#### Configuration Page (`/src/pages/Configuration.tsx`)
- **NEW PAGE**: `/configuration` route
- Allows users to configure message mode per page
- Tabs for Welcome, Responses, Sequences, Broadcasts
- Shows current configuration (random vs fixed)
- Lists available global messages

#### Configuration Components:
- **MessageConfigDialog**: Modal for selecting random/fixed mode and message
- **MessageConfigCard**: Card showing current config with edit button
- Integrated with Supabase RPC functions

#### Updated Components:
- **Sidebar**: Now uses real pages from database via `usePage()` hook
- **App.tsx**: Wrapped with `PageProvider` for global page state
- **Navigation**: Added "Configuration" link in sidebar

---

### 7. Message Management

#### Welcome Page
- **Before**: Single message (text or template)
- **After**: Multiple messages in pool, random pick on send
- Create unlimited welcome messages
- Each can be enabled/disabled independently
- Weight system for probability control

#### Responses Page  
- **Before**: Multiple messages per response trigger
- **After**: Global pool of messages, no parent trigger needed
- Random pick from all enabled messages when bot responds
- Messages available to all pages

#### Sequences Page
- **Before**: Fixed sequence of messages per day/order
- **After**: Multiple messages per day/order, random pick
- Example: Day 1, Order 1 can have 5 different messages
- System picks one randomly when sending

#### Broadcasts Page
- **Already supported**: Multiple messages per broadcast
- **Enhanced**: Added global flag for cross-page availability

---

## Workflow: How Users Create and Use Messages

### Step 1: Create Global Messages (Once)
User creates messages in the dashboard:
- Go to **Welcome** page → Create 5-10 welcome messages
- Go to **Responses** page → Create responses for different keywords
- Go to **Sequences** page → Create multiple messages per day/order
- Go to **Broadcasts** page → Create broadcast campaigns with multiple messages

All messages are **global by default** (available to all pages).

### Step 2: Connect Facebook Pages
- Add Facebook pages to `pages` table (via Admin or API)
- Each page appears in sidebar dropdown
- Pages share the same global message library

### Step 3: Configure Each Page (Optional)
- Go to **Configuration** page
- Select page from sidebar
- For each message type, choose:
  - **Random Mode**: System picks randomly (default)
  - **Fixed Mode**: Assign specific message to this page only
- Save configuration

### Step 4: System Sends Messages
When bot sends a message:
1. n8n workflow calls: `get_page_welcome_message('page-id')`
2. Function checks configuration for this page
3. Returns either:
   - **Fixed message** (if configured)
   - **Random message** from global pool (weighted)
4. Message sent to subscriber

---

## Multi-Page Support Details

#### How It Works:
1. Admin can connect multiple Facebook pages
2. Each page has independent subscriber list
3. All messages are GLOBAL by default (is_global = true)
4. Each page can configure message selection (random or fixed)
5. When sending:
   - System checks page configuration
   - If fixed → uses assigned message
   - If random → picks from global pool (weighted)
   - Sends to page's subscribers

#### Page Selection:
- Dropdown in sidebar shows all active pages
- Selection persists across sessions (localStorage)
- All pages share same message library
- Each page has independent configuration

---

## Migration Strategy

#### Two Migrations Required:

**Migration 1**: `20260106_multi_page_message_pools.sql`
- Creates `welcome_messages` table
- Adds `is_global` flags to existing tables
- Creates basic random selection functions
- Migrates existing data

**Migration 2**: `20260107_page_message_configuration.sql` (NEW)
- Creates configuration tables (`page_welcome_config`, etc.)
- Creates page-specific selection functions (`get_page_welcome_message`, etc.)
- Creates helper functions (`set_page_welcome_mode`, etc.)
- Creates views for configuration management

#### Existing Data:
- Old `welcome_message` → migrated to `welcome_messages` table
- All existing messages marked as `is_global = true`
- Default configurations use random mode (backward compatible)

#### New Installations:
- Start with empty message pools
- Create demo pages for testing
- Add messages to each pool
- Configure pages as needed

---

## Usage Examples

### SQL Examples

#### Creating Welcome Messages:
```sql
INSERT INTO welcome_messages (title, content, weight, is_global, is_active)
VALUES 
  ('Welcome! 🎉', 'Thanks for subscribing!', 10, true, true),
  ('Hello! 👋', 'Great to have you here!', 5, true, true),
  ('Hey there! ✨', 'Welcome aboard!', 3, true, true);
```

#### Configuring Pages:
```sql
-- Set Page 1 to random mode for welcome
SELECT set_page_welcome_mode('page-uuid-1', 'random', NULL);

-- Set Page 2 to fixed welcome message
SELECT set_page_welcome_mode('page-uuid-2', 'fixed', 'message-uuid');

-- Configure sequence with custom timing
SELECT set_page_sequence_mode('page-uuid', 1, 1, 'fixed', 'msg-uuid', 48); -- 48 hours
```

#### Getting Messages (Page-Specific):
```sql
-- Get welcome message for specific page (respects config)
SELECT * FROM get_page_welcome_message('page-uuid');

-- Get sequence message for page (respects config + custom timing)
SELECT * FROM get_page_sequence_message('page-uuid', 1, 1);

-- Get broadcast message for page
SELECT * FROM get_page_broadcast_message('page-uuid', 'broadcast-uuid');
```

#### Legacy Functions (Backward Compatible):
```sql
-- Old functions still work (always random)
SELECT * FROM get_random_welcome_message();
SELECT * FROM get_random_response_message();
SELECT * FROM get_random_sequence_message(1, 1);
```

#### Weight System:
- Weight 10 = 10x more likely than weight 1
- Weight 5 = 5x more likely than weight 1
- Weight 1 = baseline probability
- Disabled messages (is_active = false) never picked
- Only applies in RANDOM mode

---

## API Integration (n8n Workflows)

### ⚠️ IMPORTANT: Use Page-Specific Functions

**OLD WAY (Deprecated)**:
```javascript
const message = await db.query('SELECT * FROM get_random_welcome_message()');
```

**NEW WAY (Recommended)**:
```javascript
// Always pass page_id to respect configuration
const message = await supabase
  .rpc('get_page_welcome_message', { p_page_id: pageId })
  .single();
```

### Sending Welcome Message (n8n):
```javascript
// 1. Get page-specific message (respects config)
const { data: message, error } = await supabase
  .rpc('get_page_welcome_message', { 
    p_page_id: pageId 
  })
  .single();

// 2. Send to new subscriber
await sendToMessenger(subscriberId, message);

// 3. Update stats
await supabase
  .from('welcome_messages')
  .update({ sent_count: message.sent_count + 1 })
  .eq('id', message.id);
```

### Sending Response Message:
```javascript
// 1. User sends keyword to bot
// 2. Get page-specific response
const { data: message } = await supabase
  .rpc('get_page_response_message', { 
    p_page_id: pageId,
    p_keyword: 'price' 
  })
  .single();

// 3. Send reply
await sendToMessenger(subscriberId, message);

// 4. Update stats
await supabase
  .from('response_messages')
  .update({ sent_count: message.sent_count + 1 })
  .eq('id', message.id);
```

### Sending Sequence Message:
```javascript
// 1. Check sequence schedule for subscriber
// 2. Get page-specific message (respects config + custom timing)
const { data: message } = await supabase
  .rpc('get_page_sequence_message', { 
    p_page_id: pageId,
    p_day_number: 1,
    p_message_order: 1
  })
  .single();

// 3. Schedule next message using delay_hours
const nextSendTime = new Date(Date.now() + message.delay_hours * 3600000);

// 4. Send message
await sendToMessenger(subscriberId, message);
```

### Sending Broadcast Message:
```javascript
// 1. Get page-specific broadcast message (respects config)
const { data: message } = await supabase
  .rpc('get_page_broadcast_message', { 
    p_page_id: pageId,
    p_broadcast_id: broadcastId
  })
  .single();

// 2. Send to all page subscribers
for (const subscriber of subscribers) {
  await sendToMessenger(subscriber.id, message);
}
```

---

## Frontend Usage

### Using PageContext in Components:
```typescript
import { usePage } from "@/contexts/PageContext";

function MyComponent() {
  const { currentPage, pages, setCurrentPage, loading } = usePage();
  
  return (
    <div>
      <p>Current: {currentPage?.name}</p>
      <select onChange={(e) => {
        const page = pages.find(p => p.id === e.target.value);
        setCurrentPage(page);
      }}>
        {pages.map(page => (
          <option key={page.id} value={page.id}>{page.name}</option>
        ))}
      </select>
    </div>
  );
}
```

### Configuring Messages:
```typescript
// Configure welcome message mode
const { data } = await supabase.rpc('set_page_welcome_mode', {
  p_page_id: currentPage.id,
  p_mode: 'fixed',
  p_fixed_message_id: selectedMessage.id
});

// View current configuration
const { data: config } = await supabase
  .from('page_welcome_config_detail')
  .select('*')
  .eq('page_id', currentPage.id)
  .single();
```

---

## Benefits of New Architecture

### For Users:
✅ **Create Once, Use Everywhere**: Create messages once, available to all pages
✅ **Flexible Configuration**: Choose random or fixed mode per page
✅ **Custom Timing**: Override sequence delays per page
✅ **Message Variety**: Random selection keeps messages fresh
✅ **Easy Management**: Single message library for all pages
✅ **Page-Specific Control**: Customize behavior per Facebook page

### For Developers:
✅ **Backward Compatible**: Old functions still work (always random)
✅ **Simple API**: One function call gets correct message
✅ **Centralized Logic**: Database handles configuration
✅ **Scalable**: Add unlimited pages and messages
✅ **Configuration Views**: Easy to query current setup

### For System:
✅ **Better UX**: Users don't see same message every time
✅ **A/B Testing**: Track performance of different messages
✅ **Weight Control**: Fine-tune message selection probability
✅ **Global Sharing**: Reduce duplication across pages
✅ **Flexible Rules**: Easy to add new selection logic

---

## Troubleshooting

### No message returned from get_page_* functions:
- Check if page has configuration in config table
- If fixed mode: Ensure fixed_message_id exists and is active
- If random mode: Ensure global messages exist with is_active = true
- Check weight values (must be > 0)

### Message always the same:
- If fixed mode: This is expected behavior
- If random mode: Check if only one message exists
- Verify multiple messages with is_active = true
- Check weight distribution

### Configuration not saving:
- Verify page_id and message_id exist
- Check mode is 'random' or 'fixed'
- If fixed, ensure message_id is provided
- Check database constraints

### Page not appearing in selector:
- Check `is_active = true` in pages table
- Verify page was loaded by PageContext
- Check browser console for errors
- Clear localStorage: `localStorage.clear()`

---

## Next Steps

### Immediate (Run in Supabase):
1. Execute `20260106_multi_page_message_pools.sql` migration
2. Execute `20260107_page_message_configuration.sql` migration
3. Add Facebook pages to `pages` table
4. Create messages in dashboard

### Short-Term (Configuration):
1. Go to Configuration page
2. For each page, set message modes (random/fixed)
3. Test welcome, sequence, broadcast flows
4. Adjust weights based on performance

### Long-Term (n8n Integration):
1. Update all n8n workflows to use `get_page_*` functions
2. Pass `page_id` in all message requests
3. Remove hardcoded message references
4. Test with multiple pages
5. Monitor stats and adjust weights

---

## Files Modified/Created

### Database Migrations:
- `supabase/migrations/20260106_multi_page_message_pools.sql` (356 lines)
- `supabase/migrations/20260107_page_message_configuration.sql` (NEW, 600+ lines)

### Frontend Components:
- `src/contexts/PageContext.tsx` (60 lines)
- `src/pages/Configuration.tsx` (NEW, 150+ lines)
- `src/components/config/MessageConfigDialog.tsx` (NEW, 180+ lines)
- `src/components/config/MessageConfigCard.tsx` (NEW, 80+ lines)

### Updated Files:
- `src/App.tsx` - Added Configuration route
- `src/components/layout/Sidebar.tsx` - Added Configuration link
- `MULTI_PAGE_ARCHITECTURE.md` - Updated documentation

---

## Summary

The new architecture provides:
// 1. Determine day and order for subscriber
const day = calculateDay(subscriber.joined_date);
const order = getCurrentOrder(subscriber);

// 2. Get random message for that step
const message = await db.query('SELECT * FROM get_random_sequence_message($1, $2)', [day, order]);

// 3. Send message
await sendToMessenger(subscriber.id, message);

// 4. Update stats
await db.query('UPDATE sequence_messages SET sent_count = sent_count + 1 WHERE id = $1', [message.id]);
```

## Benefits

### For Bot Admins:
1. **Variety**: Create multiple versions of each message type
2. **A/B Testing**: Different message weights for testing
3. **Multi-Page**: Manage multiple Facebook pages from one dashboard
4. **Scalability**: Add unlimited pages and messages
5. **Analytics**: Track performance of each message variation

### For Subscribers:
1. **Fresh Content**: Don't see same message repeatedly
2. **Better Experience**: More natural conversation flow
3. **Personalization**: Different messages for different contexts

### For Developers:
1. **Simple API**: Just call `get_random_*()` functions
2. **Weighted Logic**: Built into database functions
3. **Stats Tracking**: Automatic counting system
4. **Global Pools**: No complex page-specific logic needed

## Next Steps

1. **Run Migration**: Execute `20260106_multi_page_message_pools.sql`
2. **Add Pages**: Create entries in `pages` table for each Facebook page
3. **Create Messages**: Add multiple messages to each pool
4. **Update n8n**: Modify workflows to use new random selection functions
5. **Test**: Verify random selection works correctly
6. **Monitor**: Check stats to see which messages perform best

## Database Views

### `page_message_stats`
```sql
SELECT * FROM page_message_stats;
```
Shows for each page:
- `available_welcome_messages`: Count of enabled welcome messages
- `available_response_messages`: Count of enabled response messages  
- `available_sequence_steps`: Count of unique sequence steps
- `available_broadcasts`: Count of enabled broadcasts

## Configuration Options

### Message Weights:
- **10**: Premium/best performing messages
- **7-9**: High priority messages
- **4-6**: Standard messages
- **1-3**: Experimental/low priority messages

### Global vs Page-Specific:
- **Global (is_global = true)**: Available to all pages
- **Page-Specific (future)**: Could add page_id foreign key for exclusive messages

## Troubleshooting

### No messages being sent?
- Check `is_enabled = true` on messages
- Verify `is_global = true` for global pools
- Ensure pages table has active pages

### Same message always picked?
- Check weight distribution
- Verify multiple enabled messages exist
- Test random function: `SELECT * FROM get_random_welcome_message()` (run multiple times)

### Page not showing in dropdown?
- Check `pages.is_active = true`
- Verify page loaded in PageContext
- Check browser localStorage for saved page

## Security Notes

- Messages are global by default (visible to all pages)
- Future: Add RLS (Row Level Security) for user-specific access
- Current: All authenticated users see all pages/messages
- Recommendation: Add user_id filtering in production
