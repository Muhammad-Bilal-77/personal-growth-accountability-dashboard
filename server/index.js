import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import multer from "multer";
import { Readable } from "stream";
import cron from "node-cron";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT = 3001,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_NAME = "muneeb_to_do_list",
  GOOGLE_DRIVE_SHARE_PUBLIC,
  DEFAULT_LAT,
  DEFAULT_LNG,
  DEFAULT_TIMEZONE,
  NOTIFY_EMAIL,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USE_TLS,
  EMAIL_HOST_USER,
  EMAIL_HOST_PASSWORD,
  AUTH_JWT_SECRET,
} = process.env;

if (!SUPABASE_URL) {
  console.warn("SUPABASE_URL is not set. Add it to your .env file.");
}

if (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is not set. Add one to your .env file."
  );
}

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const supabase = supabaseKey && SUPABASE_URL
  ? createClient(SUPABASE_URL, supabaseKey)
  : null;

const getDateString = (value) => {
  if (!value) return new Date().toISOString().split("T")[0];
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
};

const getPrayerDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return getDateString();
  return getDateString(date);
};

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ error: "Supabase not configured" });
    return false;
  }
  return true;
};

const recordActivity = async (activityDate, increment = 1) => {
  if (!supabase) return;
  const dateStr = getDateString(activityDate);

  const { data: existing, error: findError } = await supabase
    .from("activity_log")
    .select("id,count")
    .eq("activity_date", dateStr)
    .maybeSingle();

  if (findError) {
    console.warn("Activity lookup failed", findError.message);
    return;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("activity_log")
      .update({ count: (existing.count || 0) + increment })
      .eq("id", existing.id);
    if (updateError) {
      console.warn("Activity update failed", updateError.message);
    }
    return;
  }

  const { error: insertError } = await supabase
    .from("activity_log")
    .insert({ activity_date: dateStr, count: increment });
  if (insertError) {
    console.warn("Activity insert failed", insertError.message);
  }
};

const mailer = EMAIL_HOST && EMAIL_HOST_USER && EMAIL_HOST_PASSWORD
  ? nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT || 587),
      secure: false,
      auth: {
        user: EMAIL_HOST_USER,
        pass: EMAIL_HOST_PASSWORD,
      },
    })
  : null;

const sendMail = async ({ subject, text, html }) => {
  if (!mailer || !NOTIFY_EMAIL) return;
  await mailer.sendMail({
    from: EMAIL_HOST_USER,
    to: NOTIFY_EMAIL,
    subject,
    text,
    html: html || text,
  });
};

