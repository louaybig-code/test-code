import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  ApiEnvelope,
  AuthTokens,
  BoardData,
  Channel,
  ChannelMessage,
  Epic,
  Notification,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  PaginatedResponse,
  PersonalToken,
  Project,
  ProjectFolder,
  ProjectPermissions,
  ProjectStats,
  ProjectStatus,
  ProjectWorkflow,
  Role,
  RolePermissionDto,
  RolesCatalog,
  SavedFilter,
  SearchResults,
  Sprint,
  Task,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  TaskSubtask,
  UserProfile,
  Workspace,
} from '../types';

// Use environment variable or fallback to proxy route
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/smash_api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with cookies
});

// In-memory token storage + sessionStorage backup so it survives page refresh
let memoryAccessToken: string | null = sessionStorage.getItem('smash_access_token');

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
  if (token) {
    sessionStorage.setItem('smash_access_token', token);
  } else {
    sessionStorage.removeItem('smash_access_token');
  }
};

export const getAccessToken = () => memoryAccessToken;

export const getRefreshTokenFromStorage = (): string | null => {
  return localStorage.getItem('smash_refresh_token');
};

export const setRefreshTokenInStorage = (token: string | null) => {
  if (token) {
    localStorage.setItem('smash_refresh_token', token);
  } else {
    localStorage.removeItem('smash_refresh_token');
  }
};

// Request interceptor to append Bearer token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (memoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${memoryAccessToken}`;
  }
  return config;
});

