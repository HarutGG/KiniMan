# KinoMan Backend - Technical Design Specification

## Overview

The KinoMan Backend is a Node.js/Express/MongoDB API that delivers personalized movie and TV series recommendations powered by AI-driven analysis. The system integrates with TMDB (The Movie Database) for comprehensive metadata and Google's Gemini API for intelligent, Armenian-language content recommendations.

### Design Philosophy

This design prioritizes:
- **Graceful Degradation**: When external APIs fail (Gemini, TMDB, MongoDB), the system uses fallback mechanisms rather than failing completely
- **Armenian-First**: All user-facing text, explanations, and recommendations are delivered in natural, fluent Armenian
- **Type Safety**: Clear contracts between components with explicit data structures
- **Testability**: Pure functions for business logic, clear dependency injection for external services
- **Maintainability**: Logical separation of concerns across services, routes, middleware, and models

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Next.js Frontend                         │
│  (Quiz UI, Search, Wishlist, Recommendation Display)            │
└─────────────────┬─────────────────────────────────────────────────┘
                  │ HTTP/CORS
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express API (KinoMan Backend)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ CORS Middleware │ Auth Middleware │ Error Handler       │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Routes                                                │     │
│  │  ├─ /api/quiz/recommend (POST)                        │     │
│  │  ├─ /api/movies/search (GET)                          │     │
│  │  ├─ /api/movies/details/:id (GET)                     │     │
│  │  ├─ /api/favorites (POST/DELETE)                      │     │
│  │  ├─ /api/auth/register|login (POST)                   │     │
│  │  ├─ /api/user/history (GET)                           │     │
│  │  └─ /api/health (GET)                                 │     │
│  └────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Services                                              │     │
│  │  ├─ Gemini Service (AI Recommendation)                │     │
│  │  ├─ TMDB Service (Movie Database)                     │     │
│  │  └─ Genre Service (Mapping & Localization)            │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────┬──────────────┬──────────────────────────────────┘
                  │              │
        ┌─────────▼──┐   ┌───────▼──────────┐
        │  MongoDB   │   │  External APIs   │
        │  (User,    │   │  ├─ Gemini API   │
        │  Sessions, │   │  └─ TMDB API     │
        │  History)  │   └──────────────────┘
        └────────────┘
```

### Architecture Pattern: Monolithic Service

The backend is organized as a **monolithic Express service** rather than microservices because:
- Single deployment unit simplifies operational complexity
- Shared database context (user, sessions, history) is naturally co-located
- Current scale (single API server) doesn't require service fragmentation
- Clear separation within the monolith via middleware, services, and routes provides modularity benefits

---

## Directory Structure

```
server/
├── src/
│   ├── index.js                    # Entry point, Express app setup
│   ├── middleware/
│   │   ├── auth.js                 # JWT extraction, user resolution
│   │   ├── error.js                # Error handling, HttpError class
│   │   ├── validation.js           # Request parameter validation
│   │   ├── cors.js                 # CORS configuration (dynamic origins)
│   │   └── logging.js              # Structured JSON logging
│   ├── routes/
│   │   ├── quiz.js                 # POST /api/quiz/recommend
│   │   ├── movies.js               # GET /api/movies/search, /details/:id
│   │   ├── favorites.js            # POST/DELETE /api/favorites
│   │   ├── auth.js                 # POST /api/auth/register, /login
│   │   └── user.js                 # GET /api/user/history
│   ├── services/
│   │   ├── gemini.js               # Gemini API integration, fallback logic
│   │   ├── tmdb.js                 # TMDB API integration, genre mapping
│   │   └── auth-service.js         # Password hashing, JWT signing
│   ├── models/
│   │   ├── User.js                 # Mongoose User schema
│   │   └── QuizSession.js           # Mongoose QuizSession schema
│   ├── utils/
│   │   ├── genres.js               # Genre ID ↔ Name mappings
│   │   ├── errors.js               # HttpError definitions, messages
│   │   ├── validators.js           # Input validation helpers
│   │   └── constants.js            # Enums, defaults, thresholds
│   └── types/
│       └── index.d.ts              # TypeScript type definitions
└── .env.example                    # Environment variable template
```

---

## Middleware Pipeline Design

### Middleware Execution Order

```
Request
  ↓
[1] CORS Middleware
  ↓
[2] Body Parser (express.json, 1MB limit)
  ↓
[3] Structured Logging Middleware
  ↓
[4] Guest Session Middleware (X-Guest-Id header handling)
  ↓
[5] Authentication Middleware (JWT extraction, optional)
  ↓
[6] Request Validation Middleware
  ↓
[7] Route Handlers (wrapped in asyncHandler)
  ↓
[8] Error Handler Middleware
  ↓
