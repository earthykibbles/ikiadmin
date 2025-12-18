import nodemailer from 'nodemailer';

export type SendCredentialsEmailInput = {
  to: string;
  name?: string | null;
  loginUrl: string;
  temporaryPassword: string;
  roles?: string[];
};

export type SendLoginAlertEmailInput = {
  to: string;
  userEmail: string;
  loginAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type SmtpEnv = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

function getSmtpEnv(): SmtpEnv | null {
  // Generic SMTP envs
  const host =
    process.env.SMTP_HOST ||
    process.env.MAILGUN_SMTP_SERVER ||
    process.env.MAILGUN_SMTP_HOST ||
    '';

  const portRaw = process.env.SMTP_PORT || process.env.MAILGUN_SMTP_PORT || '';
  const port = portRaw ? Number.parseInt(portRaw, 10) : 587;

  const user = process.env.SMTP_USER || process.env.MAILGUN_SMTP_LOGIN || '';
  const pass = process.env.SMTP_PASS || process.env.MAILGUN_SMTP_PASSWORD || '';

  const from =
    process.env.SMTP_FROM ||
    process.env.MAILGUN_FROM ||
    (process.env.MAILGUN_DOMAIN ? `Iki Admin <no-reply@${process.env.MAILGUN_DOMAIN}>` : '');

  const secureRaw = (process.env.SMTP_SECURE || '').toLowerCase();
  const secure = secureRaw === 'true' || port === 465;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from, secure };
}

export async function sendCredentialsEmail(input: SendCredentialsEmailInput) {
  const smtp = getSmtpEnv();
  if (!smtp) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or Mailgun SMTP envs).'
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = 'Your Iki Admin account credentials';
  const rolesLine = input.roles && input.roles.length > 0 ? input.roles.join(', ') : '—';

  const text = [
    `Hi${input.name ? ` ${input.name}` : ''},`,
    '',
    'An Iki Admin account has been created for you.',
    '',
    `Login: ${input.loginUrl}`,
    `Email: ${input.to}`,
    `Temporary password: ${input.temporaryPassword}`,
    `Roles: ${rolesLine}`,
    '',
    'Please sign in and change your password immediately.',
  ].join('\n');

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #0b1220;">
    <h2 style="margin: 0 0 12px;">Iki Admin account created</h2>
    <p style="margin: 0 0 12px;">Hi${input.name ? ` ${escapeHtml(input.name)}` : ''},</p>
    <p style="margin: 0 0 12px;">An Iki Admin account has been created for you.</p>

    <div style="padding: 12px 14px; border: 1px solid rgba(0,0,0,0.12); border-radius: 10px; background: #f7fafc;">
      <div><strong>Login:</strong> <a href="${escapeAttr(input.loginUrl)}">${escapeHtml(input.loginUrl)}</a></div>
      <div><strong>Email:</strong> ${escapeHtml(input.to)}</div>
      <div><strong>Temporary password:</strong> ${escapeHtml(input.temporaryPassword)}</div>
      <div><strong>Roles:</strong> ${escapeHtml(rolesLine)}</div>
    </div>

    <p style="margin: 12px 0 0;">Please sign in and change your password immediately.</p>
  </div>
  `;

  const info = await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId };
}

export async function sendLoginAlertEmail(input: SendLoginAlertEmailInput) {
  const smtp = getSmtpEnv();
  if (!smtp) {
    // If SMTP is not configured, silently skip login alerts rather than failing auth flows.
    console.warn('SMTP is not configured; login alert email was skipped.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = `Iki Admin login: ${input.userEmail}`;
  const loginTime = input.loginAt.toISOString();

  const lines = [
    `An Iki Admin user just signed in.`,
    '',
    `User: ${input.userEmail}`,
    `Time (UTC): ${loginTime}`,
    input.ipAddress ? `IP address: ${input.ipAddress}` : '',
    input.userAgent ? `User agent: ${input.userAgent}` : '',
    '',
    'If this was not you, please investigate immediately and rotate credentials.',
  ].filter(Boolean);

  const text = lines.join('\n');

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #0b1220;">
    <h2 style="margin: 0 0 12px;">Iki Admin login alert</h2>
    <p style="margin: 0 0 12px;">An Iki Admin user just signed in.</p>

    <div style="padding: 12px 14px; border: 1px solid rgba(0,0,0,0.12); border-radius: 10px; background: #f7fafc;">
      <div><strong>User:</strong> ${escapeHtml(input.userEmail)}</div>
      <div><strong>Time (UTC):</strong> ${escapeHtml(loginTime)}</div>
      ${
        input.ipAddress
          ? `<div><strong>IP address:</strong> ${escapeHtml(String(input.ipAddress))}</div>`
          : ''
      }
      ${
        input.userAgent
          ? `<div><strong>User agent:</strong> ${escapeHtml(String(input.userAgent))}</div>`
          : ''
      }
    </div>

    <p style="margin: 12px 0 0;">
      If this was not you, please investigate immediately and rotate credentials.
    </p>
  </div>
  `;

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text,
    html,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

