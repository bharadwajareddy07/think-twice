-- ============================================================
-- Think Twice — Production Migration Script (Safe & Idempotent)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES & COLUMN MIGRATIONS (Safe for pre-existing tables)
-- ============================================================

-- 1a. Houses Table
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (name IN ('AGNI', 'BHUMI', 'VAYU', 'JAL', 'AKASH')),
    color TEXT NOT NULL DEFAULT '#ef4444',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT houses_name_unique UNIQUE (name)
);

ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#ef4444';
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1b. Admin Roles Table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT admin_roles_user_unique UNIQUE (user_id)
);

ALTER TABLE public.admin_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1c. Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_code TEXT NOT NULL UNIQUE DEFAULT ('TT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))),
    player_token TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    college TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_status_check;
ALTER TABLE public.players ADD CONSTRAINT players_status_check CHECK (status IN ('active', 'disabled', 'ACTIVE', 'DISABLED'));

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS player_token TEXT DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1d. Competitions Table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT DEFAULT ('COMP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))),
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INT NOT NULL DEFAULT 1800,
    difficulty TEXT DEFAULT 'Medium',
    category TEXT DEFAULT 'General Knowledge',
    question_count INT DEFAULT 0,
    participant_limit INT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_code_check;
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_status_check;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_status_check 
    CHECK (status IN ('DRAFT', 'UPCOMING', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'lobby', 'active', 'upcoming', 'paused', 'draft'));

ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS code TEXT DEFAULT ('COMP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)));
ALTER TABLE public.competitions ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.competitions ALTER COLUMN code SET DEFAULT ('COMP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)));

ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS duration INT DEFAULT 1800;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Knowledge';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS question_count INT DEFAULT 0;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS participant_limit INT;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1e. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    prompt TEXT,
    think_twice_prompt TEXT DEFAULT 'Pause and reconsider your initial response. Are you certain?',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT DEFAULT 'Medium',
    category TEXT DEFAULT 'General',
    time_limit INT DEFAULT 30,
    position INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS think_twice_prompt TEXT DEFAULT 'Pause and reconsider your initial response. Are you certain?';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_option TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS time_limit INT DEFAULT 30;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS position INT DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1f. Competition Questions Junction Table
CREATE TABLE IF NOT EXISTS public.competition_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT comp_question_unique UNIQUE (competition_id, question_id)
);

ALTER TABLE public.competition_questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1g. Game Sessions Table (Drop NOT NULL on legacy user_id column if pre-existed)
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    current_question INT DEFAULT 1,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    question_started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT player_comp_session UNIQUE (player_id, competition_id)
);

ALTER TABLE public.game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_status_check 
    CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'not_started', 'in_progress', 'completed', 'abandoned'));