const createPrayerTimingsEmailHTML = (timings, dateStr) => {
  const prayers = [
    { name: 'Fajr', time: timings.Fajr, icon: '🌅', color: '#667eea' },
    { name: 'Dhuhr', time: timings.Dhuhr, icon: '☀️', color: '#f6ad55' },
    { name: 'Asr', time: timings.Asr, icon: '🌤️', color: '#ed8936' },
    { name: 'Maghrib', time: timings.Maghrib, icon: '🌆', color: '#9f7aea' },
    { name: 'Isha', time: timings.Isha, icon: '🌙', color: '#4c51bf' },
  ];

  const prayerRows = prayers.map(p => `
    <tr>
      <td style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="60">
              <div style="width: 50px; height: 50px; border-radius: 12px; background: ${p.color}; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                ${p.icon}
              </div>
            </td>
            <td style="padding-left: 15px;">
              <h3 style="margin: 0; color: #2d3748; font-size: 20px; font-weight: 600;">${p.name}</h3>
              <p style="margin: 5px 0 0 0; color: #718096; font-size: 14px;">Prayer Time</p>
            </td>
            <td style="text-align: right;">
              <div style="background: #f7fafc; padding: 12px 20px; border-radius: 8px; display: inline-block;">
                <span style="color: ${p.color}; font-size: 24px; font-weight: 700;">${p.time || '--:--'}</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prayer Timings</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">🕌 Prayer Timings</h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </td>
              </tr>
              
              <!-- Prayer Times -->
              ${prayerRows}
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; text-align: center; background: #f7fafc; border-top: 3px solid #667eea;">
                  <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                    📿 <strong>Remember:</strong> The first matter that the slave will be brought to account for on the Day of Judgment is the prayer.
                  </p>
                  <p style="margin: 15px 0 0 0; color: #718096; font-size: 12px;">
                    May Allah accept your prayers • Daily Sanctuary
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
};

const createPrayerReminderHTML = (prayerName, timeStr, message, hadith) => {
  const icons = {
    Fajr: '🌅',
    Dhuhr: '☀️',
    Asr: '🌤️',
    Maghrib: '🌆',
    Isha: '🌙'
  };
  
  const colors = {
    Fajr: '#667eea',
    Dhuhr: '#f6ad55',
    Asr: '#ed8936',
    Maghrib: '#9f7aea',
    Isha: '#4c51bf'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background: ${colors[prayerName] || '#667eea'};">
                  <div style="font-size: 64px; margin-bottom: 10px;">${icons[prayerName] || '🕌'}</div>
                  <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">${prayerName} Prayer</h1>
                  ${timeStr ? `<p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500;">${timeStr}</p>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0; color: #2d3748; font-size: 18px; line-height: 1.6; text-align: center;">
                    ${message}
                  </p>
                </td>
              </tr>
              ${hadith ? `
              <tr>
                <td style="padding: 0 30px 40px 30px;">
                  <div style="background: #f7fafc; border-left: 4px solid ${colors[prayerName] || '#667eea'}; padding: 20px; border-radius: 8px;">
                    <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.7; font-style: italic;">
                      📖 "${hadith}"
                    </p>
                  </div>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 0 30px 30px 30px; text-align: center;">
                  <p style="margin: 0; color: #718096; font-size: 14px;">
                    May Allah accept your prayers 🤲
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
};

const verifyPassword = async (input, stored) => {
  if (!stored) return false;
  return bcrypt.compare(input, stored);
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, AUTH_JWT_SECRET || "");
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const hadiths = [
  "The first matter that the slave will be brought to account for on the Day of Judgment is the prayer.",
  "Guard strictly your prayers, especially the middle prayer.",
  "Between a man and disbelief is abandoning the prayer.",
];

const getUserLocation = async () => {
  if (!supabase) return null;
  const { data } = await supabase.from("user_settings").select("*").eq("id", 1).maybeSingle();
  if (data?.lat && data?.lng) return data;
  if (DEFAULT_LAT && DEFAULT_LNG) {
    return { lat: Number(DEFAULT_LAT), lng: Number(DEFAULT_LNG), timezone: DEFAULT_TIMEZONE || undefined };
  }
  return null;
};

const getPrayerTimings = async ({ lat, lng, date, timezone }) => {
  const url = new URL("https://api.aladhan.com/v1/timings");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("method", "2");
  if (date) url.searchParams.set("date", date);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to fetch prayer timings");
  }
  const payload = await response.json();
  const timings = payload?.data?.timings || {};
  const tz = timezone || payload?.data?.meta?.timezone;
  return { timings, timezone: tz };
};

const parseTime = (dateStr, timeStr, tz) => {
  const cleanTime = (timeStr || "").split(" ")[0].trim();
  const [hourStr, minuteStr] = cleanTime.split(":");
  const [yearStr, monthStr, dayStr] = (dateStr || "").split("-");

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (
    Number.isNaN(year)
    || Number.isNaN(month)
    || Number.isNaN(day)
    || Number.isNaN(hour)
    || Number.isNaN(minute)
  ) {
    return new Date("invalid");
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);

  const getPart = (type) => Number(parts.find((part) => part.type === type)?.value);
  const tzYear = getPart("year");
  const tzMonth = getPart("month");
  const tzDay = getPart("day");
  const tzHour = getPart("hour");
  const tzMinute = getPart("minute");
  const tzSecond = getPart("second");

  const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMs = tzAsUtc - desiredAsUtc;
  return new Date(utcGuess.getTime() - offsetMs);
};

const shouldSendNotification = async (type, dateStr, referenceId = "") => {
  if (!supabase) return false;
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("notification_type", type)
    .eq("reference_date", dateStr)
    .eq("reference_id", referenceId)
    .maybeSingle();

  return !data?.id;
};

const markNotificationSent = async (type, dateStr, referenceId = "") => {
  if (!supabase) return;
  await supabase.from("notification_log").insert({
    notification_type: type,
    reference_date: dateStr,
    reference_id: referenceId,
  });
};

const getOAuthClient = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return null;
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
};

const getDriveTokens = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("drive_tokens")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.warn("Drive token read failed", error.message);
    return null;
  }
  return data || null;
};

const saveDriveTokens = async (tokens) => {
  if (!supabase) return null;
  const payload = {
    id: 1,
    access_token: tokens.access_token ?? null,
    refresh_token: tokens.refresh_token ?? null,
    scope: tokens.scope ?? null,
    token_type: tokens.token_type ?? null,
    expiry_date: tokens.expiry_date ?? null,
    folder_id: tokens.folder_id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("drive_tokens")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    console.warn("Drive token save failed", error.message);
    return null;
  }
  return data;
};

const getDriveClient = async () => {
  const oauthClient = getOAuthClient();
  if (!oauthClient) return null;
  const tokens = await getDriveTokens();
  if (!tokens?.access_token && !tokens?.refresh_token) return null;

  oauthClient.setCredentials({
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token ?? undefined,
    scope: tokens.scope ?? undefined,
    token_type: tokens.token_type ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  });

  oauthClient.on("tokens", async (newTokens) => {
    if (newTokens.access_token || newTokens.refresh_token) {
      await saveDriveTokens({
        access_token: newTokens.access_token || tokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
        scope: newTokens.scope || tokens.scope,
        token_type: newTokens.token_type || tokens.token_type,
        expiry_date: newTokens.expiry_date || tokens.expiry_date,
      });
    }
  });

  return google.drive({ version: "v3", auth: oauthClient });
};

const getDriveFolderId = async (drive) => {
  if (!drive) return null;
  if (GOOGLE_DRIVE_FOLDER_ID) return GOOGLE_DRIVE_FOLDER_ID;

  const tokens = await getDriveTokens();
  if (tokens?.folder_id) return tokens.folder_id;

  const listResponse = await drive.files.list({
    q: `name='${GOOGLE_DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });

  const existing = listResponse.data.files?.[0];
  if (existing?.id) {
    await saveDriveTokens({
      access_token: tokens?.access_token,
      refresh_token: tokens?.refresh_token,
      scope: tokens?.scope,
      token_type: tokens?.token_type,
      expiry_date: tokens?.expiry_date,
      folder_id: existing.id,
    });
    return existing.id;
  }

  const folderResponse = await drive.files.create({
    requestBody: {
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const folderId = folderResponse.data.id;
  if (folderId) {
    await saveDriveTokens({
      access_token: tokens?.access_token,
      refresh_token: tokens?.refresh_token,
      scope: tokens?.scope,
      token_type: tokens?.token_type,
      expiry_date: tokens?.expiry_date,
      folder_id: folderId,
    });
  }
  return folderId || null;
};

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    supabaseConfigured: Boolean(SUPABASE_URL && supabaseKey),
    driveConfigured: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI),
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  if (!ensureSupabase(res)) return;
  const { data: user, error } = await supabase
    .from("auth_users")
    .select("username,password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  if (!AUTH_JWT_SECRET) return res.status(500).json({ error: "Auth not configured" });

  const token = jwt.sign({ username }, AUTH_JWT_SECRET, { expiresIn: "24h" });
  return res.json({ token, username });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

app.get("/api/drive/status", async (_req, res) => {
  if (!ensureSupabase(res)) return;
  const tokens = await getDriveTokens();
  res.json({ connected: Boolean(tokens?.refresh_token || tokens?.access_token) });
});

app.get("/api/drive/auth", async (_req, res) => {
  const oauthClient = getOAuthClient();
  if (!oauthClient) {
    return res.status(500).json({ error: "Google Drive OAuth not configured" });
  }

  const authUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  return res.json({ url: authUrl });
});

app.get("/auth/google/callback", async (req, res) => {
  const oauthClient = getOAuthClient();
  if (!oauthClient) {
    return res.status(500).send("Google Drive OAuth not configured");
  }

  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing code");
  }

  const { tokens } = await oauthClient.getToken(code);
  await saveDriveTokens(tokens);
  return res.send("Google Drive connected. You can close this window.");
});

app.use("/api", (req, res, next) => {
  const publicPaths = [
    "/health",
    "/auth/login",
    "/auth/me",
    "/parse-file",
  ];
  // Allow all /chat/* paths
  if (publicPaths.includes(req.path) || req.path.startsWith("/chat")) return next();
  return requireAuth(req, res, next);
});

app.get("/api/settings/location", async (_req, res) => {
  if (!ensureSupabase(res)) return;
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.post("/api/settings/location", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { lat, lng, timezone } = req.body ?? {};
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ id: 1, lat, lng, timezone, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.get("/api/prayers/timings", async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const date = req.query.date ? String(req.query.date) : undefined;
    const timezone = req.query.timezone ? String(req.query.timezone) : undefined;

    let location = null;
    if (lat !== undefined && lng !== undefined) {
      location = { lat, lng, timezone };
    } else {
      location = await getUserLocation();
    }

    if (!location) {
      return res.status(400).json({ error: "Location not configured" });
    }

    const result = await getPrayerTimings({
      lat: location.lat,
      lng: location.lng,
      date,
      timezone: location.timezone,
    });

    return res.json({ data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch timings" });
  }
});

app.post("/api/prayers/timings/email", async (req, res) => {
  if (!ensureSupabase(res)) return;
  try {
    const location = await getUserLocation();
    if (!location) {
      return res.status(400).json({ error: "Location not configured" });
    }

    const todayStr = getDateString();
    const { timings } = await getPrayerTimings({
      lat: location.lat,
      lng: location.lng,
      date: todayStr,
      timezone: location.timezone,
    });

    const textLines = [
      `Prayer timings for ${todayStr}:`,
      `Fajr: ${timings.Fajr || "--"}`,
      `Dhuhr: ${timings.Dhuhr || "--"}`,
      `Asr: ${timings.Asr || "--"}`,
      `Maghrib: ${timings.Maghrib || "--"}`,
      `Isha: ${timings.Isha || "--"}`,
    ].join("\n");

    const htmlContent = createPrayerTimingsEmailHTML(timings, todayStr);

    await sendMail({
      subject: "🕌 Today's Prayer Timings",
      text: textLines,
      html: htmlContent,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  if (!ensureSupabase(res)) return;

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data });
});

app.post("/api/auth/signin", async (req, res) => {
  if (!ensureSupabase(res)) return;

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data });
});

app.get("/api/user", async (req, res) => {
  if (!ensureSupabase(res)) return;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    return res.status(401).json({ error: error.message });
  }

  return res.json({ data });
});

app.get("/api/table/:table", async (req, res) => {
  if (!ensureSupabase(res)) return;

  const { table } = req.params;
  const { limit = 50 } = req.query;

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(Number(limit));

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data });
});

app.get("/api/tasks", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const dateStr = getDateString(req.query.date);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("task_date", dateStr)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data });
});

app.post("/api/tasks", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { text, task_date, due_at } = req.body ?? {};
  if (!text) {
    return res.status(400).json({ error: "Task text is required" });
  }

  const dateStr = getDateString(task_date);
  const { data, error } = await supabase
    .from("tasks")
    .insert({ text, task_date: dateStr, due_at: due_at || null })
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await recordActivity(dateStr, 1);
  return res.json({ data });
});

app.patch("/api/tasks/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  const { text, completed } = req.body ?? {};

  const updates = {};
  if (text !== undefined) updates.text = text;
  if (completed !== undefined) updates.completed = completed;

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (completed === true && data?.task_date) {
    await recordActivity(data.task_date, 1);
  }

  return res.json({ data });
});

