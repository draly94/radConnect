// js/auth.js - Fixed version
let currentUser = null;
let currentProfile = null;

async function initSupabase() {
    const { createClient } = supabase;
    return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

async function checkAuth() {
    const sb = await initSupabase();
    const { data: { session } } = await sb.auth.getSession();
    
    if (!session) {
        window.location.href = CONFIG.LOGIN_PAGE;
        return null;
    }
    
    currentUser = session.user;
    
    // Load profile from database
    const { data: profile, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (error) {
        console.error('Error loading profile:', error);
        window.location.href = CONFIG.LOGIN_PAGE;
        return null;
    }
    
    currentProfile = profile;
    console.log('Profile loaded:', currentProfile); // Debug
    
    return { user: currentUser, profile: currentProfile };
}

async function login(email, password) {
    const sb = await initSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signup(email, password, userData = {}) {
    const sb = await initSupabase();
    const { data, error } = await sb.auth.signUp({ 
        email, 
        password,
        options: {
            data: userData
        }
    });
    if (error) throw error;
    return data;
}

async function logout() {
    const sb = await initSupabase();
    await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
    window.location.href = CONFIG.LOGIN_PAGE;
}

function isAdmin() { 
    console.log('Checking admin, profile role:', currentProfile?.role);
    return currentProfile?.role === 'admin'; 
}

function isSP() { 
    console.log('Checking SP, profile role:', currentProfile?.role);
    return currentProfile?.role === 'service_provider'; 
}

function isRad() { 
    return currentProfile?.role === 'radiologist'; 
}