Response
```

### Detailed Middleware Specifications

#### 1. CORS Middleware (cors.js)

```javascript
// Allows dynamic origin checking from CLIENT_ORIGIN env var
// Supports comma-separated multiple origins
// Credentials: true (cookies/auth headers)
// Methods: GET, POST, DELETE, PUT, PATCH, OPTIONS
// Headers: Content-Type, Authorization, X-Guest-Id
```

**Behavior:**
- Parse `CLIENT_ORIGIN` env var, support comma-separated origins
- For each request, check if Origin header matches allowed origins
- Include `Access-Control-Allow-Origin` in response
- For OPTIONS requests, respond with 200 and full CORS headers

#### 2. Body Parser Middleware

```javascript
app.use(express.json({ limit: '1mb' }))
```

**Behavior:**
- Parse incoming JSON bodies
- Enforce 1MB request limit (Requirement 12.8)
- Return HTTP 413 if body exceeds limit

#### 3. Structured Logging Middleware (logging.js)

```javascript
// Log format:
// {
//   "timestamp": "2024-01-15T10:30:00Z",
//   "level": "info",
//   "method": "POST",
//   "path": "/api/quiz/recommend",
//   "statusCode": 200,
//   "responseTime": 245,
//   "userId": "user-123",  // if authenticated
//   "guestId": "uuid",      // if guest
//   "message": "Quiz recommendation completed"
// }

// Never log:
// - passwords, tokens, sensitive auth data
// - JWT values in Authorization header
// - email addresses (unless necessary for debugging)
```

**Behavior:**
- Intercept request/response, measure timing
- Log method, path, status, duration
- Attach user/guest context to log
- Use JSON structured format for log aggregation

#### 4. Guest Session Middleware (guest.js)

```javascript
// Check for X-Guest-Id header
// If missing, generate UUID and attach to res.locals
// Allow request to proceed with guest context
```

**Behavior:**
- Before auth middleware, check `X-Guest-Id` header
- If present and valid UUID format, store in `req.guest.id`
- If missing, generate new UUID4, attach to `req.guest.id`
- Return `X-Guest-Id` in response headers so client can store it

#### 5. Authentication Middleware (auth.js)

```javascript
// Extract Authorization: Bearer {token} header
// Validate JWT signature using JWT_SECRET
// Decode token to extract userId
// Query MongoDB for user
// Attach to req.user or null if invalid
```

**Behavior:**
- Extract Authorization header
- If present, validate JWT and attach decoded user to `req.user`
- If invalid/missing, set `req.user = null`
- Do NOT fail the request here (optional auth for many endpoints)
- Provide `requireUser` middleware that checks `req.user` exists

#### 6. Request Validation Middleware (validation.js)

```javascript
// Create validators for each route
// Validate query params, body params, URL params
// Return HTTP 400 with error details if invalid
```

**Behavior:**
- Per-route validation rules
- For `/api/quiz/recommend`: validate mood, vibe, pace, duration, mealPreference enums
- For `/api/auth/register`: validate email format, password strength
- For `/api/movies/search`: sanitize query, validate filters
- For `/api/movies/details/:id`: validate id is positive integer

#### 7. asyncHandler Middleware

```javascript
// Wrap all route handlers
// Catch errors (including async errors)
// Pass to error handler middleware
```

```javascript
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage in routes:
router.post('/api/quiz/recommend', asyncHandler(async (req, res) => {
  // no try-catch needed, errors caught by asyncHandler
}));
```

#### 8. Error Handler Middleware (error.js)

```javascript
// Catches all errors from route handlers
// Formats error response
// Returns appropriate HTTP status
// Logs error details (without sensitive data)
```

**Behavior:**
- Receives error object
- Extract status code (default 500)
- Extract message, include Armenian error text if applicable
- Return JSON: { status, message, timestamp }
- Log full error details including stack trace
- Never expose stack traces to client in production

---

## Database Schema Design

### User Schema (User.js)

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    // Never returned in API responses
  },
  savedMovies: {
    type: [Number],
    default: [],
    // Array of TMDB movie IDs
  },
  history: {
    type: [historySchema],
    default: [],
    // Max 50 entries, FIFO removal when limit reached
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Indexes:
// - email: unique (case-insensitive via lowercase)
// - savedMovies: for efficient querying favorite counts
```

**History Entry Schema:**
```javascript
const historySchema = new mongoose.Schema({
  movieIds: [Number],     // Array of recommended TMDB IDs
  sessionId: String,      // Reference to QuizSession
  at: {
    type: Date,
    default: Date.now,
  },
}, { _id: false })
```

### QuizSession Schema (QuizSession.js)

```javascript
const quizSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    // UUID v4 format
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional: for authenticated users
  },
  guestId: {
    type: String,
    // Optional: for guest sessions (UUID)
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    // {
    //   mood: "happy" | "sad" | "tense" | "romantic" | "adventurous" | "chill",
    //   vibe: "colorful" | "dark" | "vintage" | "neon" | "natural",
    //   pace: "fast" | "slow" | "balanced",
    //   duration: "short" | "feature" | "epic" | "series",
    //   mealPreference: "sweet" | "salty" | "spicy" | "healthy" | "drinks",
    //   isPairMode: boolean,
    //   surprise: boolean,
    // }
  },
  recommendedMovieIds: {
    type: [Number],
    default: [],
  },
  geminiTokens: {
    type: Number,
    default: 0,
    // Track token usage for cost monitoring
  },
  fallbackUsed: {
    type: Boolean,
    default: false,
    // For monitoring fallback frequency
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

// Indexes:
// - sessionId: unique for fast lookup
// - createdAt: for purging old sessions
// - userId: for user-specific history queries
```

