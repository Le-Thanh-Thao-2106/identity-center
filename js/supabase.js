
const supabaseClient = typeof openBreastCareSignIn !== "undefined" && openBreastCareSignIn
    ? null
    : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (supabaseClient) console.log("Identity Center connected to Supabase!");
