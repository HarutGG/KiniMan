# KinoMan Backend Requirements Specification

## Introduction

This specification defines the complete requirements for the KinoMan backend service—a Node.js/Express/MongoDB-based API that provides intelligent movie and TV series recommendations using AI-powered analysis. The backend integrates with the TMDB (The Movie Database) API for comprehensive movie metadata and Gemini API for intelligent content recommendations with Armenian-language reasoning and personalization. All AI-generated text responses, including reasoning and recommendations, MUST be delivered in fluent Armenian, making the recommendation experience contextually appropriate for Armenian-speaking users.

The system processes user quiz sessions, manages personalized movie preferences, and delivers curated recommendations with contextual snack pairings based on user mood, viewing preferences, and meal preferences.

## Glossary

- **KinoMan_System**: The Node.js/Express backend service that processes recommendations, manages user data, and orchestrates external API calls
- **Quiz_Session**: A unique instance of user interaction with the recommendation quiz, capturing answers and generated recommendations
- **Recommendation_Engine**: The component responsible for generating genre suggestions and movie recommendations using Gemini and TMDB APIs
- **TMDB_API**: The Movie Database API providing comprehensive movie/TV metadata, ratings, genres, cast, and trailer information
- **Gemini_API**: Google's generative AI service used to analyze quiz answers and generate intelligent Armenian-language reasoning and recommendations
- **User_Profile**: A registered user account containing authentication credentials, saved movies, and recommendation history
- **Guest_Session**: An unauthenticated user session identified by a guest ID, allowing temporary recommendation and search without account creation
- **Movie_Metadata**: Normalized object containing movie/TV show information from TMDB (title, year, rating, genres, poster, trailer link)
- **Genre_Mapping**: Bidirectional mapping between English genre names, Armenian genre names, and TMDB genre IDs
- **Snack_Pairing**: Contextual food/beverage recommendation paired with movie recommendations based on meal preference input
- **AI_Reasoning_HY**: AI-generated explanation in Armenian language describing why certain genres/movies match user preferences
- **Error_Response**: Standardized error message and HTTP status code returned when operations fail

## Functional Requirements

### Requirement 1: Quiz-Based Recommendation Generation

**User Story:** As a movie enthusiast, I want to answer a brief quiz about my mood and preferences, so that I receive personalized movie recommendations with Armenian explanations and snack pairings.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/quiz/recommend` with valid mood, vibe, pace, duration, and mealPreference parameters, THE KinoMan_System SHALL process the quiz answers through the Recommendation_Engine.
2. WHEN the Recommendation_Engine processes valid answers, THE KinoMan_System SHALL call the Gemini_API with a prompt structured to return JSON containing: genres (English names), keywords (TMDB search terms), tmdb_genre_ids (numeric TMDB genre identifiers), media_type ("movie" or "tv"), AI_Reasoning_HY (Armenian explanation), and Snack_Pairing_HY (Armenian snack recommendation).
3. WHEN the Gemini_API response is received, THE KinoMan_System SHALL parse the JSON response using strict parsing that rejects malformed JSON and removes markdown code fences (``` json ``` delimiters).
4. WHEN Gemini_API JSON parsing fails or returns invalid data, THE KinoMan_System SHALL apply fallback logic that maps mood, vibe, and pace parameters to predefined TMDB genre IDs and provides pre-generated Armenian explanations.
5. WHEN valid genre IDs and keywords are extracted, THE KinoMan_System SHALL call TMDB_API's discover endpoint with: with_genres parameter, with_keywords parameter, sort_by parameter (vote_average.desc for discovery, popularity.asc for surprise mode), vote_count threshold, vote_average threshold, and runtime constraints based on duration preference.
6. WHEN TMDB_API returns movies, THE KinoMan_System SHALL normalize each result into Movie_Metadata objects containing: tmdbId, title, overview, posterPath, backdropPath, year, imdbRating, genres (Armenian names mapped from genre IDs), and mediaType.
7. WHEN keyword-based search yields fewer than 3 results, THE KinoMan_System SHALL retry the TMDB_API call without the with_keywords parameter.
8. WHEN genre-based search yields fewer than 3 results, THE KinoMan_System SHALL retry using fallback genres derived from the mood parameter.
9. WHEN all processing completes successfully, THE KinoMan_System SHALL return a JSON response containing: recommendedMovies array (up to 8 movies), recommendedGenres (English names from Gemini), tmdbGenreIds (numeric IDs used), AIReasoningHY (Armenian reasoning), SnackRecommendationHY (Armenian snack pairing), mediaType, and sessionId (UUID).
10. WHEN a session ID is generated, THE KinoMan_System SHALL store the Quiz_Session in MongoDB containing: sessionId, answers (mood, vibe, pace, duration, mealPreference, isPairMode, surprise), recommendedMovieIds, and createdAt timestamp.
11. IF the isPairMode flag is true, THEN THE KinoMan_System SHALL instruct Gemini_API to emphasize shared viewing experience and mutual enjoyment in the AI_Reasoning_HY text.
12. IF the surprise flag is true, THEN THE KinoMan_System SHALL instruct Gemini_API to recommend lesser-known films with high ratings (>7.2) instead of widely popular titles.
13. WHERE duration is "series", THE KinoMan_System SHALL set media_type to "tv" and query TMDB's tv discovery endpoint instead of movie discovery.
14. WHERE duration is "short", THE KinoMan_System SHALL apply runtime constraints of 60-100 minutes for movies.
15. WHERE duration is "epic", THE KinoMan_System SHALL apply runtime constraints of 140+ minutes for movies.
16. WHERE duration is "feature", THE KinoMan_System SHALL apply runtime constraints of 95-145 minutes for movies.

### Requirement 2: Movie Search by Title or Genre

**User Story:** As a user, I want to search for specific movies or TV shows by title, genre, rating, or year, so that I can find content that matches my specific interests beyond quiz-based recommendations.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/movies/search` with a query parameter, THE KinoMan_System SHALL call TMDB_API's multi-search endpoint with the query, language set to "hy-AM", and include_adult set to false.
2. WHEN optional filter parameters (genre, rating, year) are provided, THE KinoMan_System SHALL filter results after TMDB_API returns data based on: genre ID inclusion, rating threshold (>= provided value), and exact year match.
3. WHEN the query parameter is empty or missing, THE KinoMan_System SHALL execute a discover query for movies with genre_id of 18 (Drama) and runtime of 95-145 minutes.
4. WHEN TMDB_API returns results, THE KinoMan_System SHALL normalize each result into Movie_Metadata format, filtering out results without poster_path.
5. WHEN search results are normalized, THE KinoMan_System SHALL map numeric genre IDs to Armenian genre names using the Genre_Mapping lookup table.
6. WHEN search completes, THE KinoMan_System SHALL return up to 16 movies in a JSON array with Movie_Metadata structure.

