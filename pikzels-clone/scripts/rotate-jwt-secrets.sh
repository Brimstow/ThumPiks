#!/bin/bash
# =============================================================================
# Secret Rotation Script — Thumbnail Maker Studio
# =============================================================================
#
# Generates cryptographically secure secrets and outputs Railway CLI commands.
# Does NOT set variables automatically — review and paste commands yourself.
#
# Usage:
#   bash scripts/rotate-jwt-secrets.sh                  # Rotate JWT + session secrets
#   bash scripts/rotate-jwt-secrets.sh --all            # Rotate JWT + session + encryption key
#   bash scripts/rotate-jwt-secrets.sh --encryption-key-only  # Only encryption key
#
# Prerequisites:
#   - openssl (included in Git Bash on Windows, native on macOS/Linux)
#   - Railway CLI authenticated (railway login)
#
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Generate a cryptographically secure hex string
generate_secret() {
  local length=${1:-64}
  openssl rand -hex "$length"
}

# Print a section header
header() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

# Print a warning
warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Print info
info() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Print the Railway command
railway_cmd() {
  local var_name=$1
  local var_value=$2
  echo -e "${BOLD}railway variables set ${var_name}=\"${var_value}\"${NC}"
}

# ─────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────
MODE="jwt"  # Default: rotate JWT + session secrets only

if [[ "${1:-}" == "--all" ]]; then
  MODE="all"
elif [[ "${1:-}" == "--encryption-key-only" ]]; then
  MODE="encryption"
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash scripts/rotate-jwt-secrets.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  (no args)              Rotate JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET"
  echo "  --all                  Rotate all secrets including ENCRYPTION_KEY"
  echo "  --encryption-key-only  Only generate a new ENCRYPTION_KEY"
  echo "  --help, -h             Show this help"
  echo ""
  echo "The script generates new secrets and prints Railway CLI commands."
  echo "It does NOT set variables automatically — you review and paste."
  exit 0
fi

# ─────────────────────────────────────────────────────────────
# Verify openssl is available
# ─────────────────────────────────────────────────────────────
if ! command -v openssl &> /dev/null; then
  echo -e "${RED}ERROR: openssl is not installed or not in PATH.${NC}"
  echo "Install it or use Git Bash on Windows (includes openssl)."
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Generate secrets
# ─────────────────────────────────────────────────────────────

header "Thumbnail Maker Studio — Secret Rotation"

echo -e "Mode: ${BOLD}${MODE}${NC}"
echo -e "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

if [[ "$MODE" == "jwt" || "$MODE" == "all" ]]; then
  JWT_SECRET=$(generate_secret 32)
  REFRESH_TOKEN_SECRET=$(generate_secret 32)
  SESSION_SECRET=$(generate_secret 32)

  header "Step 1: Copy-paste these Railway commands"

  warn "This will invalidate ALL active user sessions."
  warn "Users will need to re-login after deployment."
  echo ""

  railway_cmd "JWT_SECRET" "$JWT_SECRET"
  echo ""
  railway_cmd "REFRESH_TOKEN_SECRET" "$REFRESH_TOKEN_SECRET"
  echo ""
  railway_cmd "SESSION_SECRET" "$SESSION_SECRET"
  echo ""

  info "3 secrets generated (64 hex characters each = 256 bits of entropy)"
fi

if [[ "$MODE" == "encryption" || "$MODE" == "all" ]]; then
  ENCRYPTION_KEY=$(generate_secret 16)  # 32 hex chars = 256 bits, meets the 32-char minimum

  if [[ "$MODE" == "all" ]]; then
    header "Step 2: Encryption Key (CAUTION)"
  else
    header "Step 1: Encryption Key (CAUTION)"
  fi

  echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  CAUTION: ENCRYPTION_KEY is used for MFA data encryption.  ║${NC}"
  echo -e "${RED}║  Rotating it breaks MFA for users who have it enabled.     ║${NC}"
  echo -e "${RED}║                                                            ║${NC}"
  echo -e "${RED}║  Before rotating, check if any users have MFA:             ║${NC}"
  echo -e "${RED}║  SELECT id, email FROM \"User\"                              ║${NC}"
  echo -e "${RED}║    WHERE settings::text LIKE '%mfa%';                      ║${NC}"
  echo -e "${RED}║                                                            ║${NC}"
  echo -e "${RED}║  If users have MFA: run re-encryption migration first!     ║${NC}"
  echo -e "${RED}║  See docs/secret-rotation-procedure.md section B.          ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  railway_cmd "ENCRYPTION_KEY" "$ENCRYPTION_KEY"
  echo ""

  info "1 encryption key generated (32 hex characters = 256 bits)"
fi

# ─────────────────────────────────────────────────────────────
# Post-rotation checklist
# ─────────────────────────────────────────────────────────────

header "Post-Rotation Checklist"

echo "After setting the variables in Railway:"
echo ""
echo "  1. Wait for Railway to redeploy (~60 seconds)"
echo "  2. Verify health endpoint:"
echo "     curl -s https://YOUR_DOMAIN/health | jq '.status'"
echo "     Expected: \"OK\""
echo ""
echo "  3. Test login: Open app in browser, log in with valid credentials"
echo ""
echo "  4. Record the rotation in docs/secret-rotation-procedure.md"
echo "     (Rotation Log table at the bottom)"
echo ""

warn "IMPORTANT: Do NOT commit these secrets to git!"
warn "They are displayed here for copy-paste to Railway only."
echo ""
info "Done. Review the commands above and paste into your terminal."
