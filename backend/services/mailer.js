const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────────────────────────────────────
// createTransporter
// Builds a Nodemailer transporter from .env variables.
// Called fresh for each send so config changes take effect without restart.
// ─────────────────────────────────────────────────────────────────────────────
const createTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    throw new Error(
      'Email is not configured — set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env'
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465 (SSL)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Prevent long hangs if the SMTP server is unreachable
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// sendMail
// Low-level wrapper around transporter.sendMail.
// Skips sending in test environment so unit tests don't hit real SMTP.
// ─────────────────────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, text }) => {
  if (process.env.NODE_ENV === 'test') {
    console.log(`[TEST] Email suppressed → ${to}: ${subject}`);
    return;
  }

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `TalentHive <noreply@talenthive.com>`,
    to,
    subject,
    html,
    // Plain-text fallback for email clients that don't render HTML
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`📧  Email sent → ${to} | Message ID: ${info.messageId}`);
  }

  return info;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML layout
// Wraps every email in a consistent branded shell so they all look the same.
// ─────────────────────────────────────────────────────────────────────────────
const emailLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>TalentHive</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#12121A;border-radius:16px;border:1px solid #2A2A3E;overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6C63FF,#FFB547);padding:2px 0 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#12121A;padding:28px 36px;">
                    <span style="font-size:22px;font-weight:800;color:#E8E8F0;letter-spacing:-0.5px;">
                      Talent<span style="color:#6C63FF;">Hive</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #2A2A3E;">
              <p style="color:#6B6B8A;font-size:12px;margin:0;line-height:1.6;">
                You received this email because you have an account on TalentHive.<br/>
                <a href="${process.env.CLIENT_URL}/settings"
                   style="color:#6C63FF;text-decoration:none;">Manage email preferences</a>
                &nbsp;·&nbsp;
                <a href="${process.env.CLIENT_URL}"
                   style="color:#6C63FF;text-decoration:none;">Visit TalentHive</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// Shared button component
// ─────────────────────────────────────────────────────────────────────────────
const emailButton = (href, label) => `
  <a href="${href}"
     style="display:inline-block;margin-top:24px;padding:12px 28px;
            background:#6C63FF;color:#ffffff;text-decoration:none;
            border-radius:8px;font-size:15px;font-weight:600;">
    ${label}
  </a>
`;