---

## External API Integration Design

### Gemini Service (services/gemini.js)

**Integration Points:**
- Receives quiz answers object
- Calls Google Generative AI API (gemini-2.0-flash model)
- Handles JSON response extraction and parsing
- Implements comprehensive fallback strategy

**Key Functions:**

```javascript
// parseGeminiJson(rawText)
// - Input: raw response text from Gemini (may include markdown fences)
// - Output: parsed JSON object
// - Strategy: remove ```json and ``` delimiters, find first { and last }, parse substring
// - Throws: on invalid JSON
// - Property: For any valid JSON (with or without markdown), extraction succeeds
// - Property: For any invalid JSON, throws predictable error

// fallbackInsight(answers)
// - Input: quiz answers object
// - Output: pre-generated recommendation with valid genre IDs and Armenian text
// - Strategy: map mood/vibe to predefined genre sets, use pre-written Armenian text
// - Property: For any valid answers, returns valid genre IDs and non-empty Armenian text
// - Property: Fallback text is always in Armenian script (not Latin transliteration)

// async geminiRecommend(answers)
// - Input: quiz answers object
// - Output: { genres, keywords, tmdb_genre_ids, media_type, ai_reasoning_hy, snack_recommendation_hy }
// - Strategy:
//   1. Check if GEMINI_API_KEY exists; if not, return fallback
//   2. Construct prompt with explicit Armenian language instruction
//   3. Call Gemini API with JSON response mime type
//   4. Parse response using parseGeminiJson
//   5. Validate required fields present and Armenian text valid
//   6. On any error, return fallback
// - Timeout: 2 seconds (Requirement 17.4)
// - Fallback: triggered on timeout, parse error, or API error
```

**Gemini Prompt Structure:**

```
Դու ԿինոՄանի կինո-խորհրդատու ես։ Պատասխանիր ՄԻԱՅՆ վավեր JSON օբյեկտով, առանց markdown-ի։
Բոլոր տեքստային դաշտերը (ai_reasoning_hy, snack_recommendation_hy) պետք է լինեն սահուն, բնական հայերենով։

Օգտատիրոջ պատասխաններ.
- mood: {mood}
- vibe: {vibe}
- pace: {pace}
- duration: {duration}
- mealPreference: {mealPreference}
- isPairMode: {isPairMode}
- surprise: {surprise}

JSON σχήμα.
{
  "genres": ["EnglishGenre1", "EnglishGenre2"],
  "keywords": ["keyword1", "keyword2"],
  "tmdb_genre_ids": [18, 35],
  "media_type": "movie" | "tv",
  "ai_reasoning_hy": "2-4 նախադասություն հայերեն",
  "snack_recommendation_hy": "հայերեն խորտիկի առաջարկ"
}

Կանոններ.
- media_type = "tv" միայն եթե duration = "series"
- Օգտագործիր TMDB պաշտոնական genre IDs
- Եթե isPairMode true, շեշտիր ընդհանուր համը
- Եթե surprise true, առաջարկիր քիչ հայտնի, բարձր գնահատականով ֆիլմեր
```

**Error Recovery Strategy:**

```
┌─────────────────────────┐
│  Gemini API Call        │
└────────────┬────────────┘
             │
      ┌──────▼──────┐
      │ Success?    │
      └──────┬──────┘
             │
        Yes  │  No
            │   │
      ┌─────▼──┴──────────────────────┐
      │ Parse JSON                    │
      └────────┬───────────────────────┘
               │
        ┌──────▼──────┐
        │ Valid JSON? │
        └──────┬──────┘
               │
          Yes  │  No
              │   │
        ┌─────▼──┴──────────────────┐
        │ Validate Armenian Text    │
        └────────┬──────────────────┘
                 │
          ┌──────▼──────┐
          │ Armenian?   │
          └──────┬──────┘
                 │
             Yes │  No
                │   │
          ┌─────▼──┴────────────────┐
          │ Return Fallback         │
          └────────────────────────┘
```

### TMDB Service (services/tmdb.js)

**Integration Points:**
- Receives genre IDs, keywords, runtime constraints
- Queries TMDB discover endpoint (movies or TV)
- Queries TMDB search/multi endpoint (search)
- Queries TMDB details endpoint (single movie/TV details)
- Implements retry logic and fallback genre mapping

**Key Functions:**