app.delete("/api/tasks/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true });
});

app.get("/api/prayers", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const dateStr = req.query.date ? getDateString(req.query.date) : getPrayerDate();

  const [{ data: prayers, error: prayerError }, { data: logs, error: logError }] = await Promise.all([
    supabase.from("prayers").select("*").order("sort_order", { ascending: true }),
    supabase.from("prayer_logs").select("*").eq("log_date", dateStr),
  ]);

  if (prayerError) {
    return res.status(400).json({ error: prayerError.message });
  }
  if (logError) {
    return res.status(400).json({ error: logError.message });
  }

  const logByPrayer = new Map((logs || []).map((log) => [log.prayer_id, log]));
  const data = (prayers || []).map((prayer) => ({
    id: prayer.id,
    name: prayer.name,
    time: prayer.time_label,
    completed: Boolean(logByPrayer.get(prayer.id)?.completed),
  }));

  return res.json({ data });
});

app.get("/api/prayers/today", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const dateStr = getPrayerDate();

  const [{ data: prayers, error: prayerError }, { data: logs, error: logError }] = await Promise.all([
    supabase.from("prayers").select("*").order("sort_order", { ascending: true }),
    supabase.from("prayer_logs").select("*").eq("log_date", dateStr),
  ]);

  if (prayerError) {
    return res.status(400).json({ error: prayerError.message });
  }
  if (logError) {
    return res.status(400).json({ error: logError.message });
  }

  const logByPrayer = new Map((logs || []).map((log) => [log.prayer_id, log]));
  const data = (prayers || []).map((prayer) => ({
    id: prayer.id,
    name: prayer.name,
    time: prayer.time_label,
    completed: Boolean(logByPrayer.get(prayer.id)?.completed),
  }));

  return res.json({ data, date: dateStr, rolloverHour: 12 });
});

app.get("/api/prayers/history", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const days = Number(req.query.days ?? 7);
  const totalDays = Number.isNaN(days) ? 7 : days;
  const end = new Date();
  const endStr = getDateString(end);
  const start = new Date();
  start.setDate(start.getDate() - (totalDays - 1));
  const startStr = getDateString(start);

  const [{ data: prayers, error: prayerError }, { data: logs, error: logError }] = await Promise.all([
    supabase.from("prayers").select("*").order("sort_order", { ascending: true }),
    supabase.from("prayer_logs").select("*").gte("log_date", startStr).lte("log_date", endStr),
  ]);

  if (prayerError) {
    return res.status(400).json({ error: prayerError.message });
  }
  if (logError) {
    return res.status(400).json({ error: logError.message });
  }

  const prayersList = prayers || [];
  const logsByDate = new Map();
  (logs || []).forEach((log) => {
    const list = logsByDate.get(log.log_date) || [];
    list.push(log);
    logsByDate.set(log.log_date, list);
  });

  const history = [];
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = getDateString(date);
    const dayLogs = logsByDate.get(dateStr) || [];
    const logByPrayer = new Map(dayLogs.map((log) => [log.prayer_id, log]));
    const dayPrayers = prayersList.map((prayer) => ({
      id: prayer.id,
      name: prayer.name,
      time: prayer.time_label,
      completed: Boolean(logByPrayer.get(prayer.id)?.completed),
    }));
    history.push({ date: dateStr, prayers: dayPrayers });
  }

  return res.json({ data: history });
});

app.post("/api/prayers/:id/complete", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  const { completed, date } = req.body ?? {};
  const dateStr = date ? getDateString(date) : getPrayerDate();

  const { data, error } = await supabase
    .from("prayer_logs")
    .upsert(
      { prayer_id: id, log_date: dateStr, completed: Boolean(completed) },
      { onConflict: "prayer_id,log_date" }
    )
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (completed === true) {
    await recordActivity(dateStr, 1);
  }

  return res.json({ data });
});

app.get("/api/events", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const from = req.query.from ? getDateString(req.query.from) : null;
  const to = req.query.to ? getDateString(req.query.to) : null;

  let query = supabase.from("events").select("*").order("event_date", { ascending: true });
  if (from) query = query.gte("event_date", from);
  if (to) query = query.lte("event_date", to);

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const normalized = (data || []).map((event) => ({
    id: event.id,
    title: event.title,
    date: event.event_date,
    category: event.category,
    notes: event.notes ?? "",
  }));

  return res.json({ data: normalized });
});

app.post("/api/events", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { title, date, category, notes } = req.body ?? {};
  if (!title || !date || !category) {
    return res.status(400).json({ error: "Title, date, and category are required" });
  }

  const dateStr = getDateString(date);
  const { data, error } = await supabase
    .from("events")
    .insert({ title, event_date: dateStr, category, notes })
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await recordActivity(dateStr, 1);
  return res.json({
    data: {
      id: data.id,
      title: data.title,
      date: data.event_date,
      category: data.category,
      notes: data.notes ?? "",
    },
  });
});

app.patch("/api/events/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  const { title, date, category, notes } = req.body ?? {};

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (date !== undefined) updates.event_date = getDateString(date);
  if (category !== undefined) updates.category = category;
  if (notes !== undefined) updates.notes = notes;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({
    data: {
      id: data.id,
      title: data.title,
      date: data.event_date,
      category: data.category,
      notes: data.notes ?? "",
    },
  });
});

app.delete("/api/events/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true });
});

app.get("/api/subjects", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const [subjectsRes, chaptersRes, lessonsRes] = await Promise.all([
    supabase.from("subjects").select("*").order("sort_order", { ascending: true }),
    supabase.from("chapters").select("*").order("sort_order", { ascending: true }),
    supabase.from("lessons").select("id,chapter_id,title").order("date_added", { ascending: true }),
  ]);

  if (subjectsRes.error) {
    return res.status(400).json({ error: subjectsRes.error.message });
  }
  if (chaptersRes.error) {
    return res.status(400).json({ error: chaptersRes.error.message });
  }
  if (lessonsRes.error) {
    return res.status(400).json({ error: lessonsRes.error.message });
  }

  const lessonsByChapter = new Map();
  (lessonsRes.data || []).forEach((lesson) => {
    const list = lessonsByChapter.get(lesson.chapter_id) || [];
    list.push({ id: lesson.id, name: lesson.title });
    lessonsByChapter.set(lesson.chapter_id, list);
  });

  const chaptersBySubject = new Map();
  (chaptersRes.data || []).forEach((chapter) => {
    const list = chaptersBySubject.get(chapter.subject_id) || [];
    list.push({
      id: chapter.id,
      name: chapter.name,
      lessons: lessonsByChapter.get(chapter.id) || [],
    });
    chaptersBySubject.set(chapter.subject_id, list);
  });

  const data = (subjectsRes.data || []).map((subject) => ({
    id: subject.id,
    name: subject.name,
    chapters: chaptersBySubject.get(subject.id) || [],
  }));

  return res.json({ data });
});

app.post("/api/subjects", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "Name is required" });

  const { data, error } = await supabase
    .from("subjects")
    .insert({ name })
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.delete("/api/subjects/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
});

app.post("/api/chapters", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { subject_id, name } = req.body ?? {};
  if (!subject_id || !name) {
    return res.status(400).json({ error: "Subject and name are required" });
  }

  const { data, error } = await supabase
    .from("chapters")
    .insert({ subject_id, name })
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.delete("/api/chapters/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
});

app.get("/api/lessons", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { search } = req.query;

  let query = supabase
    .from("lessons")
    .select("id,title,date_added")
    .order("date_added", { ascending: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const normalized = (data || []).map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    dateAdded: lesson.date_added
      ? new Date(lesson.date_added).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "",
  }));

  return res.json({ data: normalized });
});