### Requirement 3: Movie Details and Metadata Retrieval

**User Story:** As a user, I want to view detailed information about a specific movie or TV show, so that I can make an informed decision about whether to watch it.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/movies/details/:id`, THE KinoMan_System SHALL attempt to fetch detailed information from TMDB_API for the specified movieId.
2. WHEN the movieId mediaType is unknown, THE KinoMan_System SHALL try both movie and tv endpoints in sequence until one succeeds.
3. WHEN TMDB_API returns details with append_to_response set to "credits,videos", THE KinoMan_System SHALL extract: full cast (up to 10 members) with name, character, and profilePath; all videos with site and type filters.
4. WHEN videos are retrieved, THE KinoMan_System SHALL identify the first YouTube Trailer; if none exists, SHALL use any YouTube video; if none exist, SHALL set trailerUrl to null.
5. WHEN trailer video is found, THE KinoMan_System SHALL construct trailerUrl in the format "https://www.youtube.com/watch?v={video_key}".
6. WHEN all data is collected, THE KinoMan_System SHALL return Movie_Metadata extended with: overview, runtime (or episodeRuntime for TV), cast array, trailerKey, and trailerUrl.
7. IF neither movie nor tv endpoint returns data, THEN THE KinoMan_System SHALL return HTTP 404 with error message "Ֆիլմը չի գտնվել։" (The film was not found).

### Requirement 4: User Favorites Management

**User Story:** As an authenticated user, I want to save movies to my personal wishlist and remove movies from the wishlist, so that I can maintain a personalized collection of films I want to watch.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/favorites` with a movieId in the request body and valid authentication, THE KinoMan_System SHALL add the movieId to the authenticated user's savedMovies array (if not already present).
2. WHEN a movieId is already in the user's savedMovies array, THE KinoMan_System SHALL not add a duplicate and SHALL return success status.
3. WHEN a DELETE request is made to `/api/favorites/:movieId` with valid authentication, THE KinoMan_System SHALL remove the movieId from the user's savedMovies array.
4. IF the user is not authenticated, THE KinoMan_System SHALL return HTTP 401 with authentication error message.
5. WHEN the favorite operation completes, THE KinoMan_System SHALL return the updated User_Profile with the current savedMovies array.
6. WHEN saveMovie or deleteMovie operations complete, THE KinoMan_System SHALL store the updated User_Profile in MongoDB with the operation timestamp.

### Requirement 5: User Authentication and Session Management

