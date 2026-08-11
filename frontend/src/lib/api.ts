import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // Part 8: tell the backend which hostname the guest/staff actually
    // visited. The frontend and backend are typically separate Render
    // services with their own domains, so the backend's own req.headers.host
    // can't be used to detect a tenant's subdomain/custom domain — this
    // header carries the browser's real hostname instead.
    config.headers['x-tenant-host'] = window.location.hostname;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Public ──────────────────────────────────────────────────
export const getCategories = () => api.get('/categories').then(r => r.data);
export const getCategoryBySlug = (slug: string) => api.get(`/categories/${slug}/by-slug`).then(r => r.data);
export const getServices = (categoryId?: string) => api.get('/services', { params: { categoryId } }).then(r => r.data);
export const getService = (id: string) => api.get(`/services/${id}`).then(r => r.data);
export const getSettings = () => api.get('/settings').then(r => r.data);

// ── Auth ─────────────────────────────────────────────────────
export const login = (email: string, password: string) => api.post('/auth/login', { email, password }).then(r => r.data);

// ── Me (self) ────────────────────────────────────────────────
export const getMe = () => api.get('/users/me').then(r => r.data);
export const updateMe = (data: { name?: string; currentPassword?: string; newPassword?: string; profilePhoto?: string }) =>
  api.put('/users/me', data).then(r => r.data);
