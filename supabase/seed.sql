-- =====================================================================
-- Starter data. Safe to re-run. Everything here is editable on the dashboard.
-- =====================================================================

-- IMPORTANT: replace with the email you will sign in with. Whoever signs up
-- with this address becomes the (only) administrator.
insert into public.app_config (key, value)
values ('admin_email', 'wulzymart@gmail.com')
on conflict (key) do nothing;

insert into public.admins (user_id)
select id from auth.users
 where lower(email) = lower((select value from public.app_config where key = 'admin_email'))
on conflict do nothing;

insert into public.site_settings (
  id, doctor_name, short_name, post_nominals, specialty, headline, tagline, short_bio, about_html,
  credentials, experience, education, interests, approach, engagements, location, seo_description
) values (
  1,
  'Dr Olawole Olawale Martins',
  'Dr Olawole',
  'MBBS',
  'Resident Doctor in Family Medicine',
  'Know the facts. Live healthier.',
  'Clear, evidence-based guidance on prevention, long-term conditions and everyday health, in plain language.',
  'Medical doctor with nearly a decade of experience across private and public healthcare, now a Resident Doctor in Family Medicine at Lagos University Teaching Hospital. I help people understand their health and make better decisions about it.',
  '<p>I am a medical doctor with nearly a decade of experience across private and public healthcare settings. I am currently a Resident Doctor in the Department of Family Medicine at Lagos University Teaching Hospital (LUTH), where I am deepening my expertise in comprehensive, continuous and patient-centred care.</p><p>My practice is grounded in a simple belief: effective healthcare goes beyond diagnosing and treating disease. It means understanding the person, their family, their environment and the social factors that shape their health.</p><p>I have worked in outpatient and inpatient care, emergency medicine, maternal and child health, preventive medicine, and the management of acute and long-term conditions. Family Medicine drew me because it looks at the whole person, puts prevention first, and recognises the family and community as part of the picture.</p><p>Beyond the clinic, I am passionate about making medical knowledge accessible. My background in software engineering informs my interest in how thoughtful technology can make reliable health information easier to reach.</p>',
  '[
    {"title":"MBBS","detail":"Medical doctor"},
    {"title":"Family Medicine residency","detail":"Lagos University Teaching Hospital, since August 2025"},
    {"title":"Doctor of the Year 2022","detail":"Solid Rock Hospital, Ojodu"},
    {"title":"BLS and ACLS","detail":"Basic and Advanced Cardiovascular Life Support, 2024"}
  ]'::jsonb,
  '[
    {"role":"Resident Doctor, Family Medicine","place":"Lagos University Teaching Hospital (LUTH), Lagos","period":"August 2025 to present","summary":"Developing advanced skills in comprehensive clinical assessment, diagnostic reasoning, preventive care, chronic disease management and family-oriented care, and in coordinating care across levels of the health system."},
    {"role":"Medical Officer","place":"Lagos State Health Service Commission","period":"October 2023 to July 2025","summary":"Worked in outpatient clinics, inpatient care and emergency settings at General Hospital Ifako-Ijaiye, including the General Outpatient Department, Accident and Emergency, and antenatal and gynaecological clinics. Contributed to departmental teaching and continuing medical education."},
    {"role":"Medical Officer","place":"Solid Rock Hospital, Ojodu, Lagos","period":"April 2022 to October 2023","summary":"Provided general practice, maternity care, emergency care and minor surgical procedures, including deliveries, wound care, obstetric ultrasonography and excisional biopsies. Received the Doctor of the Year Award in 2022."}
  ]'::jsonb,
  '[
    {"title":"Family Medicine residency training","place":"Lagos University Teaching Hospital, Nigeria","year":"Commenced August 2025"},
    {"title":"Doctor of Medicine (MD)","place":"Kharkiv National Medical University, Ukraine","year":"2017"},
    {"title":"BSc Human Anatomy","place":"University of Ilorin, Nigeria","year":"2011"},
    {"title":"Advanced Cardiovascular Life Support (ACLS)","place":"","year":"2024"},
    {"title":"Basic Life Support (BLS)","place":"","year":"2024"}
  ]'::jsonb,
  '[
    {"title":"Family medicine and primary care","detail":"Comprehensive, continuous, coordinated and person-centred care."},
    {"title":"Prevention and health promotion","detail":"Early detection, screening, health education and risk reduction."},
    {"title":"Chronic disease management","detail":"Long-term care for hypertension, diabetes and other cardiometabolic conditions."},
    {"title":"Lifestyle medicine","detail":"Nutrition, physical activity, sleep, stress and changes in habit that last."},
    {"title":"Maternal and child health","detail":"The health of mothers, newborns, children and families."},
    {"title":"Mental and social wellbeing","detail":"How family, work, support and living conditions shape health."},
    {"title":"Medical education","detail":"Teaching, mentoring and continuing professional learning."}
  ]'::jsonb,
  '[
    {"title":"Patient-centred care","detail":"Every patient deserves to be heard, understood and involved in decisions about their health."},
    {"title":"Prevention before complications","detail":"Timely screening, risk assessment, education and lifestyle change can prevent a great deal of illness."},
    {"title":"Whole-person assessment","detail":"Symptoms rarely make sense apart from family, work, wellbeing, finances and environment."},
    {"title":"Continuity of care","detail":"Follow-up, monitoring and appropriate referral, with a relationship that continues."},
    {"title":"Health literacy","detail":"Understandable, practical, evidence-based information that lets people decide for themselves."}
  ]'::jsonb,
  '[
    "Health education and public health awareness programmes",
    "Corporate wellness and workplace health initiatives",
    "Medical education, teaching and mentorship",
    "Community health outreach and disease-prevention programmes",
    "Healthcare innovation and digital health initiatives",
    "Medical conferences, panel discussions and speaking engagements"
  ]'::jsonb,
  'Lagos, Nigeria',
  'Dr Olawole Olawale Martins, MBBS, is a Resident Doctor in Family Medicine at LUTH. Book an online consultation and read clear, evidence-based health articles.'
)
on conflict (id) do nothing;

insert into public.private_settings (id) values (1) on conflict (id) do nothing;

-- Example consultation options. NGN prices are in kobo (1000000 = NGN 10,000)
-- and USD prices in cents (1500 = USD 15). Replace these on the dashboard
-- before taking real bookings. The amounts are placeholders, not recommendations.
insert into public.services (name, slug, summary, description, duration_minutes, price_ngn_kobo, price_usd_cents, modes, sort_order)
values
  ('Quick consult', 'quick-consult',
   'One focused question, answered clearly.',
   'Best for a single concern: a test result, a medication question, or deciding whether you need to be seen in person.',
   15, 1000000, 1500, array['meet', 'phone', 'whatsapp'], 1),
  ('Standard consultation', 'standard-consultation',
   'Time to talk through your history and a plan.',
   'A full conversation about your symptoms, history and goals, with clear next steps in writing afterwards.',
   30, 1800000, 2500, array['meet', 'phone', 'whatsapp'], 2),
  ('Extended session', 'extended-session',
   'For long-term conditions and lifestyle plans.',
   'Unhurried time to review a long-term condition, medicines, diet and activity, and to set goals you can keep.',
   60, 3200000, 4500, array['meet', 'phone', 'whatsapp'], 3)
on conflict (slug) do nothing;

-- Weekly hours: every day, 09:00 to 17:00 (site time zone). Adjust on the dashboard.
insert into public.availability_rules (weekday, start_time, end_time)
select d, time '09:00', time '17:00'
  from generate_series(1, 7) as d
 where not exists (select 1 from public.availability_rules);