**User Story:** As a new user, I want to create an account with email and password, so that my movie preferences and saved movies are persisted across sessions.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/register` with email and password, THE KinoMan_System SHALL validate that email is a valid email format and password meets minimum security requirements (minimum 8 characters, contains alphanumeric characters).
2. WHEN email validation succeeds and the email does not already exist in MongoDB, THE KinoMan_System SHALL hash the password using bcrypt with salt rounds ≥ 10.
3. WHEN password hashing completes, THE KinoMan_System SHALL create a new User_Profile with email, hashed password, empty savedMovies array, empty history array, and timestamps.
4. WHEN User_Profile creation succeeds, THE KinoMan_System SHALL generate a JWT token with the userId and return it in the response with HTTP 201 status.
5. IF email already exists in MongoDB, THE KinoMan_System SHALL return HTTP 409 with conflict error message.
6. IF password does not meet security requirements, THE KinoMan_System SHALL return HTTP 400 with validation error message detailing requirements.
7. WHEN a POST request is made to `/api/auth/login` with email and password, THE KinoMan_System SHALL query MongoDB for a User_Profile with matching email (case-insensitive).
8. WHEN User_Profile is found, THE KinoMan_System SHALL compare the provided password against the stored hash using bcrypt.
9. WHEN password comparison succeeds, THE KinoMan_System SHALL generate a JWT token with the userId and return it in the response.
10. IF password comparison fails or User_Profile is not found, THE KinoMan_System SHALL return HTTP 401 with authentication error message.
11. WHEN a request includes a valid JWT token in the Authorization header, THE KinoMan_System SHALL extract the userId and validate the token signature using the JWT_SECRET.
12. WHEN token validation succeeds, THE KinoMan_System SHALL attach the decoded user information to the request object for downstream middleware and route handlers.

### Requirement 6: Guest Session Support

**User Story:** As a casual visitor, I want to use the recommendation and search features without creating an account, so that I can explore recommendations immediately.

#### Acceptance Criteria

1. WHEN a request is received without valid authentication credentials, THE KinoMan_System SHALL check for a guest ID in the X-Guest-Id header.
2. WHEN X-Guest-Id header is provided and valid (UUID format), THE KinoMan_System SHALL allow access to quiz, search, and movie details endpoints.
3. WHEN X-Guest-Id header is missing, THE KinoMan_System SHALL generate a new UUID and return it in the response header "X-Guest-Id".
4. WHEN a quiz recommendation is generated for a guest session, THE KinoMan_System SHALL store the Quiz_Session with the guestId instead of userId.
5. WHEN a guest performs a quiz or search, THE KinoMan_System SHALL NOT create or modify a User_Profile.

### Requirement 7: Recommendation History Tracking

**User Story:** As an authenticated user, I want my recommendation history to be tracked, so that I can review previous recommendations and see patterns in my viewing preferences.

#### Acceptance Criteria

1. WHEN a quiz recommendation is successfully generated for an authenticated user, THE KinoMan_System SHALL append an entry to the user's history array containing: movieIds (recommended TMDB IDs), sessionId, and at (timestamp).
2. WHEN a user's history array reaches 50 entries, THE KinoMan_System SHALL maintain only the 50 most recent entries (FIFO removal).
3. WHEN a GET request is made to `/api/user/history`, THE KinoMan_System SHALL return the authenticated user's history array in reverse chronological order (newest first).
4. WHEN history retrieval completes, THE KinoMan_System SHALL normalize movie IDs to Movie_Metadata objects if additional detail is requested.

### Requirement 8: Armenian Language Output for All AI-Generated Content

**User Story:** As an Armenian-speaking user, I want all AI-generated explanations and recommendations to be in fluent, natural Armenian, so that the system feels contextually appropriate and culturally relevant.

#### Acceptance Criteria

1. WHEN the Gemini_API is called with quiz answers, THE KinoMan_System SHALL include an explicit instruction in the prompt requiring all text responses to be in fluent Armenian language.
2. WHEN Gemini_API returns ai_reasoning_hy and snack_recommendation_hy fields, THE KinoMan_System SHALL validate that both fields contain Armenian text (not Latin-script transliteration, not English, not placeholder text).
3. WHEN Gemini_API returns invalid or non-Armenian text in ai_reasoning_hy or snack_recommendation_hy, THE KinoMan_System SHALL use the fallback_insight function which provides pre-generated fluent Armenian text.
4. WHEN movie recommendations are returned to the user, THE KinoMan_System SHALL include the ai_reasoning_hy text explaining why these genres match their preferences in Armenian.
5. WHEN snack pairings are returned, THE KinoMan_System SHALL include the snack_recommendation_hy text describing food and beverage recommendations in Armenian.
6. WHERE movie details include genre names, THE KinoMan_System SHALL map numeric TMDB genre IDs to Armenian genre names using the GENRE_ID_TO_HY mapping table.

### Requirement 9: TMDB API Fallback and Error Recovery

**User Story:** As a system administrator, I want the recommendation engine to gracefully handle TMDB API failures, so that users receive recommendations even if external API calls fail or return unexpected data.

#### Acceptance Criteria

1. WHEN TMDB_API returns an HTTP error (4xx or 5xx), THE KinoMan_System SHALL catch the error and return HTTP 502 with error message "TMDB ծառայությունը ժամանակավորապես անհասանելի է։" (TMDB service is temporarily unavailable).
2. WHEN TMDB_API keyword search returns fewer than 3 results, THE KinoMan_System SHALL automatically retry the same query without the with_keywords parameter.
3. WHEN TMDB_API genre search returns fewer than 3 results, THE KinoMan_System SHALL retry using fallback genre IDs derived from the mood parameter.
4. WHEN TMDB_API returns no results after all retry attempts, THE KinoMan_System SHALL return an empty movies array with appropriate HTTP 200 status and error message in response body.
5. WHEN TMDB_API_KEY is not configured, THE KinoMan_System SHALL return HTTP 503 with error message "TMDB API բանալին բացակայում է։ Ավելացրեք TMDB_API_KEY։" (TMDB API key is missing).

### Requirement 10: Gemini API Fallback and JSON Parsing Robustness

**User Story:** As a system administrator, I want the recommendation engine to handle Gemini API failures and malformed JSON responses, so that quiz recommendations always succeed even if the AI service fails.

#### Acceptance Criteria

1. WHEN Gemini_API_KEY is not configured, THE KinoMan_System SHALL immediately invoke the fallback_insight function and return pre-generated recommendations without calling Gemini_API.
2. WHEN Gemini_API request fails (network error, timeout, rate limit), THE KinoMan_System SHALL catch the error and invoke the fallback_insight function to return recommendations.
3. WHEN Gemini_API returns response text that is not valid JSON, THE KinoMan_System SHALL attempt to extract JSON by: removing markdown code fences (``` and ``` json), finding the first "{" and last "}" characters, and parsing the substring between them.
4. WHEN JSON extraction and parsing fail, THE KinoMan_System SHALL catch the error and invoke the fallback_insight function.
5. WHEN the parsed JSON is missing required fields (genres, tmdb_genre_ids, ai_reasoning_hy, snack_recommendation_hy, media_type), THE KinoMan_System SHALL populate missing fields with fallback values.
6. WHEN ai_reasoning_hy or snack_recommendation_hy contain empty or whitespace-only values, THE KinoMan_System SHALL replace with fallback Armenian text.
7. WHEN fallback is triggered, THE KinoMan_System SHALL NOT throw an error to the client but SHALL return successful recommendations with fallback content.
8. WHEN fallback is triggered more than twice in 24 hours for the same answers (mood, vibe, pace), THE KinoMan_System SHALL log a warning for monitoring purposes.

### Requirement 11: CORS and Request Headers Configuration

**User Story:** As a frontend developer, I want the backend API to accept requests from my Next.js application with proper CORS headers, so that I can call the API from the browser without encountering CORS errors.

#### Acceptance Criteria

1. WHEN a request is received with an Origin header, THE KinoMan_System SHALL check if the origin matches the CLIENT_ORIGIN environment variable (allowing multiple origins if comma-separated).
2. WHEN the origin matches, THE KinoMan_System SHALL include Access-Control-Allow-Origin header in the response.
3. WHEN the request method is OPTIONS, THE KinoMan_System SHALL respond with HTTP 200 and include CORS headers: Allow-Methods (GET, POST, DELETE, PUT, PATCH, OPTIONS), Allow-Headers (Content-Type, Authorization, X-Guest-Id), Allow-Credentials (true).
4. WHEN a request includes the X-Guest-Id header, THE KinoMan_System SHALL NOT require authentication for quiz, search, and details endpoints.
5. WHEN a request lacks authentication and X-Guest-Id header, THE KinoMan_System SHALL allow unauthenticated access to quiz, search, and details endpoints; only favorites and history endpoints require authentication.

### Requirement 12: Error Handling and Standardized Error Responses

**User Story:** As a frontend developer, I want all API errors to follow a consistent format with appropriate HTTP status codes, so that I can implement predictable error handling in the client application.

#### Acceptance Criteria

1. WHEN an error occurs in any route handler, THE KinoMan_System SHALL catch the error using the asyncHandler middleware and pass it to the errorHandler middleware.
2. WHEN the errorHandler middleware receives an error, THE KinoMan_System SHALL return a JSON response containing: status (HTTP status code), message (error description in appropriate language), and timestamp.
3. WHEN the HTTP status code is 404 (Not Found), THE KinoMan_System SHALL return error message "Հայտնված էջը չի գտնվել։" (The requested page was not found) or resource-specific message.
4. WHEN the HTTP status code is 401 (Unauthorized), THE KinoMan_System SHALL return error message "Անհրաժեշտ է ձեռք բերել հավաստման իրավունք։" (Authentication is required).
5. WHEN the HTTP status code is 400 (Bad Request), THE KinoMan_System SHALL return error message describing the specific validation failure.
6. WHEN the HTTP status code is 500 (Internal Server Error), THE KinoMan_System SHALL return generic error message "Ներքին սերվերի սխալ։ Փորձեք կրկին։" (Internal server error. Please try again) and log detailed error to server logs.
7. WHEN client sends malformed JSON body, THE KinoMan_System SHALL return HTTP 400 with parsing error message.
8. WHEN request body exceeds 1MB limit, THE KinoMan_System SHALL return HTTP 413 with error message.

### Requirement 13: MongoDB Connection and Data Persistence

**User Story:** As a system administrator, I want the backend to connect to MongoDB for persisting user accounts and recommendation history, so that user data survives server restarts.

#### Acceptance Criteria

1. WHEN the server starts, THE KinoMan_System SHALL attempt to connect to MongoDB using the MONGODB_URI environment variable or default to "mongodb://127.0.0.1:27017/kinoman".
2. WHEN MongoDB connection succeeds, THE KinoMan_System SHALL set mongoose connection state to "1" (connected) and log "MongoDB connected".
3. WHEN MongoDB connection fails, THE KinoMan_System SHALL log a warning message and continue server startup; quiz and search endpoints work without MongoDB, but authentication and favorites require MongoDB.
4. WHEN a user registers or logs in, THE KinoMan_System SHALL verify MongoDB is connected; IF not connected, SHALL return HTTP 503 with error message "Տվյալների բազա անհասանելի է։" (Database is unavailable).
5. WHEN User_Profile is created, THE KinoMan_System SHALL enforce unique index on email field (case-insensitive).
6. WHEN Quiz_Session is created, THE KinoMan_System SHALL enforce unique index on sessionId field.
7. WHEN querying MongoDB, THE KinoMan_System SHALL handle duplicate key errors (E11000) and return appropriate error messages to client.

### Requirement 14: Health Check and Service Status Endpoint

**User Story:** As a DevOps engineer, I want a health check endpoint that reports the status of all service dependencies, so that I can monitor the API availability and diagnose connection issues.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/health`, THE KinoMan_System SHALL return HTTP 200 with JSON containing: ok (boolean), service (string "kinoman-api"), mongo (boolean indicating connection state).
2. WHEN MongoDB is connected, THE KinoMan_System SHALL return mongo: true.
3. WHEN MongoDB is not connected, THE KinoMan_System SHALL return mongo: false but still return HTTP 200 (health check succeeds even if MongoDB is unavailable as long as API is running).
4. WHEN health check is called, THE KinoMan_System SHALL NOT attempt to connect to MongoDB if already attempted during startup.