app.post("/api/lessons", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { chapter_id, title, content } = req.body ?? {};
  if (!chapter_id || !title) {
    return res.status(400).json({ error: "Chapter and title are required" });
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({ chapter_id, title, content })
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.get("/api/lessons/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;

  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,content,date_added,file_url,file_name,drive_file_id")
    .eq("id", id)
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { data: files, error: fileError } = await supabase
    .from("lesson_files")
    .select("id,file_url,file_name,drive_file_id")
    .eq("lesson_id", id)
    .order("created_at", { ascending: true });

  if (fileError) {
    return res.status(400).json({ error: fileError.message });
  }

  return res.json({
    data: {
      id: data.id,
      title: data.title,
      content: data.content,
      dateAdded: data.date_added,
      fileUrl: data.file_url,
      fileName: data.file_name,
      driveFileId: data.drive_file_id,
      files: files || [],
    },
  });
});

app.patch("/api/lessons/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  const { title, content, file_url, file_name } = req.body ?? {};

  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (file_url !== undefined) updates.file_url = file_url;
  if (file_name !== undefined) updates.file_name = file_name;

  const { data, error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.post("/api/lessons/:id/remove-file", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;

  const { data: existing, error: fetchError } = await supabase
    .from("lessons")
    .select("drive_file_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return res.status(400).json({ error: fetchError.message });

  if (existing?.drive_file_id) {
    const drive = await getDriveClient();
    if (drive) {
      await drive.files.delete({ fileId: existing.drive_file_id });
    }
  }

  const { data, error } = await supabase
    .from("lessons")
    .update({ file_url: null, file_name: null, drive_file_id: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

app.delete("/api/lessons/:id", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;

  const { data: files, error: filesError } = await supabase
    .from("lesson_files")
    .select("drive_file_id")
    .eq("lesson_id", id);

  if (filesError) return res.status(400).json({ error: filesError.message });

  const drive = await getDriveClient();
  if (drive) {
    for (const file of files || []) {
      if (file.drive_file_id) {
        await drive.files.delete({ fileId: file.drive_file_id });
      }
    }
  }

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
});

app.delete("/api/lessons/:id/files/:fileId", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id, fileId } = req.params;

  const { data: fileRow, error: fileError } = await supabase
    .from("lesson_files")
    .select("drive_file_id")
    .eq("id", fileId)
    .eq("lesson_id", id)
    .maybeSingle();

  if (fileError) return res.status(400).json({ error: fileError.message });

  if (fileRow?.drive_file_id) {
    const drive = await getDriveClient();
    if (drive) {
      await drive.files.delete({ fileId: fileRow.drive_file_id });
    }
  }

  const { error } = await supabase
    .from("lesson_files")
    .delete()
    .eq("id", fileId)
    .eq("lesson_id", id);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
});

app.post("/api/lessons/:id/upload", upload.array("files"), async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: "File is required" });
  }

  try {
    const drive = await getDriveClient();
    if (!drive) {
      return res.status(400).json({ error: "Google Drive not connected" });
    }

    const folderId = await getDriveFolderId(drive);
    const createdFiles = [];

    for (const file of req.files) {
      const stream = Readable.from(file.buffer);
      const requestBody = {
        name: file.originalname,
        parents: folderId ? [folderId] : undefined,
      };

      const media = {
        mimeType: file.mimetype,
        body: stream,
      };

      const createResponse = await drive.files.create({
        requestBody,
        media,
        fields: "id,webViewLink,webContentLink",
      });

      const fileId = createResponse.data.id;
      let fileUrl = createResponse.data.webViewLink || createResponse.data.webContentLink;

      if (GOOGLE_DRIVE_SHARE_PUBLIC === "true" && fileId) {
        await drive.permissions.create({
          fileId,
          requestBody: { role: "reader", type: "anyone" },
        });
        const fileMeta = await drive.files.get({ fileId, fields: "webViewLink,webContentLink" });
        fileUrl = fileMeta.data.webViewLink || fileMeta.data.webContentLink;
      }

      createdFiles.push({
        lesson_id: id,
        file_url: fileUrl,
        file_name: file.originalname,
        drive_file_id: fileId,
      });
    }

    const { data, error } = await supabase
      .from("lesson_files")
      .insert(createdFiles)
      .select("*");

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (error) {
    console.error("Drive upload failed", error);
    const message = error?.response?.data?.error?.message || error?.message || "Drive upload failed";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/lessons/:id/view", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { id } = req.params;

  const { error } = await supabase
    .from("lesson_views")
    .insert({ lesson_id: id });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await recordActivity(getDateString(), 1);
  return res.json({ success: true });
});

// File upload for chatbot - parse document content
const chatFileUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit (increased from 10MB)
});

app.post("/api/parse-file", (req, res, next) => {
  console.log('File upload request received');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  chatFileUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: "File too large", 
          details: "Maximum file size is 50MB" 
        });
      }
      return res.status(400).json({ 
        error: "File upload failed", 
        details: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { buffer, mimetype, originalname } = req.file;
    console.log(`Processing file: ${originalname}, Type: ${mimetype}, Size: ${buffer.length} bytes`);
    let text = "";
    let extractionMethod = "";

    try {
      // Parse PDF files
      if (mimetype === 'application/pdf') {
        console.log('Parsing PDF with pdf-parse');
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse();
        const data = await parser.parse(buffer);
        text = data.text;
        extractionMethod = 'pdf-parse';
        console.log(`PDF parsed: ${text.length} characters, ${data.numpages} pages`);
      }
      // Parse Word documents (DOCX)
      else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               mimetype === 'application/msword') {
        console.log('Parsing Word document with mammoth');
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        extractionMethod = 'mammoth';
        console.log(`Word document parsed: ${text.length} characters`);
      }
      // Parse PowerPoint (PPTX) - extract text from XML structure
      else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
               mimetype === 'application/vnd.ms-powerpoint') {
        console.log('Parsing PowerPoint - extracting text from slide XML');
        try {
          const AdmZip = (await import('adm-zip')).default;
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          
          let slideTexts = [];
          zipEntries.forEach(entry => {
            if (entry.entryName.match(/ppt\/slides\/slide\d+\.xml/)) {
              const content = entry.getData().toString('utf8');
              // Extract text between <a:t> tags
              const textMatches = content.match(/<a:t>([^<]+)<\/a:t>/g);
              if (textMatches) {
                const slideText = textMatches.map(match => 
                  match.replace(/<\/?a:t>/g, '')
                ).join(' ');
                slideTexts.push(slideText);
              }
            }
          });
          
          
          if (slideTexts.length > 0) {
            text = slideTexts.join('\n\n--- Next Slide ---\n\n');
            extractionMethod = 'adm-zip-xml';
            console.log(`PPTX parsed: ${text.length} characters from ${slideTexts.length} slides`);
          } else {
            text = "PowerPoint file uploaded but no text content could be extracted. The slides may contain only images or complex formatting.";
            extractionMethod = 'pptx-fallback';
          }
        } catch (pptxError) {
          console.error('PPTX parsing error:', pptxError);
          text = "PowerPoint file uploaded. Content extraction encountered an error. Please try converting to PDF format for better results.";
          extractionMethod = 'pptx-error';
        }
      }
      // Parse plain text files
      else if (mimetype === 'text/plain') {
        text = buffer.toString('utf-8');
        extractionMethod = 'utf-8';
        console.log(`Text file parsed: ${text.length} characters`);
      }
      // Unsupported format
      else {
        console.log('Unsupported mimetype:', mimetype);
        return res.status(400).json({ 
          error: "Unsupported file format. Please use PDF, DOCX, PPTX, or TXT files.",
          receivedType: mimetype
        });
      }

      if (!text || text.trim().length === 0) {
        console.log('No text extracted from file');
        return res.status(400).json({ 
          error: "Could not extract text from the file. The file might be empty, corrupted, or contain only images." 
        });
      }

      console.log(`Successfully extracted ${text.trim().length} characters via ${extractionMethod}`);
      return res.json({ 
        success: true, 
        text: text.trim(),
        fileName: originalname,
        extractedBy: extractionMethod
      });

    } catch (parseError) {
      console.error("File parsing error:", parseError);
      return res.status(500).json({ 
        error: "Failed to parse file content. Please ensure the file is not corrupted.",
        details: parseError.message
      });
    }

  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({ 
      error: "Failed to process file upload",
      details: error.message
    });
  }
});