```javascript
// async discoverMovies(params)
// - Input: { genreIds, keywords, sortBy, voteCount, voteAverage, runtimeMin, runtimeMax, mediaType }
// - Output: array of raw TMDB results
// - Strategy: call /discover/movie or /discover/tv with filters
// - Retry: if < 3 results, retry without keywords
// - Retry: if still < 3, use fallback genres
// - Timeout: 1.5 seconds (Requirement 17.5)

// async searchMovies(query, filters)
// - Input: search query string, optional filters (genre, rating, year)
// - Output: array of normalized movies
// - Strategy: call /search/multi endpoint
// - Filter: genre ID inclusion, rating threshold, year match
// - Normalization: to Movie_Metadata format with Armenian genres

// async getMovieDetails(id, mediaType)
// - Input: TMDB movie ID, optional mediaType ("movie" or "tv")
// - Output: detailed Movie_Metadata with cast and trailer
// - Strategy: if mediaType unknown, try both /movie and /tv endpoints
// - Extraction: cast (limit 10), videos (prioritize trailer)
// - Trailer: format as "https://www.youtube.com/watch?v={key}"

// mapGenreIds(englishNames, tmdbIds)
// - Input: array of English genre names or TMDB IDs
// - Output: array of validated TMDB numeric IDs
// - Strategy: lookup each name/ID in genre mapping
// - Property: for any valid genre (by name or ID), returns correct numeric ID
// - Property: bidirectional: ID -> name -> ID returns same ID

// fallbackGenreIds(answers)
// - Input: quiz answers object
// - Output: array of TMDB genre IDs
// - Strategy: map mood/vibe/pace to predefined genre sets
// - Property: for any valid answers, returns non-empty genre ID array
```

**Movie Metadata Normalization:**

```javascript
// normalize(tmdbResult, mediaType)
// Input: raw TMDB API result
// Output: {
//   id: number,
//   tmdbId: number,
//   title: string,
//   overview: string,
//   posterPath: string,  // full URL
//   backdropPath: string,  // full URL
//   year: string,  // extracted from release_date or first_air_date
//   imdbRating: number,  // vote_average
//   genreIds: [number],  // numeric TMDB IDs
//   genres: [string],  // Armenian names
//   runtime: number,  // for movie
//   episodeRuntime: number,  // for TV
//   cast: [{id, name, character, profilePath}],
//   trailerUrl: string,
//   mediaType: "movie" | "tv",
// }
```

**Error Recovery for TMDB:**

```
If keyword search fails or returns < 3 results:
  └─> Retry without keywords

If genre search returns < 3 results:
  └─> Retry with fallback genres (mood-based)

If all retries fail:
  └─> Return empty array with HTTP 200
  └─> Client displays "No movies found" message

If TMDB API returns 4xx/5xx error:
  └─> Return HTTP 502
  └─> Message: "TMDB ծառայությունը ժամանակավորապես անհասանելի է։"
```

---

## Genre Mapping System

### Bidirectional Genre Mapping

**Genre Mapping Table (genres.js):**

| TMDB ID | English Name | Armenian Name |
|---------|--------------|---------------|
| 28 | Action | Մարտաֆիլմ |
| 12 | Adventure | Արկածային |
| 16 | Animation | Անիմացիա |
| 35 | Comedy | Կատակերգություն |
| 80 | Crime | Քրեական |
| 99 | Documentary | Վավերագրական |
| 18 | Drama | Դրամա |
| 10751 | Family | Ընտանեկան |
| 14 | Fantasy | Ֆանտազիա |
| 36 | History | Պատմական |
| 27 | Horror | Սարսափ |
| 10402 | Music | Երաժշտական |
| 9648 | Mystery | Առեղծված |
| 10749 | Romance | Մելոդրամա |
| 878 | Science Fiction | Գիտաֆանտաստիկա |
| 53 | Thriller | Թրիլեր |
| 10752 | War | Պատերազմ |
| 37 | Western | Վեսթերն |

**Mapping Functions:**

```javascript
// getArmenianGenres(tmdbIds)
// Property: For any array of valid TMDB IDs, returns array of Armenian names in same order
// Property: Unknown IDs are skipped, not returned

// getTmdbIds(englishNames)
// Property: For any array of valid English names, returns array of TMDB IDs
// Property: Case-insensitive matching

// getTmdbIdsFromArmenian(armenianNames)
// Property: For any array of valid Armenian names, returns array of TMDB IDs

// moodToGenreMap(mood)
// Input: mood string ("happy", "sad", "tense", "romantic", "adventurous", "chill")
// Output: array of TMDB genre IDs
const moodMap = {
  happy: [35, 10751, 16],  // Comedy, Family, Animation
  sad: [18, 10749],  // Drama, Romance
  tense: [53, 80, 27],  // Thriller, Crime, Horror
  romantic: [10749, 18],  // Romance, Drama
  adventurous: [12, 28, 878],  // Adventure, Action, Sci-Fi
  chill: [18, 35, 10751],  // Drama, Comedy, Family
}

// vibeToGenreModifier(vibe)
// Input: vibe string
// Output: genre IDs to prefer or exclude
const vibeModifier = {
  colorful: [16, 35],  // Animation, Comedy
  dark: [27, 53, 80],  // Horror, Thriller, Crime
  vintage: [36, 37, 10752],  // History, Western, War
  neon: [878, 53],  // Sci-Fi, Thriller
  natural: [99, 12, 10751],  // Documentary, Adventure, Family
}
```

---

## Authentication Architecture