### Requirement 15: Genre Mapping and Localization

**User Story:** As a user, I want movie genres to be displayed in Armenian, so that I can understand content categories in my native language.

#### Acceptance Criteria

1. THE KinoMan_System SHALL maintain a bidirectional Genre_Mapping containing: English genre names, Armenian genre names, and TMDB numeric genre IDs for at least these genres: Action (Մարտաֆիլմ, 28), Adventure (Արկածային, 12), Animation (Անիմացիա, 16), Comedy (Կատակերգություն, 35), Crime (Քրեական, 80), Documentary (Վավերագրական, 99), Drama (Դրամա, 18), Family (Ընտանեկան, 10751), Fantasy (Ֆանտազիա, 14), History (Պատմական, 36), Horror (Սարսափ, 27), Music (Երաժշտական, 10402), Mystery (Առեղծված, 9648), Romance (Մելոդրամա/Ռոմանտիկ, 10749), Science Fiction (Գիտաֆանտաստիկա, 878), Thriller (Թրիլեր, 53), War (Պատերազմ, 10752), Western (Վեսթերն, 37).
2. WHEN movie genres are included in responses, THE KinoMan_System SHALL use mapGenreIds function to convert TMDB numeric genre IDs to Armenian names.
3. WHEN Gemini_API returns English genre names, THE KinoMan_System SHALL map them to TMDB IDs using case-insensitive lookup.
4. WHEN user quiz answers include mood or vibe values, THE KinoMan_System SHALL map them to predefined genre lists (e.g., happy mood maps to Comedy 35, Family 10751; sad mood maps to Drama 18).

