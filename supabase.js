const SUPABASE_URL = "https://drxrxdnrlnmjrczoshww.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyeHJ4ZG5ybG5tanJjem9zaHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTk2NTMsImV4cCI6MjA4ODYzNTY1M30.xt7IgeplSgxbED5dM8dqe2hxH0ydQp-SBtX1_ojHghs";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

export default supabase;