### JWT Token Strategy

**Token Structure:**
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  iat: 1705329000,
  exp: 1705415400  // 24 hours
}
```

**Signing & Verification:**

```javascript
// signToken(user)
// - Create JWT payload with userId, email
// - Sign with JWT_SECRET (min 32 chars)
// - Set expiration to 24 hours
// - Return token string

// verifyToken(token)
// - Verify signature using JWT_SECRET
// - Check expiration
// - Return decoded payload or throw error

// extractToken(authHeader)
// - Parse "Bearer {token}" format
// - Return token or null
```

**Password Hashing:**

```javascript
// hashPassword(password)
// - Use bcrypt with saltRounds >= 10
// - Return hashed password
// - Property: For any password string, hash is reproducible (same salt = same hash)
// - Property: No plaintext password ever stored or returned

// comparePassword(providedPassword, hashedPassword)
// - Use bcrypt.compare
// - Return true/false
// - Property: Correct password returns true
// - Property: Incorrect password returns false
// - Property: Always takes consistent time (timing attack prevention)
```

### Authentication Flow

```
User Registration:
┌──────────────────────┐
│ POST /auth/register  │
│ {email, password}    │
└──────────┬───────────┘
           │
     ┌─────▼─────┐
     │ Validate  │
     │ email fmt │
     └─────┬─────┘
           │
     ┌─────▼────────┐
     │ Validate     │
     │ password     │
     │ strength     │
     └─────┬────────┘
           │
     ┌─────▼──────────────┐
     │ Hash password      │
     │ (bcrypt, salt>=10) │
     └─────┬──────────────┘
           │
     ┌─────▼──────────────┐
     │ Check if email     │
     │ already exists     │
     │ (E11000 error)     │
     └─────┬──────────────┘
           │
      Yes  │  No
         ┌─┴───────┐
         │         │
    ┌────▼──┐  ┌──▼──────────────┐
    │ 409   │  │ Create User     │
    │ Conflict
    │       │  │ Generate token  │
    │       │  │ Return 201      │
    └───────┘  └─────────────────┘

User Login:
┌──────────────────────┐
│ POST /auth/login     │
│ {email, password}    │
└──────────┬───────────┘
           │
     ┌─────▼──────────────┐
     │ Query user by      │
     │ email (case-insensitive)
     └─────┬──────────────┘
           │
      Found│  Not Found
         ┌─┴───────┐
         │         │
    ┌────▼────┐  ┌─▼──────────────┐
    │ Compare │  │ Return 401     │
    │ pwd hash│  │ Generic error  │
    └─┬──┬────┘  └────────────────┘
      │ ││
   Yes│ │└─ No: return 401
     └─┴─┐
   ┌─────▼──────────────┐
   │ Generate token     │
   │ Return 200         │
   └────────────────────┘
```

---

## Error Handling Architecture

### HttpError Class

```javascript
class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.message = message;
    this.details = details;
  }
}

