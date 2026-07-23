// api.js - All Supabase database queries

async function getSB() {
    const { createClient } = supabase;
    return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

// Cases
async function getCases(status = null) {
    const sb = await getSB();
    let query = sb.from('cases').select('*').order('created_at', { ascending: false });
    
    if (!isAdmin()) {
        query = query.or(`provider_id.eq.${currentUser.id},assigned_radiologist_id.eq.${currentUser.id}`);
    }
    if (status) query = query.eq('status', status);
    
    const { data } = await query;
    return data || [];
}

async function getCaseById(id) {
    const sb = await getSB();
    const { data } = await sb.from('cases').select('*').eq('id', id).single();
    return data;
}

async function createCase(caseData) {
    const sb = await getSB();
    const { data, error } = await sb.from('cases').insert([{
        provider_id: currentUser.id,
        modality: caseData.modality,
        body_system: caseData.bodySystem,
        urgency: caseData.urgency,
        provider_notes: caseData.notes,
        status: 'pending_admin_review'
    }]).select().single();
    
    if (error) throw error;
    return data;
}

async function updateCase(id, updates) {
    const sb = await getSB();
    const { data, error } = await sb.from('cases').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function getAvailableCases() {
    const sb = await getSB();
    const { data } = await sb.from('cases')
        .select('*')
        .eq('status', 'awaiting_radiologist')
        .not('excluded_radiologists', 'cs', `{${currentUser.id}}`)
        .order('created_at', { ascending: false });
    return data || [];
}

// Pricing
async function getPricing() {
    const sb = await getSB();
    const { data } = await sb.from('pricing').select('*').eq('is_active', true);
    return data || [];
}

async function savePricing(pricingData) {
    const sb = await getSB();
    const { data, error } = await sb.from('pricing').insert([pricingData]).select().single();
    if (error) throw error;
    return data;
}

async function updatePricing(id, updates) {
    const sb = await getSB();
    const { error } = await sb.from('pricing').update(updates).eq('id', id);
    if (error) throw error;
}

async function deletePricing(id) {
    const sb = await getSB();
    const { error } = await sb.from('pricing').delete().eq('id', id);
    if (error) throw error;
}

// Wallet
async function getWalletBalance(userId = null) {
    const sb = await getSB();
    const id = userId || currentUser.id;
    const { data } = await sb.rpc('get_wallet_balance', { user_id: id });
    return data?.[0] || { net_balance: 0, total_owed_or_earned: 0, total_paid_or_received: 0 };
}

async function getTransactions() {
    const sb = await getSB();
    const { data } = await sb.from('transactions')
        .select('*, cases(case_number)')
        .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });
    return data || [];
}

async function recordPayment(caseId, fromUserId, toUserId, amount, type, notes) {
    const sb = await getSB();
    const { data, error } = await sb.from('transactions').insert([{
        case_id: caseId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount,
        type,
        notes,
        created_by: currentUser.id
    }]).select().single();
    if (error) throw error;
    return data;
}

// Notifications
async function getNotifications() {
    const sb = await getSB();
    const { data } = await sb.from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);
    return data || [];
}

async function markNotificationRead(id) {
    const sb = await getSB();
    await sb.from('notifications').update({ is_read: true, read_at: new Date() }).eq('id', id);
}