// Response interceptor for 401 handling & token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<any>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshTokenFromStorage();
      if (!refreshToken) {
        setAccessToken(null);
        setRefreshTokenInStorage(null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post<ApiEnvelope<AuthTokens>>(`${BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        if (refreshResponse.data?.success && refreshResponse.data.data) {
          const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
          setAccessToken(accessToken);
          if (newRefreshToken) {
            setRefreshTokenInStorage(newRefreshToken);
          }
          processQueue(null, accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        setRefreshTokenInStorage(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
const ERROR_MESSAGES_FR: Record<string, string> = {
  // Auth errors
  'CONFLICT': 'Un compte avec cet email existe déjà',
  'An account with this email already exists': 'Un compte avec cet email existe déjà',
  'Invalid credentials': 'Email ou mot de passe incorrect',
  'UNAUTHORIZED': 'Email ou mot de passe incorrect',
  'Invalid token': 'Session expirée, veuillez vous reconnecter',
  'Token expired': 'Session expirée, veuillez vous reconnecter',
  'Email already exists': 'Un compte avec cet email existe déjà',
  'Email not verified': 'Email non vérifié',
  'Account locked': 'Compte verrouillé',
  'Account suspended': 'Compte suspendu',
  'Invalid refresh token': 'Session expirée, veuillez vous reconnecter',
  'Refresh token expired': 'Session expirée, veuillez vous reconnecter',
  
  // Validation errors
  'VALIDATION_ERROR': 'Données invalides',
  'Invalid email format': 'Format d\'email invalide',
  'Password too short': 'Mot de passe trop court (minimum 8 caractères)',
  'Password too weak': 'Mot de passe trop faible',
  'Required field missing': 'Champ obligatoire manquant',
  'Invalid input': 'Données invalides',
  'Invalid format': 'Format invalide',
  'Missing required fields': 'Champs obligatoires manquants',
  'Invalid parameter': 'Paramètre invalide',
  'Invalid request body': 'Corps de requête invalide',
  
  // Permission errors
  'FORBIDDEN': 'Vous n\'avez pas le rôle requis pour cette action',
  'Insufficient permissions': 'Vous n\'avez pas le rôle requis pour cette action',
  'Access denied': 'Vous n\'avez pas le rôle requis pour cette action',
  'Your role is read-only': 'Vous n\'avez pas le rôle requis pour cette action',
  'Your role is read-only and cannot modify': 'Vous n\'avez pas le rôle requis pour cette action',
  'Requires one of roles': 'Vous n\'avez pas le rôle requis pour cette action',
  'Not authorized': 'Vous n\'avez pas le rôle requis pour cette action',
  'Permission denied': 'Vous n\'avez pas le rôle requis pour cette action',
  'Role not found': 'Rôle introuvable',
  'Member not found': 'Membre introuvable',
  'Project member not found': 'Membre du projet introuvable',
  'Organization member not found': 'Membre de l\'organisation introuvable',
  'You cannot remove yourself': 'Vous ne pouvez pas vous retirer vous-même',
  'Cannot remove the last owner': 'Impossible de retirer le dernier propriétaire',
  'You do not have permission': 'Vous n\'avez pas le rôle requis pour cette action',
  
  // Resource errors
  'NOT_FOUND': 'Ressource introuvable',
  'Resource not found': 'Ressource introuvable',
  'Project not found': 'Projet introuvable',
  'Task not found': 'Tâche introuvable',
  'Organization not found': 'Organisation introuvable',
  'Workspace not found': 'Espace de travail introuvable',
  'User not found': 'Utilisateur introuvable',
  'Sprint not found': 'Sprint introuvable',
  'Epic not found': 'Epic introuvable',
  'Comment not found': 'Commentaire introuvable',
  'Attachment not found': 'Pièce jointe introuvable',
  'Invitation not found': 'Invitation introuvable',
  
  // Conflict errors
  'Resource already exists': 'Cette ressource existe déjà',
  'Duplicate entry': 'Entrée dupliquée',
  'Already exists': 'Existe déjà',
  'Name already taken': 'Ce nom est déjà utilisé',
  'Slug already exists': 'Cet identifiant existe déjà',
  
  // Server errors
  'INTERNAL_SERVER_ERROR': 'Erreur serveur, veuillez réessayer',
  'Internal server error': 'Erreur serveur, veuillez réessayer',
  'Server error': 'Erreur serveur',
  'Database error': 'Erreur de base de données',
  'BAD_GATEWAY': 'Service temporairement indisponible',
  'Bad gateway': 'Service temporairement indisponible',
  'SERVICE_UNAVAILABLE': 'Service temporairement indisponible',
  'Service unavailable': 'Service temporairement indisponible',
  'GATEWAY_TIMEOUT': 'Délai d\'attente dépassé',
  'Gateway timeout': 'Délai d\'attente dépassé',
  'Service temporarily unavailable': 'Service temporairement indisponible',
  
  // Rate limiting
  'Too Many Requests': 'Trop de requêtes, veuillez patienter quelques instants',
  'THROTTLER': 'Trop de requêtes, veuillez patienter quelques instants',
  'Rate limit exceeded': 'Limite de requêtes dépassée, veuillez patienter',
  'Too many attempts': 'Trop de tentatives, veuillez patienter',
  
  // Network errors
  'Network Error': 'Erreur de connexion, vérifiez votre connexion internet',
  'Request failed': 'Échec de la requête',
  'Connection failed': 'Échec de la connexion',
  'Connection timeout': 'Délai de connexion dépassé',
  'Request timeout': 'Délai de requête dépassé',
  'No internet connection': 'Pas de connexion internet',
  
  // File upload errors
  'File too large': 'Fichier trop volumineux',
  'Invalid file type': 'Type de fichier invalide',
  'Upload failed': 'Échec du téléchargement',
  'File not found': 'Fichier introuvable',
  
  // Business logic errors
  'Cannot delete system role': 'Impossible de supprimer un rôle système',
  'Cannot delete role with': 'Impossible de supprimer ce rôle car des membres lui sont assignés. Réassignez-les d\'abord.',
  'Cannot modify system role': 'Impossible de modifier un rôle système',
  'Cannot remove last owner': 'Impossible de retirer le dernier propriétaire',
  'The channel creator cannot leave': 'Le créateur du canal ne peut pas le quitter — supprimez-le si vous souhaitez le fermer.',
  'This user reaches the project through their': 'Cet utilisateur accède au projet via son rôle dans l\'organisation. Pour modifier son rôle, modifiez-le au niveau de l\'organisation ou retirez-le de celle-ci.',
  'role in the organization': 'rôle dans l\'organisation',
  'not through a project membership': 'pas via une adhésion au projet',
  'Change their organization role': 'Modifiez leur rôle d\'organisation',
  'remove them from the organization': 'ou retirez-les de l\'organisation',
  'Sprint already started': 'Le sprint a déjà commencé',
  'Sprint already completed': 'Le sprint est déjà terminé',
  'Task already archived': 'La tâche est déjà archivée',
  'Project already archived': 'Le projet est déjà archivé',
  'Cannot archive active sprint': 'Impossible d\'archiver un sprint actif',
  'Invalid status transition': 'Transition de statut invalide',
  'Circular dependency detected': 'Dépendance circulaire détectée',
  
  // Payment/Subscription errors
  'Payment required': 'Paiement requis',
  'Subscription expired': 'Abonnement expiré',
  'Subscription required': 'Abonnement requis',
  'Quota exceeded': 'Quota dépassé',
  'Plan limit reached': 'Limite du forfait atteinte',
};

// Helper to extract user-friendly error message
function getErrorMessage(error: any): string {
  const code = error.response?.data?.error?.code;
  const apiMessage = error.response?.data?.error?.message || error.response?.data?.message;

  // For FORBIDDEN errors, always show a clean French message
  // (backend messages like "Requires one of roles: OWNER, ADMIN" are technical — not user-friendly)
  if (code === 'FORBIDDEN' || error.response?.status === 403) {
    // Always use the specific role-based message for FORBIDDEN errors
    return 'Vous n\'avez pas le rôle requis pour cette action';
  }

  // For UNAUTHORIZED errors
  if (code === 'UNAUTHORIZED' || error.response?.status === 401) {
    return 'Session expirée, veuillez vous reconnecter';
  }

  // Try exact match on API message first, then on code
  if (apiMessage) {
    const translated = ERROR_MESSAGES_FR[apiMessage] || ERROR_MESSAGES_FR[code || ''];
    if (translated) return translated;
    // Partial match — check if any dictionary key is contained in the message
    const partialMatch = Object.keys(ERROR_MESSAGES_FR).find(
      (key) => apiMessage.toLowerCase().includes(key.toLowerCase()) && key.length > 8
    );
    if (partialMatch) return ERROR_MESSAGES_FR[partialMatch];
    // If no translation found but we have a code match, use that
    if (code && ERROR_MESSAGES_FR[code]) return ERROR_MESSAGES_FR[code];
    // Return the raw API message only if it looks user-friendly (no technical jargon)
    if (apiMessage && !apiMessage.startsWith('Requires') && !apiMessage.includes('ability') && !apiMessage.includes('read-only')) {
      return apiMessage;
    }
    // Fallback to code translation
    if (code && ERROR_MESSAGES_FR[code]) return ERROR_MESSAGES_FR[code];
  }
  
  // Try to get error code alone
  if (code && ERROR_MESSAGES_FR[code]) {
    return ERROR_MESSAGES_FR[code];
  }
  
  // Handle ALL HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    
    // 2xx Success (shouldn't normally be errors, but handle anyway)
    if (status >= 200 && status < 300) {
      return 'Opération réussie';
    }
    
    // 3xx Redirection
    if (status >= 300 && status < 400) {
      return 'Redirection requise';
    }
    
    // 4xx Client Errors
    switch (status) {
      case 400: return 'Requête invalide - vérifiez les données envoyées';
      case 401: return 'Session expirée, veuillez vous reconnecter';
      case 402: return 'Paiement requis';
      case 403: return 'Vous n\'avez pas la permission d\'effectuer cette action';
      case 404: return 'Ressource introuvable';
      case 405: return 'Méthode non autorisée';
      case 406: return 'Format de réponse non acceptable';
      case 407: return 'Authentification proxy requise';
      case 408: return 'Délai de requête dépassé';
      case 409: return 'Conflit - cette ressource existe déjà ou est en cours d\'utilisation';
      case 410: return 'Cette ressource n\'est plus disponible';
      case 411: return 'Longueur de contenu requise';
      case 412: return 'Précondition échouée';
      case 413: return 'Contenu trop volumineux';
      case 414: return 'URL trop longue';
      case 415: return 'Type de média non supporté';
      case 416: return 'Plage non satisfaisable';
      case 417: return 'Attente échouée';
      case 418: return 'Je suis une théière'; // Easter egg!
      case 421: return 'Requête mal dirigée';
      case 422: return 'Données invalides - vérifiez les informations saisies';
      case 423: return 'Ressource verrouillée';
      case 424: return 'Dépendance échouée';
      case 425: return 'Trop tôt';
      case 426: return 'Mise à niveau requise';
      case 428: return 'Précondition requise';
      case 429: return 'Trop de requêtes - veuillez patienter quelques instants';
      case 431: return 'En-têtes de requête trop volumineux';
      case 451: return 'Indisponible pour des raisons légales';
    }
    
    // 5xx Server Errors
    switch (status) {
      case 500: return 'Erreur serveur - veuillez réessayer dans quelques instants';
      case 501: return 'Fonctionnalité non implémentée';
      case 502: return 'Passerelle incorrecte - service temporairement indisponible';
      case 503: return 'Service temporairement indisponible - maintenance en cours';
      case 504: return 'Délai d\'attente de la passerelle dépassé';
      case 505: return 'Version HTTP non supportée';
      case 506: return 'Variante négocie également';
      case 507: return 'Stockage insuffisant';
      case 508: return 'Boucle détectée';
      case 510: return 'Non étendu';
      case 511: return 'Authentification réseau requise';
    }
    
    // Generic fallback for unknown status codes
    if (status >= 400 && status < 500) {
      return `Erreur client (${status}) - veuillez vérifier votre requête`;
    }
    if (status >= 500) {
      return `Erreur serveur (${status}) - veuillez réessayer plus tard`;
    }
  }
  
  // Handle network errors
  if (error.message === 'Network Error') {
    return ERROR_MESSAGES_FR['Network Error'];
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'Délai de connexion dépassé';
  }
  
  if (error.code === 'ERR_NETWORK') {
    return 'Erreur réseau - vérifiez votre connexion internet';
  }
  
  // Check if message exists in our translations
  if (error.message && ERROR_MESSAGES_FR[error.message]) {
    return ERROR_MESSAGES_FR[error.message];
  }
  
  // Fallback to original error message or generic message
  return error.message || 'Une erreur est survenue - veuillez réessayer';
}

// Helper extractor to unwrap ApiEnvelope with better error handling
async function requestData<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const res = await promise;
    if (!res.data.success) {
      const code = res.data.error?.code || '';
      const rawMsg = res.data.error?.message || res.data.message || '';
      // Always route through getErrorMessage logic for consistent French translation
      // Build a fake error object so getErrorMessage can handle code/message properly
      const fakeError = {
        response: {
          status: code === 'FORBIDDEN' ? 403 : code === 'UNAUTHORIZED' ? 401 : code === 'NOT_FOUND' ? 404 : 400,
          data: { error: { code, message: rawMsg }, message: rawMsg },
        },
      };
      throw new Error(getErrorMessage(fakeError));
    }
    return res.data.data as T;
  } catch (error: any) {
    // Re-throw with user-friendly French message
    throw new Error(getErrorMessage(error));
  }
}

// ── Global error translation interceptor ─────────────────────────────────────
// Runs AFTER the 401-refresh interceptor. Translates every rejected error into
// a French Error object so components never see raw English axios messages.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<any>>) => {
    const frenchMessage = getErrorMessage(error);
    const translated = new Error(frenchMessage) as any;
    // Keep original response so callers can still check status codes if needed
    translated.response = error.response;
    translated.status = error.response?.status;
    translated.originalError = error;
    return Promise.reject(translated);
  }
);

// API Service functions
export const apiService = {
  // Health
  getHealth: () => requestData<{ status: string; database: string }>(api.get('/health')),

  // Auth
  register: (payload: { email: string; password: string; firstName?: string; lastName?: string }) =>
    requestData<AuthTokens>(api.post('/api/v1/auth/register', payload)),

  login: (payload: { email: string; password: string }) =>
    requestData<AuthTokens>(api.post('/api/v1/auth/login', payload)),

  refresh: (refreshToken: string) =>
    requestData<AuthTokens>(api.post('/api/v1/auth/refresh', { refreshToken })),

  logout: (refreshToken: string) =>
    api.post('/api/v1/auth/logout', { refreshToken }).then((res) => res.data),

  ssoRedirect: (provider: string) =>
    requestData<{ url?: string }>(api.post(`/api/v1/auth/sso/${provider}/redirect`)),

  ssoCallback: (provider: string, data?: any) =>
    requestData<AuthTokens>(api.post(`/api/v1/auth/sso/${provider}/callback`, data)),

  // Profile
  getMe: () => requestData<UserProfile>(api.get('/api/v1/me')),

  updateMe: (data: FormData | Partial<UserProfile>) => {
    if (data instanceof FormData) {
      return requestData<UserProfile>(
        api.patch('/api/v1/me', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    }
    return requestData<UserProfile>(api.patch('/api/v1/me', data));
  },

  updatePassword: (payload: { currentPassword?: string; newPassword?: string }) =>
    api.patch('/api/v1/me/password', payload),

  getNotificationSettings: () => requestData<UserProfile['notificationSettings']>(api.get('/api/v1/me/notification-settings')),

  updateNotificationSettings: (payload: { inApp?: boolean; email?: boolean; push?: boolean }) =>
    requestData<UserProfile['notificationSettings']>(api.patch('/api/v1/me/notification-settings', payload)),

  // Personal Access Tokens
  getTokens: () => requestData<PersonalToken[]>(api.get('/api/v1/tokens')),

  createToken: (payload: { name: string; abilities?: string[]; expiresAt?: string }) =>
    requestData<PersonalToken>(api.post('/api/v1/tokens', payload)),

  deleteToken: (tokenStringOrId: string) =>
    api.delete(`/api/v1/tokens/${tokenStringOrId}`),

  // Organizations
  getOrganizations: () => requestData<Organization[]>(api.get('/api/v1/organizations')),

  createOrganization: (payload: { name: string }) =>
    requestData<Organization>(api.post('/api/v1/organizations', payload)),

  getOrganization: (orgId: string) =>
    requestData<Organization>(api.get(`/api/v1/organizations/${orgId}`)),

  updateOrganization: (orgId: string, payload: { name?: string }) =>
    requestData<Organization>(api.patch(`/api/v1/organizations/${orgId}`, payload)),

  deleteOrganization: (orgId: string) =>
    api.delete(`/api/v1/organizations/${orgId}`),

  getOrgWorkspaces: (orgId: string) =>
    requestData<Workspace[]>(api.get(`/api/v1/organizations/${orgId}/workspaces`)),

  createOrgWorkspace: (orgId: string, payload: { name: string }) =>
    requestData<Workspace>(api.post(`/api/v1/organizations/${orgId}/workspaces`, payload)),

  getOrgMembers: (orgId: string) =>
    requestData<OrganizationMember[]>(api.get(`/api/v1/organizations/${orgId}/members`)),

  deleteOrgMember: (orgId: string, userId: string) =>
    api.delete(`/api/v1/organizations/${orgId}/members/${userId}`),

  inviteOrgMember: (orgId: string, payload: { email: string; role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT' }) =>
    requestData<OrganizationInvitation>(api.post(`/api/v1/organizations/${orgId}/invitations`, payload)),

  // Workspaces
  getWorkspace: (wsId: string) =>
    requestData<Workspace>(api.get(`/api/v1/workspaces/${wsId}`)),

  updateWorkspace: (wsId: string, payload: { name?: string }) =>
    requestData<Workspace>(api.patch(`/api/v1/workspaces/${wsId}`, payload)),

  deleteWorkspace: (wsId: string) =>
    api.delete(`/api/v1/workspaces/${wsId}`),

  // Invitations
  getInvitation: (token: string) =>
    requestData<OrganizationInvitation>(api.get(`/api/v1/invitations/${token}`)),

  acceptInvitationPublic: (token: string) =>
    api.get(`/api/v1/invitations/${token}/accept`),

  acceptInvitationAuth: (token: string) =>
    requestData<any>(api.post(`/api/v1/invitations/${token}/accept`)),

  // Projects
  getWorkspaceProjects: (wsId: string) =>
    requestData<Project[]>(api.get(`/api/v1/workspaces/${wsId}/projects`)),

  createProject: (wsId: string, payload: { name: string; description?: string }) =>
    requestData<Project>(api.post(`/api/v1/workspaces/${wsId}/projects`, payload)),

  getProject: (projId: string) =>
    requestData<Project>(api.get(`/api/v1/projects/${projId}`)),

  updateProject: (projId: string, payload: { name?: string; description?: string }) =>
    requestData<Project>(api.patch(`/api/v1/projects/${projId}`, payload)),

  deleteProject: (projId: string) =>
    api.delete(`/api/v1/projects/${projId}`),

  // My Projects (all projects user has access to)
  getMyProjects: () =>
    requestData<Project[]>(api.get('/api/v1/me/projects')),

  // Project Members
  getProjectMembers: (projId: string) =>
    requestData<OrganizationMember[]>(api.get(`/api/v1/projects/${projId}/members`)),

  addProjectMember: (projId: string, payload: { email: string; role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT' }) =>
    requestData<any>(api.post(`/api/v1/projects/${projId}/members`, payload)),

  updateProjectMemberRole: (projId: string, userId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT') =>
    requestData<any>(api.patch(`/api/v1/projects/${projId}/members/${userId}`, { role })),

  removeProjectMember: (projId: string, userId: string) =>
    api.delete(`/api/v1/projects/${projId}/members/${userId}`),

  getProjectFolders: (projId: string) =>
    requestData<ProjectFolder[]>(api.get(`/api/v1/projects/${projId}/folders`)),

  createFolder: (projId: string, payload: { name: string }) =>
    requestData<ProjectFolder>(api.post(`/api/v1/projects/${projId}/folders`, payload)),

  updateFolder: (folderId: string, payload: { name?: string }) =>
    requestData<ProjectFolder>(api.patch(`/api/v1/folders/${folderId}`, payload)),

  deleteFolder: (folderId: string) =>
    api.delete(`/api/v1/folders/${folderId}`),

  // Tasks
  getProjectTasks: (
    projId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      assigneeId?: string;
      folderId?: string;
      search?: string;
      archived?: boolean;
    }
  ) =>
    requestData<Task[] | { tasks: Task[]; total?: number }>(
      api.get(`/api/v1/projects/${projId}/tasks`, { params })
    ),

  createTask: (
    projId: string,
    payload: {
      title: string;
      description?: string;
      folderId?: string | null;
      epicId?: string | null;
      sprintId?: string | null;
      status?: string;
      priority?: string;
      progress?: number;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ) => requestData<Task>(api.post(`/api/v1/projects/${projId}/tasks`, payload)),

  getTask: (taskId: string) =>
    requestData<Task>(api.get(`/api/v1/tasks/${taskId}`)),

  updateTask: (taskId: string, payload: Partial<Task>) =>
    requestData<Task>(api.patch(`/api/v1/tasks/${taskId}`, payload)),

  deleteTask: (taskId: string) =>
    api.delete(`/api/v1/tasks/${taskId}`),

  setTaskProgress: (taskId: string, progress: number) =>
    requestData<Task>(api.patch(`/api/v1/tasks/${taskId}/progress`, { progress })),

  createSubtask: (taskId: string, payload: { title: string }) =>
    requestData<TaskSubtask>(api.post(`/api/v1/tasks/${taskId}/subtasks`, payload)),

  updateSubtask: (subtaskId: string, payload: { title?: string; completed?: boolean; position?: number }) =>
    requestData<TaskSubtask>(api.patch(`/api/v1/subtasks/${subtaskId}`, payload)),

  deleteSubtask: (subtaskId: string) =>
    api.delete(`/api/v1/subtasks/${subtaskId}`),

  createTaskLink: (taskId: string, payload: { targetTaskId: string; type?: string }) =>
    requestData<any>(api.post(`/api/v1/tasks/${taskId}/links`, payload)),

  deleteTaskLink: (taskId: string, linkId: string) =>
    api.delete(`/api/v1/tasks/${taskId}/links/${linkId}`),

  uploadAttachment: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestData<TaskAttachment>(
      api.post(`/api/v1/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },

  downloadAttachment: (attachmentId: string) =>
    api.get(`/api/v1/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      maxRedirects: 0,
      validateStatus: (s) => s < 400, // accept 302 as success
    }),

  deleteAttachment: (attachmentId: string) =>
    api.delete(`/api/v1/attachments/${attachmentId}`),

  toggleFavoriteTask: (taskId: string, isFav: boolean) => {
    if (isFav) {
      return api.post(`/api/v1/tasks/${taskId}/favorite`);
    } else {
      return api.delete(`/api/v1/tasks/${taskId}/favorite`);
    }
  },

  archiveTask: (taskId: string) =>
    api.post(`/api/v1/tasks/${taskId}/archive`),

  restoreTask: (taskId: string) =>
    api.post(`/api/v1/tasks/${taskId}/restore`),

  // Epics & Sprints & Backlog
  getEpics: (projId: string) =>
    requestData<Epic[]>(api.get(`/api/v1/projects/${projId}/epics`)),

  createEpic: (projId: string, payload: { name: string; description?: string; color?: string }) =>
    requestData<Epic>(api.post(`/api/v1/projects/${projId}/epics`, payload)),

  updateEpic: (epicId: string, payload: { name?: string; description?: string; color?: string; position?: number }) =>
    requestData<Epic>(api.patch(`/api/v1/epics/${epicId}`, payload)),

  deleteEpic: (epicId: string) =>
    api.delete(`/api/v1/epics/${epicId}`),

  getSprints: (projId: string) =>
    requestData<Sprint[]>(api.get(`/api/v1/projects/${projId}/sprints`)),

  createSprint: (
    projId: string,
    payload: { name: string; goal?: string; startDate?: string; endDate?: string }
  ) => requestData<Sprint>(api.post(`/api/v1/projects/${projId}/sprints`, payload)),

  updateSprint: (
    sprintId: string,
    payload: { name?: string; goal?: string; startDate?: string; endDate?: string }
  ) => requestData<Sprint>(api.patch(`/api/v1/sprints/${sprintId}`, payload)),

  startSprint: (sprintId: string) =>
    requestData<Sprint>(api.post(`/api/v1/sprints/${sprintId}/start`)),

  closeSprint: (sprintId: string) =>
    requestData<Sprint>(api.post(`/api/v1/sprints/${sprintId}/close`)),

  deleteSprint: (sprintId: string) =>
    api.delete(`/api/v1/sprints/${sprintId}`),

  getBacklog: (projId: string) =>
    requestData<Task[]>(api.get(`/api/v1/projects/${projId}/backlog`)),

  reorderBacklog: (projId: string, taskIds: string[]) =>
    requestData<any>(api.patch(`/api/v1/projects/${projId}/backlog/reorder`, { taskIds })),

  // Statuses, Workflow, Board
  getStatuses: (projId: string) =>
    requestData<ProjectStatus[]>(api.get(`/api/v1/projects/${projId}/statuses`)),

  createStatus: (
    projId: string,
    payload: { name: string; category?: 'TODO' | 'IN_PROGRESS' | 'DONE'; color?: string }
  ) => requestData<ProjectStatus>(api.post(`/api/v1/projects/${projId}/statuses`, payload)),

  updateStatus: (
    statusId: string,
    payload: { name?: string; category?: string; color?: string; position?: number }
  ) => requestData<ProjectStatus>(api.patch(`/api/v1/statuses/${statusId}`, payload)),

  deleteStatus: (statusId: string) =>
    api.delete(`/api/v1/statuses/${statusId}`),

  getWorkflow: (projId: string) =>
    requestData<ProjectWorkflow>(api.get(`/api/v1/projects/${projId}/workflow`)),

  updateWorkflow: (projId: string, payload: { transitions: Array<{ from: string; to: string }> }) =>
    requestData<ProjectWorkflow>(api.put(`/api/v1/projects/${projId}/workflow`, payload)),

  getBoard: (projId: string) =>
    requestData<BoardData>(api.get(`/api/v1/projects/${projId}/board`)),

  updateBoardColumns: (projId: string, statusIds: string[]) =>
    requestData<any>(api.patch(`/api/v1/projects/${projId}/board/columns`, { statusIds })),

  moveTask: (taskId: string, payload: { status: string; position?: number }) =>
    requestData<Task>(api.patch(`/api/v1/tasks/${taskId}/move`, payload)),

  getCalendarTasks: (projId: string, from?: string, to?: string) =>
    requestData<Task[]>(api.get(`/api/v1/projects/${projId}/calendar`, { params: { from, to } })),

  // Collaboration - Activity & Comments & Channels
  getTaskActivity: (taskId: string) =>
    requestData<TaskActivity[]>(api.get(`/api/v1/tasks/${taskId}/activity`)),

  getTaskComments: (taskId: string) =>
    requestData<TaskComment[]>(api.get(`/api/v1/tasks/${taskId}/comments`)),

  createComment: (taskId: string, payload: { body: string; mentions?: string[] }) =>
    requestData<TaskComment>(api.post(`/api/v1/tasks/${taskId}/comments`, payload)),

  updateComment: (commentId: string, payload: { body: string; mentions?: string[] }) =>
    requestData<TaskComment>(api.patch(`/api/v1/comments/${commentId}`, payload)),

  deleteComment: (commentId: string) =>
    api.delete(`/api/v1/comments/${commentId}`),

  getChannels: (wsId: string) =>
    requestData<Channel[]>(api.get(`/api/v1/workspaces/${wsId}/channels`)),

  createChannel: (
    wsId: string,
    payload: { name: string; type?: 'PUBLIC' | 'PRIVATE'; projectId?: string; memberIds?: string[] }
  ) => requestData<Channel>(api.post(`/api/v1/workspaces/${wsId}/channels`, payload)),

  getChannelMessages: (channelId: string, params?: { page?: number; limit?: number }) =>
    requestData<ChannelMessage[] | { messages: ChannelMessage[] }>(
      api.get(`/api/v1/channels/${channelId}/messages`, { params })
    ),

  createChannelMessage: (channelId: string, payload: { body: string }) =>
    requestData<ChannelMessage>(api.post(`/api/v1/channels/${channelId}/messages`, payload)),

  updateChannel: (channelId: string, payload: { name: string }) =>
    requestData<Channel>(api.patch(`/api/v1/channels/${channelId}`, payload)),

  deleteChannel: (channelId: string) =>
    api.delete(`/api/v1/channels/${channelId}`),

  getChannelMembers: (channelId: string) =>
    requestData<any[]>(api.get(`/api/v1/channels/${channelId}/members`)),

  addChannelMember: (channelId: string, payload: { userId: string }) =>
    requestData<any>(api.post(`/api/v1/channels/${channelId}/members`, payload)),

  leaveChannel: (channelId: string) =>
    api.delete(`/api/v1/channels/${channelId}/members`),

  removeChannelMember: (channelId: string, userId: string) =>
    api.delete(`/api/v1/channels/${channelId}/members/${userId}`),

  updateMessage: (channelId: string, messageId: string, payload: { body: string }) =>
    requestData<ChannelMessage>(api.patch(`/api/v1/channels/${channelId}/messages/${messageId}`, payload)),

  deleteMessage: (channelId: string, messageId: string) =>
    api.delete(`/api/v1/channels/${channelId}/messages/${messageId}`),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number; unread?: boolean }) =>
    requestData<PaginatedResponse<Notification>>(api.get('/api/v1/notifications', { params })),

  markAllNotificationsRead: () =>
    requestData<{ count: number }>(api.patch('/api/v1/notifications/read-all')),

  markNotificationRead: (notificationId: string) =>
    requestData<Notification>(api.patch(`/api/v1/notifications/${notificationId}/read`)),

  // Search
  search: (query: string, type?: 'task' | 'project' | 'comment') =>
    requestData<SearchResults>(api.get('/api/v1/search', { params: { q: query, type } })),

  // Saved Filters
  getFilters: () =>
    requestData<SavedFilter[]>(api.get('/api/v1/filters')),

  createFilter: (payload: { name: string; type?: string; criteria?: Record<string, any> }) =>
    requestData<SavedFilter>(api.post('/api/v1/filters', payload)),

  deleteFilter: (filterId: string) =>
    api.delete(`/api/v1/filters/${filterId}`),

  // Project Stats
  getProjectStats: (projId: string) =>
    requestData<ProjectStats>(api.get(`/api/v1/projects/${projId}/stats`)),

  // Roles & Permissions
  getRoles: () =>
    requestData<RolesCatalog>(api.get('/api/v1/roles')),

  getMemberRoles: (orgId: string, userId: string) =>
    requestData<{ roles: string[] }>(api.get(`/api/v1/organizations/${orgId}/members/${userId}/roles`)),

  setMemberRoles: (orgId: string, userId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT') =>
    requestData<any>(api.put(`/api/v1/organizations/${orgId}/members/${userId}/roles`, { role })),

  getProjectPermissions: (projId: string) =>
    requestData<ProjectPermissions>(api.get(`/api/v1/projects/${projId}/permissions`)),

  setProjectPermissions: (projId: string, permissions: RolePermissionDto[]) =>
    requestData<ProjectPermissions>(api.put(`/api/v1/projects/${projId}/permissions`, { permissions })),

  // Custom project roles
  getProjectRoles: (projId: string) =>
    requestData<any[]>(api.get(`/api/v1/projects/${projId}/roles`)),

  createProjectRole: (projId: string, payload: { name: string; abilities: string[] }) =>
    requestData<any>(api.post(`/api/v1/projects/${projId}/roles`, payload)),

  updateProjectRole: (projId: string, roleId: string, payload: { name?: string; abilities?: string[] }) =>
    requestData<any>(api.put(`/api/v1/projects/${projId}/roles/${roleId}`, payload)),

  deleteProjectRole: (projId: string, roleId: string) =>
    api.delete(`/api/v1/projects/${projId}/roles/${roleId}`),

  // Alias for addProjectMember (used in App.tsx)
  inviteProjectMember: (projId: string, payload: { email: string; role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT' }) =>
    requestData<any>(api.post(`/api/v1/projects/${projId}/members`, payload)),
};
