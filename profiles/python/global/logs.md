# Best Practices Guide: Python Logging with Loguru

- Always use Loguru Python package for logging
- Use the log level patterns based on the examples below:
| Level | Value | Method | When to Use | Example |
|-------|-------|--------|-------------|---------|
| TRACE | 5 | `logger.trace()` | Ultra-detailed debugging, function entry/exit | "Entering function with args={}" |
| DEBUG | 10 | `logger.debug()` | Development diagnostics | "Query returned 42 rows" |
| INFO | 20 | `logger.info()` | Normal operations | "User logged in" |
| SUCCESS | 25 | `logger.success()` | Positive confirmations (Loguru-specific) | "Payment processed successfully" |
| WARNING | 30 | `logger.warning()` | Potential issues | "Cache miss, using database" |
| ERROR | 40 | `logger.error()` | Failed operations | "Failed to connect to payment gateway" |
| CRITICAL | 50 | `logger.critical()` | System-threatening failures | "Out of memory, shutting down" |

- Examples of Practical Usage:
```python
from loguru import logger

# TRACE: Function entry/exit (only during deep debugging)
def process_payment(amount):
    logger.trace(f"Entering process_payment(amount={amount})")
    # ... processing logic
    logger.trace("Exiting process_payment successfully")

# DEBUG: Internal state for developers
logger.debug(f"API response received: {len(response.content)} bytes")

# INFO: Business events
logger.info(f"User {user_id} completed checkout")

# SUCCESS: Highlight successful results (great for monitoring)
logger.success(f"Background job completed in {elapsed}s")

# WARNING: Degraded but functional
logger.warning(f"Attempt {attempt} of 3 failed")

# ERROR: Operation failed but application continues
logger.error(f"Failed to send email to {email}")

# CRITICAL: Requires immediate attention
logger.critical("Database connection pool exhausted")
```

**Why these distinctions matter:**
- Enables filtering in production (e.g., only INFO and above)
- SUCCESS level helps distinguish positive results from neutral INFO
- Proper leveling makes log aggregation and alerting more effective