### Requirement 16: Request Validation and Input Sanitization

**User Story:** As a security administrator, I want the backend to validate all user inputs, so that invalid or malicious requests are rejected before processing.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/quiz/recommend`, THE KinoMan_System SHALL validate that mood parameter is one of: "happy", "sad", "tense", "romantic", "adventurous", "chill"; IF invalid, return HTTP 400.
2. WHEN a POST request is made to `/api/quiz/recommend`, THE KinoMan_System SHALL validate that vibe parameter is one of: "colorful", "dark", "vintage", "neon", "natural"; IF invalid, return HTTP 400.
3. WHEN a POST request is made to `/api/quiz/recommend`, THE KinoMan_System SHALL validate that pace parameter is one of: "fast", "slow", "balanced"; IF invalid, return HTTP 400.
4. WHEN a POST request is made to `/api/quiz/recommend`, THE KinoMan_System SHALL validate that duration parameter is one of: "short", "feature", "epic", "series"; IF invalid, return HTTP 400.
5. WHEN a POST request is made to `/api/quiz/recommend`, THE KinoMan_System SHALL validate that mealPreference parameter is one of: "sweet", "salty", "spicy", "healthy", "drinks"; IF missing, use default "salty".
6. WHEN a POST request is made to `/api/quiz/recommend`, THE KinoMan_System SHALL validate isPairMode and surprise as boolean values; IF invalid, treat as false.
7. WHEN a GET request is made to `/api/movies/details/:id`, THE KinoMan_System SHALL validate that id is a positive integer; IF invalid, return HTTP 400.
8. WHEN a GET request is made to `/api/movies/search`, THE KinoMan_System SHALL trim and sanitize the query parameter to remove leading/trailing whitespace and limit length to 200 characters.
9. WHEN user provides email during registration or login, THE KinoMan_System SHALL validate email format using standard email validation regex.
10. WHEN user provides password during authentication, THE KinoMan_System SHALL validate minimum length of 8 characters and require at least one number and one letter.

## Non-Functional Requirements

### Requirement 17: Performance and Response Times

**User Story:** As a user, I want the recommendation API to return results quickly, so that I have a smooth and responsive user experience.

#### Acceptance Criteria

1. WHEN a quiz recommendation request is processed, THE KinoMan_System SHALL return a response within 3 seconds (including Gemini_API call, TMDB_API call, and database operations).
2. WHEN a movie search request is processed, THE KinoMan_System SHALL return a response within 2 seconds.
3. WHEN a movie details request is processed, THE KinoMan_System SHALL return a response within 2 seconds.
4. WHEN Gemini_API call exceeds 2 seconds, THE KinoMan_System SHALL invoke fallback recommendations without waiting for full Gemini response.
5. WHEN TMDB_API call exceeds 1.5 seconds, THE KinoMan_System SHALL return partial results or cached data if available.

### Requirement 18: Scalability and Concurrent Users

**User Story:** As a DevOps engineer, I want the backend to handle increasing numbers of concurrent users, so that the service remains available during peak usage.

#### Acceptance Criteria

1. WHEN 100 concurrent requests are made to the API, THE KinoMan_System SHALL process all requests within the performance targets specified in Requirement 17.
2. WHEN the server receives requests exceeding capacity, THE KinoMan_System SHALL implement request queuing and process them in order.
3. WHEN database connection pool is exhausted, THE KinoMan_System SHALL return HTTP 503 with appropriate error message rather than crashing.
4. WHEN external API (TMDB, Gemini) rate limits are exceeded, THE KinoMan_System SHALL implement exponential backoff retry strategy and return cached results if available.

### Requirement 19: Availability and Uptime

**User Story:** As a DevOps engineer, I want the backend to maintain high availability, so that users can access the service reliably.

#### Acceptance Criteria

1. THE KinoMan_System SHALL target 99.5% uptime over rolling 30-day periods.
2. WHEN Gemini_API or TMDB_API experiences degradation or unavailability, THE KinoMan_System SHALL continue serving requests using fallback data without interruption.
3. WHEN MongoDB experiences temporary unavailability (< 30 seconds), THE KinoMan_System SHALL maintain availability for quiz, search, and details endpoints; authentication and favorites are unavailable until MongoDB recovers.

### Requirement 20: Security - Authentication and Authorization

**User Story:** As a security administrator, I want the backend to securely authenticate users and authorize API access, so that user accounts and data are protected from unauthorized access.

#### Acceptance Criteria

1. WHEN user registers with a password, THE KinoMan_System SHALL hash the password using bcrypt with minimum 10 salt rounds.
2. WHEN user logs in, THE KinoMan_System SHALL never log the plaintext password to any logs or error messages.
3. WHEN JWT token is generated, THE KinoMan_System SHALL use a secure JWT_SECRET (minimum 32 characters) stored in environment variables.
4. WHEN JWT token is received in Authorization header, THE KinoMan_System SHALL validate the token signature and expiration before granting access.
5. WHEN JWT token expires, THE KinoMan_System SHALL return HTTP 401 with error message "Ձեր գործընթացի վավերումը լրաբանել է։" (Your session has expired).
6. WHEN user attempts to access protected endpoint without valid token, THE KinoMan_System SHALL return HTTP 401.
7. WHEN a user makes a request to another user's resources (e.g., accessing another user's history), THE KinoMan_System SHALL return HTTP 403 Forbidden.

### Requirement 21: Security - Data Protection

**User Story:** As a data privacy officer, I want user data to be protected in transit and at rest, so that sensitive information is not exposed.

#### Acceptance Criteria

1. WHEN the server is deployed in production, THE KinoMan_System SHALL use HTTPS (TLS 1.2 or higher) for all connections.
2. WHEN user passwords are stored in MongoDB, THE KinoMan_System SHALL never store plaintext passwords; all passwords SHALL be hashed.
3. WHEN sensitive data (email, passwordHash) is returned to frontend, THE KinoMan_System SHALL exclude passwordHash from all responses.
4. WHEN API requests are logged, THE KinoMan_System SHALL not log Authorization header values or authentication credentials.
5. WHEN user account is deleted, THE KinoMan_System SHALL securely delete all associated data from MongoDB.

### Requirement 22: Security - API Rate Limiting

**User Story:** As a security administrator, I want to prevent abuse and brute force attacks on the API, so that legitimate users have fair access.

#### Acceptance Criteria

1. WHEN requests are received from a single IP address, THE KinoMan_System SHALL implement rate limiting to allow maximum 100 requests per minute for unauthenticated endpoints.
2. WHEN requests are received from an authenticated user, THE KinoMan_System SHALL implement rate limiting to allow maximum 500 requests per minute.
3. WHEN rate limit is exceeded, THE KinoMan_System SHALL return HTTP 429 (Too Many Requests) with Retry-After header.
4. WHEN authentication attempts (login) are made from a single IP, THE KinoMan_System SHALL implement stricter rate limiting: maximum 5 failed attempts per minute; after exceeding, SHALL lock out that IP for 15 minutes.

### Requirement 23: Logging and Monitoring

**User Story:** As a DevOps engineer, I want comprehensive logs of API activity and errors, so that I can monitor service health and diagnose issues.

#### Acceptance Criteria

1. WHEN requests are received, THE KinoMan_System SHALL log: timestamp, HTTP method, path, query parameters, response status code, and response time.
2. WHEN errors occur, THE KinoMan_System SHALL log: error type, error message, stack trace, request context, and timestamp.
3. WHEN Gemini_API or TMDB_API fails, THE KinoMan_System SHALL log the specific failure reason and any retry attempts.
4. WHEN database errors occur, THE KinoMan_System SHALL log database-specific error information for debugging.
5. WHEN sensitive data is processed, THE KinoMan_System SHALL NOT include sensitive values (passwords, email addresses, tokens) in logs.
6. WHEN logs are written, THE KinoMan_System SHALL use structured logging format (JSON) for easy parsing and aggregation.

### Requirement 24: Maintainability and Code Organization

**User Story:** As a developer, I want the backend code to be well-organized and maintainable, so that I can quickly understand and modify features.

#### Acceptance Criteria

1. THE KinoMan_System code SHALL be organized into these directories: /src/routes (route handlers), /src/services (external API integrations), /src/models (database schemas), /src/middleware (request/response middleware).
2. WHEN a new route is added, THE KinoMan_System SHALL follow the existing pattern of exporting a function that registers the route on the provided router.
3. WHEN external API calls are needed, THE KinoMan_System SHALL use dedicated service modules (gemini.js, tmdb.js) rather than inline API calls in route handlers.
4. WHEN database models are used, THE KinoMan_System SHALL use Mongoose schemas defined in /src/models rather than raw MongoDB queries.
5. WHEN errors are handled, THE KinoMan_System SHALL use the HttpError class and asyncHandler middleware for consistent error handling.

### Requirement 25: Testing and Quality Assurance

**User Story:** As a QA engineer, I want comprehensive test coverage to ensure API reliability and correctness, so that bugs are caught before production.

#### Acceptance Criteria

1. WHEN the backend code is changed, THE KinoMan_System test suite SHALL execute all tests automatically.
2. WHEN tests execute, THE KinoMan_System SHALL achieve minimum 70% code coverage for all modules.
3. WHEN tests execute, THE KinoMan_System test suite SHALL include: unit tests for service functions (gemini, tmdb), integration tests for API endpoints, property-based tests for core business logic.
4. WHEN a quiz recommendation is tested, THE test suite SHALL verify that responses always include required fields regardless of Gemini_API and TMDB_API success/failure.
5. WHEN genre mapping is tested, THE test suite SHALL verify bidirectional mapping accuracy between TMDB IDs, English names, and Armenian names.

## API Contract Specification

### Quiz Recommendation Endpoint

**Request:**
```
POST /api/quiz/recommend
Content-Type: application/json
Authorization: Bearer {jwt_token} (optional for guests)
X-Guest-Id: {uuid} (optional)