// Simple in-memory cache for AI responses
const chatCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// AI Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { 
      message, 
      context, 
      conversationHistory,
      uploadedFileText,
      uploadedFileName,
      contentScope = 'all',
      selectedSubjectId,
      selectedChapterId
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    // Create cache key based on message, context, and file content
    const cacheKey = JSON.stringify({ 
      message, 
      context, 
      uploadedFileText, 
      contentScope,
      selectedSubjectId,
      selectedChapterId
    });
    const cached = chatCache.get(cacheKey);
    
    // Return cached response if available and not expired
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return res.json({ 
        message: cached.response,
        success: true,
        cached: true,
        model: cached.model || 'unknown',
        apiKey: cached.apiKey || 'unknown'
      });
    }

    // Check if Gemini API key is configured
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_KEY_FALLBACK = process.env.GEMINI_API_KEY_FALLBACK;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    
    if (!GEMINI_API_KEY && !GEMINI_API_KEY_FALLBACK && !GROQ_API_KEY) {
      return res.status(503).json({ 
        error: "AI service not configured. Please add GEMINI_API_KEY to your environment variables." 
      });
    }

    // Handle uploaded file content
    let uploadedFileContext = "";
    if (uploadedFileText && contentScope === 'file') {
      uploadedFileContext = `\n\n=== UPLOADED FILE CONTENT ===\n`;
      uploadedFileContext += `File: ${uploadedFileName || 'Unknown'}\n\n`;
      uploadedFileContext += uploadedFileText;
      uploadedFileContext += `\n\n=== END OF FILE ===\n`;
    }

    // Fetch academic repository data based on content scope
    let repositoryContext = "";
    if (supabase && contentScope !== 'file') {
      try {
        // Build query based on content scope
        let query = supabase
          .from("subjects")
          .select(`
            id,
            name,
            chapters:chapters(
              id,
              name,
              lessons:lessons(
                id,
                title,
                content
              )
            )
          `)
          .order('name');

        // Filter by specific subject if contentScope is 'subject' or 'chapter'
        if ((contentScope === 'subject' || contentScope === 'chapter') && selectedSubjectId) {
          query = query.eq('id', selectedSubjectId);
        }

        const { data: subjects, error: subjectsError } = await query;

        if (!subjectsError && subjects && subjects.length > 0) {
          // If contentScope is 'current', only use context from props
          if (contentScope === 'current') {
            repositoryContext = "\n\n=== CURRENT LESSON CONTEXT ===\n\n";
            if (context?.lessonTitle) {
              repositoryContext += `Lesson: ${context.lessonTitle}\n`;
            }
            if (context?.subjectName) {
              repositoryContext += `Subject: ${context.subjectName}\n`;
            }
            if (context?.chapterName) {
              repositoryContext += `Chapter: ${context.chapterName}\n`;
            }
            if (context?.lessonContent) {
              repositoryContext += `\nContent:\n${context.lessonContent}\n`;
            }
          } else {
            repositoryContext = "\n\n=== ACADEMIC REPOSITORY CONTENT ===\n\n";
          
            subjects.forEach((subject, sIndex) => {
              repositoryContext += `\nSUBJECT ${sIndex + 1}: ${subject.name}\n`;
              repositoryContext += "=" .repeat(50) + "\n";
              
              if (subject.chapters && subject.chapters.length > 0) {
                // Filter chapters if contentScope is 'chapter'
                const chaptersToShow = contentScope === 'chapter' && selectedChapterId
                  ? subject.chapters.filter(ch => ch.id === selectedChapterId)
                  : subject.chapters;
                
                chaptersToShow.forEach((chapter, cIndex) => {
                  repositoryContext += `\n  CHAPTER ${cIndex + 1}: ${chapter.name}\n`;
                  repositoryContext += "  " + "-".repeat(45) + "\n";
                  
                  if (chapter.lessons && chapter.lessons.length > 0) {
                    chapter.lessons.forEach((lesson, lIndex) => {
                      repositoryContext += `\n    LESSON ${lIndex + 1}: ${lesson.title}\n`;
                      if (lesson.content) {
                        // Include FULL lesson content (word-to-word)
                        repositoryContext += `    Content:\n${lesson.content}\n`;
                        repositoryContext += `    [End of ${lesson.title}]\n`;
                      } else {
                        repositoryContext += `    (No content available)\n`;
                      }
                    });
                  } else {
                    repositoryContext += "    (No lessons in this chapter)\n";
                  }
                });
              } else {
                repositoryContext += "  (No chapters in this subject)\n";
              }
              repositoryContext += "\n";
            });
          }
        }
      } catch (dbError) {
        console.warn("Could not fetch repository data:", dbError.message);
      }
    }

    // Import Google Generative AI dynamically
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Primary API key
    const primaryKey = GEMINI_API_KEY || GEMINI_API_KEY_FALLBACK;
    const genAI = new GoogleGenerativeAI(primaryKey);
    
    let systemMessage = `You are a helpful academic assistant. You can help students:
- Understand lessons and concepts
- Summarize chapters or subjects
- Answer questions about specific topics
- Compare different lessons or chapters
- Provide study guidance
- Analyze uploaded documents (PDF, Word, PowerPoint)

Be concise, accurate, and educational in your responses.`;

    // Add uploaded file context if using file-only mode
    if (uploadedFileContext) {
      systemMessage += uploadedFileContext;
      systemMessage += "\n\nThe student has uploaded a file and wants to ask questions about it. Focus your answers on the uploaded file content.";
    }
    
    // Add repository context
    if (repositoryContext) {
      systemMessage += repositoryContext;
      
      // Add scope information
      if (contentScope === 'current') {
        systemMessage += "\n\nNote: You are currently focusing on the lesson the student is viewing.";
      } else if (contentScope === 'subject') {
        systemMessage += "\n\nNote: You are currently focusing on a specific subject.";
      } else if (contentScope === 'chapter') {
        systemMessage += "\n\nNote: You are currently focusing on a specific chapter.";
      }
    }
    
    // Add current viewing context if available (and not in file-only mode)
    if (context && contentScope !== 'file') {
      systemMessage += "\n\n=== CURRENTLY VIEWING ===\n";
      if (context.subjectName) {
        systemMessage += `Subject: ${context.subjectName}\n`;
      }
      if (context.chapterName) {
        systemMessage += `Chapter: ${context.chapterName}\n`;
      }
      if (context.lessonTitle) {
        systemMessage += `Lesson: ${context.lessonTitle}\n`;
      }
      if (context.lessonContent) {
        // Send FULL content without any truncation
        systemMessage += `\nCurrent Lesson Full Content:\n${context.lessonContent}\n`;
      }
    }

    // Build conversation history for context
    let conversationContext = systemMessage + "\n\n";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext += "=== CONVERSATION HISTORY ===\n";
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}\n`;
      });
    }
    conversationContext += `\n=== NEW QUESTION ===\nStudent: ${message}\n\nAssistant:`;

    // Helper function to try generating content with a specific model and API key
    const tryGenerateContent = async (genAIInstance, modelName, conversationContext, retries = 3) => {
      const modelInstance = genAIInstance.getGenerativeModel({ model: modelName });
      let lastError;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await modelInstance.generateContent({
            contents: [{ parts: [{ text: conversationContext }] }],
          });
          const response = await result.response;
          const responseMessage = response.text() || "I apologize, but I couldn't generate a response.";
          
          return { success: true, message: responseMessage, model: modelName };
        } catch (apiError) {
          lastError = apiError;
          
          // If this is a rate limit or service unavailable error, retry with backoff
          if (apiError.status === 503 || apiError.status === 429 || apiError.status === 500) {
            if (attempt < retries) {
              const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
              console.log(`${modelName} API error (${apiError.status}), retrying in ${waitTime}ms... (attempt ${attempt}/${retries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // For other errors or final retry, throw the error
          throw apiError;
        }
      }
      
      throw lastError;
    };

    // Helper function to try all models with a given API key
    const tryAllModelsWithKey = async (genAIInstance, keyLabel) => {
      console.log(`\n=== Trying with ${keyLabel} ===`);
      
      // Try primary model: Gemini 2.5 Flash
      try {
        console.log('Attempting with Gemini 2.5 Flash...');
        return await tryGenerateContent(genAIInstance, 'gemini-2.5-flash', conversationContext, 2);
      } catch (primaryError) {
        console.log('Gemini 2.5 Flash failed, trying alternatives...');
        
        // Fallback to Gemini Flash
        try {
          console.log('Attempting with Gemini Flash (generic)...');
          return await tryGenerateContent(genAIInstance, 'gemini-flash', conversationContext, 1);
        } catch (flashError) {
          
          // Try Gemini Pro
          try {
            console.log('Attempting with Gemini Pro...');
            return await tryGenerateContent(genAIInstance, 'gemini-pro', conversationContext, 1);
          } catch (proError) {
            console.log(`All models failed with ${keyLabel}:`, {
              'gemini-2.5-flash': primaryError.message.substring(0, 150) + '...',
              'gemini-flash': flashError.message.substring(0, 150) + '...',
              'gemini-pro': proError.message.substring(0, 150) + '...'
            });
            throw primaryError; // Throw the original error
          }
        }
      }
    };

    // Helper function to try Groq as a fallback
    const tryGroqFallback = async () => {
      if (!GROQ_API_KEY) {
        throw new Error('Groq API key not configured');
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'user', content: conversationContext }
          ],
          temperature: 0.6,
          max_tokens: 1024
        })
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        throw new Error(`Groq API error (${groqResponse.status}): ${errorText}`);
      }

      const groqData = await groqResponse.json();
      const groqMessage = groqData?.choices?.[0]?.message?.content?.trim();

      if (!groqMessage) {
        throw new Error('Groq returned an empty response');
      }

      return { success: true, message: groqMessage, model: GROQ_MODEL };
    };

    // Try primary API key first
    let result;
    let usedModel = 'gemini-2.5-flash';
    let usedApiKey = 'primary';
    
    try {
      result = await tryAllModelsWithKey(genAI, 'Primary API Key');
      usedModel = result.model;
    } catch (primaryKeyError) {
      console.log('\n⚠️  Primary API key exhausted. Trying fallback API key...\n');
      
      // Try fallback API key if available
      if (GEMINI_API_KEY_FALLBACK && GEMINI_API_KEY_FALLBACK !== primaryKey) {
        try {
          const fallbackGenAI = new GoogleGenerativeAI(GEMINI_API_KEY_FALLBACK);
          result = await tryAllModelsWithKey(fallbackGenAI, 'Fallback API Key');
          usedModel = result.model;
          usedApiKey = 'fallback';
          console.log(`✅ Success with fallback API key using ${result.model}`);
        } catch (fallbackKeyError) {
          console.log('❌ Both Gemini API keys exhausted. Errors:');
          console.log('Primary:', primaryKeyError.message.substring(0, 200));
          console.log('Fallback:', fallbackKeyError.message.substring(0, 200));

          if (GROQ_API_KEY) {
            try {
              console.log('\n⚠️  Trying Groq fallback...');
              result = await tryGroqFallback();
              usedModel = result.model;
              usedApiKey = 'groq';
              console.log(`✅ Success with Groq using ${result.model}`);
            } catch (groqError) {
              console.log('❌ Groq fallback failed:', groqError.message.substring(0, 200));
              
              console.log('\n⚠️  IMPORTANT: All API keys have exceeded their quota.');
              console.log('Solutions:');
              console.log('1. Wait until midnight for quota reset');
              console.log('2. Use additional API keys');
              console.log('3. Upgrade to a paid plan for higher limits\n');
              
              // Throw the original error
              throw primaryKeyError;
            }
          } else {
            console.log('\n⚠️  IMPORTANT: All API keys have exceeded their quota.');
            console.log('Solutions:');
            console.log('1. Wait until midnight for quota reset');
            console.log('2. Use additional API keys');
            console.log('3. Upgrade to a paid plan for higher limits\n');
            
            // Throw the original error
            throw primaryKeyError;
          }
        }
      } else {
        console.log('❌ No fallback API key available or same as primary');
        
        if (GROQ_API_KEY) {
          try {
            console.log('\n⚠️  Trying Groq fallback...');
            result = await tryGroqFallback();
            usedModel = result.model;
            usedApiKey = 'groq';
            console.log(`✅ Success with Groq using ${result.model}`);
          } catch (groqError) {
            console.log('❌ Groq fallback failed:', groqError.message.substring(0, 200));
            throw primaryKeyError;
          }
        } else {
          throw primaryKeyError;
        }
      }
    }

    // If we got a successful response
    if (result && result.success) {
      // Cache the response for future identical queries
      chatCache.set(cacheKey, {
        response: result.message,
        timestamp: Date.now(),
        model: usedModel,
        apiKey: usedApiKey
      });

      // Clean up old cache entries (keep cache size manageable)
      if (chatCache.size > 100) {
        const oldestKey = chatCache.keys().next().value;
        chatCache.delete(oldestKey);
      }

      return res.json({ 
        message: result.message,
        success: true,
        cached: false,
        model: usedModel,
        apiKey: usedApiKey
      });
    }
    
    // This shouldn't happen, but just in case
    throw new Error('Unexpected error: No response generated');

  } catch (error) {
    console.error("Chat API error:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to process chat request";
    if (error.status === 503) {
      errorMessage = "AI service is currently experiencing high demand. Please try again in a moment.";
    } else if (error.status === 429) {
      errorMessage = "Rate limit reached. Please wait a moment before trying again.";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: error.status ? `Status ${error.status}` : error.message 
    });
  }
});