// ─────────────────────────────────────────────────────────────────────────────
// sendWelcomeEmail
// Sent immediately after a new user registers.
// ─────────────────────────────────────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  const isEmployer = user.role === 'employer';

  const content = `
    <h1 style="color:#E8E8F0;font-size:24px;margin:0 0 12px;">
      Welcome to TalentHive, ${user.name.split(' ')[0]}! 👋
    </h1>
    <p style="color:#6B6B8A;font-size:15px;line-height:1.7;margin:0 0 8px;">
      Your account has been created successfully as a
      <strong style="color:#E8E8F0;">${user.role}</strong>.
    </p>
    <p style="color:#6B6B8A;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ${
        isEmployer
          ? 'Start posting jobs and finding your next great hire.'
          : 'Complete your profile and start finding your dream job with AI-powered matching.'
      }
    </p>

    <div style="background:#1A1A26;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="color:#6B6B8A;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.08em;">
        Next steps
      </p>
      ${
        isEmployer
          ? `
            <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">✅ Complete your company profile</p>
            <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">📝 Post your first job listing</p>
            <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">👥 Review AI-matched candidates</p>
          `
          : `
            <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">✅ Upload your resume</p>
            <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">🔗 Connect your LinkedIn profile</p>
            <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">🔍 Browse AI-matched jobs</p>
          `
      }
    </div>

    ${emailButton(
      isEmployer
        ? `${process.env.CLIENT_URL}/employer/jobs/new`
        : `${process.env.CLIENT_URL}/jobs`,
      isEmployer ? 'Post Your First Job →' : 'Browse Jobs →'
    )}
  `;

  await sendMail({
    to: user.email,
    subject: `Welcome to TalentHive, ${user.name.split(' ')[0]}! 🚀`,
    html: emailLayout(content),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// sendApplicationEmail
// Notifies the employer when a candidate applies for their job.
// ─────────────────────────────────────────────────────────────────────────────
const sendApplicationEmail = async (employer, candidate, job) => {
  const content = `
    <h1 style="color:#E8E8F0;font-size:22px;margin:0 0 12px;">
      New Application Received 📩
    </h1>
    <p style="color:#6B6B8A;font-size:15px;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#E8E8F0;">${candidate.name}</strong> has applied for
      <strong style="color:#6C63FF;">${job.title}</strong>.
    </p>

    <div style="background:#1A1A26;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="color:#6B6B8A;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">
        Candidate Summary
      </p>
      <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">
        👤 <strong>Name:</strong> ${candidate.name}
      </p>
      <p style="color:#E8E8F0;font-size:14px;margin:6px 0;">
        📧 <strong>Email:</strong> ${candidate.email}
      </p>
      ${
        candidate.headline
          ? `<p style="color:#E8E8F0;font-size:14px;margin:6px 0;">
               💼 <strong>Headline:</strong> ${candidate.headline}
             </p>`
          : ''
      }
      ${
        candidate.location
          ? `<p style="color:#E8E8F0;font-size:14px;margin:6px 0;">
               📍 <strong>Location:</strong> ${candidate.location}
             </p>`
          : ''
      }
      ${
        candidate.skills?.length
          ? `<p style="color:#E8E8F0;font-size:14px;margin:6px 0;">
               🛠 <strong>Skills:</strong> ${candidate.skills.slice(0, 6).join(', ')}
             </p>`
          : ''
      }
    </div>

    ${emailButton(
      `${process.env.CLIENT_URL}/employer/applications?job=${job._id}`,
      'View Application →'
    )}
  `;

  await sendMail({
    to: employer.email,
    subject: `New application for ${job.title} — ${candidate.name}`,
    html: emailLayout(content),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// sendStatusUpdateEmail
// Notifies the candidate when the employer moves their application forward.
// ─────────────────────────────────────────────────────────────────────────────
const sendStatusUpdateEmail = async (candidate, job, status) => {
  const statusConfig = {
    reviewing: {
      emoji: '👀',
      heading: 'Your application is being reviewed',
      body: `The team at <strong style="color:#E8E8F0;">${job.company?.name}</strong> is reviewing your application for <strong style="color:#6C63FF;">${job.title}</strong>. We'll keep you posted!`,
      color: '#FFB547',
    },
    shortlisted: {
      emoji: '⭐',
      heading: "You've been shortlisted!",
      body: `Great news! You've been shortlisted for <strong style="color:#6C63FF;">${job.title}</strong> at <strong style="color:#E8E8F0;">${job.company?.name}</strong>. The employer will be in touch soon.`,
      color: '#6C63FF',
    },
    interview: {
      emoji: '🎯',
      heading: "You're invited for an interview!",
      body: `Congratulations! <strong style="color:#E8E8F0;">${job.company?.name}</strong> would like to interview you for <strong style="color:#6C63FF;">${job.title}</strong>. Check your dashboard for details.`,
      color: '#2DD98F',
    },
    offered: {
      emoji: '🎊',
      heading: "You've received a job offer!",
      body: `Amazing news! <strong style="color:#E8E8F0;">${job.company?.name}</strong> has extended a job offer for <strong style="color:#6C63FF;">${job.title}</strong>. Login to your dashboard to review it.`,
      color: '#2DD98F',
    },
    rejected: {
      emoji: '📬',
      heading: 'Application update',
      body: `Thank you for your interest in <strong style="color:#6C63FF;">${job.title}</strong> at <strong style="color:#E8E8F0;">${job.company?.name}</strong>. After careful consideration, they have decided to move forward with other candidates.`,
      color: '#6B6B8A',
    },
  };

  const config = statusConfig[status];
  if (!config) return; // unknown status — skip

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">${config.emoji}</div>
      <h1 style="color:#E8E8F0;font-size:22px;margin:0;">${config.heading}</h1>
    </div>

    <div style="background:#1A1A26;border-left:4px solid ${config.color};
                border-radius:0 10px 10px 0;padding:20px;margin-bottom:24px;">
      <p style="color:#6B6B8A;font-size:15px;line-height:1.7;margin:0;">
        ${config.body}
      </p>
    </div>

    <div style="background:#1A1A26;border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="color:#6B6B8A;font-size:13px;margin:0 0 8px;">Application details</p>
      <p style="color:#E8E8F0;font-size:14px;margin:4px 0;">
        💼 <strong>Role:</strong> ${job.title}
      </p>
      <p style="color:#E8E8F0;font-size:14px;margin:4px 0;">
        🏢 <strong>Company:</strong> ${job.company?.name}
      </p>
      <p style="color:#E8E8F0;font-size:14px;margin:4px 0;">
        📊 <strong>Status:</strong>
        <span style="color:${config.color};">
          ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </p>
    </div>

    ${status !== 'rejected'
      ? emailButton(
          `${process.env.CLIENT_URL}/dashboard/applications`,
          'View in Dashboard →'
        )
      : `
        <p style="color:#6B6B8A;font-size:14px;line-height:1.6;">
          Don't get discouraged — there are plenty of great opportunities waiting for you.
        </p>
        ${emailButton(`${process.env.CLIENT_URL}/jobs`, 'Browse More Jobs →')}
      `
    }
  `;

  await sendMail({
    to: candidate.email,
    subject: `${config.emoji} ${config.heading} — ${job.title}`,
    html: emailLayout(content),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// sendPasswordResetEmail
// Sends a time-limited reset link (30 min) to the user's email.
// ─────────────────────────────────────────────────────────────────────────────
const sendPasswordResetEmail = async (user, resetURL) => {
  const content = `
    <h1 style="color:#E8E8F0;font-size:22px;margin:0 0 12px;">
      Reset Your Password 🔐
    </h1>
    <p style="color:#6B6B8A;font-size:15px;line-height:1.7;margin:0 0 24px;">
      We received a request to reset the password for your TalentHive account
      (<strong style="color:#E8E8F0;">${user.email}</strong>).
      Click the button below to choose a new password.
    </p>

    ${emailButton(resetURL, 'Reset Password →')}

    <div style="background:#1A1A26;border-radius:10px;padding:16px;margin-top:28px;">
      <p style="color:#6B6B8A;font-size:13px;margin:0;line-height:1.6;">
        ⏱ This link expires in <strong style="color:#E8E8F0;">30 minutes</strong>.<br/>
        If you didn't request a password reset, you can safely ignore this email —
        your password will not change.
      </p>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: 'Reset your TalentHive password',
    html: emailLayout(content),
  });
};

module.exports = {
  sendWelcomeEmail,
  sendApplicationEmail,
  sendStatusUpdateEmail,
  sendPasswordResetEmail,
};