{
  "mood": "happy" | "sad" | "tense" | "romantic" | "adventurous" | "chill",
  "vibe": "colorful" | "dark" | "vintage" | "neon" | "natural",
  "pace": "fast" | "slow" | "balanced",
  "duration": "short" | "feature" | "epic" | "series",
  "mealPreference": "sweet" | "salty" | "spicy" | "healthy" | "drinks" (optional, default: "salty"),
  "isPairMode": boolean (optional, default: false),
  "surprise": boolean (optional, default: false)
}
```

**Success Response (200 OK):**
```json
{
  "recommendedMovies": [
    {
      "id": 550,
      "tmdbId": 550,
      "title": "Fight Club",
      "overview": "An insomniac office worker and a devil-may-care soapmaker form an underground fight club...",
      "posterPath": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp2AWUvMPSI6DfekJF9.jpg",
      "backdropPath": "https://image.tmdb.org/t/p/w500/...",
      "year": "1999",
      "imdbRating": 8.8,
      "genreIds": [18, 53],
      "genres": ["Դրամա", "Թրիլեր"],
      "mediaType": "movie"
    }
  ],
  "recommendedGenres": ["Drama", "Thriller"],
  "tmdbGenreIds": [18, 53],
  "aiReasoningHY": "Քո ինտենսիվ տրամադրությունը և թրիլերային վայբը անկասկածորեն հանգեցնում են սուր և հետհաշվերախ ստեղծագործությունների։ Այս ֆիլմերը հեղուկ կախարդական մատրիցա են, որ պահպանում են լարվածությունը։",
  "snackRecommendationHY": "Կծու նաչոս, համեմունքային պոպկորն և սառը լիմոնադ՝ թրիլերային գրգռվածությունը մեղմելու համար։",
  "mediaType": "movie",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400 Bad Request):**
