
const supabaseClient = typeof breastCareHandoff !== "undefined" && breastCareHandoff
    ? null
    : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (supabaseClient) console.log("Identity Center connected to Supabase!");