// Usage:
throw new HttpError(400, "Չեղ ապրանքի տեսակ։", { 
  field: "mood",
  allowed: ["happy", "sad", "tense", ...]
});
```

### Error Classification

| Status | Scenario | Armenian Message | Loggable |
|--------|----------|-----------------|----------|
| 400 | Input validation fails | "Հայտնված պարամետր անվավեր է։" (specific reason) | Yes |
| 401 | Missing/invalid JWT | "Անհրաժեշտ է ձեռք բերել հավաստման իրավունք։" | Yes |
| 401 | Session expired | "Ձեր գործընթացի վավերումը լրաբանել է։" | Yes |
| 403 | User accessing another user's data | "Այս գործողությունը թույլատրված չէ։" | Yes |
| 404 | Resource not found | "Ֆիլմը չի գտնվել։" or "Հայտնված էջը չի գտնվել։" | Yes |
| 409 | Email already exists | "Այս էլեկտրոնային հասցեն արդեն գրանցված է։" | Yes |
| 413 | Request body too large | "Հարցման չափը չափազանց մեծ է։" | Yes |
| 429 | Rate limit exceeded | "Չափազանց շատ հարցումներ։ Թեքցեք վերամբարձ։" | No (spam) |
| 502 | External API error (TMDB) | "TMDB ծառայությունը ժամանակավորապես անհասանելի է։" | Yes |
| 503 | MongoDB unavailable | "Տվյալների բազա անհասանելի է։" | Yes |
| 500 | Internal server error | "Ներքին սերվերի սխալ։ Փորձեք կրկին։" | Yes (full stack) |

### Error Response Format

```json
{
  "status": 400,
  "message": "Չեղ mood պարամետր։ Թույլատրված արժեքներ՝ happy, sad, tense, romantic, adventurous, chill",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "field": "mood",
    "provided": "invalid",
    "allowed": ["happy", "sad", "tense", "romantic", "adventurous", "chill"]
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JSON Extraction from Malformed Text

*For any response text that contains valid JSON delimited by braces with or without markdown code fences (```json ... ```), the parseGeminiJson function SHALL successfully extract and parse the JSON object.*

**Validates: Requirements 1.3, 10.3**

### Property 2: Fallback Provides Valid Recommendations

*For any valid quiz answers object (with all required mood, vibe, pace, duration fields), the fallbackInsight function SHALL return a recommendation containing valid TMDB genre IDs, non-empty English genre names, non-empty Armenian reasoning text, and non-empty Armenian snack pairing text.*

**Validates: Requirements 1.4, 10.2, 8.3**

### Property 3: Gemini Failure Triggers Fallback

*For any quiz request, if Gemini API call fails (timeout, network error, API error), invalid JSON is returned, or required fields are missing, the recommendation engine SHALL invoke fallback logic and return a successful recommendation with valid genre IDs and Armenian text rather than failing with an error.*

**Validates: Requirements 1.4, 10.1, 10.2, 10.4, 10.7**

### Property 4: Genre Mapping Bidirectional Consistency

*For any valid TMDB genre ID, mapping it to English name and then to Armenian name and back to TMDB ID SHALL return the same original ID. Conversely, starting with English name -> Armenian name -> TMDB ID -> English name returns the same English name.*

**Validates: Requirements 2.5, 15.1, 15.3**

### Property 5: Parameter Validation for Quiz Requests

*For any POST request to `/api/quiz/recommend` where mood is not in ["happy", "sad", "tense", "romantic", "adventurous", "chill"], or vibe not in ["colorful", "dark", "vintage", "neon", "natural"], or pace not in ["fast", "slow", "balanced"], or duration not in ["short", "feature", "epic", "series"], the system SHALL return HTTP 400 with specific error message about the invalid parameter.*

**Validates: Requirements 16.1, 16.2, 16.3, 16.4**

### Property 6: Valid Quiz Response Contains All Required Fields

*For any successful quiz recommendation response, the returned JSON object SHALL contain all required fields: recommendedMovies (array), recommendedGenres (array), tmdbGenreIds (array), AIReasoningHY (non-empty Armenian string), SnackRecommendationHY (non-empty Armenian string), mediaType ("movie" or "tv"), and sessionId (UUID format).*

**Validates: Requirement 1.9**

### Property 7: Session Storage on Success

*For any successful quiz recommendation, a Quiz_Session document SHALL be created in MongoDB with: unique sessionId, answers object, recommendedMovieIds array, and createdAt timestamp.*

**Validates: Requirement 1.10**

### Property 8: Email Validation for Registration

*For any email string, the validation function SHALL return true if the email matches standard email format (contains @, domain with .), and false for strings missing @ or domain components.*

**Validates: Requirements 5.1, 16.9**

### Property 9: Password Hashing with Sufficient Rounds

*For any password string provided during user registration, the stored password in MongoDB SHALL be a bcrypt hash (not plaintext) created with salt rounds >= 10, such that bcrypt.compare(providedPassword, storedHash) returns true for the correct password and false for any different password.*

**Validates: Requirements 5.2, 20.1**

### Property 10: Authenticated User Cannot Access Other User's Data

*For any request to `/api/user/history` with valid JWT token for userId A, attempting to access history with userId B in the path SHALL return HTTP 403 Forbidden rather than returning userId B's data.*

**Validates: Requirement 20.7**

### Property 11: Guest Sessions Don't Modify User Profiles

*For any quiz recommendation generated with X-Guest-Id header (no authenticated user), a Quiz_Session SHALL be created with guestId (not userId), and NO User_Profile record SHALL be created or modified in MongoDB.*

**Validates: Requirement 6.5**

### Property 12: Armenian Text Validation

*For any response containing ai_reasoning_hy or snack_recommendation_hy fields, the text SHALL contain only Armenian script characters (ranges U+0530-U+058F) with no Latin-script transliteration (e.g., "Հայերեն" not "Hayeren"), no English text, and no placeholder values.*

**Validates: Requirements 8.2, 8.3**

### Property 13: Response Time for Quiz Endpoint

*For any POST request to `/api/quiz/recommend` (including Gemini call, TMDB call, and MongoDB storage), the response SHALL be returned within 3 seconds.*

**Validates: Requirement 17.1**

---

## Testing Strategy

### Testing Approach

The KinoMan Backend uses a **multi-layered testing strategy** combining unit tests, integration tests, and property-based tests for comprehensive coverage:

| Test Type | Purpose | Tools | Min Coverage |
|-----------|---------|-------|--------------|
| Unit Tests | Pure functions, business logic | Jest | 70% |
| Integration Tests | API endpoints, service interactions | Supertest + Jest | 60% |
| Property Tests | Universal properties, edge cases | fast-check or Hypothesis | Required for core logic |
| E2E Tests (Optional) | Full user workflows | Optional | - |

### Unit Test Areas

1. **Genre Mapping (genres.js)**
   - Bidirectional mapping accuracy (Property 4)
   - Unknown genre handling
   - Case-insensitive lookup
   - Array order preservation

2. **JSON Parsing (gemini.js)**
   - Markdown fence removal (Property 1)
   - Brace extraction and parsing
   - Invalid JSON handling
   - Edge cases: empty strings, only braces, nested structures

3. **Password Hashing (auth-service.js)**
   - Bcrypt hashing with correct salt rounds (Property 9)
   - Comparison succeeds for correct password
   - Comparison fails for incorrect password
   - Plaintext never stored

4. **Error Handling (middleware/error.js)**
   - HttpError instantiation
   - Error handler middleware response formatting
   - Armenian message selection
   - Stack trace excluded from client response

### Integration Test Areas

1. **Quiz Recommendation Endpoint**
   - Valid request accepted
   - All required response fields present (Property 6)
   - Gemini failure triggers fallback (Property 3)
   - Session created in MongoDB (Property 7)
   - Response time < 3 seconds (Property 13)

2. **Movie Search Endpoint**
   - Empty query defaults to Drama genre
   - Filters (genre, rating, year) applied correctly
   - Results normalized to Movie_Metadata format
   - Genre IDs mapped to Armenian names

3. **Movie Details Endpoint**
   - Single movie retrieval with cast and trailer
   - Both movie and TV endpoints tried on media type unknown
   - Trailer extraction (YouTube Trailer prioritized)
   - HTTP 404 when not found

4. **Authentication Endpoints**
   - Registration with valid email/password creates user
   - Login with correct credentials returns JWT token
   - Invalid credentials return HTTP 401
   - Duplicate email returns HTTP 409

5. **Favorites Management**
   - Authenticated user can add/remove favorites
   - Unauthenticated user gets HTTP 401
   - Duplicates not added twice
   - User data updated in MongoDB

### Property-Based Test Configuration

**Library:** fast-check (JavaScript) or similar

**General Settings:**
- Minimum 100 iterations per property test
- Seed: fixed for reproducibility in CI
- Timeout: 5 seconds per property

**Property Tests:**

1. **Genre Mapping Bidirectionality (Property 4)**
   ```
   Generate: random valid TMDB genre ID
   Property: id -> english -> armenian -> id returns same id
   ```

2. **JSON Extraction (Property 1)**
   ```
   Generate: valid JSON with random markdown formatting
   Property: extraction succeeds and parses correctly
   ```

3. **Quiz Parameter Validation (Property 5)**
   ```
   Generate: random mood, vibe, pace, duration combinations
   Property: invalid values trigger 400; valid values pass through
   ```

4. **Response Completeness (Property 6)**
   ```
   Generate: any valid quiz request
   Property: response contains all required fields
   ```

5. **Fallback Validity (Property 2)**
   ```
   Generate: random valid quiz answers
   Property: fallback returns valid genre IDs and Armenian text
   ```

### Test Coverage Targets

| Module | Target Coverage | Focus Areas |
|--------|-----------------|-------------|
| services/gemini.js | 80% | parseGeminiJson, fallbackInsight, error paths |
| services/tmdb.js | 75% | genre mapping, normalization, retry logic |
| middleware/auth.js | 85% | token extraction, validation, user resolution |
| middleware/error.js | 80% | error formatting, status code selection |
| utils/genres.js | 90% | bidirectional mapping, lookup accuracy |
| routes/* | 70% | happy path, error cases, 404 scenarios |

---

## Performance Optimization

### Caching Strategy

1. **Genre Mapping Cache**
   - Pre-loaded at server startup (in-memory)
   - Bidirectional lookup: ID <-> Name
   - Zero latency for genre conversions

2. **Fallback Genre Sets Cache**
   - Pre-generated for each mood/vibe combination
   - In-memory, updated only on code deployment
   - Prevents repeated computation during fallback

3. **TMDB Genre List Cache**
   - Cached from TMDB `/genre/movie/list` endpoint
   - Refreshed daily or on server restart
   - Used for validating genre IDs from Gemini

4. **Optional: Gemini Response Caching**
   - Cache key: hash of (mood, vibe, pace, duration, mealPreference)
   - TTL: 24 hours
   - Space limit: 1000 entries
   - Hit rate monitoring

### Database Optimization

1. **Indexes**
   - User.email: unique (case-insensitive)
   - User.savedMovies: for favorite count queries
   - QuizSession.sessionId: unique, fast lookup
   - QuizSession.createdAt: for session purging

2. **Query Optimization**
   - Use `select()` to exclude unnecessary fields (e.g., hide passwordHash)
   - Batch updates for history array
   - Projection: { passwordHash: 0 } for user queries

3. **Connection Pooling**
   - Mongoose default pool: 10 connections
   - For production: increase to 20-50 based on load
   - Configured via mongoose options in index.js

### External API Optimization

1. **TMDB Request Caching**
   - Cache discovery results by (genreIds, keywords, sortBy)
   - TTL: 1 hour
   - Space limit: 100 entries

2. **Timeout Strategy**
   - Gemini: 2 seconds (Requirement 17.4)
   - TMDB: 1.5 seconds per request (Requirement 17.5)
   - MongoDB: 5 seconds (default mongoose)

3. **Rate Limiting**
   - Gemini: rate limit handled by provider
   - TMDB: implement exponential backoff on 429
   - IP-based: 100 requests/minute unauthenticated

---

## Configuration and Environment Variables

### Required Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/kinoman

# External APIs
TMDB_API_KEY=your_tmdb_key_here
GEMINI_API_KEY=your_gemini_key_here

# JWT
JWT_SECRET=your_secret_min_32_chars_here

# Server
PORT=4000
NODE_ENV=development|production
CLIENT_ORIGIN=http://localhost:3000,https://example.com

# Gemini
GEMINI_MODEL=gemini-2.0-flash
```

### Optional Environment Variables

```bash
# Logging
LOG_LEVEL=debug|info|warn|error  (default: info)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  (default: 60 seconds)
RATE_LIMIT_MAX_REQUESTS=100  (default: 100 req/min unauthenticated)

# Caching
CACHE_TTL_SECONDS=3600  (default: 1 hour)
CACHE_MAX_ENTRIES=1000  (default)

# Performance
GEMINI_TIMEOUT_MS=2000  (default: 2 seconds)
TMDB_TIMEOUT_MS=1500  (default: 1.5 seconds)
```

### Validation on Startup

The server SHALL validate at startup:
1. MONGODB_URI is provided or default connection attempted
2. TMDB_API_KEY is provided (error if missing)
3. GEMINI_API_KEY is provided (warning if missing, fallback used)
4. JWT_SECRET exists and is >= 32 characters (error if missing or too short)
5. CLIENT_ORIGIN is provided or default to http://localhost:3000
6. PORT is valid (default 4000)

---

## Logging and Monitoring

### Structured Logging Format

All logs SHALL be output in JSON format for easy aggregation:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "service": "kinoman-api",
  "method": "POST",
  "path": "/api/quiz/recommend",
  "query": {},
  "userId": "user-123",
  "guestId": null,
  "statusCode": 200,
  "responseTime": 245,
  "message": "Quiz recommendation completed",
  "geminiTokens": 150,
  "fallbackUsed": false
}
```

### Log Levels

| Level | Use Case | Frequency |
|-------|----------|-----------|
| ERROR | API errors, exceptions, failed external calls | Low |
| WARN | Fallback triggered, rate limit approached, deprecated API use | Medium |
| INFO | Request received, response sent, session created | High |
| DEBUG | Detailed parameter values, intermediate results (dev only) | Very High |

### What NOT to Log

- ❌ Plaintext passwords
- ❌ JWT tokens or Authorization header values
- ❌ Email addresses (unless necessary)
- ❌ API keys
- ❌ Sensitive personal information

### Monitoring Metrics

1. **API Response Times**
   - /api/quiz/recommend: target < 3 seconds
   - /api/movies/search: target < 2 seconds
   - /api/movies/details/:id: target < 2 seconds

2. **External API Health**
   - Gemini API: requests/min, failures, fallback rate
   - TMDB API: requests/min, failures, retry rate, timeout count

3. **Database Health**
   - MongoDB connection state (connected/disconnected)
   - Query response times
   - Error count (duplicate key, connection errors)

4. **System Health**
   - Server uptime
   - Memory usage
   - Error rate by endpoint
   - Request volume by hour

---

## Deployment Considerations

### Build and Runtime

```bash
# Dependencies
npm install --production

# Start
node src/index.js

# Or with process manager
pm2 start src/index.js --name kinoman-api

# Health check
curl http://localhost:4000/api/health
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server/src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

### Environment Setup for Production

1. Set NODE_ENV=production
2. Ensure JWT_SECRET is strong (32+ chars, random)
3. Configure MONGODB_URI for production cluster
4. Set CLIENT_ORIGIN to production domain
5. Enable HTTPS at reverse proxy (Nginx, CloudFlare)
6. Configure rate limiting for production load
7. Set up error tracking (Sentry, DataDog)
8. Enable structured logging to aggregation service (ELK, Datadog)

---

## Review Checklist

Before proceeding to implementation, confirm:

- ✓ Database schema matches requirements (User, QuizSession, history)
- ✓ Middleware pipeline order is correct (CORS → Body → Auth → Validation → Handler → Error)
- ✓ Genre mapping covers all required genres with Armenian names
- ✓ Error responses include Armenian messages
- ✓ Authentication uses JWT with minimum 32-char secret
- ✓ Gemini fallback strategy handles all failure scenarios
- ✓ TMDB retry logic handles insufficient results
- ✓ All 25 requirements are addressed in the design
- ✓ Performance targets are feasible (3s quiz, 2s search, 2s details)
- ✓ Logging strategy excludes sensitive data
- ✓ Correctness properties are testable and comprehensive

---

## Next Steps

This design is ready for:
1. **Task Creation Phase**: Break down design into implementable tasks
2. **Property-Based Test Development**: Implement PBT using fast-check or similar
3. **Implementation**: Build routes, services, and middleware following this design
4. **Verification**: Run tests against implementation, validate response times and fallback behavior
5. **Deployment**: Follow deployment considerations for production setup

---

**Document Status:** Ready for Review and Approval

**Last Updated:** 2024-01-15

**Specification Version:** 1.0