```json
{
  "status": 400,
  "message": "Invalid mood parameter. Allowed values: happy, sad, tense, romantic, adventurous, chill",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Movie Search Endpoint

**Request:**
```
GET /api/movies/search?query=Inception&genre=14&rating=7.5&year=2010
```

**Success Response (200 OK):**
```json
{
  "movies": [
    {
      "id": 27205,
      "tmdbId": 27205,
      "title": "Inception",
      "overview": "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets...",
      "posterPath": "https://image.tmdb.org/t/p/w500/...",
      "year": "2010",
      "imdbRating": 8.8,
      "genreIds": [14, 28, 878],
      "genres": ["Ֆանտազիա", "Մարտաֆիլմ", "Գիտաֆանտաստիկա"],
      "mediaType": "movie"
    }
  ]
}
```

### Movie Details Endpoint

**Request:**
```
GET /api/movies/details/550
```

**Success Response (200 OK):**
```json
{
  "id": 550,
  "tmdbId": 550,
  "title": "Fight Club",
  "overview": "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into much more...",
  "posterPath": "https://image.tmdb.org/t/p/w500/...",
  "year": "1999",
  "imdbRating": 8.8,
  "runtime": 139,
  "genreIds": [18, 53],
  "genres": ["Դրամա", "Թրիլեր"],
  "cast": [
    {
      "id": 287,
      "name": "Brad Pitt",
      "character": "Tyler Durden",
      "profilePath": "https://image.tmdb.org/t/p/w500/..."
    }
  ],
  "trailerKey": "SUXWAEX2jlg",
  "trailerUrl": "https://www.youtube.com/watch?v=SUXWAEX2jlg",
  "mediaType": "movie"
}
```

### Favorites Management Endpoints

**Add to Favorites Request:**
```
POST /api/favorites
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "movieId": 550
}
```

**Add to Favorites Response (200 OK):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "savedMovies": [550, 27205],
  "message": "Ֆիլմը ավելացվել է favorites-ին։"
}
```

**Remove from Favorites Request:**
```
DELETE /api/favorites/550
Authorization: Bearer {jwt_token}
```

**Remove from Favorites Response (200 OK):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "savedMovies": [27205],
  "message": "Ֆիլմը հեռացվել է favorites-ից։"
}
```

### Authentication Endpoints

**Register Request:**
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Register Response (201 Created):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Հաշիվը հաջողությամբ ստեղծվել է։"
}
```