// Active Chat Auto-Save to Google Drive
// Auto-save active chat (single file that gets updated)
app.post("/api/chat/auto-save", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const drive = await getDriveClient();
    if (!drive) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const folderId = await getDriveFolderId(drive);
    if (!folderId) {
      return res.status(503).json({ error: "Could not access Drive folder" });
    }

    // Create chat data
    const chatData = {
      messages: messages,
      updatedAt: new Date().toISOString(),
    };

    const fileName = 'active_chat.json';
    const media = {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(chatData, null, 2)]),
    };

    // Check if file exists
    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    let result;
    if (existingFiles.data.files && existingFiles.data.files.length > 0) {
      // Update existing file
      result = await drive.files.update({
        fileId: existingFiles.data.files[0].id,
        media: media,
        fields: 'id',
      });
    } else {
      // Create new file
      const fileMetadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
      };
      result = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });
    }

    res.json({
      success: true,
      fileId: result.data.id,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Chat auto-save error:", error);
    res.status(500).json({ error: "Failed to auto-save chat", details: error.message });
  }
});

// Load active chat from Google Drive
app.get("/api/chat/active", async (req, res) => {
  try {
    const drive = await getDriveClient();
    if (!drive) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const folderId = await getDriveFolderId(drive);
    if (!folderId) {
      return res.status(503).json({ error: "Could not access Drive folder" });
    }

    const fileName = 'active_chat.json';

    // Find the file
    const response = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    if (!response.data.files || response.data.files.length === 0) {
      // No saved chat yet, return empty
      return res.json({ messages: [] });
    }

    // Get file content
    const fileResponse = await drive.files.get({
      fileId: response.data.files[0].id,
      alt: 'media',
    });

    res.json(fileResponse.data);
  } catch (error) {
    console.error("Chat load error:", error);
    res.status(500).json({ error: "Failed to load chat", details: error.message });
  }
});

