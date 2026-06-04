# Supabase Migration Implementation Guide

## Setup Instructions

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Copy your project URL and API keys (anon key and service role key)

### 2. Environment Variables
Add to your `.env.local` file:
```
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### 3. Create Database Tables
Run the SQL schema file in Supabase SQL editor:
```sql
[Copy content from schema.sql]
```

### 4. Install Dependencies
```bash
cd backend
npm install @supabase/supabase-js
npm remove mongodb
npm install
```

### 5. Updated Files

The following files have been created/updated for Supabase:

1. **backend/src/lib/supabase.ts** (NEW)
   - Main database connection and helper functions
   - Replaces: backend/src/lib/db.ts (MongoDB)

2. **backend/src/routes/auth.ts** (MIGRATED)
   - ✅ Converted from MongoDB to Supabase
   - Uses snake_case field names: password_changes_used, membership_order, etc.
   - API response structure unchanged (maintains backward compatibility)

3. **backend/src/routes/users.ts** (MIGRATED)
   - ✅ Converted from MongoDB to Supabase
   - Properly converts snake_case DB fields to camelCase for API response

4. **backend/src/routes/video-ai.ts** (NEEDS UPDATE)
   - [ ] Replace imports: getDb → find, insert, updateOne, deleteOne from supabase
   - [ ] Update field names: userId → user_id, jobId → job_id, createdAt → created_at, videoUrl → video_url
   - [ ] Replace db.collection() calls with Supabase helpers

5. **backend/src/routes/image-ai.ts** (NEEDS UPDATE)
   - [ ] Replace imports and field names
   - [ ] Similar pattern to video-ai.ts

6. **backend/src/routes/auto-upload.ts** (NEEDS UPDATE)
   - [ ] Replace MongoDB ObjectId with UUID handling
   - [ ] Convert collection names: scheduled_posts

7. **backend/src/routes/social-connect.ts** (NEEDS UPDATE)
   - [ ] Replace db.collection calls
   - [ ] Update field names to snake_case

8. **backend/src/routes/generated-contents.ts** (NEEDS UPDATE)
   - [ ] Update to query images table

9. **backend/src/routes/members.ts** (PARTIAL)
   - Currently uses in-memory array - should migrate to database

### Key Field Name Mappings

MongoDB → Supabase (snake_case)
- userId → user_id
- createdAt → created_at
- updatedAt → updated_at
- jobId → job_id
- videoUrl → video_url
- imageUrl → image_url
- passwordChangesUsed → password_changes_used
- membershipOrder → membership_order
- totalCreatedVideos → total_created_videos
- connectedSocialAccounts → connected_social_accounts
- lastSyncedAt → last_synced_at
- mediaSource → media_source
- generatedContentId → generated_content_id
- mediaUrl → media_url
- mediaName → media_name
- mediaType → media_type
- postTypes → post_types
- tokenExpiry → token_expiry
- refreshToken → refresh_token
- accessToken → access_token
- accountUsername → account_username
- accountId → account_id

## Quick Migration Steps

1. Install npm packages
2. Setup Supabase environment variables
3. Create database tables (run schema.sql in Supabase)
4. Update remaining route files using the pattern shown in auth.ts and users.ts
5. Test each endpoint
6. Remove old db.ts file once confirmed

## API Response Format

The API response format remains the same (camelCase) even though database uses snake_case. The route handlers convert field names for backward compatibility with frontend.

Example:
```typescript
// DB response (snake_case)
{ id: '...', email: 'user@example.com', password_changes_used: 0 }

// API response (camelCase)
{ id: '...', email: 'user@example.com', passwordChangesUsed: 0 }
```

## Database Helpers

```typescript
// Find one document
const user = await findOne('users', { email: 'test@example.com' })

// Find multiple documents
const videos = await find('videos', { user_id: userId }, { 
  orderBy: 'created_at', 
  ascending: false 
})

// Insert document
const { data, error } = await insert('users', newUserData)

// Update document
const updated = await updateOne('users', { id: userId }, { name: 'New Name' })

// Delete document
const deleted = await deleteOne('videos', { id: videoId, user_id: userId })
```

## Testing Checklist

- [ ] Login/Register flow works
- [ ] Video generation and status polling works
- [ ] Image generation works
- [ ] Scheduled posts CRUD works
- [ ] Social connections CRUD works
- [ ] User profile retrieval and update works
- [ ] Content analysis worker processes correctly
- [ ] Payments integration still works
