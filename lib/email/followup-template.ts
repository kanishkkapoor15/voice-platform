export function buildFollowupEmail(params: {
  caseName: string;
  daysSinceSent: number;
}): string {
  return `Dear ${params.caseName},

We reached out ${params.daysSinceSent} days ago about the possibility of sharing your story on Voice Platform. We wanted to gently follow up in case our earlier message was missed.

There is absolutely no obligation to respond, and we completely understand if this is not the right time. If you are interested, we would love to hear from you — simply reply to this email.

If you would prefer not to be contacted again, please let us know and we will remove you from our list immediately.

Warm regards,
The Voice Platform Team

---
Voice Platform — Amplifying Community Voices`;
}