**Login Request:**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Login Response (200 OK):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Հաջողությամբ մուտք գործել եք։"
}
```

### Health Check Endpoint

**Request:**
```
GET /api/health
```

**Response (200 OK):**
```json
{
  "ok": true,
  "service": "kinoman-api",
  "mongo": true
}
```

## Data Flow Requirements

### Quiz Recommendation Data Flow

1. **Input Reception**: Client sends POST to `/api/quiz/recommend` with mood, vibe, pace, duration, mealPreference, isPairMode, surprise.
2. **Validation**: Request validation middleware checks parameters against allowed values.
3. **Gemini AI Processing**: KinoMan_System calls Gemini_API with structured prompt requesting JSON response with genres, keywords, tmdb_genre_ids, media_type, ai_reasoning_hy, snack_recommendation_hy.
4. **JSON Parsing**: KinoMan_System parses Gemini response, extracting JSON from markdown code fences if necessary.
5. **Fallback Trigger**: If Gemini fails or returns invalid JSON, fallback_insight is invoked with quiz answers to generate default recommendations.
6. **Genre Mapping**: Extracted English genre names are mapped to TMDB numeric IDs using mapGenreIds function.
7. **TMDB Discovery**: KinoMan_System calls TMDB_API discover endpoint with mapped genre IDs, keywords, and duration-based runtime constraints.
8. **Retry Logic**: If fewer than 3 results, KinoMan_System retries without keywords; if still fewer than 3, retries with fallback genre IDs.
9. **Normalization**: Each TMDB result is normalized into Movie_Metadata format with Armenian genre names.
10. **Session Storage**: Quiz_Session is created in MongoDB with sessionId, answers, recommendedMovieIds, and createdAt timestamp.
11. **History Update**: For authenticated users, the recommendation session is appended to user's history array.
12. **Response Construction**: Response object is assembled with movies, genres, AI reasoning, snack pairing, and sessionId.
13. **Client Response**: Response is returned to client with appropriate HTTP 200 status.

### Search Data Flow

1. **Input Reception**: Client sends GET to `/api/movies/search?query=...&filters`.
2. **Parameter Sanitization**: Query string is trimmed and validated (max 200 characters).
3. **Query Construction**: If query is empty, default to discover with Drama genre (18); otherwise use search/multi endpoint.
4. **TMDB API Call**: KinoMan_System calls TMDB_API with query, language, and optional filters.
5. **Result Filtering**: Results are filtered to include only movies/TV with poster_path; optional genre, rating, year filters are applied.
6. **Normalization**: Each result is normalized to Movie_Metadata with Armenian genre names.
7. **Result Limitation**: Results are sliced to maximum 16 items.
8. **Response Construction**: Response array of Movie_Metadata objects is assembled.
9. **Client Response**: Response is returned with HTTP 200 status.

### Details Retrieval Data Flow

1. **Input Reception**: Client sends GET to `/api/movies/details/:id`.
2. **ID Validation**: ID parameter is validated as positive integer.
3. **Media Type Detection**: KinoMan_System tries both movie and tv endpoints in sequence.
4. **TMDB Details Call**: KinoMan_System calls TMDB_API with append_to_response="credits,videos".
5. **Data Extraction**: Title, overview, runtime, genres, cast, videos are extracted.
6. **Trailer Identification**: First YouTube Trailer video is identified; if none, any YouTube video; if none, trailerUrl = null.
7. **Cast Normalization**: Cast array is limited to 10 members with id, name, character, profilePath.
8. **Response Construction**: Extended Movie_Metadata object with all details is assembled.
9. **Client Response**: Response is returned with HTTP 200 status.

## Error Handling Requirements

### Error Handling Strategy

The KinoMan_System implements a multi-layered error handling approach:

1. **Request Validation Layer**: Input validation middleware catches malformed requests before route handlers execute.
2. **Service Layer Error Handling**: External API calls (TMDB, Gemini) wrap in try-catch with appropriate fallbacks and retry logic.
3. **Route Handler Error Handling**: All route handlers wrap in asyncHandler middleware to catch unexpected errors.
4. **Global Error Handler Middleware**: Catches all unhandled errors and returns standardized error responses.
5. **Graceful Degradation**: If external services fail (Gemini, TMDB), fallback data is used rather than returning errors to client.

### Specific Error Scenarios

**Gemini API Failure**: Instead of failing the quiz recommendation, fallback_insight is invoked to return pre-generated recommendations with fallback Armenian text.

**TMDB API Failure**: Retry with fallback genres; if all retries fail, return HTTP 502 with service unavailability message.

**MongoDB Connection Failure**: Quiz, search, and details endpoints continue working without MongoDB; authentication and favorites endpoints return HTTP 503.

**Malformed JSON Response from Gemini**: Parse using extraction method (find first { and last }); if extraction fails, trigger fallback.

**JWT Token Expired**: Return HTTP 401 with session expiration message.

**User Not Found During Login**: Return generic HTTP 401 (do not reveal whether email exists) to prevent enumeration attacks.

**Rate Limit Exceeded**: Return HTTP 429 with Retry-After header.

---

This comprehensive requirements specification establishes the foundation for the KinoMan backend system, with clear acceptance criteria for each requirement enabling effective verification through both manual testing and automated test development.
