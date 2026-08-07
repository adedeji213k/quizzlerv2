import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    await resend.emails.send({
      from: "Quizzler <welcome@contact.quizzler.site>",
      to,
      subject: "Welcome to Quizzler 🎉 Let's ace your next exam",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to Quizzler</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f7fa;
    font-family:Arial,Helvetica,sans-serif;
    color:#161b26;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="padding:40px 16px;background:#f5f7fa;"
>

<tr>
<td align="center">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:600px;
    background:#ffffff;
    border-radius:18px;
    overflow:hidden;
    box-shadow:0 8px 30px rgba(0,0,0,.08);
  "
>

<!-- HEADER -->

<tr>
<td
style="
padding:40px;
background:linear-gradient(135deg,#41d9c3 0%,#18b87a 100%);
"
>

<div
style="
display:inline-block;
padding:10px 16px;
background:rgba(255,255,255,.15);
border:1px solid rgba(255,255,255,.25);
border-radius:12px;
color:white;
font-size:20px;
font-weight:700;
"
>
✨ Quizzler
</div>

<div
style="
margin-top:30px;
font-size:30px;
font-weight:700;
color:white;
line-height:1.3;
"
>
Welcome to Quizzler 🎉
</div>

<div
style="
margin-top:10px;
font-size:15px;
line-height:1.7;
color:rgba(255,255,255,.92);
"
>
Study smarter. Remember more. Ace your exams.
</div>

</td>
</tr>

<!-- BODY -->

<tr>
<td style="padding:40px;">

<p
style="
margin:0 0 18px;
font-size:16px;
line-height:1.8;
"
>
Hi <strong>${name}</strong>,
</p>

<p
style="
margin:0 0 18px;
font-size:16px;
line-height:1.8;
color:#4b5563;
"
>
Welcome to <strong>Quizzler</strong>! You've just taken a huge step toward making studying faster, easier and far more effective.
</p>

<p
style="
margin:0 0 28px;
font-size:16px;
line-height:1.8;
color:#4b5563;
"
>
Instead of spending hours creating notes and questions manually, Quizzler uses AI to instantly turn your study materials into quizzes, flashcards and personalized practice sessions.
</p>

<!-- FIRST STEP -->

<table
width="100%"
cellpadding="0"
cellspacing="0"
border="0"
style="
background:#f0fdfa;
border:1px solid #ccfbf1;
border-radius:12px;
margin-bottom:32px;
"
>

<tr>
<td style="padding:24px;">

<div
style="
font-size:13px;
font-weight:700;
letter-spacing:.8px;
text-transform:uppercase;
color:#18b87a;
margin-bottom:8px;
"
>
YOUR FIRST STEP
</div>

<div
style="
font-size:20px;
font-weight:700;
color:#161b26;
margin-bottom:10px;
"
>
Upload your first study material 📚
</div>

<div
style="
font-size:14px;
line-height:1.7;
color:#6b7280;
"
>
Upload a PDF, lecture note or document and let Quizzler instantly generate quizzes and flashcards tailored to what you're learning.
</div>

</td>
</tr>

</table>

<!-- CTA -->

<table cellpadding="0" cellspacing="0" border="0">

<tr>

<td
style="
background:#18b87a;
border-radius:10px;
"
>

<a
href="https://quizzler.app/dashboard"
style="
display:inline-block;
padding:15px 28px;
color:white;
text-decoration:none;
font-weight:700;
font-size:15px;
"
>
Start Studying →
</a>

</td>

</tr>

</table>

<!-- FEATURES -->

<div
style="
margin-top:40px;
margin-bottom:18px;
font-size:18px;
font-weight:700;
color:#161b26;
"
>
Here's what you can do:
</div>

<p style="margin:10px 0;color:#4b5563;">✅ Upload lecture notes and PDFs</p>

<p style="margin:10px 0;color:#4b5563;">🧠 Generate AI quizzes in seconds</p>

<p style="margin:10px 0;color:#4b5563;">⚡ Create smart flashcards instantly</p>

<p style="margin:10px 0;color:#4b5563;">📈 Track your study progress</p>

<p style="margin:10px 0 34px;color:#4b5563;">🎯 Practice only what you need to improve</p>

<!-- TIP -->

<table
width="100%"
cellpadding="0"
cellspacing="0"
border="0"
style="
background:#f8fafc;
border-radius:10px;
"
>

<tr>

<td style="padding:20px;">

<div
style="
font-weight:700;
color:#161b26;
margin-bottom:8px;
"
>
💡 Pro Tip
</div>

<div
style="
font-size:14px;
line-height:1.7;
color:#6b7280;
"
>
The best results come from uploading your own lecture notes instead of generic documents. Quizzler learns directly from what you're studying.
</div>

</td>

</tr>

</table>

<p
style="
margin-top:34px;
font-size:15px;
line-height:1.8;
color:#4b5563;
"
>
We're excited to help you learn faster and retain more. If you ever need help, simply reply to this email—we're always happy to help.
</p>

<p
style="
margin-top:22px;
font-weight:700;
font-size:15px;
color:#161b26;
"
>
Happy studying! 🚀<br>
— The Quizzler Team
</p>

</td>
</tr>

<!-- FOOTER -->

<tr>

<td
style="
padding:26px;
background:#f8fafc;
border-top:1px solid #eef0f3;
text-align:center;
"
>

<div
style="
font-size:18px;
font-weight:700;
color:#18b87a;
"
>
✨ Quizzler
</div>

<div
style="
margin-top:8px;
font-size:13px;
color:#9ca3af;
"
>
Study smarter. Learn faster.
</div>

<div
style="
margin-top:10px;
font-size:11px;
color:#9ca3af;
"
>
© ${new Date().getFullYear()} Quizzler. All rights reserved.
</div>

</td>

</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`,
    });
  } catch (error) {
    console.error("Welcome email error:", error);
  }
}