// Save chat history to Drive (internal only, no API exposure)
const saveChatToDrive = async (messages, title) => {
  try {
    const drive = await getDriveClient();
    if (!drive) return null;

    const folderId = await getDriveFolderId(drive);
    if (!folderId) return null;

    // Create chat JSON file
    const chatData = {
      title: title,
      savedAt: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp?.toISOString?.() || new Date().toISOString(),
      })),
    };

    const fileName = `chat_${Date.now()}.json`;
    const media = {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(chatData, null, 2)]),
    };

    const result = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      },
      media: media,
      fields: 'id, webViewLink',
    });

    return {
      fileId: result.data.id,
      fileLink: result.data.webViewLink,
      fileName: fileName,
    };
  } catch (error) {
    console.error("Failed to save chat to Drive:", error.message);
    return null;
  }
};

// Auto-save chat to Drive and track in Supabase (internal endpoint)
app.post("/api/chat/save-history", async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    
    const { messages, title } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages required" });
    }

    let driveResult = null;
    
    // Try to save to Drive (non-critical)
    try {
      driveResult = await saveChatToDrive(messages, title || 'Untitled Chat');
    } catch (driveError) {
      console.log("Drive save skipped (not critical):", driveError.message);
    }

    // Store metadata in lesson_files table (same as existing files)
    if (driveResult) {
      const { error: dbError } = await supabase
        .from("lesson_files")
        .insert({
          title: `Chat: ${title || 'Untitled'}`,
          file_url: driveResult.fileLink,
          file_name: driveResult.fileName,
          drive_file_id: driveResult.fileId,
          uploaded_at: new Date().toISOString(),
          file_type: 'chat_history',
        });

      if (dbError) {
        console.warn("Warning: Saved to Drive but DB log failed:", dbError.message);
      }
    }

    res.json({
      success: true,
      saved: driveResult ? 'drive' : 'local',
      driveFileId: driveResult?.fileId,
      driveFileLink: driveResult?.fileLink,
    });
  } catch (error) {
    console.error("Chat save error:", error);
    res.status(500).json({ error: "Failed to save chat", details: error.message });
  }
});

app.get("/api/dashboard/stats", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const today = getDateString(req.query.date);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);

  const [taskRes, prayerRes, prayerLogRes, lessonViewRes] = await Promise.all([
    supabase.from("tasks").select("id,completed").eq("task_date", today),
    supabase.from("prayers").select("id"),
    supabase.from("prayer_logs").select("id,completed").eq("log_date", today),
    supabase.from("lesson_views").select("id,viewed_at").gte("viewed_at", weekStart.toISOString()),
  ]);

  if (taskRes.error) return res.status(400).json({ error: taskRes.error.message });
  if (prayerRes.error) return res.status(400).json({ error: prayerRes.error.message });
  if (prayerLogRes.error) return res.status(400).json({ error: prayerLogRes.error.message });
  if (lessonViewRes.error) return res.status(400).json({ error: lessonViewRes.error.message });

  const tasks = taskRes.data || [];
  const prayersTotal = (prayerRes.data || []).length || 5;
  const prayersCompleted = (prayerLogRes.data || []).filter((p) => p.completed).length;

  return res.json({
    data: {
      prayers: { completed: prayersCompleted, total: prayersTotal },
      tasks: { completed: tasks.filter((t) => t.completed).length, total: tasks.length },
      lessonsAccessed: (lessonViewRes.data || []).length,
    },
  });
});

app.get("/api/analytics/heatmap", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const weeks = Number(req.query.weeks ?? 20);
  const days = Number.isNaN(weeks) ? 140 : weeks * 7;
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("activity_log")
    .select("activity_date,count")
    .gte("activity_date", getDateString(start));

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const map = {};
  (data || []).forEach((row) => {
    map[row.activity_date] = row.count;
  });

  return res.json({ data: map });
});

app.get("/api/analytics/trend", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const days = Number(req.query.days ?? 30);
  const totalDays = Number.isNaN(days) ? 30 : days;
  const start = new Date();
  start.setDate(start.getDate() - (totalDays - 1));
  const startStr = getDateString(start);

  const { data, error } = await supabase
    .from("activity_log")
    .select("activity_date,count")
    .gte("activity_date", startStr);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const countsByDate = new Map((data || []).map((row) => [row.activity_date, row.count]));
  const result = [];
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = getDateString(date);
    result.push(countsByDate.get(key) || 0);
  }

  return res.json({ data: result });
});

app.get("/api/analytics/summary", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);

  const [taskRes, prayerRes, prayerLogRes, activityRes] = await Promise.all([
    supabase.from("tasks").select("id,completed,task_date").gte("task_date", getDateString(weekStart)),
    supabase.from("prayers").select("id"),
    supabase.from("prayer_logs").select("id,completed,log_date").gte("log_date", getDateString(weekStart)),
    supabase.from("activity_log").select("count,activity_date").gte("activity_date", getDateString(weekStart)),
  ]);

  if (taskRes.error) return res.status(400).json({ error: taskRes.error.message });
  if (prayerRes.error) return res.status(400).json({ error: prayerRes.error.message });
  if (prayerLogRes.error) return res.status(400).json({ error: prayerLogRes.error.message });
  if (activityRes.error) return res.status(400).json({ error: activityRes.error.message });

  const prayersTotal = (prayerRes.data || []).length || 5;
  const prayerCompleted = (prayerLogRes.data || []).filter((p) => p.completed).length;
  const prayerRate = prayersTotal ? Math.round((prayerCompleted / (prayersTotal * 7)) * 100) : 0;

  const tasks = taskRes.data || [];
  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const taskRate = tasks.length ? Math.round((tasksCompleted / tasks.length) * 100) : 0;

  const activityCounts = (activityRes.data || []).map((row) => row.count);
  const avgActivity = activityCounts.length
    ? activityCounts.reduce((sum, val) => sum + val, 0) / activityCounts.length
    : 0;
  const consistencyScore = Math.min(100, Math.round((avgActivity / 5) * 100));

  return res.json({
    data: {
      weeklyPrayerRate: `${prayerRate}%`,
      taskCompletionRate: `${taskRate}%`,
      consistencyScore: consistencyScore.toString(),
    },
  });
});