// Users (Admin)
async function getUsers() {
    const sb = await getSB();
    const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function updateUser(id, updates) {
    const sb = await getSB();
    const { error } = await sb.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
}

// Settings (Admin)
async function getSettings() {
    const sb = await getSB();
    const { data } = await sb.from('admin_settings').select('*');
    return data || [];
}

async function updateSetting(key, value) {
    const sb = await getSB();
    const { error } = await sb.from('admin_settings').update({ 
        value, 
        updated_by: currentUser.id,
        updated_at: new Date()
    }).eq('key', key);
    if (error) throw error;
}

// File Upload
async function uploadFile(bucket, caseId, file) {
    const sb = await getSB();
    const path = `${caseId}/${Date.now()}_${file.name}`;
    const { data, error } = await sb.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return { path, name: file.name, size: file.size, type: file.type };
}

async function downloadFile(bucket, path) {
    const sb = await getSB();
    
    // Create signed URL (valid for 60 seconds)
    const { data, error } = await sb.storage
        .from(bucket)
        .createSignedUrl(path, 60);
    
    if (error) throw error;
    
    // Open the signed URL
    window.open(data.signedUrl, '_blank');
    
    return data;
}

// Dashboard Stats
async function getDashboardStats() {
    const cases = await getCases();
    
    const active = cases.filter(c => !['completed', 'resolved_closed', 'rejected_by_admin'].includes(c.status));
    const pending = cases.filter(c => {
        if (isAdmin()) return ['pending_admin_review', 'pending_admin_review_rad_work', 'disputed'].includes(c.status);
        if (isSP()) return c.status === 'pending_sp_review';
        if (isRad()) return ['assigned', 'revision_requested'].includes(c.status);
        return false;
    });
    const completed = cases.filter(c => c.status === 'completed');
    const wallet = await getWalletBalance();
    
    return {
        activeCount: active.length,
        pendingCount: pending.length,
        completedCount: completed.length,
        balance: wallet.net_balance || 0
    };
}

// Matching radiologists
async function getMatchingRadiologists(modality, bodySystem) {
    const sb = await getSB();
    const { data } = await sb.rpc('match_radiologists_to_case', {
        case_modality: modality,
        case_body_system: bodySystem,
        case_urgency: 'routine'
    });
    return data || [];
}

// Add to api.js after the getTransactions function

// Get transactions for a specific user (Admin only)
async function getUserTransactions(userId) {
    const sb = await getSB();
    const { data } = await sb
        .from('transactions')
        .select('*, cases(case_number, provider_id, assigned_radiologist_id)')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });
    return data || [];
}

// Get user cases with transaction data (Admin only)
async function getUserCases(userId, role, statusFilter = 'unsettled') {
    const sb = await getSB();
    let query = sb.from('cases')
        .select('*, transactions!left(*)')
        .order('created_at', { ascending: true });
    
    // Filter by user role
    if (role === 'service_provider') {
        query = query.eq('provider_id', userId);
    } else if (role === 'radiologist') {
        query = query.eq('assigned_radiologist_id', userId);
    }
    
    // Only completed/resolved cases
    query = query.in('status', ['completed', 'resolved_closed']);
    
    const { data } = await query;
    let cases = data || [];
    
    // Filter by settlement status if needed
    if (statusFilter !== 'all') {
        const isSettled = statusFilter === 'settled';
        cases = cases.filter(c => {
            const paid = getCasePaidAmount(c);
            return isSettled ? paid >= (c.price || 0) : paid < (c.price || 0);
        });
    }
    
    return cases;
}

// Helper function to calculate paid amount for a case
function getCasePaidAmount(caseItem) {
    if (!caseItem.transactions) return 0;
    return caseItem.transactions
        .filter(t => t.case_id === caseItem.id)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
}

// Get wallet balance for a specific user (Admin only)
async function getUserWalletBalance(userId) {
    const sb = await getSB();
    const { data } = await sb.rpc('get_wallet_balance', { user_id: userId });
    return data?.[0] || { net_balance: 0, total_owed_or_earned: 0, total_paid_or_received: 0 };
}


// Add to js/api.js
async function cleanupExpiredFiles() {
    const sb = await getSB();
    
    // Get expired cases
    const { data: expiredCases, error } = await sb
        .rpc('get_expired_file_cases');
    
    if (error) throw error;
    if (!expiredCases || expiredCases.length === 0) return 0;
    
    let cleaned = 0;
    
    for (const exp of expiredCases) {
        try {
            // Get case file metadata
            const { data: caseData } = await sb
                .from('cases')
                .select('provider_files, radiologist_files')
                .eq('id', exp.case_id)
                .single();
            
            if (caseData) {
                // Collect all file paths
                const filesToDelete = [];
                
                for (const file of (caseData.provider_files || [])) {
                    filesToDelete.push(file.path);
                }
                for (const file of (caseData.radiologist_files || [])) {
                    filesToDelete.push(file.path);
                }
                
                // Delete from both buckets (try both, ignore errors)
                if (filesToDelete.length > 0) {
                    try {
                        await sb.storage.from('case-files').remove(filesToDelete);
                    } catch (e) {
                        console.warn('case-files cleanup:', e.message);
                    }
                    try {
                        await sb.storage.from('radiologist-files').remove(filesToDelete);
                    } catch (e) {
                        console.warn('radiologist-files cleanup:', e.message);
                    }
                }
            }
            
            // Mark as deleted in database
            await sb.from('cases')
                .update({ files_deleted_at: new Date().toISOString() })
                .eq('id', exp.case_id);
            
            cleaned++;
            
        } catch (error) {
            console.error(`Failed case ${exp.case_id}:`, error);
        }
    }
    
    return cleaned;
}