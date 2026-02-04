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
  const adjusted = new Date(date);
  if (adjusted.getHours() < 12) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  return getDateString(adjusted);
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

const sendMail = async ({ subject, text }) => {
  if (!mailer || !NOTIFY_EMAIL) return;
  await mailer.sendMail({
    from: EMAIL_HOST_USER,
    to: NOTIFY_EMAIL,
    subject,
    text,
  });
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
  const [hour, minute] = timeStr.split(":");
  const date = new Date(`${dateStr}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`);
  return new Date(date.toLocaleString("en-US", { timeZone: tz }));
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
    "/api/health",
    "/api/auth/login",
    "/api/auth/me",
  ];
  if (publicPaths.includes(req.path)) return next();
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

    const lines = [
      `Prayer timings for ${todayStr}:`,
      `Fajr: ${timings.Fajr || "--"}`,
      `Dhuhr: ${timings.Dhuhr || "--"}`,
      `Asr: ${timings.Asr || "--"}`,
      `Maghrib: ${timings.Maghrib || "--"}`,
      `Isha: ${timings.Isha || "--"}`,
    ].join("\n");

    await sendMail({
      subject: "Today's prayer timings",
      text: lines,
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
  updates.updated_at = new Date().toISOString();

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

const scheduleNotifications = () => {
  if (!mailer || !NOTIFY_EMAIL) return;

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
            await sendMail({
              subject: `${prayerName} time has started`,
              text: `${prayerName} prayer time has started at ${timeStr}.` ,
            });
            await markNotificationSent("prayer_start", todayStr, prayerName);
          }
        }

        const nextPrayer = prayerNames[prayerNames.indexOf(prayerName) + 1];
        const nextTimeStr = nextPrayer ? timings[nextPrayer] : null;
        if (nextTimeStr) {
          const endTime = parseTime(todayStr, nextTimeStr, timezone || "UTC");
          const halfTime = new Date(startTime.getTime() + (endTime.getTime() - startTime.getTime()) / 2);
          const halfDiff = Math.abs((now.getTime() - halfTime.getTime()) / 60000);
          if (halfDiff <= 2) {
            const prayerDate = getPrayerDate();
            const { data: log } = await supabase
              .from("prayer_logs")
              .select("completed")
              .eq("prayer_id", prayerName.toLowerCase())
              .eq("log_date", prayerDate)
              .maybeSingle();

            if (!log?.completed) {
              const shouldSend = await shouldSendNotification("prayer_half", todayStr, prayerName);
              if (shouldSend) {
                const hadith = hadiths[Math.floor(Math.random() * hadiths.length)];
                await sendMail({
                  subject: `${prayerName} reminder`,
                  text: `${prayerName} time is halfway through. Please pray soon.\n\nHadith: ${hadith}`,
                });
                await markNotificationSent("prayer_half", todayStr, prayerName);
              }
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

      const list = events.map((event) => `- ${event.title}`).join("\n");
      await sendMail({
        subject: "Event reminder for tomorrow",
        text: `You have events scheduled for tomorrow (${dateStr}):\n${list}`,
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
        await sendMail({
          subject: "Task reminder",
          text: `Reminder: ${task.text} (due at ${new Date(task.due_at).toLocaleString()})`,
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
  scheduleNotifications();
});
