import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendInviteEmail(params: {
  to: string;
  body: string;
  caseTitle: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "RESEND_API_KEY not set — email not sent. Body logged below:"
    );
    console.log(`To: ${params.to}`);
    console.log(`Case: ${params.caseTitle}`);
    console.log(params.body);
    return;
  }

  await getResend().emails.send({
    from: "Voice Platform <hello@voiceplatform.com>",
    to: params.to,
    subject: `An invitation from Voice Platform`,
    text: params.body,
  });
}