export const uploadProfilePhoto = (file: File) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post('/media/profile/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

// ── Theme preference (per-user, DB-backed) ───────────────────
export const getUserTheme = () => api.get('/users/me/theme').then(r => r.data.theme as string);
export const setUserTheme = (theme: string) => api.put('/users/me/theme', { theme }).then(r => r.data.theme as string);

// ── Admin: Categories ────────────────────────────────────────
export const getAllCategories = () => api.get('/categories', { params: { all: 'true' } }).then(r => r.data);
export const createCategory = (data: any) => api.post('/categories', data).then(r => r.data);
export const updateCategory = (id: string, data: any) => api.put(`/categories/${id}`, data).then(r => r.data);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`).then(r => r.data);
export const uploadCategoryPhoto = (id: string, file: File) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post(`/media/categories/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

// ── Admin: Services ──────────────────────────────────────────
export const getAllServices = () => api.get('/services', { params: { all: 'true' } }).then(r => r.data);
export const createService = (data: any) => api.post('/services', data).then(r => r.data);
export const updateService = (id: string, data: any) => api.put(`/services/${id}`, data).then(r => r.data);
export const deleteService = (id: string) => api.delete(`/services/${id}`).then(r => r.data);

// ── Admin: Media ─────────────────────────────────────────────
export const uploadImages = (serviceId: string, files: FileList) => {
  const form = new FormData();
  Array.from(files).forEach(f => form.append('images', f));
  return api.post(`/media/services/${serviceId}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteImage = (imageId: string) => api.delete(`/media/images/${imageId}`).then(r => r.data);

// ── Filter groups / facets (Part 3) ───────────────────────────
export const getFilterGroups = (categoryId: string) => api.get(`/categories/${categoryId}/filter-groups`).then(r => r.data);
export const createFilterGroup = (categoryId: string, data: { name: string; isRequired?: boolean; sortOrder?: number; options?: string[] }) =>
  api.post(`/categories/${categoryId}/filter-groups`, data).then(r => r.data);
export const updateFilterGroup = (id: string, data: { name?: string; isRequired?: boolean; sortOrder?: number }) =>
  api.put(`/filter-groups/${id}`, data).then(r => r.data);
export const deleteFilterGroup = (id: string) => api.delete(`/filter-groups/${id}`).then(r => r.data);
export const addFilterOption = (filterGroupId: string, data: { label: string; sortOrder?: number }) =>
  api.post(`/filter-groups/${filterGroupId}/options`, data).then(r => r.data);
export const updateFilterOption = (id: string, data: { label?: string; sortOrder?: number }) =>
  api.put(`/filter-options/${id}`, data).then(r => r.data);
export const deleteFilterOption = (id: string) => api.delete(`/filter-options/${id}`).then(r => r.data);

// ── Super Admin: Tenants (Part 7) ──────────────────────────────
export const getTenants = () => api.get('/tenants').then(r => r.data);
export const getTenant = (id: string) => api.get(`/tenants/${id}`).then(r => r.data);
export const createTenant = (data: { name: string; slug: string; businessVertical?: string; adminEmail?: string; adminPassword?: string; adminName?: string }) =>
  api.post('/tenants', data).then(r => r.data);
export const updateTenant = (id: string, data: { name?: string; customDomain?: string; isActive?: boolean }) =>
  api.put(`/tenants/${id}`, data).then(r => r.data);
export const getTenantBranding = (id: string) => api.get(`/tenants/${id}/branding`).then(r => r.data);
export const updateTenantBranding = (id: string, data: { logoUrl?: string; primaryColor?: string; accentColor?: string; siteTitle?: string; siteSubtitle?: string; latitude?: number; longitude?: number }) =>
  api.put(`/tenants/${id}/branding`, data).then(r => r.data);
export const getTenantFeatureFlags = (id: string) => api.get(`/tenants/${id}/feature-flags`).then(r => r.data);
export const setTenantFeatureFlag = (id: string, key: string, enabled: boolean) =>
  api.put(`/tenants/${id}/feature-flags`, { key, enabled }).then(r => r.data);

// ── Admin: Users ─────────────────────────────────────────────
export const getUsers = () => api.get('/users').then(r => r.data);
export const createUser = (data: any) => api.post('/users', data).then(r => r.data);
export const updateUser = (id: string, data: any) => api.put(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then(r => r.data);

// ── Admin: Settings ──────────────────────────────────────────
export const updateSettings = (data: Record<string, string>) => api.put('/settings', data).then(r => r.data);

// ── Reservations ─────────────────────────────────────────────
export const getReservations = () => api.get('/reservations').then(r => r.data);
export const getReservation = (id: string) => api.get(`/reservations/${id}`).then(r => r.data);
export const createReservation = (data: any) => api.post('/reservations', data).then(r => r.data);
export const updateReservation = (id: string, data: any) => api.put(`/reservations/${id}`, data).then(r => r.data);
export const deleteReservation = (id: string) => api.delete(`/reservations/${id}`).then(r => r.data);
export const getStats = () => api.get('/reservations/stats').then(r => r.data);

// ── Audit ────────────────────────────────────────────────────
export const getAuditLogs = (reservationId?: string) =>
  api.get('/audit', { params: reservationId ? { reservationId } : {} }).then(r => r.data);

// ── Excel Import (Part 6) ──────────────────────────────────────
export const getImportableFields = () => api.get('/import/fields').then(r => r.data);
export const getImportCategories = (tenantId?: string) =>
  api.get('/import/categories', { params: tenantId ? { tenantId } : {} }).then(r => r.data);
export const previewImportFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/import/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const commitImport = (params: {
  file: File; categoryId: string; mapping: Record<number, string>; mode: 'replace' | 'append';
}) => {
  const form = new FormData();
  form.append('file', params.file);
  form.append('categoryId', params.categoryId);
  form.append('mapping', JSON.stringify(params.mapping));
  form.append('mode', params.mode);
  return api.post('/import/commit', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

// ── Current tenant (public, host-resolved) ─────────────────────
export const getCurrentTenant = () => api.get('/tenants/current').then(r => r.data);

// ── Monthly Events (Part 4) ────────────────────────────────────
export const getEvents = (upcoming = false) => api.get('/events', { params: upcoming ? { upcoming: 'true' } : {} }).then(r => r.data);
export const getAllEvents = () => api.get('/events/admin').then(r => r.data);
export const createEvent = (data: any) => api.post('/events', data).then(r => r.data);
export const updateEvent = (id: string, data: any) => api.put(`/events/${id}`, data).then(r => r.data);
export const deleteEvent = (id: string) => api.delete(`/events/${id}`).then(r => r.data);

// ── Letter Templates (Part 5) ──────────────────────────────────
export const getMergeFields = () => api.get('/letter-templates/merge-fields').then(r => r.data);
export const getLetterTemplates = () => api.get('/letter-templates').then(r => r.data);
export const createLetterTemplate = (data: any) => api.post('/letter-templates', data).then(r => r.data);
export const updateLetterTemplate = (id: string, data: any) => api.put(`/letter-templates/${id}`, data).then(r => r.data);
export const deleteLetterTemplate = (id: string) => api.delete(`/letter-templates/${id}`).then(r => r.data);

// ── Room Types (Part 5) ─────────────────────────────────────────
export const getRoomTypes = () => api.get('/room-types').then(r => r.data);
export const createRoomType = (data: any) => api.post('/room-types', data).then(r => r.data);
export const updateRoomType = (id: string, data: any) => api.put(`/room-types/${id}`, data).then(r => r.data);
export const deleteRoomType = (id: string) => api.delete(`/room-types/${id}`).then(r => r.data);

// ── Guest Communications / Pre-Arrival Letters (Part 5) ─────────
export const getSendContext = () => api.get('/guest-communications/send-context').then(r => r.data);
export const getSuggestedEvents = (arrivalDate: string, departureDate?: string) =>
  api.get('/guest-communications/suggested-events', { params: { arrivalDate, departureDate } }).then(r => r.data);
export const previewLetter = (data: any) => api.post('/guest-communications/preview', data).then(r => r.data);
export const sendLetter = (data: any) => api.post('/guest-communications/send', data).then(r => r.data);
export const getLetterHistory = () => api.get('/guest-communications/history').then(r => r.data);

// ── Integrations (Part 5, Super Admin only) ──────────────────────
export const getOutlookStatus = (tenantId: string) => api.get(`/integrations/${tenantId}/outlook`).then(r => r.data);
export const updateOutlookConfig = (tenantId: string, data: any) => api.put(`/integrations/${tenantId}/outlook`, data).then(r => r.data);

// ── Staff Utility Modules (Part 9) ───────────────────────────────
export const getTaxiDrivers = () => api.get('/taxi-drivers').then(r => r.data);
export const createTaxiDriver = (data: any) => api.post('/taxi-drivers', data).then(r => r.data);
export const updateTaxiDriver = (id: string, data: any) => api.put(`/taxi-drivers/${id}`, data).then(r => r.data);
export const deleteTaxiDriver = (id: string) => api.delete(`/taxi-drivers/${id}`).then(r => r.data);

export const getPhoneDirectory = () => api.get('/phone-directory').then(r => r.data);
export const createPhoneEntry = (data: any) => api.post('/phone-directory', data).then(r => r.data);
export const updatePhoneEntry = (id: string, data: any) => api.put(`/phone-directory/${id}`, data).then(r => r.data);
export const deletePhoneEntry = (id: string) => api.delete(`/phone-directory/${id}`).then(r => r.data);

export const getPriceSheetItems = () => api.get('/price-sheets').then(r => r.data);
export const createPriceSheetItem = (data: any) => api.post('/price-sheets', data).then(r => r.data);
export const updatePriceSheetItem = (id: string, data: any) => api.put(`/price-sheets/${id}`, data).then(r => r.data);
export const deletePriceSheetItem = (id: string) => api.delete(`/price-sheets/${id}`).then(r => r.data);
