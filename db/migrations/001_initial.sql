CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  credibility_score INTEGER CHECK (credibility_score BETWEEN 0 AND 100),
  category TEXT CHECK (category IN (
    'harassment','disability','refugee',
    'domestic_violence','medical_neglect',
    'workplace_discrimination','other'
  )),
  region TEXT,
  guest_readiness TEXT CHECK (guest_readiness IN ('experienced','first_time')),
  contact_pathway TEXT,
  source_urls TEXT[],
  episode_matches JSONB,
  pipeline_status TEXT DEFAULT 'pending' CHECK (pipeline_status IN (
    'pending','verified','enriched','screened',
    'matched','approved','archived','human_review'
  )),
  safety_cleared BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE episode_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  air_date DATE,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episode_themes(id),
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'sent','opened','responded',
    'confirmed','pre_interview','recorded','aired'
  )),
  invite_email_body TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  aired_at TIMESTAMPTZ
);

CREATE TABLE human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  flag_reason TEXT NOT NULL,
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON cases USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX ON episode_themes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
