/**
 * Composio Integration Module
 * Handles OAuth connections for Google Drive and Dropbox using Composio
 * Each connection is scoped to a user ID for multi-user support
 */

const { Composio } = require('@composio/core');

// Get API key from user's environment variable (COMPOSIO_KEY) or standard name
const apiKey = process.env.COMPOSIO_KEY || process.env.COMPOSIO_API_KEY;

if (!apiKey) {
    console.warn('[Composio] Warning: No Composio API key found. Set COMPOSIO_KEY in .env');
}

// Initialize Composio client
const composio = apiKey ? new Composio({
    apiKey: apiKey
}) : null;

// Toolkit names as used by Composio
const TOOLKIT_MAP = {
    'googledrive': 'GOOGLEDRIVE',
    'google_drive': 'GOOGLEDRIVE',
    'google-drive': 'GOOGLEDRIVE',
    'Google Drive': 'GOOGLEDRIVE',
    'dropbox': 'DROPBOX',
    'Dropbox': 'DROPBOX'
};

/**
 * Normalize toolkit name to Composio format
 */
function normalizeToolkit(toolkit) {
    return TOOLKIT_MAP[toolkit] || toolkit.toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Initiate OAuth flow for a user
 * @param {string} userId - Unique user identifier (from session)
 * @param {string} toolkit - 'GOOGLEDRIVE' or 'DROPBOX'
 * @param {string} callbackUrl - URL to redirect after OAuth completion
 * @returns {Promise<{redirectUrl: string, connectionRequestId: string}>}
 */
async function initiateOAuthFlow(userId, toolkit, callbackUrl) {
    if (!composio) {
        throw new Error('Composio client not initialized. Please set COMPOSIO_KEY in .env');
    }

    const normalizedToolkit = normalizeToolkit(toolkit);

    console.log(`[Composio] Initiating OAuth for user ${userId}, toolkit: ${normalizedToolkit}`);

    try {
        // Use the link method to initiate OAuth flow
        const connectionRequest = await composio.connectedAccounts.initiate({
            userId: userId,
            integrationId: normalizedToolkit,
            redirectUri: callbackUrl
        });

        console.log(`[Composio] OAuth initiated, redirect URL: ${connectionRequest.redirectUrl}`);

        return {
            redirectUrl: connectionRequest.redirectUrl,
            connectionRequestId: connectionRequest.id
        };
    } catch (error) {
        console.error(`[Composio] OAuth initiation failed:`, error.message);
        throw error;
    }
}

/**
 * Get all connected accounts for a user
 * @param {string} userId - Unique user identifier
 * @param {string} [toolkit] - Optional filter by toolkit
 * @returns {Promise<Array<{id: string, toolkit: string, status: string, accountName?: string}>>}
 */
async function getConnectedAccounts(userId, toolkit = null) {
    console.log(`[Composio] Getting connected accounts for user ${userId}${toolkit ? `, toolkit: ${toolkit}` : ''}`);

    try {
        const params = { userId: userId };

        if (toolkit) {
            params.integrationId = normalizeToolkit(toolkit);
        }

        const accounts = await composio.connectedAccounts.list(params);

        const formattedAccounts = (accounts.items || accounts || []).map(account => ({
            id: account.id,
            toolkit: account.integrationId || account.appName,
            status: account.status,
            accountName: account.accountId || account.connectionParams?.accountId || 'Connected Account',
            createdAt: account.createdAt
        }));

        console.log(`[Composio] Found ${formattedAccounts.length} connected accounts`);
        return formattedAccounts;
    } catch (error) {
        console.error(`[Composio] Failed to get accounts:`, error.message);
        throw error;
    }
}

/**
 * Get connection status for a pending connection
 * @param {string} connectionRequestId - The connection request ID
 * @returns {Promise<{status: string, connectedAccount?: object}>}
 */
async function getConnectionStatus(connectionRequestId) {
    console.log(`[Composio] Checking connection status for request ${connectionRequestId}`);

    try {
        const connectionRequest = await composio.connectedAccounts.get({
            connectedAccountId: connectionRequestId
        });

        return {
            status: connectionRequest.status,
            connectedAccount: connectionRequest.status === 'ACTIVE' ? {
                id: connectionRequest.id,
                toolkit: connectionRequest.integrationId,
                accountName: connectionRequest.accountId
            } : null
        };
    } catch (error) {
        console.error(`[Composio] Status check failed:`, error.message);
        throw error;
    }
}

/**
 * Disconnect an account
 * @param {string} connectionId - The connected account ID
 * @returns {Promise<{success: boolean}>}
 */
async function disconnectAccount(connectionId) {
    console.log(`[Composio] Disconnecting account ${connectionId}`);

    try {
        await composio.connectedAccounts.delete({
            connectedAccountId: connectionId
        });

        console.log(`[Composio] Account disconnected successfully`);
        return { success: true };
    } catch (error) {
        console.error(`[Composio] Disconnect failed:`, error.message);
        throw error;
    }
}

/**
 * Execute a tool action with a connected account
 * @param {string} userId - The user ID
 * @param {string} toolkit - The toolkit name
 * @param {string} action - The action to execute (e.g., 'GOOGLEDRIVE_LIST_FILES')
 * @param {object} params - Action parameters
 * @returns {Promise<object>}
 */
async function executeAction(userId, toolkit, action, params = {}) {
    console.log(`[Composio] Executing action ${action} for user ${userId}`);

    try {
        const result = await composio.executeAction({
            action: action,
            params: params,
            userId: userId
        });

        return result;
    } catch (error) {
        console.error(`[Composio] Action execution failed:`, error.message);
        throw error;
    }
}

/**
 * List files from a connected cloud storage account
 * @param {string} userId - The user ID  
 * @param {string} toolkit - 'GOOGLEDRIVE' or 'DROPBOX'
 * @param {string} [folderId] - Optional folder ID to list contents of
 * @returns {Promise<{files: Array<{id: string, name: string, type: string, mimeType?: string, size?: number, url?: string}>}>}
 */
async function listFiles(userId, toolkit, folderId = null) {
    if (!composio) {
        throw new Error('Composio client not initialized');
    }

    const normalizedToolkit = normalizeToolkit(toolkit);
    console.log(`[Composio] Listing files for user ${userId}, toolkit: ${normalizedToolkit}, folder: ${folderId || 'root'}`);

    try {
        let action, params;

        if (normalizedToolkit === 'GOOGLEDRIVE') {
            action = 'GOOGLEDRIVE_LIST_FILES';
            params = {};
            if (folderId) {
                // Use the 'q' query parameter to filter by parent folder
                params.q = `'${folderId}' in parents and trashed=false`;
            } else {
                // List files in root
                params.q = "'root' in parents and trashed=false";
            }
            // Request specific fields
            params.fields = 'files(id,name,mimeType,size,webViewLink,webContentLink,parents)';
        } else if (normalizedToolkit === 'DROPBOX') {
            action = 'DROPBOX_LIST_FOLDER';
            params = {
                path: folderId || '', // Empty string for root
                recursive: false,
                include_media_info: true
            };
        } else {
            throw new Error(`Unsupported toolkit: ${toolkit}`);
        }

        const result = await composio.executeAction({
            action: action,
            params: params,
            entityId: userId
        });

        // Normalize the response
        let files = [];

        if (normalizedToolkit === 'GOOGLEDRIVE' && result.data?.files) {
            files = result.data.files.map(file => ({
                id: file.id,
                name: file.name,
                type: file.mimeType?.includes('folder') ? 'folder' : 'file',
                mimeType: file.mimeType,
                size: file.size ? parseInt(file.size) : null,
                url: file.webContentLink || file.webViewLink,
                viewUrl: file.webViewLink
            }));
        } else if (normalizedToolkit === 'DROPBOX' && result.data?.entries) {
            files = result.data.entries.map(file => ({
                id: file.id || file.path_lower,
                name: file.name,
                type: file['.tag'] === 'folder' ? 'folder' : 'file',
                mimeType: null, // Dropbox doesn't provide this
                size: file.size || null,
                url: file.path_lower, // We'll need to get a download link separately
                path: file.path_lower
            }));
        }

        console.log(`[Composio] Found ${files.length} files`);
        return { files };
    } catch (error) {
        console.error(`[Composio] List files failed:`, error.message);
        throw error;
    }
}

/**
 * Get a download URL for a file
 * @param {string} userId - The user ID
 * @param {string} toolkit - 'GOOGLEDRIVE' or 'DROPBOX'  
 * @param {string} fileId - The file ID
 * @returns {Promise<{url: string}>}
 */
async function getFileDownloadUrl(userId, toolkit, fileId) {
    if (!composio) {
        throw new Error('Composio client not initialized');
    }

    const normalizedToolkit = normalizeToolkit(toolkit);
    console.log(`[Composio] Getting download URL for file ${fileId}`);

    try {
        let action, params;

        if (normalizedToolkit === 'GOOGLEDRIVE') {
            action = 'GOOGLEDRIVE_GET_FILE';
            params = {
                fileId: fileId,
                fields: 'id,name,webContentLink,webViewLink,exportLinks'
            };
        } else if (normalizedToolkit === 'DROPBOX') {
            action = 'DROPBOX_GET_TEMPORARY_LINK';
            params = { path: fileId };
        } else {
            throw new Error(`Unsupported toolkit: ${toolkit}`);
        }

        const result = await composio.executeAction({
            action: action,
            params: params,
            entityId: userId
        });

        let url = null;

        if (normalizedToolkit === 'GOOGLEDRIVE') {
            url = result.data?.webContentLink ||
                result.data?.webViewLink ||
                `https://drive.google.com/uc?export=download&id=${fileId}`;
        } else if (normalizedToolkit === 'DROPBOX') {
            url = result.data?.link || result.data?.url;
        }

        console.log(`[Composio] Got download URL: ${url?.substring(0, 80)}...`);
        return { url };
    } catch (error) {
        console.error(`[Composio] Get download URL failed:`, error.message);
        throw error;
    }
}

/**
 * Upload a file to Google Drive or Dropbox
 * @param {string} userId - The user ID
 * @param {string} toolkit - 'GOOGLEDRIVE' or 'DROPBOX'
 * @param {string} fileUrl - URL of the file to upload
 * @param {string} fileName - Name for the uploaded file
 * @param {string} [folderId] - Optional folder ID to upload to
 * @returns {Promise<{id: string, name: string, url?: string}>}
 */
async function uploadFile(userId, toolkit, fileUrl, fileName, folderId = null) {
    if (!composio) {
        throw new Error('Composio client not initialized');
    }

    const normalizedToolkit = normalizeToolkit(toolkit);
    console.log(`[Composio] Uploading file ${fileName} for user ${userId}, toolkit: ${normalizedToolkit}`);

    try {
        let action, params;

        if (normalizedToolkit === 'GOOGLEDRIVE') {
            action = 'GOOGLEDRIVE_UPLOAD_FILE';
            params = {
                name: fileName,
                url: fileUrl, // URL to download the file from
                parents: folderId ? [folderId] : undefined
            };
        } else if (normalizedToolkit === 'DROPBOX') {
            action = 'DROPBOX_UPLOAD';
            params = {
                path: folderId ? `${folderId}/${fileName}` : `/${fileName}`,
                url: fileUrl
            };
        } else {
            throw new Error(`Unsupported toolkit for upload: ${toolkit}`);
        }

        const result = await composio.executeAction({
            action: action,
            params: params,
            entityId: userId
        });

        console.log(`[Composio] File uploaded successfully:`, result.data?.id || result.data?.name);

        return {
            id: result.data?.id || result.data?.path_lower,
            name: result.data?.name || fileName,
            url: result.data?.webViewLink || result.data?.webContentLink
        };
    } catch (error) {
        console.error(`[Composio] Upload file failed:`, error.message);
        throw error;
    }
}

module.exports = {
    composio,
    initiateOAuthFlow,
    getConnectedAccounts,
    getConnectionStatus,
    disconnectAccount,
    executeAction,
    normalizeToolkit,
    listFiles,
    getFileDownloadUrl,
    uploadFile
};