app.get("/api/settings/sections", async (req, res) => {
  if (!ensureSupabase(res)) return;
  const { data, error } = await supabase
    .from("settings_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const initializeDailyPrayerLogs = async () => {
  if (!supabase) return;
  try {
    const todayStr = getDateString();
    const { data: prayers } = await supabase
      .from("prayers")
      .select("id")
      .order("sort_order", { ascending: true });

    if (!prayers?.length) return;

    // Check if logs already exist for today
    const { data: existingLogs } = await supabase
      .from("prayer_logs")
      .select("id")
      .eq("log_date", todayStr)
      .limit(1);

    // Only initialize if no logs exist for today
    if (!existingLogs?.length) {
      const logsToInsert = prayers.map(prayer => ({
        prayer_id: prayer.id,
        log_date: todayStr,
        completed: false
      }));

      await supabase.from("prayer_logs").insert(logsToInsert);
      console.log(`Initialized prayer logs for ${todayStr}`);
    }
  } catch (error) {
    console.warn("Failed to initialize daily prayer logs:", error.message);
  }
};

const sendDailyPrayerTimings = async () => {
  if (!mailer || !NOTIFY_EMAIL || !supabase) return;
  try {
    const location = await getUserLocation();
    if (!location) return;

    const todayStr = getDateString();
    const { timings } = await getPrayerTimings({
      lat: location.lat,
      lng: location.lng,
      date: todayStr,
      timezone: location.timezone,
    });

    const textLines = [
      `Prayer timings for ${todayStr}:`,
      `Fajr: ${timings.Fajr || "--"}`,
      `Dhuhr: ${timings.Dhuhr || "--"}`,
      `Asr: ${timings.Asr || "--"}`,
      `Maghrib: ${timings.Maghrib || "--"}`,
      `Isha: ${timings.Isha || "--"}`,
    ].join("\n");

    const htmlContent = createPrayerTimingsEmailHTML(timings, todayStr);

    await sendMail({
      subject: "🕌 Today's Prayer Timings",
      text: textLines,
      html: htmlContent,
    });

    console.log(`Sent prayer timings email for ${todayStr}`);
  } catch (error) {
    console.warn("Failed to send daily prayer timings:", error.message);
  }
};

const scheduleNotifications = () => {
  if (!mailer || !NOTIFY_EMAIL) return;

  // Initialize prayer logs at midnight (00:01)
  cron.schedule("1 0 * * *", async () => {
    console.log("Running midnight initialization...");
    await initializeDailyPrayerLogs();
    await sendDailyPrayerTimings();
  });

  // Check prayer times every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const location = await getUserLocation();
      if (!location) return;

      const todayStr = getDateString();
      const { timings, timezone } = await getPrayerTimings({
        lat: location.lat,
        lng: location.lng,
        date: todayStr,
        timezone: location.timezone,
      });

      const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
      for (const prayerName of prayerNames) {
        const timeStr = timings[prayerName];
        if (!timeStr) continue;

        const startTime = parseTime(todayStr, timeStr, timezone || "UTC");
        const now = new Date();
        const minutesDiff = Math.abs((now.getTime() - startTime.getTime()) / 60000);

        if (minutesDiff <= 2) {
          const shouldSend = await shouldSendNotification("prayer_start", todayStr, prayerName);
          if (shouldSend) {
            const message = `${prayerName} prayer time has started. Please perform your prayer now.`;
            const hadith = hadiths[Math.floor(Math.random() * hadiths.length)];
            const htmlContent = createPrayerReminderHTML(prayerName, timeStr, message, hadith);
            
            await sendMail({
              subject: `🕌 ${prayerName} Time Has Started`,
              text: `${prayerName} prayer time has started at ${timeStr}.\n\nHadith: ${hadith}`,
              html: htmlContent,
            });
            await markNotificationSent("prayer_start", todayStr, prayerName);
          }
        }

        const nextPrayer = prayerNames[prayerNames.indexOf(prayerName) + 1];
        const nextTimeStr = nextPrayer ? timings[nextPrayer] : null;
        const endTime = nextTimeStr
          ? parseTime(todayStr, nextTimeStr, timezone || "UTC")
          : new Date(startTime.getTime() + 90 * 60000);

        const prayerDate = getPrayerDate();
        const { data: log } = await supabase
          .from("prayer_logs")
          .select("completed")
          .eq("prayer_id", prayerName.toLowerCase())
          .eq("log_date", prayerDate)
          .maybeSingle();

        if (!log?.completed) {
          const halfTime = new Date(startTime.getTime() + (endTime.getTime() - startTime.getTime()) / 2);
          const halfDiff = Math.abs((now.getTime() - halfTime.getTime()) / 60000);
          if (halfDiff <= 2) {
            const shouldSend = await shouldSendNotification("prayer_half", todayStr, prayerName);
            if (shouldSend) {
              const hadith = hadiths[Math.floor(Math.random() * hadiths.length)];
              const message = `${prayerName} time is halfway through. Please pray soon before the time runs out.`;
              const htmlContent = createPrayerReminderHTML(prayerName, '', message, hadith);
              
              await sendMail({
                subject: `⏰ ${prayerName} Reminder - Time is Passing`,
                text: `${prayerName} time is halfway through. Please pray soon.\n\nHadith: ${hadith}`,
                html: htmlContent,
              });
              await markNotificationSent("prayer_half", todayStr, prayerName);
            }
          }

          const endWarnTime = new Date(endTime.getTime() - 10 * 60000);
          const endDiff = Math.abs((now.getTime() - endWarnTime.getTime()) / 60000);
          if (endDiff <= 2) {
            const minutesLeft = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 60000));
            const shouldSend = await shouldSendNotification("prayer_end", todayStr, prayerName);
            if (shouldSend) {
              const hadith = hadiths[Math.floor(Math.random() * hadiths.length)];
              const message = `⚠️ ${prayerName} time is ending in about ${minutesLeft} minutes. Please pray before it ends!`;
              const htmlContent = createPrayerReminderHTML(prayerName, '', message, hadith);
              
              await sendMail({
                subject: `⚠️ ${prayerName} Time Ending Soon - ${minutesLeft} Min Left`,
                text: `${prayerName} time is ending in about ${minutesLeft} minutes. Please pray before it ends.\n\nHadith: ${hadith}`,
                html: htmlContent,
              });
              await markNotificationSent("prayer_end", todayStr, prayerName);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Prayer notification failed", error.message);
    }
  });

  cron.schedule("0 8 * * *", async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = getDateString(tomorrow);

      const { data: events, error } = await supabase
        .from("events")
        .select("id,title,event_date")
        .eq("event_date", dateStr);

      if (error) return;
      if (!events?.length) return;

      const shouldSend = await shouldSendNotification("event_reminder", dateStr, "daily");
      if (!shouldSend) return;

      const eventListHTML = events.map(event => 
        `<li style="padding: 12px; background: #f7fafc; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #667eea;">
          <strong style="color: #2d3748; font-size: 16px;">${event.title}</strong>
        </li>`
      ).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7fafc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                      <div style="font-size: 64px; margin-bottom: 10px;">🗓️</div>
                      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Upcoming Events Tomorrow</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <ul style="list-style: none; padding: 0; margin: 0;">
                        ${eventListHTML}
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                      <p style="margin: 0; color: #718096; font-size: 14px;">
                        🔔 Daily Sanctuary • Stay organized
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

      const list = events.map((event) => `- ${event.title}`).join("\n");
      await sendMail({
        subject: "🗓️ Event Reminder for Tomorrow",
        text: `You have events scheduled for tomorrow (${dateStr}):\n${list}`,
        html: htmlContent,
      });
      await markNotificationSent("event_reminder", dateStr, "daily");
    } catch (error) {
      console.warn("Event notification failed", error.message);
    }
  });

  // Keep Supabase active (every 3 days at 03:00)
  cron.schedule("0 3 */3 * *", async () => {
    try {
      if (!supabase) return;
      await supabase.from("tasks").select("id").limit(1);
    } catch (error) {
      console.warn("Supabase keep-alive failed", error.message);
    }
  });

  cron.schedule("*/1 * * * *", async () => {
    try {
      const now = new Date().toISOString();
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id,text,due_at")
        .is("reminder_sent", false)
        .not("due_at", "is", null)
        .lte("due_at", now);

      if (error || !tasks?.length) return;

      for (const task of tasks) {
        const dueDate = new Date(task.due_at);
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7fafc;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);">
                        <div style="font-size: 64px; margin-bottom: 10px;">\u23f0</div>
                        <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Task Reminder</h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">Due: ${dueDate.toLocaleString()}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <div style="background: #fff5f0; border-left: 4px solid #ed8936; padding: 20px; border-radius: 8px;">
                          <p style="margin: 0; color: #2d3748; font-size: 18px; line-height: 1.6;">
                            ${task.text}
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 30px 30px 30px; text-align: center;">
                        <p style="margin: 0; color: #718096; font-size: 14px;">
                          \u2705 Daily Sanctuary \u2022 Stay productive
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
        
        await sendMail({
          subject: `\u23f0 Task Reminder: ${task.text.substring(0, 50)}${task.text.length > 50 ? '...' : ''}`,
          text: `Reminder: ${task.text} (due at ${dueDate.toLocaleString()})`,
          html: htmlContent,
        });
        await supabase
          .from("tasks")
          .update({ reminder_sent: true })
          .eq("id", task.id);
      }
    } catch (error) {
      console.warn("Task reminder failed", error.message);
    }
  });
};

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  // Initialize today's prayer logs immediately on startup
  initializeDailyPrayerLogs().then(() => {
    console.log("Prayer logs initialization check completed");
  });
  scheduleNotifications();
});
