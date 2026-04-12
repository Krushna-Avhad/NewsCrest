// backend/utils/groqRateLimiter.js
// Central Groq API rate limit manager for NewsCrest
// Groq free tier: ~30 requests/min, ~14,400 tokens/min

// ─── Queue & Processing State ─────────────────────────────────────────────────
const queue = [];
let isProcessing = false;

// ─── Config ───────────────────────────────────────────────────────────────────
const DELAY_BETWEEN_CALLS_MS = 2200; // ~27 req/min — safe margin under 30
const MAX_RETRIES = 3;
const TOKEN_LIMIT_PER_MIN = 12000;   // Groq free: 14,400 — keep a buffer
const REQUEST_LIMIT_PER_MIN = 27;    // Groq free: 30 — keep a buffer

// ─── Token & Request Tracking ─────────────────────────────────────────────────
let tokensUsedThisMinute = 0;
let requestsThisMinute = 0;
let minuteStart = Date.now();

function resetWindowIfNeeded() {
  const now = Date.now();
  if (now - minuteStart > 60_000) {
    tokensUsedThisMinute = 0;
    requestsThisMinute = 0;
    minuteStart = now;
    console.log("🔄 [GroqLimiter] Rate limit window reset.");
  }
}

/**
 * Track token usage manually after a Groq call.
 * Call this with the number of tokens used (prompt + completion).
 * Returns how many ms to wait if we're near the limit, else 0.
 */
export function trackTokens(count = 0) {
  resetWindowIfNeeded();
  tokensUsedThisMinute += count;

  if (tokensUsedThisMinute >= TOKEN_LIMIT_PER_MIN) {
    const waitMs = 60_000 - (Date.now() - minuteStart);
    console.warn(
      `🛑 [GroqLimiter] Token limit approaching (${tokensUsedThisMinute}/${TOKEN_LIMIT_PER_MIN}). ` +
      `Suggest waiting ${Math.ceil(waitMs / 1000)}s.`
    );
    return waitMs > 0 ? waitMs : 1000;
  }

  return 0;
}

/**
 * Get current usage stats — useful for logging or a /health endpoint.
 */
export function getUsageStats() {
  resetWindowIfNeeded();
  const elapsed = Date.now() - minuteStart;
  return {
    requestsThisMinute,
    tokensThisMinute: tokensUsedThisMinute,
    requestLimit: REQUEST_LIMIT_PER_MIN,
    tokenLimit: TOKEN_LIMIT_PER_MIN,
    windowElapsedMs: elapsed,
    windowRemainingMs: Math.max(0, 60_000 - elapsed),
    queueLength: queue.length,
  };
}

// ─── Core Queue Processor ─────────────────────────────────────────────────────
async function processQueue() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { fn, resolve, reject, retries, label } = queue.shift();

  resetWindowIfNeeded();

  // If we're over request limit, wait out the rest of the window
  if (requestsThisMinute >= REQUEST_LIMIT_PER_MIN) {
    const waitMs = 60_000 - (Date.now() - minuteStart);
    console.warn(
      `⏳ [GroqLimiter] Request limit hit (${requestsThisMinute}/${REQUEST_LIMIT_PER_MIN}). ` +
      `Pausing ${Math.ceil(waitMs / 1000)}s...`
    );
    await sleep(waitMs + 500); // +500ms buffer
    resetWindowIfNeeded();
  }

  try {
    console.log(
      `🚀 [GroqLimiter] Calling${label ? ` [${label}]` : ""} ` +
      `| Queue: ${queue.length} remaining ` +
      `| Req: ${requestsThisMinute + 1}/${REQUEST_LIMIT_PER_MIN} this min`
    );

    requestsThisMinute++;
    const result = await fn();
    resolve(result);

  } catch (err) {
    const status = err?.status || err?.response?.status;
    const is429 = status === 429 || err?.message?.toLowerCase().includes("rate limit");

    if (is429 && retries < MAX_RETRIES) {
      // Exponential backoff: 3s → 6s → 12s
      const backoff = Math.pow(2, retries) * 3000;
      console.warn(
        `⚠️ [GroqLimiter] 429 received${label ? ` for [${label}]` : ""}. ` +
        `Retry ${retries + 1}/${MAX_RETRIES} in ${backoff / 1000}s...`
      );
      await sleep(backoff);
      // Put back at front of queue with incremented retry count
      queue.unshift({ fn, resolve, reject, retries: retries + 1, label });
    } else {
      if (is429) {
        console.error(
          `❌ [GroqLimiter] Max retries reached${label ? ` for [${label}]` : ""}. Giving up.`
        );
      }
      reject(err);
    }
  }

  // Enforce minimum delay between calls regardless of success/fail
  await sleep(DELAY_BETWEEN_CALLS_MS);
  processQueue();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wrap any Groq API call with this function.
 * It queues calls, enforces rate limits, and auto-retries on 429s.
 *
 * @param {Function} fn     - Async function that makes the Groq call
 * @param {string}   label  - Optional label for logging (e.g. "summarize", "sentiment")
 * @returns {Promise}
 *
 * @example
 * const result = await groqCall(
 *   () => groq.chat.completions.create({ ... }),
 *   "summarize"
 * );
 */
export async function groqCall(fn, label = "") {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject, retries: 0, label });
    if (!isProcessing) processQueue();
  });
}

/**
 * Priority version — jumps to the FRONT of the queue.
 * Use for user-facing real-time requests (chatbot, perspective)
 * vs background tasks (sentiment, timeline generation).
 *
 * @example
 * // Chatbot response — user is waiting, prioritize it
 * const result = await groqCallPriority(() => groq.chat.completions.create({ ... }), "chatbot");
 */
export async function groqCallPriority(fn, label = "") {
  return new Promise((resolve, reject) => {
    queue.unshift({ fn, resolve, reject, retries: 0, label });
    if (!isProcessing) processQueue();
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
