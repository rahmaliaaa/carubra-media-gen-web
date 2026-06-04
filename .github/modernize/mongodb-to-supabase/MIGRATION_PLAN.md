# MongoDB to Supabase Migration Plan

**Date**: June 4, 2026
**Project**: Carubra

## Overview
Migrate from MongoDB to Supabase (PostgreSQL) for improved:
- Type safety with SQL
- Scalability with PostgreSQL
- Better query optimization
- Simpler authentication with Supabase Auth

## Data Models to Migrate

### 1. Users Collection → users table
```
- id (UUID primary key, was using uuidv4)
- email (string, unique)
- password (string, bcrypt hashed)
- name (string)
- phone (string, nullable)
- role (string: 'Admin' | 'User')
- passwordChangesUsed (integer)
- membershipOrder (string)
- totalCreatedVideos (integer)
- connectedSocialAccounts (integer)
- coins (integer, default 10)
- createdAt (timestamp)
- updatedAt (timestamp)
```

### 2. Videos Collection → videos table
```
- id (UUID primary key)
- userId (UUID foreign key → users.id)
- prompt (string)
- style (string)
- duration (integer)
- status (string: 'pending' | 'processing' | 'completed' | 'failed')
- jobId (string, nullable)
- videoUrl (string, nullable)
- caption (string, nullable)
- createdAt (timestamp)
```

### 3. Images Collection → images table
```
- id (UUID primary key)
- userId (UUID foreign key → users.id)
- prompt (string)
- width (integer)
- height (integer)
- steps (integer)
- cfg_scale (number)
- status (string: 'pending' | 'processing' | 'completed' | 'failed')
- imageUrl (string, nullable)
- caption (string, nullable)
- createdAt (timestamp)
```

### 4. Social Connect Collection → social_connects table
```
- id (UUID primary key)
- userId (UUID foreign key → users.id)
- platform (string)
- accountUsername (string)
- accountId (string)
- accessToken (string)
- refreshToken (string, nullable)
- tokenExpiry (timestamp, nullable)
- status (string: 'active' | 'inactive')
- lastSyncedAt (timestamp, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)
```

### 5. Scheduled Posts Collection → scheduled_posts table
```
- id (UUID primary key, was using MongoDB ObjectId)
- userId (UUID foreign key → users.id)
- mediaSource (string: 'upload' | 'generated')
- generatedContentId (UUID, nullable)
- caption (string)
- mediaUrl (string, nullable)
- mediaName (string, nullable)
- mediaType (string: 'image' | 'video', nullable)
- postTypes (jsonb)
- date (string)
- time (string)
- platforms (text[])
- status (string: 'scheduled' | 'posted' | 'failed')
- createdAt (timestamp)
- updatedAt (timestamp)
```

### 6. Members Collection → members table
```
- id (UUID primary key)
- userId (UUID foreign key → users.id)
- name (string)
- email (string)
- status (string: 'active' | 'inactive')
- role (string)
- createdAt (timestamp)
```

## Migration Steps

### Phase 1: Setup Supabase
- [ ] Create Supabase project
- [ ] Create SQL schema (tables + constraints)
- [ ] Set up RLS (Row Level Security) policies
- [ ] Create Supabase environment variables

### Phase 2: Install Dependencies
- [ ] Add `@supabase/supabase-js` package
- [ ] Remove `mongodb` package
- [ ] Remove `MongoClient` type imports

### Phase 3: Create Database Layer
- [ ] Create new `backend/src/lib/supabase.ts`
- [ ] Export Supabase client instance
- [ ] Add helper functions for common operations

### Phase 4: Migrate Routes
- [ ] Update `backend/src/routes/auth.ts`
- [ ] Update `backend/src/routes/users.ts`
- [ ] Update `backend/src/routes/video-ai.ts`
- [ ] Update `backend/src/routes/image-ai.ts`
- [ ] Update `backend/src/routes/auto-upload.ts`
- [ ] Update `backend/src/routes/social-connect.ts`
- [ ] Update `backend/src/routes/generated-contents.ts`
- [ ] Update other routes as needed

### Phase 5: Testing
- [ ] Test authentication flow
- [ ] Test video/image creation and retrieval
- [ ] Test scheduled posts
- [ ] Test social media connections
- [ ] Load test for performance

### Phase 6: Cleanup
- [ ] Remove old MongoDB references
- [ ] Update .env example file
- [ ] Document Supabase setup process

## Environment Variables

```
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

## Backward Compatibility Notes
- User IDs remain UUIDs (no change needed in frontend)
- API responses will have same structure (transparent migration)
- Timestamps will be ISO 8601 strings (same as MongoDB JSON serialization)

## Rollback Plan
- Keep MongoDB connection code in feature branch
- Tag migration version for easy rollback
- Maintain data backup before running migration