-- Drop NOT NULL from legacy user_id column if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'game_sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.game_sessions ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.players(id) ON DELETE CASCADE;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS current_question INT DEFAULT 1;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'NOT_STARTED';
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1h. Answers Table (Drop NOT NULL from legacy user_id column if present)
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    first_answer TEXT NOT NULL,
    final_answer TEXT NOT NULL,
    did_reconsider BOOLEAN DEFAULT FALSE,
    changed_answer BOOLEAN DEFAULT FALSE,
    changed_to_correct BOOLEAN DEFAULT FALSE,
    changed_to_wrong BOOLEAN DEFAULT FALSE,
    is_correct BOOLEAN DEFAULT FALSE,
    response_time INT DEFAULT 0,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT session_question_answer UNIQUE (game_session_id, question_id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.answers ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.players(id) ON DELETE CASCADE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS first_answer TEXT;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS final_answer TEXT;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS did_reconsider BOOLEAN DEFAULT FALSE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS changed_answer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS changed_to_correct BOOLEAN DEFAULT FALSE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS changed_to_wrong BOOLEAN DEFAULT FALSE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS is_correct BOOLEAN DEFAULT FALSE;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS response_time INT DEFAULT 0;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- 1i. Results Table (Drop NOT NULL from legacy user_id column if present)
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE UNIQUE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    score INT DEFAULT 0,
    accuracy NUMERIC(5,2) DEFAULT 0.00,
    correct INT DEFAULT 0,
    incorrect INT DEFAULT 0,
    unanswered INT DEFAULT 0,
    completion_time INT DEFAULT 0,
    first_answer_accuracy NUMERIC(5,2) DEFAULT 0.00,
    final_answer_accuracy NUMERIC(5,2) DEFAULT 0.00,
    changed_to_correct INT DEFAULT 0,
    changed_to_wrong INT DEFAULT 0,
    player_rank INT,
    house_rank INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.results ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.results ADD COLUMN IF NOT EXISTS game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.players(id) ON DELETE CASCADE;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS accuracy NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS correct INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS incorrect INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS unanswered INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS completion_time INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS first_answer_accuracy NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS final_answer_accuracy NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS changed_to_correct INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS changed_to_wrong INT DEFAULT 0;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS player_rank INT;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS house_rank INT;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 2. SEED DATA — Five Official Houses (idempotent)
-- ============================================================

INSERT INTO public.houses (name, color, description)
VALUES 
    ('AGNI',  '#ef4444', 'Fire — Passion, Drive, and Quick Action'),
    ('BHUMI', '#10b981', 'Earth — Stability, Depth, and Resilience'),
    ('VAYU',  '#06b6d4', 'Wind — Agility, Innovation, and Clarity'),
    ('JAL',   '#3b82f6', 'Water — Flow, Adaptability, and Intuition'),
    ('AKASH', '#8b5cf6', 'Ether — Vision, Wisdom, and Higher Insight')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color, description = EXCLUDED.description;

-- ============================================================
-- 3. SECURITY DEFINER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_operator(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = user_uuid AND role IN ('admin', 'operator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.submit_student_answer(
    p_game_session_id UUID,
    p_player_id UUID,
    p_player_token TEXT,
    p_question_id UUID,
    p_first_answer TEXT,
    p_final_answer TEXT,
    p_response_time INT
)
RETURNS JSONB AS $$
DECLARE
    v_player_exists BOOLEAN;
    v_session_record RECORD;
    v_question_record RECORD;
    v_is_correct BOOLEAN;
    v_is_first_correct BOOLEAN;
    v_changed_answer BOOLEAN;
    v_changed_to_correct BOOLEAN;
    v_changed_to_wrong BOOLEAN;
    v_points INT := 0;
    v_answer_id UUID;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.players 
        WHERE id = p_player_id AND (player_token = p_player_token OR player_token IS NULL) AND status IN ('active', 'ACTIVE')
    ) INTO v_player_exists;

    IF NOT v_player_exists THEN
        RAISE EXCEPTION 'Unauthorized: Player identity token invalid or account disabled.';
    END IF;

    SELECT * INTO v_session_record FROM public.game_sessions 
    WHERE id = p_game_session_id AND player_id = p_player_id AND status IN ('IN_PROGRESS', 'in_progress');

    IF v_session_record.id IS NULL THEN
        RAISE EXCEPTION 'Invalid session: Session not found or already completed.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.answers WHERE game_session_id = p_game_session_id AND question_id = p_question_id) THEN
        RAISE EXCEPTION 'Duplicate submission: Question already answered for this session.';
    END IF;

    SELECT * INTO v_question_record FROM public.questions WHERE id = p_question_id;

    IF v_question_record.id IS NULL THEN
        RAISE EXCEPTION 'Question not found.';
    END IF;

    v_is_first_correct := (p_first_answer = v_question_record.correct_option);
    v_is_correct := (p_final_answer = v_question_record.correct_option);
    v_changed_answer := (p_first_answer <> p_final_answer);
    v_changed_to_correct := (v_changed_answer AND NOT v_is_first_correct AND v_is_correct);
    v_changed_to_wrong := (v_changed_answer AND v_is_first_correct AND NOT v_is_correct);

    IF v_is_correct THEN
        v_points := 100;
        IF v_changed_to_correct THEN
            v_points := v_points + 30;
        ELSIF NOT v_changed_answer THEN
            v_points := v_points + 20;
        END IF;
    ELSIF v_changed_to_wrong THEN
        v_points := -10;
    END IF;

    INSERT INTO public.answers (
        game_session_id, player_id, question_id,
        first_answer, final_answer, did_reconsider, changed_answer,
        changed_to_correct, changed_to_wrong, is_correct, response_time
    ) VALUES (
        p_game_session_id, p_player_id, p_question_id,
        p_first_answer, p_final_answer, TRUE, v_changed_answer,
        v_changed_to_correct, v_changed_to_wrong, v_is_correct, p_response_time
    ) RETURNING id INTO v_answer_id;

    UPDATE public.game_sessions 
    SET score = GREATEST(0, score + v_points), question_started_at = NOW()
    WHERE id = p_game_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'answer_id', v_answer_id,
        'is_correct', v_is_correct,
        'correct_option', v_question_record.correct_option,
        'explanation', v_question_record.explanation,
        'points_earned', v_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.finalize_game_session(
    p_game_session_id UUID,
    p_player_id UUID,
    p_player_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_player_exists BOOLEAN;
    v_session RECORD;
    v_total_questions INT;
    v_correct INT := 0;
    v_incorrect INT := 0;
    v_unanswered INT := 0;
    v_first_correct INT := 0;
    v_final_correct INT := 0;
    v_changed_to_correct INT := 0;
    v_changed_to_wrong INT := 0;
    v_accuracy NUMERIC(5,2) := 0.00;
    v_first_accuracy NUMERIC(5,2) := 0.00;
    v_final_accuracy NUMERIC(5,2) := 0.00;
    v_result_id UUID;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.players 
        WHERE id = p_player_id AND (player_token = p_player_token OR player_token IS NULL)
    ) INTO v_player_exists;

    IF NOT v_player_exists THEN
        RAISE EXCEPTION 'Unauthorized player identity token.';
    END IF;

    SELECT * INTO v_session FROM public.game_sessions 
    WHERE id = p_game_session_id AND player_id = p_player_id;
    
    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'Game session not found.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.results WHERE game_session_id = p_game_session_id) THEN
        SELECT id INTO v_result_id FROM public.results WHERE game_session_id = p_game_session_id;
        RETURN jsonb_build_object('success', true, 'result_id', v_result_id, 'already_finalized', true);
    END IF;

    SELECT COUNT(*) INTO v_total_questions FROM public.questions;
    IF v_total_questions = 0 THEN v_total_questions := 1; END IF;

    SELECT 
        COUNT(*) FILTER (WHERE is_correct = true),
        COUNT(*) FILTER (WHERE is_correct = false),
        COUNT(*) FILTER (WHERE first_answer = (SELECT correct_option FROM public.questions q WHERE q.id = answers.question_id)),
        COUNT(*) FILTER (WHERE final_answer = (SELECT correct_option FROM public.questions q WHERE q.id = answers.question_id)),
        COUNT(*) FILTER (WHERE changed_to_correct = true),
        COUNT(*) FILTER (WHERE changed_to_wrong = true)
    INTO 
        v_correct, v_incorrect, v_first_correct, v_final_correct, v_changed_to_correct, v_changed_to_wrong
    FROM public.answers WHERE game_session_id = p_game_session_id;

    v_unanswered := GREATEST(0, v_total_questions - (v_correct + v_incorrect));
    v_accuracy := ROUND((v_correct::NUMERIC / v_total_questions::NUMERIC) * 100, 2);
    v_first_accuracy := ROUND((v_first_correct::NUMERIC / v_total_questions::NUMERIC) * 100, 2);
    v_final_accuracy := ROUND((v_final_correct::NUMERIC / v_total_questions::NUMERIC) * 100, 2);

    INSERT INTO public.results (
        game_session_id, player_id, competition_id, score, accuracy,
        correct, incorrect, unanswered,
        first_answer_accuracy, final_answer_accuracy,
        changed_to_correct, changed_to_wrong
    ) VALUES (
        p_game_session_id, p_player_id, v_session.competition_id, v_session.score,
        v_accuracy, v_correct, v_incorrect, v_unanswered,
        v_first_accuracy, v_final_accuracy,
        v_changed_to_correct, v_changed_to_wrong
    ) RETURNING id INTO v_result_id;

    UPDATE public.game_sessions 
    SET status = 'COMPLETED', completed_at = NOW() 
    WHERE id = p_game_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'result_id', v_result_id,
        'score', v_session.score,
        'accuracy', v_accuracy
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- ROW LEVEL SECURITY POLICIES

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('houses','admin_roles','players','competitions','questions',
                            'competition_questions','game_sessions','answers','results')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY houses_select_policy ON public.houses FOR SELECT USING (true);
CREATE POLICY houses_admin_policy ON public.houses FOR ALL USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY admin_roles_select ON public.admin_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY admin_roles_admin ON public.admin_roles FOR ALL USING (user_id = auth.uid());

CREATE POLICY players_select ON public.players FOR SELECT USING (true);
CREATE POLICY players_insert ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY players_admin_update ON public.players FOR UPDATE USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY players_admin_delete ON public.players FOR DELETE USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY competitions_select ON public.competitions FOR SELECT USING (true);
CREATE POLICY competitions_admin ON public.competitions FOR ALL USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY questions_select ON public.questions FOR SELECT USING (true);
CREATE POLICY questions_admin ON public.questions FOR ALL USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY comp_questions_select ON public.competition_questions FOR SELECT USING (true);
CREATE POLICY comp_questions_admin ON public.competition_questions FOR ALL USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY game_sessions_select ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY game_sessions_insert ON public.game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY game_sessions_admin ON public.game_sessions FOR ALL USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY answers_select ON public.answers FOR SELECT USING (true);
CREATE POLICY answers_admin ON public.answers FOR ALL USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY results_select ON public.results FOR SELECT USING (true);
CREATE POLICY results_admin ON public.results FOR ALL USING (public.is_admin_or_operator(auth.uid()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
