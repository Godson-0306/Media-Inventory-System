-- One-time restart of every organization's 14-day trial (including ACTIVE).
UPDATE "Organization"
SET "subscriptionStatus" = 'TRIAL',
    "trialEndsAt" = NOW() + INTERVAL '14 days';
