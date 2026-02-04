insert into prayers (id, name, time_label, sort_order)
values
  ('fajr', 'Fajr', 'Before Sunrise', 1),
  ('dhuhr', 'Dhuhr', 'Early Afternoon', 2),
  ('asr', 'Asr', 'Late Afternoon', 3),
  ('maghrib', 'Maghrib', 'After Sunset', 4),
  ('isha', 'Isha', 'Night', 5)
on conflict (id) do nothing;

insert into settings_sections (id, title, description, icon, sort_order)
values
  ('profile', 'Profile Settings', 'Manage your personal information and preferences', 'User', 1),
  ('notifications', 'Notifications', 'Configure how and when you receive reminders', 'Bell', 2),
  ('privacy', 'Privacy & Security', 'Control your data and security settings', 'Shield', 3),
  ('appearance', 'Appearance', 'Customize the look and feel of your dashboard', 'Palette', 4)
on conflict (id) do nothing;

insert into subjects (id, name, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'Mathematics', 1),
  ('22222222-2222-2222-2222-222222222222', 'Natural Sciences', 2),
  ('33333333-3333-3333-3333-333333333333', 'Languages', 3)
on conflict (id) do nothing;

insert into chapters (id, subject_id, name, sort_order)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Algebra', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Calculus', 2),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Physics', 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Arabic', 1)
on conflict (id) do nothing;

insert into lessons (id, chapter_id, title, content, date_added)
values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Linear Equations', '<p>Welcome to Linear Equations.</p><p>This lesson covers variables, constants, and solving for unknowns.</p>', '2024-01-15'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Quadratic Functions', '<p>Welcome to Quadratic Functions.</p><p>This lesson covers parabolas and factoring.</p>', '2024-01-18'),
  ('10000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Introduction to Derivatives', '<p>Learn the basics of derivatives.</p>', '2024-01-22'),
  ('10000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Basic Integration', '<p>Learn the basics of integration.</p>', '2024-01-25'),
  ('10000000-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Classical Mechanics', '<p>Learn classical mechanics fundamentals.</p>', '2024-01-28'),
  ('10000000-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Grammar Fundamentals', '<p>Learn Arabic grammar fundamentals.</p>', '2024-02-02')
on conflict (id) do nothing;
