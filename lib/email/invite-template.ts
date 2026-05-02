export function buildInviteEmail(params: {
  caseName: string;
  emailBody: string;
}): string {
  return `Dear ${params.caseName},

${params.emailBody}

---
Voice Platform — Amplifying Community Voices
This email was sent by Voice Platform. If you received this in error, please disregard it.`;
}
