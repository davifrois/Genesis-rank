import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import {
    Activity,
    AlertCircle,
    BarChart3,
    CheckCircle2,
    ClipboardList,
    Clock,
    Calendar,
    Download,
    LayoutDashboard,
    LayoutGrid,
    List,
    LogOut,
    Menu,
    Newspaper,
    Pencil,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    Trophy,
    Trash2,
    Upload,
    UserPlus,
    Users,
    Zap
} from 'lucide-react';
import { generateBracketsPDF, generateRankingPDF } from '../services/pdfService';
import { extractTextFromPdfFile, parseAthletesFromText } from '../services/pdfImportService';
import { buildBracketMatches } from '../services/bracketService';
import { authService } from '../services/authService';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { motion, AnimatePresence } from 'framer-motion';
import LoginOverlay from '../components/LoginOverlay';
import { useI18n } from '../hooks/useI18n';
import { DEFAULT_EVENT_FEES, DEFAULT_EVENT_PIX_KEY } from '../utils/eventPricing';
import { buildFileSafeName, downloadCsv } from '../services/exportService';
import { translateBelt, translateCategory, translateCompositeLabel, translateWeight } from '../utils/localeLabels';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';

const ATHLETE_PAGE_SIZE_OPTIONS = [20, 40, 80];

const createEventEditFormState = () => ({
    id: '',
    name: '',
    date: '',
    location: '',
    posterUrl: '',
    registrationUrl: '',
    pixKey: DEFAULT_EVENT_PIX_KEY,
    feeUnder15: DEFAULT_EVENT_FEES.under15,
    feeOver15: DEFAULT_EVENT_FEES.over15,
    feeCombo: DEFAULT_EVENT_FEES.combo,
    feeAbsolute: DEFAULT_EVENT_FEES.absolute,
    registrationOpen: true,
    internalRegistration: true
});

const createNewsFormState = () => ({
    title: '',
    summary: '',
    imageUrl: '',
    publishedAt: ''
});

const buildImportDebug = (rawText) => {
    const lines = (rawText || '')
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);
    return lines.slice(0, 60).join('\n');
};

const normalizeLookup = (value) => (
    (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
);

const buildAthleteLookupKey = (name, academy) => (
    `${normalizeLookup(name)}|${normalizeLookup(academy)}`
);

const parseRegistrationNotes = (value) => {
    if (!value || typeof value !== 'string') return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const parseRegistrationRecord = (item, eventMap, copy) => {
    const source = (item && typeof item === 'object') ? item : {};
    const notes = parseRegistrationNotes(source.notes);
    const totalValue = Number(notes?.totalValue || 0);
    const proofName = notes?.comprovanteNome || '';
    const proofFileUrl = notes?.comprovanteArquivoDataUrl || '';
    const proofMimeType = notes?.comprovanteMimeType || '';
    const proofSizeBytes = Number(notes?.comprovanteTamanhoBytes || 0);
    const notesText = notes?.observacoes || '';
    const athletePhotoUrl = notes?.athletePhotoUrl || '';
    const statusNormalized = normalizeRegistrationStatus(source.status);
    const isPendingSync = statusNormalized === REGISTRATION_STATUS.PENDING_SYNC;
    const isPaymentConfirmed = statusNormalized === REGISTRATION_STATUS.PAYMENT_CONFIRMED;
    const isPaymentError = statusNormalized === REGISTRATION_STATUS.PAYMENT_ERROR;
    const isImageProof = /^data:image\//i.test(proofFileUrl) || /^image\//i.test(proofMimeType);
    const isPdfProof = /^data:application\/pdf/i.test(proofFileUrl) || /pdf/i.test(proofMimeType);
    const statusLabel = isPendingSync
        ? copy.registrationsPanel.statusPendingSync
        : isPaymentConfirmed
            ? copy.registrationsPanel.statusPaymentConfirmed
            : isPaymentError
                ? copy.registrationsPanel.statusPaymentError
                : copy.registrationsPanel.statusDefault;

    return {
        ...source,
        notes,
        totalValue,
        proofName,
        proofFileUrl,
        proofMimeType,
        proofSizeBytes,
        isImageProof,
        isPdfProof,
        notesText,
        athletePhotoUrl,
        statusNormalized,
        isPendingSync,
        isPaymentConfirmed,
        isPaymentError,
        isPendingPaymentReview: !isPendingSync && !isPaymentConfirmed && !isPaymentError,
        statusLabel,
        syncError: source.lastError || '',
        eventName: source.eventName || eventMap[source.eventId]?.name || copy.common.noEvent,
        paymentReviewNotes: source.paymentReviewNotes || '',
        paymentReviewedBy: source.paymentReviewedBy || '',
        paymentReviewedAt: source.paymentReviewedAt || ''
    };
};

const fieldsEqualIfPresent = (left, right) => {
    const normalizedLeft = normalizeLookup(left || '');
    const normalizedRight = normalizeLookup(right || '');
    if (!normalizedLeft || !normalizedRight) return true;
    return normalizedLeft === normalizedRight;
};

const athleteMatchesRegistrationRecord = (athlete, registration) => {
    if (!athlete || !registration) return false;
    if ((athlete.eventId || '') !== (registration.eventId || '')) return false;

    const nameMatch = normalizeLookup(athlete.nome || '') === normalizeLookup(registration.nome || '');
    const academyMatch = normalizeLookup(athlete.academia || '') === normalizeLookup(registration.academia || '');
    if (!nameMatch || !academyMatch) return false;

    if (!fieldsEqualIfPresent(athlete.categoria, registration.categoria)) return false;
    if (!fieldsEqualIfPresent(athlete.faixa, registration.faixa)) return false;
    if (!fieldsEqualIfPresent(athlete.peso, registration.peso)) return false;
    return true;
};

const buildRegistrationIdentityKey = (registration) => {
    if (!registration) return '';
    return [
        normalizeLookup(registration.eventId || ''),
        normalizeLookup(registration.nome || ''),
        normalizeLookup(registration.academia || ''),
        normalizeLookup(registration.categoria || ''),
        normalizeLookup(registration.faixa || ''),
        normalizeLookup(registration.peso || '')
    ].join('|');
};

const buildAthleteRegistrationIdentityKey = (athlete) => (
    buildRegistrationIdentityKey({
        eventId: athlete?.eventId || '',
        nome: athlete?.nome || '',
        academia: athlete?.academia || '',
        categoria: athlete?.categoria || '',
        faixa: athlete?.faixa || '',
        peso: athlete?.peso || ''
    })
);

const REGISTRATION_SUPPRESSED_STORAGE_KEY = 'genesis_dashboard_suppressed_registration_keys_v1';

const loadSuppressedRegistrationKeys = () => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(REGISTRATION_SUPPRESSED_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return [...new Set(
            parsed
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean)
        )];
    } catch {
        return [];
    }
};

const saveSuppressedRegistrationKeys = (keys) => {
    if (typeof window === 'undefined') return;
    try {
        if (!keys?.length) {
            window.localStorage.removeItem(REGISTRATION_SUPPRESSED_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(REGISTRATION_SUPPRESSED_STORAGE_KEY, JSON.stringify(keys));
    } catch {
        // Ignore localStorage write failures.
    }
};

const getRegistrationDecisionTimestamp = (registration) => (
    new Date(registration?.paymentReviewedAt || registration?.createdAt || 0).getTime()
);

const toAthleteFromRegistration = (registration) => {
    const notes = registration?.notes && typeof registration.notes === 'object' ? registration.notes : {};
    const absolutoGi = (notes?.absolutoGi || '').toString().trim().toUpperCase();
    const modalidade = (registration?.modalidade || '').toString().trim().toUpperCase();

    return {
        nome: registration?.nome || '',
        academia: registration?.academia || '',
        faixa: registration?.faixa || '',
        peso: registration?.peso || '',
        categoria: registration?.categoria || '',
        genero: registration?.genero || '',
        isNoGi: modalidade === 'NO-GI',
        isAbsolute: absolutoGi === 'SIM',
        eventId: registration?.eventId || '',
        pontos: 0,
        historico: []
    };
};

const toMemberProfileFromRegistration = (registration, currentUser) => {
    const notes = registration?.notes && typeof registration.notes === 'object' ? registration.notes : {};
    const birthYear = (notes?.anoNascimento || '').toString().trim();
    const hasValidBirthYear = /^\d{4}$/.test(birthYear);
    const parsedAge = Number(notes?.idade || '');

    return {
        fullName: registration?.nome || '',
        firstName: registration?.nome || '',
        lastName: '',
        email: registration?.email || '',
        phone: registration?.phone || '',
        birthDate: hasValidBirthYear ? `${birthYear}-01-01` : '',
        age: Number.isFinite(parsedAge) && parsedAge >= 0 ? Math.floor(parsedAge) : '',
        country: 'Brasil',
        city: '',
        belt: registration?.faixa || '',
        weight: registration?.peso || '',
        academyId: notes?.academyId || '',
        academyName: registration?.academia || notes?.academyName || '',
        photoUrl: notes?.athletePhotoUrl || '',
        createdByUsername: currentUser?.username || '',
        createdByName: currentUser?.name || '',
        createdAt: registration?.createdAt || new Date().toISOString()
    };
};

const Dashboard = () => {
    const {
        athletes,
        addAthlete,
        updateAthletePoints,
        setManualPoints,
        resetAthletePoints,
        clearAthletes,
        importAthletes,
        brackets,
        generateBrackets,
        setBracketPodium,
        applyBracketPodium,
        events,
        news,
        memberProfiles,
        addMemberProfile,
        activeEventId,
        openEventModal,
        updateEvent,
        deleteEvent,
        addNews,
        deleteNews,
        setActiveEvent,
        assignAthletesToEvent,
        removeAthlete,
        addLog,
        currentUser,
        logout,
        clearEventResults,
        logs
    } = useStore();
    const { language } = useI18n();
    const isEnglish = language === 'en-US';
    const copy = useMemo(() => (
        isEnglish
            ? {
                feedback: {
                    activateEventForReport: 'Activate an event to export the report.',
                    noAthletesOnActiveEvent: 'No athlete linked to the active event.',
                    reportGenerated: (name) => `Report generated for ${name || 'active event'}.`,
                    reportFail: 'Failed to export report.',
                    eventUpdated: (name) => `Event updated: ${name || 'event'}.`,
                    eventUpdateFail: 'Failed to update event.',
                    removeEventConfirm: (name) => `Delete ${name}? This action cannot be undone.`,
                    eventRemoved: 'Event removed successfully.',
                    eventRemoveFail: 'Failed to remove event.',
                    clearAthletesConfirm: 'This will clear all athletes from the athlete base panel. Continue?',
                    allAthletesRemoved: 'All athletes were removed.',
                    noTextPdf: 'PDF has no text. Generate searchable PDF (OCR) and try again.',
                    noTextImport: 'PDF has no text to import.',
                    noAthleteInFile: 'No athlete found. Check if PDF is searchable text.',
                    noValidAthleteImport: 'No valid athlete to import.',
                    importReadFail: 'Failed to read file.',
                    invalidManualPoints: 'Enter a valid points value.',
                    manualPointsUpdated: 'Points updated manually.',
                    manualPointsFail: 'Could not update points.',
                    beltSummaryUpdated: 'Belt summary updated.',
                    selectEventForBracket: 'Select an event to generate brackets.',
                    existingBracketsConfirm: 'Brackets already exist for this event. Generate again?',
                    bracketsGenerated: (count) => `${count} brackets generated.`,
                    noBracketCategory: 'No category found to generate brackets.',
                    bracketGenerateFail: 'Failed to generate brackets.',
                    noBracketForPdf: 'No bracket available for PDF export.',
                    bracketPdfSaved: 'Brackets PDF saved successfully.',
                    bracketPdfFail: 'Failed to save brackets PDF.',
                    podiumApplied: 'Podium applied successfully.',
                    podiumApplyFail: 'Could not apply podium.',
                    resetOnlyLocal: 'Password reset is available only in local mode.',
                    selectUser: 'Select a user.',
                    mismatchPassword: 'Passwords do not match.',
                    passwordUpdated: 'Password updated successfully.',
                    passwordResetFor: (username) => `Password reset for ${username}.`,
                    passwordResetFail: 'Failed to reset password.',
                    minName: 'Name must have at least 3 characters.',
                    academyRequired: 'Please provide athlete academy.',
                    athleteRegistered: (name) => `Athlete ${name} registered.`,
                    athletesAssigned: 'Athletes linked to event.',
                    athleteAssignFail: 'Failed to link athletes.',
                    pointsClearedFor: (name) => `Points cleared for ${name}.`,
                    removeAthleteConfirm: (name) => `Remove athlete ${name}? This action cannot be undone.`,
                    athleteRemoved: (name) => `Athlete removed: ${name}.`,
                    athleteRemoveFail: 'Could not remove athlete.',
                    goldFor: (name) => `Gold for ${name}`,
                    silverFor: (name) => `Silver for ${name}`,
                    bronzeFor: (name) => `Bronze for ${name}`,
                    newsTitleRequired: 'News title is required.',
                    newsSummaryRequired: 'News summary is required.',
                    newsCreated: (title) => `News published: ${title}.`,
                    newsCreateFail: 'Failed to publish news.',
                    newsDeleteConfirm: (title) => `Remove news "${title}"?`,
                    newsDeleted: 'News removed.',
                    newsDeleteFail: 'Failed to remove news.',
                    registrationLoadFail: 'Failed to load public registrations.',
                    registrationSyncDone: (synced, pending) => `Sync finished: ${synced} sent, ${pending} pending.`,
                    registrationSyncFail: 'Failed to sync pending registrations.',
                    registrationStatusUpdated: 'Payment status updated.',
                    registrationStatusFail: 'Failed to update payment status.',
                    registrationExportDone: (count) => `${count} registrations exported to spreadsheet.`,
                    registrationExportNoData: 'No registration available to export.',
                    clearReimportLocksConfirm: (count) => `Clear ${count} registration reimport locks?`,
                    reimportLocksCleared: (count) => `${count} reimport locks removed.`,
                    reimportLocksNone: 'No reimport lock to clear.'
                },
                nav: {
                    overview: 'Overview',
                    events: 'Events',
                    news: 'News',
                    registrations: 'Registrations',
                    brackets: 'Brackets',
                    athletes: 'Athletes',
                    automation: 'Automation',
                    activity: 'Activity'
                },
                common: {
                    close: 'Close',
                    cancel: 'Cancel',
                    save: 'Save',
                    search: 'Search',
                    active: 'Active',
                    inactive: 'Inactive',
                    noEvent: 'No event',
                    allEvents: 'All events',
                    points: 'Points',
                    selected: 'selected',
                    noneFound: 'None found',
                    update: 'Update'
                },
                sidebar: {
                    title: 'Quick menu',
                    activeAthletes: 'Active athletes',
                    totalPoints: 'Total points',
                    registeredEvents: 'Registered events',
                    newRegister: 'New registration'
                },
                hero: {
                    activeEvent: 'Active event',
                    noActiveEvent: 'No active event',
                    title: 'Control Panel',
                    subtitle: 'Track registrations, adjustments and ranking results with real-time metrics and admin shortcuts.',
                    updatedAt: 'Updated at',
                    secureSessionFor: 'Secure session for',
                    average: 'Average',
                    newAthlete: 'New athlete',
                    logs: 'Logs',
                    menu: 'Menu',
                    rankingUpdated: 'Ranking updated',
                    athletes: 'athletes',
                    noLeader: 'No leader'
                },
                stats: {
                    enrolled: 'Registered',
                    activeTrend: 'active',
                    totalPoints: 'Total points',
                    average: 'Average',
                    registeredEvents: 'Registered events',
                    centralizedControl: 'Centralized control',
                    records: 'Records',
                    continuousMonitoring: 'Continuous monitoring'
                },
                eventsPanel: {
                    title: 'Events',
                    subtitle: 'Create events and organize athletes by stage.',
                    createEvent: 'Create event',
                    noEvents: 'No event registered.',
                    date: 'Date',
                    undefinedDate: 'Date undefined',
                    athletes: 'Athletes',
                    activeEvent: 'Active event',
                    activate: 'Activate',
                    manageAthletes: 'Manage athletes',
                    edit: 'Edit',
                    registration: 'Registration',
                    noPoster: 'No poster',
                    open: 'Open',
                    closed: 'Closed'
                },
                newsPanel: {
                    title: 'News',
                    subtitle: 'Create official announcements and publish directly to public news page.',
                    openNewsPage: 'Open news page',
                    titleLabel: 'Title',
                    titlePlaceholder: 'Ex: Registration for Stage 2 is now open',
                    summaryLabel: 'Summary',
                    summaryPlaceholder: 'Write a short summary that will appear on home and news page.',
                    imageLabel: 'Cover image URL (optional)',
                    imagePlaceholder: 'https://.../news.jpg',
                    dateLabel: 'Publish date',
                    publish: 'Publish news',
                    noNews: 'No published news yet.',
                    remove: 'Remove'
                },
                registrationsPanel: {
                    title: 'Public registrations',
                    subtitle: 'All event registrations received through public form in one place.',
                    refresh: 'Refresh',
                    syncNow: 'Sync now',
                    pendingLabel: 'Pending sync',
                    filterPending: 'Only pending',
                    filterAll: 'Show all',
                    searchPlaceholder: 'Search by athlete, academy, phone, email or notes',
                    searchAria: 'Search registration',
                    eventFilter: 'Event filter',
                    allEvents: 'All events',
                    tablePhoto: 'Photo',
                    tableAthlete: 'Athlete',
                    tableEvent: 'Event',
                    tableCategory: 'Category',
                    tableContact: 'Contact',
                    tablePayment: 'Payment',
                    tableNotes: 'Notes',
                    tableStatus: 'Status',
                    totalValue: 'Total',
                    pixKey: 'Pix key',
                    receipt: 'Receipt',
                    noReceipt: 'No receipt',
                    noData: 'No public registration found.',
                    noNotes: 'No notes',
                    noPhoto: 'No photo',
                    statusPendingSync: 'Pending sync',
                    statusDefault: 'Pending',
                    statusPaymentConfirmed: 'Payment confirmed - Athlete active',
                    statusPaymentError: 'Payment error',
                    confirmPayment: 'Confirm payment',
                    markPaymentError: 'Mark payment error',
                    exportSpreadsheet: 'Export spreadsheet',
                    confirmReviewPrompt: 'Optional payment review note:',
                    errorReviewPrompt: 'Describe the payment issue (optional):',
                    reviewedBy: 'Reviewed by',
                    reviewedAt: 'Reviewed at',
                    reviewNotes: 'Review notes',
                    proofPreviewTitle: 'Receipt preview',
                    proofPreviewPdf: 'PDF preview',
                    openReceipt: 'Open receipt',
                    lastError: 'Sync error'
                },
                bracketsPanel: {
                    title: 'Brackets',
                    subtitle: 'Generate brackets by category and apply podium automatically.',
                    selectEvent: 'Select event',
                    selectEventAria: 'Select event for brackets',
                    selectCategoryAria: 'Select bracket category',
                    allCategories: 'All categories',
                    generate: 'Generate brackets',
                    savePdf: 'Save brackets PDF',
                    searchPlaceholder: 'Search bracket by number or category',
                    searchAria: 'Search bracket',
                    brackets: 'brackets',
                    bracket: 'Bracket',
                    applied: 'Applied',
                    event: 'Event',
                    athletes: 'Athletes',
                    round1: 'Round 1',
                    athlete: 'Athlete',
                    noAthleteBracket: 'No athletes in this bracket.',
                    podium: 'Podium',
                    firstPlace: '1st place',
                    secondPlace: '2nd place',
                    thirdPlace: '3rd place',
                    selectAthlete: 'Select athlete',
                    apply: 'Apply podium',
                    reapply: 'Reapply podium',
                    noBracketFound: 'No bracket found.'
                },
                beltSummary: {
                    title: 'Belt summary',
                    subtitle: 'Point distribution by graduation',
                    updateTitle: 'Updated at'
                },
                athletesPanel: {
                    title: 'Athlete database',
                    subtitle: 'Manage registrations and adjust points quickly',
                    searchPlaceholder: 'Search by name or academy',
                    searchAria: 'Search athlete',
                    filterEventAria: 'Filter by event',
                    noEvent: 'No event',
                    listView: 'List view',
                    cardView: 'Card view',
                    athlete: 'Athlete',
                    academy: 'Academy',
                    event: 'Event',
                    contact: 'Contact',
                    profile: 'Profile',
                    noProfile: 'No membership profile',
                    noPhoto: 'No photo',
                    actions: 'Actions',
                    pointsPlaceholder: 'Points',
                    clearPointsAria: 'Clear points',
                    registerGoldAria: 'Register gold',
                    registerSilverAria: 'Register silver',
                    registerBronzeAria: 'Register bronze',
                    removeAthleteAria: 'Remove athlete',
                    clearBase: 'Clear athlete base',
                    clearReimportLocks: 'Clear reimport locks',
                    paginationPrev: 'Prev',
                    paginationNext: 'Next',
                    paginationPerPage: 'Per page',
                    paginationPage: 'Page',
                    paginationShowing: (from, to, total) => `Showing ${from}-${to} of ${total}`,
                    belt: 'Belt',
                    weight: 'Weight',
                    category: 'Category',
                    noAthleteFound: 'No athlete found.'
                },
                automation: {
                    title: 'Automation and shortcuts',
                    subtitle: 'Organized tools to speed up work',
                    fast: 'Fast',
                    importFromPdf: 'Import list from PDF',
                    importDescription: 'Read PDF and split name, belt, category and academy.',
                    importPdf: 'Import PDF',
                    debugPreview: 'Debug preview (first lines)',
                    importFile: 'Import file',
                    importFileDesc: 'Open PDF/TXT selector to update ranking.',
                    select: 'Select',
                    exportReport: 'Export report',
                    exportReportDesc: 'Generate official PDF for active event.',
                    generatePdf: 'Generate PDF',
                    immediateControl: 'Immediate control',
                    immediateControlDesc: 'Clear temporary results and reset panel.',
                    clear: 'Clear',
                    safe: 'Safe',
                    clearAthletes: 'Clear athletes',
                    clearAthletesDesc: 'Remove all registered athletes from system.',
                    clearAll: 'Clear all',
                    caution: 'Caution',
                    keyboardTitle: 'Keyboard shortcuts',
                    keyboardSubtitle: 'Direct access for frequent tasks',
                    shortcutNewAthlete: 'Ctrl + N new athlete',
                    shortcutImport: 'Ctrl + I import ranking',
                    shortcutExport: 'Ctrl + E export PDF',
                    shortcutLogs: 'Ctrl + L logs'
                },
                activity: {
                    title: 'System activity',
                    subtitle: 'Real-time audit with recent logs',
                    viewAll: 'View all',
                    noRecent: 'No recent record.',
                    secureSession: 'Secure session',
                    secureSessionSubtitle: 'Access control with visual confirmation',
                    endSession: 'End session',
                    localUsers: 'Local users',
                    localUsersDesc: 'Manage panel account passwords.',
                    noUser: 'No registered user.',
                    resetPassword: 'Reset password',
                    local: 'Local'
                },
                modalLogs: {
                    title: 'System logs'
                },
                modalEventEdit: {
                    title: 'Edit event',
                    eventName: 'Event name',
                    eventNamePlaceholder: 'Ex: Stage 1 - Regional',
                    date: 'Date',
                    location: 'Location',
                    locationPlaceholder: 'Ex: Main Arena',
                    posterUrl: 'Poster image URL',
                    posterUrlPlaceholder: 'https://.../poster.jpg',
                    posterFile: 'Or upload poster image',
                    registrationUrl: 'Registration URL',
                    registrationUrlPlaceholder: 'https://...',
                    pixKey: 'Pix key (event owner)',
                    pixKeyPlaceholder: 'CPF / CNPJ / email / phone / random key',
                    feeUnder15: 'Fee up to 15 years (GI/NO-GI)',
                    feeOver15: 'Fee over 15 years (GI/NO-GI)',
                    feeCombo: 'Fee Combo GI + NO-GI',
                    feeAbsolute: 'Fee Absolute GI / NO-GI',
                    registrationOpen: 'Open registrations now',
                    internalRegistration: 'Registration on our platform',
                    deleteEvent: 'Delete event',
                    saveChanges: 'Save changes'
                },
                modalAthlete: {
                    title: 'New athlete',
                    fullName: 'Full name',
                    fullNamePlaceholder: 'Ex: Rodrigo Cavaca',
                    event: 'Event',
                    noEvent: 'No event',
                    graduation: 'Graduation',
                    weight: 'Weight',
                    absoluteWeightPlaceholder: 'Absolute',
                    weightPlaceholder: 'Ex: Feather',
                    category: 'Category',
                    categoryPlaceholder: 'Ex: Adult',
                    categoryType: 'Category type',
                    typeWeight: 'Weight',
                    typeAbsolute: 'Absolute',
                    modality: 'Modality',
                    modalityGi: 'GI (with gi)',
                    modalityNoGi: 'NO-GI (without gi)',
                    teamAcademy: 'Team / Academy',
                    teamAcademyPlaceholder: 'Ex: Zenith JJ',
                    country: 'Country',
                    countryPlaceholder: 'Ex: Brazil',
                    photoUrl: 'Photo URL (optional)',
                    saveRegister: 'Save record'
                },
                modalAssign: {
                    title: 'Manage athletes',
                    eventPrefix: 'Event',
                    subtitle: 'Selecting moves athlete to this event.',
                    searchPlaceholder: 'Search athlete',
                    searchAria: 'Search athlete',
                    selected: 'selected',
                    noAcademy: 'No academy',
                    current: 'Current',
                    otherEvent: 'Other event',
                    noAthleteFound: 'No athlete found.',
                    saveLink: 'Save link'
                },
                modalReset: {
                    title: 'Reset password',
                    noUser: 'No user available.',
                    user: 'User',
                    newPassword: 'New password',
                    confirmPassword: 'Confirm password',
                    updatePassword: 'Update password'
                }
            }
            : {
                feedback: {
                    activateEventForReport: 'Ative um evento para gerar o relatorio.',
                    noAthletesOnActiveEvent: 'Nenhum atleta vinculado ao evento ativo.',
                    reportGenerated: (name) => `Relatorio gerado para ${name || 'evento ativo'}.`,
                    reportFail: 'Falha ao gerar o relatorio.',
                    eventUpdated: (name) => `Evento atualizado: ${name || 'evento'}.`,
                    eventUpdateFail: 'Falha ao atualizar evento.',
                    removeEventConfirm: (name) => `Deseja apagar o ${name}? Esta acao nao pode ser desfeita.`,
                    eventRemoved: 'Evento removido com sucesso.',
                    eventRemoveFail: 'Falha ao remover evento.',
                    clearAthletesConfirm: 'Isto limpara todos os atletas do painel da base. Deseja continuar?',
                    allAthletesRemoved: 'Todos os atletas foram removidos.',
                    noTextPdf: 'PDF sem texto. Gere um PDF pesquisavel (OCR) e tente novamente.',
                    noTextImport: 'PDF sem texto para importar.',
                    noAthleteInFile: 'Nenhum atleta encontrado. Verifique se o PDF tem texto.',
                    noValidAthleteImport: 'Nenhum atleta valido para importar.',
                    importReadFail: 'Falha ao ler o arquivo.',
                    invalidManualPoints: 'Informe um valor valido para pontos.',
                    manualPointsUpdated: 'Pontos atualizados manualmente.',
                    manualPointsFail: 'Nao foi possivel atualizar os pontos.',
                    beltSummaryUpdated: 'Resumo por faixa atualizado.',
                    selectEventForBracket: 'Selecione um evento para gerar as chaves.',
                    existingBracketsConfirm: 'Ja existem chaves para este evento. Deseja gerar novamente?',
                    bracketsGenerated: (count) => `${count} chaves geradas.`,
                    noBracketCategory: 'Nenhuma categoria encontrada para gerar chaves.',
                    bracketGenerateFail: 'Falha ao gerar chaves.',
                    noBracketForPdf: 'Nenhuma chave disponivel para exportar em PDF.',
                    bracketPdfSaved: 'PDF das chaves salvo com sucesso.',
                    bracketPdfFail: 'Falha ao salvar PDF das chaves.',
                    podiumApplied: 'Podio aplicado com sucesso.',
                    podiumApplyFail: 'Nao foi possivel aplicar o podio.',
                    resetOnlyLocal: 'Redefinicao de senha disponivel apenas no modo local.',
                    selectUser: 'Selecione um usuario.',
                    mismatchPassword: 'As senhas nao conferem.',
                    passwordUpdated: 'Senha atualizada com sucesso.',
                    passwordResetFor: (username) => `Senha redefinida para ${username}.`,
                    passwordResetFail: 'Falha ao redefinir senha.',
                    minName: 'Nome precisa ter pelo menos 3 caracteres.',
                    academyRequired: 'Informe a academia do atleta.',
                    athleteRegistered: (name) => `Atleta ${name} cadastrado.`,
                    athletesAssigned: 'Atletas vinculados ao evento.',
                    athleteAssignFail: 'Falha ao vincular atletas.',
                    pointsClearedFor: (name) => `Pontos limpos para ${name}`,
                    removeAthleteConfirm: (name) => `Excluir o atleta ${name}? Esta acao nao pode ser desfeita.`,
                    athleteRemoved: (name) => `Atleta removido: ${name}.`,
                    athleteRemoveFail: 'Nao foi possivel remover o atleta.',
                    goldFor: (name) => `Ouro para ${name}`,
                    silverFor: (name) => `Prata para ${name}`,
                    bronzeFor: (name) => `Bronze para ${name}`,
                    newsTitleRequired: 'Informe o titulo da noticia.',
                    newsSummaryRequired: 'Informe o resumo da noticia.',
                    newsCreated: (title) => `Noticia publicada: ${title}.`,
                    newsCreateFail: 'Falha ao publicar noticia.',
                    newsDeleteConfirm: (title) => `Remover noticia "${title}"?`,
                    newsDeleted: 'Noticia removida.',
                    newsDeleteFail: 'Falha ao remover noticia.',
                    registrationLoadFail: 'Falha ao carregar inscricoes publicas.',
                    registrationSyncDone: (synced, pending) => `Sincronizacao concluida: ${synced} enviadas, ${pending} pendentes.`,
                    registrationSyncFail: 'Falha ao sincronizar inscricoes pendentes.',
                    registrationStatusUpdated: 'Status de pagamento atualizado.',
                    registrationStatusFail: 'Falha ao atualizar status de pagamento.',
                    registrationExportDone: (count) => `${count} inscricoes exportadas para planilha.`,
                    registrationExportNoData: 'Nenhuma inscricao disponivel para exportar.',
                    clearReimportLocksConfirm: (count) => `Limpar ${count} bloqueios de reimportacao de inscricao?`,
                    reimportLocksCleared: (count) => `${count} bloqueios de reimportacao removidos.`,
                    reimportLocksNone: 'Nenhum bloqueio de reimportacao para limpar.'
                },
                nav: {
                    overview: 'Visao geral',
                    events: 'Eventos',
                    news: 'Noticias',
                    registrations: 'Inscricoes',
                    brackets: 'Chaveamento',
                    athletes: 'Atletas',
                    automation: 'Automacoes',
                    activity: 'Atividade'
                },
                common: {
                    close: 'Fechar',
                    cancel: 'Cancelar',
                    save: 'Salvar',
                    search: 'Pesquisar',
                    active: 'Ativo',
                    inactive: 'Inativo',
                    noEvent: 'Sem evento',
                    allEvents: 'Todos os eventos',
                    points: 'Pontos',
                    selected: 'selecionados',
                    noneFound: 'Nenhum encontrado',
                    update: 'Atualizar'
                },
                sidebar: {
                    title: 'Menu rapido',
                    activeAthletes: 'Atletas ativos',
                    totalPoints: 'Pontos totais',
                    registeredEvents: 'Eventos cadastrados',
                    newRegister: 'Novo cadastro'
                },
                hero: {
                    activeEvent: 'Evento ativo',
                    noActiveEvent: 'Sem evento ativo',
                    title: 'Painel de Controle',
                    subtitle: 'Acompanhe registros, ajustes e resultados do ranking com indicadores em tempo real e atalhos inteligentes para as rotinas administrativas.',
                    updatedAt: 'Atualizado as',
                    secureSessionFor: 'Sessao segura para',
                    average: 'Media',
                    newAthlete: 'Novo atleta',
                    logs: 'Logs',
                    menu: 'Menu',
                    rankingUpdated: 'Ranking atualizado',
                    athletes: 'atletas',
                    noLeader: 'Sem lider'
                },
                stats: {
                    enrolled: 'Inscritos',
                    activeTrend: 'ativos',
                    totalPoints: 'Pontos totais',
                    average: 'Media',
                    registeredEvents: 'Eventos cadastrados',
                    centralizedControl: 'Controle centralizado',
                    records: 'Registros',
                    continuousMonitoring: 'Monitoramento continuo'
                },
                eventsPanel: {
                    title: 'Eventos',
                    subtitle: 'Crie eventos e organize atletas por etapa.',
                    createEvent: 'Criar evento',
                    noEvents: 'Nenhum evento cadastrado.',
                    date: 'Data',
                    undefinedDate: 'Data indefinida',
                    athletes: 'Atletas',
                    activeEvent: 'Evento ativo',
                    activate: 'Ativar',
                    manageAthletes: 'Gerenciar atletas',
                    edit: 'Editar',
                    registration: 'Inscricao',
                    noPoster: 'Sem cartaz',
                    open: 'Aberto',
                    closed: 'Fechado'
                },
                newsPanel: {
                    title: 'Noticias',
                    subtitle: 'Crie comunicados oficiais e publique direto na pagina de noticias.',
                    openNewsPage: 'Abrir pagina de noticias',
                    titleLabel: 'Titulo',
                    titlePlaceholder: 'Ex: Inscricoes da Etapa 2 abertas',
                    summaryLabel: 'Resumo',
                    summaryPlaceholder: 'Escreva um resumo curto para aparecer na home e em noticias.',
                    imageLabel: 'URL da imagem de capa (opcional)',
                    imagePlaceholder: 'https://.../noticia.jpg',
                    dateLabel: 'Data de publicacao',
                    publish: 'Publicar noticia',
                    noNews: 'Nenhuma noticia publicada ainda.',
                    remove: 'Remover'
                },
                registrationsPanel: {
                    title: 'Inscricoes publicas',
                    subtitle: 'Todas as inscricoes recebidas pelo formulario publico em um unico painel.',
                    refresh: 'Atualizar',
                    syncNow: 'Sincronizar agora',
                    pendingLabel: 'Pendentes de sincronizacao',
                    filterPending: 'Mostrar apenas pendentes',
                    filterAll: 'Mostrar todos',
                    searchPlaceholder: 'Buscar por atleta, academia, telefone, email ou anotacoes',
                    searchAria: 'Buscar inscricao',
                    eventFilter: 'Filtro de evento',
                    allEvents: 'Todos os eventos',
                    tablePhoto: 'Foto',
                    tableAthlete: 'Atleta',
                    tableEvent: 'Evento',
                    tableCategory: 'Categoria',
                    tableContact: 'Contato',
                    tablePayment: 'Pagamento',
                    tableNotes: 'Observacoes',
                    tableStatus: 'Status',
                    totalValue: 'Total',
                    pixKey: 'Chave Pix',
                    receipt: 'Comprovante',
                    noReceipt: 'Sem comprovante',
                    noData: 'Nenhuma inscricao publica encontrada.',
                    noNotes: 'Sem observacoes',
                    noPhoto: 'Sem foto',
                    statusPendingSync: 'Pendente de sincronizacao',
                    statusDefault: 'Pendente',
                    statusPaymentConfirmed: 'Pagamento confirmado - Atleta ativo',
                    statusPaymentError: 'Erro no pagamento',
                    confirmPayment: 'Confirmar pagamento',
                    markPaymentError: 'Marcar erro no pagamento',
                    exportSpreadsheet: 'Exportar planilha',
                    confirmReviewPrompt: 'Observacao da conferencia (opcional):',
                    errorReviewPrompt: 'Descreva o erro de pagamento (opcional):',
                    reviewedBy: 'Conferido por',
                    reviewedAt: 'Conferido em',
                    reviewNotes: 'Observacao da conferencia',
                    proofPreviewTitle: 'Previa do comprovante',
                    proofPreviewPdf: 'Previa PDF',
                    openReceipt: 'Abrir comprovante',
                    lastError: 'Erro de sincronizacao'
                },
                bracketsPanel: {
                    title: 'Chaveamento',
                    subtitle: 'Gere chaves por categoria e aplique o podio automaticamente.',
                    selectEvent: 'Selecionar evento',
                    selectEventAria: 'Selecionar evento para chaveamento',
                    selectCategoryAria: 'Selecionar categoria de chaveamento',
                    allCategories: 'Todas as categorias',
                    generate: 'Gerar chaves',
                    savePdf: 'Salvar PDF das chaves',
                    searchPlaceholder: 'Buscar chave por numero ou categoria',
                    searchAria: 'Buscar chave',
                    brackets: 'chaves',
                    bracket: 'Chave',
                    applied: 'Aplicado',
                    event: 'Evento',
                    athletes: 'Atletas',
                    round1: 'Rodada 1',
                    athlete: 'Atleta',
                    noAthleteBracket: 'Sem atletas nesta chave.',
                    podium: 'Podio',
                    firstPlace: '1o lugar',
                    secondPlace: '2o lugar',
                    thirdPlace: '3o lugar',
                    selectAthlete: 'Selecionar atleta',
                    apply: 'Aplicar podio',
                    reapply: 'Reaplicar podio',
                    noBracketFound: 'Nenhuma chave encontrada.'
                },
                beltSummary: {
                    title: 'Resumo por faixa',
                    subtitle: 'Distribuicao de pontos por graduacao',
                    updateTitle: 'Atualizado as'
                },
                athletesPanel: {
                    title: 'Base de atletas',
                    subtitle: 'Gerencie registros e ajuste pontuacoes rapidamente',
                    searchPlaceholder: 'Pesquisar por nome ou academia',
                    searchAria: 'Pesquisar atleta',
                    filterEventAria: 'Filtrar por evento',
                    noEvent: 'Sem evento',
                    listView: 'Visualizacao em lista',
                    cardView: 'Visualizacao em cards',
                    athlete: 'Atleta',
                    academy: 'Academia',
                    event: 'Evento',
                    contact: 'Contato',
                    profile: 'Perfil',
                    noProfile: 'Sem perfil de filiacao',
                    noPhoto: 'Sem foto',
                    actions: 'Acoes',
                    pointsPlaceholder: 'Pontos',
                    clearPointsAria: 'Limpar pontos',
                    registerGoldAria: 'Registrar ouro',
                    registerSilverAria: 'Registrar prata',
                    registerBronzeAria: 'Registrar bronze',
                    removeAthleteAria: 'Remover atleta',
                    clearBase: 'Limpar base de atletas',
                    clearReimportLocks: 'Limpar bloqueios de reimportacao',
                    paginationPrev: 'Anterior',
                    paginationNext: 'Proxima',
                    paginationPerPage: 'Por pagina',
                    paginationPage: 'Pagina',
                    paginationShowing: (from, to, total) => `Mostrando ${from}-${to} de ${total}`,
                    belt: 'Faixa',
                    weight: 'Peso',
                    category: 'Categoria',
                    noAthleteFound: 'Nenhum atleta encontrado.'
                },
                automation: {
                    title: 'Automacoes e atalhos',
                    subtitle: 'Ferramentas organizadas para agilizar o trabalho',
                    fast: 'Rapido',
                    importFromPdf: 'Importar relacao por PDF',
                    importDescription: 'Le o PDF e separa nome, faixa, categoria e academia.',
                    importPdf: 'Importar PDF',
                    debugPreview: 'Debug preview (primeiras linhas)',
                    importFile: 'Importar arquivo',
                    importFileDesc: 'Abra o seletor de PDF/TXT para atualizar o ranking.',
                    select: 'Selecionar',
                    exportReport: 'Exportar relatorio',
                    exportReportDesc: 'Gere o PDF oficial do evento ativo.',
                    generatePdf: 'Gerar PDF',
                    immediateControl: 'Controle imediato',
                    immediateControlDesc: 'Limpe resultados temporarios e reinicie o painel.',
                    clear: 'Limpar',
                    safe: 'Seguro',
                    clearAthletes: 'Limpar atletas',
                    clearAthletesDesc: 'Remove todos os atletas cadastrados do sistema.',
                    clearAll: 'Limpar tudo',
                    caution: 'Cuidado',
                    keyboardTitle: 'Atalhos de teclado',
                    keyboardSubtitle: 'Acesso direto para tarefas frequentes',
                    shortcutNewAthlete: 'Ctrl + N novo atleta',
                    shortcutImport: 'Ctrl + I importar ranking',
                    shortcutExport: 'Ctrl + E exportar PDF',
                    shortcutLogs: 'Ctrl + L logs'
                },
                activity: {
                    title: 'Atividade do sistema',
                    subtitle: 'Auditoria em tempo real com logs recentes',
                    viewAll: 'Ver todos',
                    noRecent: 'Nenhum registro recente.',
                    secureSession: 'Sessao segura',
                    secureSessionSubtitle: 'Controle de acesso com confirmacao visual',
                    endSession: 'Encerrar sessao',
                    localUsers: 'Usuarios locais',
                    localUsersDesc: 'Gerencie senhas das contas do painel.',
                    noUser: 'Nenhum usuario cadastrado.',
                    resetPassword: 'Redefinir senha',
                    local: 'Local'
                },
                modalLogs: {
                    title: 'Logs do sistema'
                },
                modalEventEdit: {
                    title: 'Editar evento',
                    eventName: 'Nome do evento',
                    eventNamePlaceholder: 'Ex: Etapa 1 - Regional',
                    date: 'Data',
                    location: 'Local',
                    locationPlaceholder: 'Ex: Arena Central',
                    posterUrl: 'URL da imagem do cartaz',
                    posterUrlPlaceholder: 'https://.../cartaz.jpg',
                    posterFile: 'Ou envie a imagem do cartaz',
                    registrationUrl: 'URL de inscricao',
                    registrationUrlPlaceholder: 'https://...',
                    pixKey: 'Chave Pix (responsavel do campeonato)',
                    pixKeyPlaceholder: 'CPF / CNPJ / email / telefone / chave aleatoria',
                    feeUnder15: 'Valor ate 15 anos (GI/NO-GI)',
                    feeOver15: 'Valor acima de 15 anos (GI/NO-GI)',
                    feeCombo: 'Valor Combo GI + NO-GI',
                    feeAbsolute: 'Valor Absoluto GI / NO-GI',
                    registrationOpen: 'Inscricoes abertas agora',
                    internalRegistration: 'Inscricao na nossa plataforma',
                    deleteEvent: 'Apagar evento',
                    saveChanges: 'Salvar alteracoes'
                },
                modalAthlete: {
                    title: 'Novo atleta',
                    fullName: 'Nome completo',
                    fullNamePlaceholder: 'Ex: Rodrigo Cavaca',
                    event: 'Evento',
                    noEvent: 'Sem evento',
                    graduation: 'Graduacao',
                    weight: 'Peso',
                    absoluteWeightPlaceholder: 'Absoluto',
                    weightPlaceholder: 'Ex: Pena',
                    category: 'Categoria',
                    categoryPlaceholder: 'Ex: Adulto',
                    categoryType: 'Tipo de categoria',
                    typeWeight: 'Peso',
                    typeAbsolute: 'Absoluto',
                    modality: 'Modalidade',
                    modalityGi: 'GI (com pano)',
                    modalityNoGi: 'NO-GI (sem pano)',
                    teamAcademy: 'Equipe / Academia',
                    teamAcademyPlaceholder: 'Ex: Zenith JJ',
                    country: 'Pais',
                    countryPlaceholder: 'Ex: Brasil',
                    photoUrl: 'URL da foto (opcional)',
                    saveRegister: 'Salvar registro'
                },
                modalAssign: {
                    title: 'Gerenciar atletas',
                    eventPrefix: 'Evento',
                    subtitle: 'Selecionar move o atleta para este evento.',
                    searchPlaceholder: 'Pesquisar atleta',
                    searchAria: 'Pesquisar atleta',
                    selected: 'selecionados',
                    noAcademy: 'Sem academia',
                    current: 'Atual',
                    otherEvent: 'Outro evento',
                    noAthleteFound: 'Nenhum atleta encontrado.',
                    saveLink: 'Salvar vinculo'
                },
                modalReset: {
                    title: 'Redefinir senha',
                    noUser: 'Nenhum usuario disponivel.',
                    user: 'Usuario',
                    newPassword: 'Nova senha',
                    confirmPassword: 'Confirmar senha',
                    updatePassword: 'Atualizar senha'
                }
            }
    ), [isEnglish]);
    const locale = isEnglish ? 'en-US' : 'pt-BR';
    const localizeBelt = useCallback(
        (value, fallback = copy.athletesPanel.belt) => translateBelt(value || fallback, language),
        [copy.athletesPanel.belt, language]
    );
    const localizeWeight = useCallback(
        (value, fallback = copy.athletesPanel.weight) => translateWeight(value || fallback, language),
        [copy.athletesPanel.weight, language]
    );
    const localizeCategory = useCallback(
        (value, fallback = copy.athletesPanel.category) => translateCategory(value || fallback, language),
        [copy.athletesPanel.category, language]
    );
    const localizeComposite = useCallback(
        (label) => translateCompositeLabel(label, language),
        [language]
    );

    const translateLogAction = useCallback((action) => {
        if (!isEnglish) return action;
        const map = {
            LOGIN: 'Login',
            LOGOUT: 'Logout',
            LOGIN_SUCCESS: 'Login success',
            LOGIN_FAILURE: 'Login failure',
            REGISTER: 'Register',
            REGISTER_FAILURE: 'Register failure',
            RESET_PASSWORD: 'Password reset',
            RESET_PASSWORD_ADMIN: 'Admin password reset',
            RESET_PASSWORD_FAILURE: 'Password reset failure',
            ADD_EVENT: 'Add event',
            UPDATE_EVENT: 'Update event',
            DELETE_EVENT: 'Delete event',
            SET_ACTIVE_EVENT: 'Set active event',
            ASSIGN_EVENT: 'Assign event',
            ADD_ATHLETE: 'Add athlete',
            UPDATE_POINTS: 'Update points',
            SET_POINTS: 'Set points',
            RESET_POINTS: 'Reset points',
            GENERATE_BRACKETS: 'Generate brackets',
            APPLY_BRACKET: 'Apply bracket',
            CLEAR_ATHLETES: 'Clear athletes',
            BATCH: 'Batch import'
        };
        return map[action] || action;
    }, [isEnglish]);

    const translateLogDetails = useCallback((details) => {
        if (!isEnglish || !details) return details;
        const replacements = [
            [/Usuario/gi, 'User'],
            [/Usuário/gi, 'User'],
            [/UsuÃ¡rio/gi, 'User'],
            [/acessou o sistema/gi, 'accessed the system'],
            [/saiu/gi, 'logged out'],
            [/Evento criado/gi, 'Event created'],
            [/Evento atualizado/gi, 'Event updated'],
            [/Evento removido/gi, 'Event removed'],
            [/Evento ativo/gi, 'Active event'],
            [/Atletas vinculados ao evento/gi, 'Athletes linked to event'],
            [/Novo atleta/gi, 'New athlete'],
            [/Pontos limpos/gi, 'Points cleared'],
            [/Pontuação alterada/gi, 'Points updated'],
            [/Pontuacao alterada/gi, 'Points updated'],
            [/Pontos definidos manualmente/gi, 'Points manually set'],
            [/Importacao/gi, 'Import'],
            [/Importação/gi, 'Import'],
            [/invalidos/gi, 'invalid'],
            [/duplicados/gi, 'duplicate'],
            [/Chaves geradas/gi, 'Brackets generated'],
            [/Podio aplicado/gi, 'Podium applied'],
            [/Falha/gi, 'Failure'],
            [/Nao encontrado/gi, 'Not found'],
            [/não encontrado/gi, 'Not found']
        ];
        return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), details);
    }, [isEnglish]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [toast, setToast] = useState(null);
    const [navOpen, setNavOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [viewMode, setViewMode] = useState('table');
    const [athletesPage, setAthletesPage] = useState(1);
    const [athletesPageSize, setAthletesPageSize] = useState(ATHLETE_PAGE_SIZE_OPTIONS[0]);
    const [now, setNow] = useState(new Date());
    const importInputRef = useRef(null);
    const [importMode, setImportMode] = useState('GI');
    const [importStatus, setImportStatus] = useState('');
    const [importError, setImportError] = useState('');
    const [importDebug, setImportDebug] = useState('');
    const [manualInputs, setManualInputs] = useState({});
    const [eventFilter, setEventFilter] = useState(activeEventId || 'all');
    const [importEventId, setImportEventId] = useState(activeEventId || '');
    const [bracketEventId, setBracketEventId] = useState(activeEventId || '');
    const [bracketMode, setBracketMode] = useState('ALL');
    const [bracketSearch, setBracketSearch] = useState('');
    const [showEventEditModal, setShowEventEditModal] = useState(false);
    const [eventEditForm, setEventEditForm] = useState(createEventEditFormState);
    const [eventEditError, setEventEditError] = useState('');
    const [newsForm, setNewsForm] = useState(createNewsFormState);
    const [newsError, setNewsError] = useState('');
    const [newAthlete, setNewAthlete] = useState({
        nome: '',
        faixa: 'Branca',
        peso: '',
        categoria: 'Adulto',
        academia: '',
        pais: 'Brasil',
        photoUrl: '',
        isNoGi: false,
        isAbsolute: false,
        eventId: activeEventId || ''
    });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignEvent, setAssignEvent] = useState(null);
    const [assignSelection, setAssignSelection] = useState({});
    const [assignSearch, setAssignSearch] = useState('');
    const [showUserResetModal, setShowUserResetModal] = useState(false);
    const [userResetList, setUserResetList] = useState([]);
    const [userResetUsername, setUserResetUsername] = useState('');
    const [userResetPassword, setUserResetPassword] = useState('');
    const [userResetConfirm, setUserResetConfirm] = useState('');
    const [userResetError, setUserResetError] = useState('');
    const [userResetSuccess, setUserResetSuccess] = useState('');
    const [userResetLoading, setUserResetLoading] = useState(false);
    const [publicRegistrations, setPublicRegistrations] = useState([]);
    const [registrationSearch, setRegistrationSearch] = useState('');
    const [registrationEventFilter, setRegistrationEventFilter] = useState('all');
    const [registrationPendingOnly, setRegistrationPendingOnly] = useState(false);
    const [registrationPendingFilterTouched, setRegistrationPendingFilterTouched] = useState(false);
    const [registrationsLoading, setRegistrationsLoading] = useState(false);
    const [registrationsSyncing, setRegistrationsSyncing] = useState(false);
    const [registrationsError, setRegistrationsError] = useState('');
    const [registrationStatusUpdatingId, setRegistrationStatusUpdatingId] = useState('');
    const [suppressedRegistrationKeys, setSuppressedRegistrationKeys] = useState(loadSuppressedRegistrationKeys);
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const deferredRegistrationSearch = useDeferredValue(registrationSearch);
    const suppressedRegistrationKeySet = useMemo(
        () => new Set(suppressedRegistrationKeys),
        [suppressedRegistrationKeys]
    );

    const showFeedback = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        saveSuppressedRegistrationKeys(suppressedRegistrationKeys);
    }, [suppressedRegistrationKeys]);

    const addSuppressedRegistrationKeys = useCallback((keys) => {
        const normalized = (Array.isArray(keys) ? keys : [keys])
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
        if (!normalized.length) return;

        setSuppressedRegistrationKeys((prev) => {
            const next = new Set(prev);
            normalized.forEach((key) => next.add(key));
            if (next.size === prev.length) return prev;
            return [...next];
        });
    }, []);

    const removeSuppressedRegistrationKey = useCallback((key) => {
        const normalized = typeof key === 'string' ? key.trim() : '';
        if (!normalized) return;
        setSuppressedRegistrationKeys((prev) => (
            prev.includes(normalized)
                ? prev.filter((item) => item !== normalized)
                : prev
        ));
    }, []);

    const handleFinalizeEvent = useCallback(() => {
        if (!activeEventId) {
            showFeedback('error', copy.feedback.activateEventForReport);
            return;
        }

        const eventMeta = events.find((event) => event.id === activeEventId);
        const eventAthletes = athletes.filter((athlete) => athlete.eventId === activeEventId);

        if (!eventAthletes.length) {
            showFeedback('error', copy.feedback.noAthletesOnActiveEvent);
            return;
        }

        try {
            generateRankingPDF(eventAthletes, {
                eventName: eventMeta?.name || copy.bracketsPanel.event,
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || ''
            });
            showFeedback('success', copy.feedback.reportGenerated(eventMeta?.name));
            clearEventResults();
        } catch (err) {
            const message = err?.message || copy.feedback.reportFail;
            console.error('PDF export error:', err);
            showFeedback('error', message);
        }
    }, [activeEventId, athletes, clearEventResults, events, showFeedback, copy.feedback, copy.bracketsPanel.event]);

    const handleOpenEditEvent = useCallback((eventItem) => {
        if (!eventItem) return;
        setEventEditError('');
        setEventEditForm({
            id: eventItem.id,
            name: eventItem.name || '',
            date: eventItem.date || '',
            location: eventItem.location || '',
            posterUrl: eventItem.posterUrl || '',
            registrationUrl: eventItem.registrationUrl || '',
            pixKey: eventItem.pixKey || DEFAULT_EVENT_PIX_KEY,
            feeUnder15: eventItem.feeUnder15 ?? DEFAULT_EVENT_FEES.under15,
            feeOver15: eventItem.feeOver15 ?? DEFAULT_EVENT_FEES.over15,
            feeCombo: eventItem.feeCombo ?? DEFAULT_EVENT_FEES.combo,
            feeAbsolute: eventItem.feeAbsolute ?? DEFAULT_EVENT_FEES.absolute,
            registrationOpen: eventItem.registrationOpen !== false,
            internalRegistration: eventItem.internalRegistration !== false
        });
        setShowEventEditModal(true);
    }, []);

    const handleCloseEditEvent = useCallback(() => {
        setShowEventEditModal(false);
        setEventEditError('');
        setEventEditForm(createEventEditFormState());
    }, []);

    const handleUpdateEvent = useCallback((event) => {
        event.preventDefault();
        setEventEditError('');
        try {
            const updated = updateEvent(eventEditForm.id, {
                name: eventEditForm.name,
                date: eventEditForm.date,
                location: eventEditForm.location,
                posterUrl: eventEditForm.posterUrl,
                registrationUrl: eventEditForm.registrationUrl,
                pixKey: eventEditForm.pixKey,
                feeUnder15: eventEditForm.feeUnder15,
                feeOver15: eventEditForm.feeOver15,
                feeCombo: eventEditForm.feeCombo,
                feeAbsolute: eventEditForm.feeAbsolute,
                registrationOpen: eventEditForm.registrationOpen,
                internalRegistration: eventEditForm.internalRegistration
            });
            showFeedback('success', copy.feedback.eventUpdated(updated?.name));
            handleCloseEditEvent();
        } catch (err) {
            const message = err?.message || copy.feedback.eventUpdateFail;
            setEventEditError(message);
            showFeedback('error', message);
        }
    }, [eventEditForm, updateEvent, showFeedback, handleCloseEditEvent, copy.feedback]);

    const handleEventEditPosterFile = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setEventEditForm((prev) => ({ ...prev, posterUrl: reader.result }));
            }
        };
        reader.onerror = () => setEventEditError(copy.feedback.eventUpdateFail);
        reader.readAsDataURL(file);
        event.target.value = '';
    }, [copy.feedback.eventUpdateFail]);

    const handleDeleteEvent = useCallback(() => {
        if (!eventEditForm.id) return;
        const name = eventEditForm.name || (isEnglish ? 'selected event' : 'evento selecionado');
        const confirmed = window.confirm(copy.feedback.removeEventConfirm(name));
        if (!confirmed) return;
        try {
            deleteEvent(eventEditForm.id);
            showFeedback('success', copy.feedback.eventRemoved);
            handleCloseEditEvent();
        } catch (err) {
            const message = err?.message || copy.feedback.eventRemoveFail;
            setEventEditError(message);
            showFeedback('error', message);
        }
    }, [eventEditForm.id, eventEditForm.name, deleteEvent, showFeedback, handleCloseEditEvent, copy.feedback, isEnglish]);

    const handleImportRanking = useCallback(() => {
        importInputRef.current?.click();
    }, []);

    const handleClearAthletes = useCallback(() => {
        const confirmed = window.confirm(copy.feedback.clearAthletesConfirm);
        if (confirmed) {
            const keysToSuppress = athletes
                .map((athlete) => buildAthleteRegistrationIdentityKey(athlete))
                .filter(Boolean);
            addSuppressedRegistrationKeys(keysToSuppress);
            clearAthletes();
            showFeedback('success', copy.feedback.allAthletesRemoved);
        }
    }, [athletes, addSuppressedRegistrationKeys, clearAthletes, showFeedback, copy.feedback]);

    const handleClearReimportLocks = useCallback(() => {
        if (!suppressedRegistrationKeys.length) {
            showFeedback('success', copy.feedback.reimportLocksNone);
            return;
        }
        const confirmed = window.confirm(copy.feedback.clearReimportLocksConfirm(suppressedRegistrationKeys.length));
        if (!confirmed) return;
        setSuppressedRegistrationKeys([]);
        showFeedback('success', copy.feedback.reimportLocksCleared(suppressedRegistrationKeys.length));
    }, [suppressedRegistrationKeys, showFeedback, copy.feedback]);

    const handleRemoveAthlete = useCallback((athlete) => {
        if (!athlete?.id) return;
        const athleteName = athlete.nome || (isEnglish ? 'selected athlete' : 'atleta selecionado');
        const confirmed = window.confirm(copy.feedback.removeAthleteConfirm(athleteName));
        if (!confirmed) return;

        try {
            const identityKey = buildAthleteRegistrationIdentityKey(athlete);
            if (identityKey) addSuppressedRegistrationKeys([identityKey]);
            removeAthlete(athlete.id);
            setManualInputs((prev) => {
                const next = { ...prev };
                delete next[athlete.id];
                return next;
            });
            showFeedback('success', copy.feedback.athleteRemoved(athleteName));
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.athleteRemoveFail);
        }
    }, [addSuppressedRegistrationKeys, removeAthlete, showFeedback, copy.feedback, isEnglish]);

    const handleImportFile = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportError('');
        setImportStatus('Lendo arquivo...');
        setImportDebug('');

        try {
            const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
            const text = isText ? await file.text() : await extractTextFromPdfFile(file);
            const cleanedText = text.replace(/\s+/g, '').trim();

            if (!cleanedText) {
                setImportError(copy.feedback.noTextPdf);
                setImportStatus('');
                showFeedback('error', copy.feedback.noTextImport);
                return;
            }

            const parsed = parseAthletesFromText(text, importMode);

            if (!parsed.length) {
                setImportError(copy.feedback.noAthleteInFile);
                setImportDebug(buildImportDebug(text));
                console.log('PDF import debug preview:\n', buildImportDebug(text));
                setImportStatus('');
                showFeedback('error', copy.feedback.noValidAthleteImport);
                return;
            }

            const result = importAthletes(parsed, { eventId: importEventId || activeEventId || '' });
            const importedCount = result?.imported ?? parsed.length;
            setImportStatus(`${importedCount} atletas importados.`);
            showFeedback('success', `${importedCount} atletas importados.`);
        } catch (err) {
            setImportError(err?.message || copy.feedback.importReadFail);
            setImportStatus('');
            showFeedback('error', copy.feedback.importReadFail);
        } finally {
            event.target.value = '';
            setTimeout(() => {
                setImportStatus('');
                setImportError('');
            }, 4000);
        }
    }, [importAthletes, importMode, importEventId, activeEventId, showFeedback, copy.feedback]);

    const handleManualInputChange = useCallback((id, value) => {
        setManualInputs((prev) => ({ ...prev, [id]: value }));
    }, []);

    const handleManualPoints = useCallback((id) => {
        const rawValue = manualInputs[id];
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
            showFeedback('error', copy.feedback.invalidManualPoints);
            return;
        }
        const ok = setManualPoints(id, parsed);
        if (ok) {
            showFeedback('success', copy.feedback.manualPointsUpdated);
            setManualInputs((prev) => ({ ...prev, [id]: '' }));
        } else {
            showFeedback('error', copy.feedback.manualPointsFail);
        }
    }, [manualInputs, setManualPoints, showFeedback, copy.feedback]);

    const handleRefreshBeltSummary = useCallback(() => {
        setNow(new Date());
        showFeedback('success', copy.feedback.beltSummaryUpdated);
    }, [showFeedback, copy.feedback]);

    const filteredBrackets = useMemo(() => {
        const term = bracketSearch.trim().toLowerCase();
        const numberTerm = Number(term);
        const hasNumber = term.length > 0 && Number.isFinite(numberTerm);
        return brackets
            .filter((bracket) => (
                !bracketEventId
                || bracket.eventId === bracketEventId
            ))
            .filter((bracket) => (
                bracketMode === 'ALL' || bracket.mode === bracketMode
            ))
            .filter((bracket) => {
                if (!term) return true;
                const labelMatch = (bracket.label || '').toLowerCase().includes(term);
                const numberMatch = hasNumber ? bracket.number === numberTerm : false;
                return labelMatch || numberMatch;
            })
            .sort((a, b) => (a.number || 0) - (b.number || 0));
    }, [brackets, bracketEventId, bracketMode, bracketSearch]);

    const handleGenerateBrackets = useCallback(async () => {
        if (!bracketEventId) {
            showFeedback('error', copy.feedback.selectEventForBracket);
            return;
        }

        const hasExisting = brackets.some((bracket) => (
            bracket.eventId === bracketEventId
            && (bracketMode === 'ALL' || bracket.mode === bracketMode)
        ));

        if (hasExisting) {
            const confirmed = window.confirm(copy.feedback.existingBracketsConfirm);
            if (!confirmed) return;
        }

        try {
            const result = generateBrackets({
                eventId: bracketEventId,
                mode: bracketMode,
                replaceExisting: hasExisting
            });
            if (result.created > 0) {
                showFeedback('success', copy.feedback.bracketsGenerated(result.created));
                const eventMeta = events.find((event) => event.id === bracketEventId);
                const modeLabelMap = {
                    ALL: isEnglish ? 'Overall' : 'Geral',
                    GI: isEnglish ? 'GI (weight)' : 'GI (peso)',
                    'NO-GI': isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)',
                    'ABS-GI': 'ABS GI',
                    'ABS-NO-GI': 'ABS NO-GI'
                };
                await generateBracketsPDF(result.brackets || [], athletes, {
                    eventName: eventMeta?.name || copy.bracketsPanel.event,
                    eventDate: eventMeta?.date || '',
                    eventLocation: eventMeta?.location || '',
                    modeLabel: modeLabelMap[bracketMode] || bracketMode
                });
            } else {
                showFeedback('error', copy.feedback.noBracketCategory);
            }
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.bracketGenerateFail);
        }
    }, [bracketEventId, bracketMode, brackets, events, generateBrackets, athletes, showFeedback, copy.feedback, copy.bracketsPanel.event, isEnglish]);

    const handleExportBracketsPdf = useCallback(async () => {
        if (!filteredBrackets.length) {
            showFeedback('error', copy.feedback.noBracketForPdf);
            return;
        }

        const eventMeta = events.find((event) => event.id === bracketEventId);
        const modeLabelMap = {
            ALL: isEnglish ? 'Overall' : 'Geral',
            GI: isEnglish ? 'GI (weight)' : 'GI (peso)',
            'NO-GI': isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)',
            'ABS-GI': 'ABS GI',
            'ABS-NO-GI': 'ABS NO-GI'
        };

        try {
            await generateBracketsPDF(filteredBrackets, athletes, {
                eventName: eventMeta?.name || copy.bracketsPanel.event,
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || '',
                modeLabel: modeLabelMap[bracketMode] || bracketMode
            });
            showFeedback('success', copy.feedback.bracketPdfSaved);
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.bracketPdfFail);
        }
    }, [
        filteredBrackets,
        events,
        bracketEventId,
        bracketMode,
        athletes,
        showFeedback,
        copy.feedback,
        copy.bracketsPanel.event,
        isEnglish
    ]);

    const handleApplyBracketPodium = useCallback((bracketId) => {
        const result = applyBracketPodium(bracketId);
        if (result.ok) {
            showFeedback('success', copy.feedback.podiumApplied);
        } else {
            showFeedback('error', result.message || copy.feedback.podiumApplyFail);
        }
    }, [applyBracketPodium, showFeedback, copy.feedback]);

    const openUserResetModal = useCallback(() => {
        if (authService.isLocalAuth && !authService.isLocalAuth()) {
            showFeedback('error', copy.feedback.resetOnlyLocal);
            return;
        }
        const users = authService.listUsers ? authService.listUsers() : [];
        setUserResetList(users);
        setUserResetUsername(users[0]?.username || '');
        setUserResetPassword('');
        setUserResetConfirm('');
        setUserResetError('');
        setUserResetSuccess('');
        setShowUserResetModal(true);
    }, [showFeedback, copy.feedback]);

    const closeUserResetModal = useCallback(() => {
        setShowUserResetModal(false);
        setUserResetPassword('');
        setUserResetConfirm('');
        setUserResetError('');
        setUserResetSuccess('');
    }, []);

    const handleUserResetSubmit = useCallback(async (event) => {
        event.preventDefault();
        setUserResetError('');
        setUserResetSuccess('');

        if (!userResetUsername) {
            setUserResetError(copy.feedback.selectUser);
            return;
        }

        if (userResetPassword !== userResetConfirm) {
            setUserResetError(copy.feedback.mismatchPassword);
            return;
        }

        setUserResetLoading(true);
        try {
            await authService.resetPassword(userResetUsername, userResetPassword);
            setUserResetSuccess(copy.feedback.passwordUpdated);
            showFeedback('success', copy.feedback.passwordResetFor(userResetUsername));
            addLog({
                type: 'AUTH',
                action: 'RESET_PASSWORD_ADMIN',
                details: copy.feedback.passwordResetFor(userResetUsername)
            });
            setUserResetPassword('');
            setUserResetConfirm('');
        } catch (err) {
            const message = err?.message || copy.feedback.passwordResetFail;
            setUserResetError(message);
            showFeedback('error', message);
            addLog({
                type: 'AUTH',
                action: 'RESET_PASSWORD_FAILURE',
                details: `Falha: ${userResetUsername} - ${message}`
            });
        } finally {
            setUserResetLoading(false);
        }
    }, [userResetUsername, userResetPassword, userResetConfirm, showFeedback, addLog, copy.feedback]);

    const loadPublicRegistrations = useCallback(async () => {
        setRegistrationsLoading(true);
        setRegistrationsError('');
        try {
            const payload = await publicRegistrationService.listRegistrations();
            setPublicRegistrations(Array.isArray(payload) ? payload : []);
        } catch (err) {
            const message = err?.message || copy.feedback.registrationLoadFail;
            setRegistrationsError(message);
            showFeedback('error', message);
        } finally {
            setRegistrationsLoading(false);
        }
    }, [showFeedback, copy.feedback.registrationLoadFail]);

    const handleSyncPendingRegistrations = useCallback(async () => {
        setRegistrationsSyncing(true);
        setRegistrationsError('');
        try {
            const syncResult = await publicRegistrationService.syncPendingRegistrations();
            const payload = await publicRegistrationService.listRegistrations();
            setPublicRegistrations(Array.isArray(payload) ? payload : []);
            showFeedback(
                'success',
                copy.feedback.registrationSyncDone(syncResult?.synced || 0, syncResult?.pending || 0)
            );
        } catch (err) {
            const message = err?.message || copy.feedback.registrationSyncFail;
            setRegistrationsError(message);
            showFeedback('error', message);
        } finally {
            setRegistrationsSyncing(false);
        }
    }, [showFeedback, copy.feedback]);

    const handleUpdateRegistrationPaymentStatus = useCallback(async (registration, nextStatus) => {
        if (!registration?.id || !nextStatus) return;
        const promptMessage = nextStatus === REGISTRATION_STATUS.PAYMENT_ERROR
            ? copy.registrationsPanel.errorReviewPrompt
            : copy.registrationsPanel.confirmReviewPrompt;
        const reviewNotes = window.prompt(promptMessage, registration.paymentReviewNotes || '');
        if (reviewNotes === null) return;

        setRegistrationStatusUpdatingId(registration.id);
        setRegistrationsError('');
        try {
            const updated = await publicRegistrationService.updatePaymentStatus(registration.id, {
                status: nextStatus,
                reviewNotes,
                reviewedBy: currentUser?.name || currentUser?.username || 'ADMIN'
            });
            setPublicRegistrations((prev) => prev.map((item) => (
                item.id === registration.id ? updated : item
            )));

            const eventMapForUpdate = events.reduce((acc, event) => {
                if (event?.id) acc[event.id] = event;
                return acc;
            }, {});
            const normalizedUpdated = parseRegistrationRecord(updated, eventMapForUpdate, copy);
            const updatedIdentityKey = buildRegistrationIdentityKey(normalizedUpdated);

            if (normalizedUpdated.isPaymentConfirmed && updatedIdentityKey) {
                removeSuppressedRegistrationKey(updatedIdentityKey);
            }

            if (normalizedUpdated.isPaymentError && updatedIdentityKey) {
                addSuppressedRegistrationKeys([updatedIdentityKey]);
            }

            if (normalizedUpdated.isPaymentConfirmed) {
                setActiveSection('brackets');
                const section = document.getElementById('brackets');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            showFeedback('success', copy.feedback.registrationStatusUpdated);
        } catch (err) {
            const message = err?.message || copy.feedback.registrationStatusFail;
            setRegistrationsError(message);
            showFeedback('error', message);
        } finally {
            setRegistrationStatusUpdatingId('');
        }
    }, [
        currentUser,
        events,
        addSuppressedRegistrationKeys,
        removeSuppressedRegistrationKey,
        showFeedback,
        copy
    ]);

    const handleExportRegistrationsSpreadsheet = useCallback(() => {
        const eventMapForExport = events.reduce((acc, event) => {
            if (event?.id) acc[event.id] = event;
            return acc;
        }, {});

        const rows = publicRegistrations
            .map((item) => parseRegistrationRecord(item, eventMapForExport, copy))
            .filter((item) => (
                registrationEventFilter === 'all'
                || item.eventId === registrationEventFilter
            ));
        if (!rows.length) {
            showFeedback('error', copy.feedback.registrationExportNoData);
            return;
        }

        const headers = isEnglish
            ? [
                'Registration ID',
                'Event ID',
                'Event',
                'Event date',
                'Event location',
                'Athlete',
                'Academy',
                'Email',
                'Phone',
                'Gender',
                'Category',
                'Belt',
                'Weight',
                'Mode',
                'Birth year',
                'Age',
                'Registration type',
                'GI weight',
                'NO-GI weight',
                'Absolute GI',
                'Estimated total',
                'Pix key',
                'Receipt file',
                'Receipt type',
                'Receipt size (bytes)',
                'Receipt attached',
                'Athlete notes',
                'Payment status',
                'Payment review notes',
                'Reviewed by',
                'Reviewed at',
                'Created at'
            ]
            : [
                'ID inscricao',
                'ID evento',
                'Evento',
                'Data evento',
                'Local evento',
                'Atleta',
                'Academia',
                'Email',
                'Telefone',
                'Genero',
                'Categoria',
                'Faixa',
                'Peso',
                'Modalidade',
                'Ano nascimento',
                'Idade',
                'Tipo inscricao',
                'Peso GI',
                'Peso NO-GI',
                'Absoluto GI',
                'Valor total',
                'Chave Pix',
                'Arquivo comprovante',
                'Tipo comprovante',
                'Tamanho comprovante (bytes)',
                'Comprovante anexado',
                'Observacoes atleta',
                'Status pagamento',
                'Observacao conferencia',
                'Conferido por',
                'Conferido em',
                'Criado em'
            ];

        const data = rows.map((item) => [
            item.id || '',
            item.eventId || '',
            item.eventName || '',
            item.eventDate || '',
            item.eventLocation || '',
            item.nome || '',
            item.academia || '',
            item.email || '',
            item.phone || '',
            item.genero || '',
            item.categoria || '',
            item.faixa || '',
            item.peso || '',
            item.modalidade || '',
            item.notes?.anoNascimento || '',
            item.notes?.idade || '',
            item.notes?.tipoInscricao || '',
            item.notes?.pesoGiSelecionado || '',
            item.notes?.pesoNoGiSelecionado || '',
            item.notes?.absolutoGi || '',
            item.totalValue || 0,
            item.notes?.pixKey || '',
            item.proofName || '',
            item.proofMimeType || '',
            item.proofSizeBytes || '',
            item.proofFileUrl ? (isEnglish ? 'YES' : 'SIM') : (isEnglish ? 'NO' : 'NAO'),
            item.notesText || '',
            item.statusLabel || '',
            item.paymentReviewNotes || '',
            item.paymentReviewedBy || '',
            item.paymentReviewedAt || '',
            item.createdAt || ''
        ]);

        const eventLabel = registrationEventFilter === 'all'
            ? (isEnglish ? 'all-events' : 'todos-eventos')
            : (events.find((event) => event.id === registrationEventFilter)?.name || registrationEventFilter);
        const filename = `${isEnglish ? 'registrations' : 'inscricoes'}_${buildFileSafeName(eventLabel)}_${new Date().toISOString().slice(0, 10)}`;
        downloadCsv(filename, headers, data);
        showFeedback('success', copy.feedback.registrationExportDone(data.length));
    }, [
        publicRegistrations,
        copy,
        showFeedback,
        isEnglish,
        registrationEventFilter,
        events
    ]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handler = (event) => {
            if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                setShowAddModal(true);
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
                event.preventDefault();
                handleImportRanking();
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                handleFinalizeEvent();
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
                event.preventDefault();
                setShowLogs(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleImportRanking, handleFinalizeEvent]);

    useEffect(() => {
        loadPublicRegistrations();
    }, [loadPublicRegistrations]);

    useEffect(() => {
        if (activeEventId && !newAthlete.eventId) {
            setNewAthlete((prev) => ({ ...prev, eventId: activeEventId }));
        }
        if (activeEventId && !importEventId) {
            setImportEventId(activeEventId);
        }
        if (activeEventId && !bracketEventId) {
            setBracketEventId(activeEventId);
        }
    }, [activeEventId, newAthlete.eventId, importEventId, bracketEventId]);

    useEffect(() => {
        const eventIds = new Set(events.map((event) => event.id));
        if (eventFilter !== 'all' && eventFilter !== 'none' && !eventIds.has(eventFilter)) {
            setEventFilter('all');
        }
        if (importEventId && !eventIds.has(importEventId)) {
            setImportEventId('');
        }
        if (bracketEventId && !eventIds.has(bracketEventId)) {
            setBracketEventId('');
        }
        if (registrationEventFilter !== 'all' && !eventIds.has(registrationEventFilter)) {
            setRegistrationEventFilter('all');
        }
    }, [events, eventFilter, importEventId, bracketEventId, registrationEventFilter]);

    const eventMap = useMemo(() => (
        events.reduce((acc, event) => {
            acc[event.id] = event;
            return acc;
        }, {})
    ), [events]);

    const activeEvent = useMemo(() => (
        events.find((event) => event.id === activeEventId)
    ), [events, activeEventId]);

    const athleteMap = useMemo(() => (
        new Map(athletes.map((athlete) => [athlete.id, athlete]))
    ), [athletes]);

    const profileByAthleteKey = useMemo(() => {
        const sortedProfiles = [...memberProfiles]
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const map = new Map();
        sortedProfiles.forEach((profile) => {
            const key = buildAthleteLookupKey(profile.fullName, profile.academyName);
            if (!key || map.has(key)) return;
            map.set(key, profile);
        });
        return map;
    }, [memberProfiles]);

    const isLocalAuth = authService.isLocalAuth ? authService.isLocalAuth() : true;
    const localUsers = isLocalAuth && authService.listUsers ? authService.listUsers() : [];

    const filteredAthletes = useMemo(() => {
        const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
        return athletes.filter((athlete) => {
            const profileKey = buildAthleteLookupKey(athlete.nome, athlete.academia);
            const profile = profileByAthleteKey.get(profileKey);
            const searchable = [
                athlete.nome,
                athlete.academia,
                athlete.faixa,
                athlete.peso,
                athlete.categoria,
                athlete.pais,
                profile?.email,
                profile?.phone,
                profile?.city,
                profile?.country
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const matchesSearch = searchable.includes(normalizedSearchTerm);
            const matchesEvent = eventFilter === 'all'
                ? true
                : eventFilter === 'none'
                    ? !athlete.eventId
                    : athlete.eventId === eventFilter;
            return matchesSearch && matchesEvent;
        });
    }, [athletes, deferredSearchTerm, eventFilter, profileByAthleteKey]);

    const athleteRows = useMemo(() => (
        [...filteredAthletes]
            .map((athlete) => {
                const profileKey = buildAthleteLookupKey(athlete.nome, athlete.academia);
                const profile = profileByAthleteKey.get(profileKey) || null;
                return {
                    athlete,
                    profile,
                    eventLabel: eventMap[athlete.eventId]?.name || copy.common.noEvent,
                    photoUrl: athlete.photoUrl || profile?.photoUrl || ''
                };
            })
            .sort((a, b) => (a.athlete?.nome || '').localeCompare(b.athlete?.nome || ''))
    ), [filteredAthletes, profileByAthleteKey, eventMap, copy.common.noEvent]);

    const athletesPageCount = useMemo(
        () => Math.max(1, Math.ceil(athleteRows.length / athletesPageSize)),
        [athleteRows.length, athletesPageSize]
    );

    useEffect(() => {
        setAthletesPage((prev) => Math.min(prev, athletesPageCount));
    }, [athletesPageCount]);

    const pagedAthleteRows = useMemo(() => {
        const start = (athletesPage - 1) * athletesPageSize;
        return athleteRows.slice(start, start + athletesPageSize);
    }, [athleteRows, athletesPage, athletesPageSize]);

    const athletePageRange = useMemo(() => {
        const total = athleteRows.length;
        if (!total) return { from: 0, to: 0, total: 0 };
        const from = (athletesPage - 1) * athletesPageSize + 1;
        const to = Math.min(athletesPage * athletesPageSize, total);
        return { from, to, total };
    }, [athleteRows.length, athletesPage, athletesPageSize]);

    const currencyFormatter = useMemo(() => (
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'BRL'
        })
    ), [locale]);

    const parsedPublicRegistrations = useMemo(() => (
        publicRegistrations
            .map((item) => parseRegistrationRecord(item, eventMap, copy))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    ), [publicRegistrations, eventMap, copy]);

    const latestRegistrationDecisions = useMemo(() => {
        const decisionMap = new Map();
        parsedPublicRegistrations.forEach((item) => {
            const key = buildRegistrationIdentityKey(item);
            if (!key) return;
            const current = decisionMap.get(key);
            if (!current) {
                decisionMap.set(key, item);
                return;
            }
            const currentIsDecisive = current.isPaymentConfirmed || current.isPaymentError;
            const nextIsDecisive = item.isPaymentConfirmed || item.isPaymentError;

            // Never let a new pending row override an already reviewed decision.
            if (currentIsDecisive && !nextIsDecisive) return;
            if (!currentIsDecisive && nextIsDecisive) {
                decisionMap.set(key, item);
                return;
            }

            const currentTime = currentIsDecisive
                ? getRegistrationDecisionTimestamp(current)
                : new Date(current.createdAt || 0).getTime();
            const nextTime = nextIsDecisive
                ? getRegistrationDecisionTimestamp(item)
                : new Date(item.createdAt || 0).getTime();

            if (nextTime >= currentTime) decisionMap.set(key, item);
        });
        return [...decisionMap.values()];
    }, [parsedPublicRegistrations]);

    const registrationReconcilePlan = useMemo(() => {
        const confirmed = latestRegistrationDecisions.filter((item) => (
            item.isPaymentConfirmed
            && item.eventId
            && !suppressedRegistrationKeySet.has(buildRegistrationIdentityKey(item))
        ));

        const paymentError = latestRegistrationDecisions.filter((item) => (
            item.isPaymentError && item.eventId
        ));

        const toImportAthletes = confirmed
            .filter((registration) => !athletes.some((athlete) => (
                athleteMatchesRegistrationRecord(athlete, registration)
            )))
            .map(toAthleteFromRegistration);

        const blockedByEvent = new Map();
        paymentError.forEach((registration) => {
            const blockedIds = athletes
                .filter((athlete) => athleteMatchesRegistrationRecord(athlete, registration))
                .map((athlete) => athlete.id);
            if (!blockedIds.length) return;
            const blockedSet = blockedByEvent.get(registration.eventId) || new Set();
            blockedIds.forEach((id) => blockedSet.add(id));
            blockedByEvent.set(registration.eventId, blockedSet);
        });

        const eventAssignments = [];
        blockedByEvent.forEach((blockedSet, eventId) => {
            const currentIds = athletes
                .filter((athlete) => athlete.eventId === eventId)
                .map((athlete) => athlete.id);
            const keepIds = currentIds.filter((id) => !blockedSet.has(id));
            const isSameSelection = (
                currentIds.length === keepIds.length
                && currentIds.every((id) => keepIds.includes(id))
            );
            if (isSameSelection) return;
            eventAssignments.push({ eventId, keepIds });
        });

        return {
            toImportAthletes,
            eventAssignments
        };
    }, [latestRegistrationDecisions, suppressedRegistrationKeySet, athletes]);

    useEffect(() => {
        const { toImportAthletes, eventAssignments } = registrationReconcilePlan;
        if (toImportAthletes.length) {
            importAthletes(toImportAthletes);
        }
        if (eventAssignments.length) {
            eventAssignments.forEach((assignment) => {
                assignAthletesToEvent(assignment.eventId, assignment.keepIds);
            });
        }
    }, [registrationReconcilePlan, importAthletes, assignAthletesToEvent]);

    useEffect(() => {
        const confirmed = latestRegistrationDecisions.filter((item) => (
            item.isPaymentConfirmed
            && item.eventId
            && !suppressedRegistrationKeySet.has(buildRegistrationIdentityKey(item))
        ));
        if (!confirmed.length) return;

        const existingProfileKeys = new Set(
            memberProfiles.map((profile) => (
                `${normalizeLookup(profile?.fullName || '')}|${normalizeLookup(profile?.academyName || '')}`
            ))
        );

        const toCreate = confirmed
            .filter((registration) => {
                const academyName = registration?.academia || registration?.notes?.academyName || '';
                const key = `${normalizeLookup(registration?.nome || '')}|${normalizeLookup(academyName)}`;
                if (!key || existingProfileKeys.has(key)) return false;
                existingProfileKeys.add(key);
                return true;
            })
            .map((registration) => toMemberProfileFromRegistration(registration, currentUser));

        if (!toCreate.length) return;
        toCreate.forEach((profile) => {
            try {
                addMemberProfile(profile);
            } catch {
                // Keep dashboard stable even if one registration has incomplete profile data.
            }
        });
    }, [latestRegistrationDecisions, memberProfiles, suppressedRegistrationKeySet, addMemberProfile, currentUser]);

    const registrationRows = useMemo(() => {
        const term = deferredRegistrationSearch.trim().toLowerCase();
        return parsedPublicRegistrations
            .filter((item) => (
                registrationEventFilter === 'all'
                || item.eventId === registrationEventFilter
            ))
            .filter((item) => (
                !registrationPendingOnly || item.isPendingSync
            ))
            .filter((item) => {
                if (!term) return true;
                const searchable = [
                    item.nome,
                    item.academia,
                    item.email,
                    item.phone,
                    item.eventName,
                    item.notesText,
                    item.proofName,
                    item.paymentReviewNotes
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return searchable.includes(term);
            });
    }, [
        parsedPublicRegistrations,
        deferredRegistrationSearch,
        registrationEventFilter,
        registrationPendingOnly
    ]);

    const pendingSyncCount = useMemo(() => (
        parsedPublicRegistrations.filter((item) => item.isPendingSync).length
    ), [parsedPublicRegistrations]);

    useEffect(() => {
        if (registrationPendingFilterTouched) return;
        setRegistrationPendingOnly(pendingSyncCount > 0);
    }, [pendingSyncCount, registrationPendingFilterTouched]);

    useEffect(() => {
        setAthletesPage(1);
    }, [searchTerm, eventFilter, athletesPageSize]);

    const assignCandidates = useMemo(() => {
        const term = assignSearch.trim().toLowerCase();
        const sorted = [...athletes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        if (!term) return sorted;
        return sorted.filter((athlete) => (
            athlete.nome.toLowerCase().includes(term)
            || (athlete.academia || '').toLowerCase().includes(term)
        ));
    }, [athletes, assignSearch]);

    const totals = useMemo(() => {
        const totalPoints = athletes.reduce((acc, athlete) => acc + athlete.pontos, 0);
        // "Ativo" no painel = atleta vinculado a algum campeonato/evento.
        const activeAthletes = athletes.filter((athlete) => Boolean((athlete.eventId || '').toString().trim())).length;
        const averagePoints = athletes.length ? Math.round(totalPoints / athletes.length) : 0;

        const academyMap = athletes.reduce((acc, athlete) => {
            const key = athlete.academia || copy.modalAssign.noAcademy;
            if (!acc[key]) acc[key] = { count: 0, points: 0 };
            acc[key].count += 1;
            acc[key].points += athlete.pontos;
            return acc;
        }, {});

        const topAcademy = Object.entries(academyMap).sort((a, b) => b[1].points - a[1].points)[0];

        return {
            totalPoints,
            averagePoints,
            activeAthletes,
            topAcademy
        };
    }, [athletes, copy.modalAssign.noAcademy]);

    const eventStats = useMemo(() => (
        events.map((event) => ({
            ...event,
            athleteCount: athletes.filter((athlete) => athlete.eventId === event.id).length
        }))
    ), [events, athletes]);

    const beltStats = useMemo(() => {
        const beltMap = athletes.reduce((acc, athlete) => {
            const key = athlete.faixa || 'Branca';
            if (!acc[key]) acc[key] = { count: 0, points: 0 };
            acc[key].count += 1;
            acc[key].points += athlete.pontos;
            return acc;
        }, {});

        return Object.entries(beltMap)
            .map(([label, data]) => ({ label, ...data }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);
    }, [athletes]);

    const maxBeltPoints = Math.max(1, ...beltStats.map((belt) => belt.points));

    const recentLogs = logs.slice(0, 6);

    const navItems = [
        { id: 'overview', label: copy.nav.overview, icon: LayoutDashboard },
        { id: 'events', label: copy.nav.events, icon: Calendar, meta: events.length },
        { id: 'news', label: copy.nav.news, icon: Newspaper, meta: news.length },
        { id: 'registrations', label: copy.nav.registrations, icon: ClipboardList, meta: publicRegistrations.length },
        { id: 'brackets', label: copy.nav.brackets, icon: ClipboardList },
        { id: 'athletes', label: copy.nav.athletes, icon: Users, meta: athletes.length },
        { id: 'automation', label: copy.nav.automation, icon: Zap },
        { id: 'activity', label: copy.nav.activity, icon: Activity }
    ];

    const orderedNews = useMemo(() => (
        [...news].sort((a, b) => {
            const aTime = new Date(a.publishedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.publishedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        })
    ), [news]);

    const handleNavClick = (id) => {
        setActiveSection(id);
        setNavOpen(false);
        const section = document.getElementById(id);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handlePublishNews = useCallback((event) => {
        event.preventDefault();
        setNewsError('');

        const title = newsForm.title.trim();
        const summary = newsForm.summary.trim();
        if (!title) {
            const message = copy.feedback.newsTitleRequired;
            setNewsError(message);
            showFeedback('error', message);
            return;
        }
        if (!summary) {
            const message = copy.feedback.newsSummaryRequired;
            setNewsError(message);
            showFeedback('error', message);
            return;
        }

        try {
            const created = addNews({
                title,
                summary,
                imageUrl: newsForm.imageUrl,
                publishedAt: newsForm.publishedAt
            });
            setNewsForm(createNewsFormState());
            showFeedback('success', copy.feedback.newsCreated(created.title));
        } catch (err) {
            const message = err?.message || copy.feedback.newsCreateFail;
            setNewsError(message);
            showFeedback('error', message);
        }
    }, [newsForm, addNews, showFeedback, copy.feedback]);

    const handleDeleteNews = useCallback((item) => {
        const confirmed = window.confirm(copy.feedback.newsDeleteConfirm(item.title));
        if (!confirmed) return;
        try {
            deleteNews(item.id);
            showFeedback('success', copy.feedback.newsDeleted);
        } catch (err) {
            const message = err?.message || copy.feedback.newsDeleteFail;
            showFeedback('error', message);
        }
    }, [deleteNews, showFeedback, copy.feedback]);

    const handleAddAthlete = (event) => {
        event.preventDefault();

        if (newAthlete.nome.length < 3) {
            showFeedback('error', copy.feedback.minName);
            return;
        }
        if (!newAthlete.academia) {
            showFeedback('error', copy.feedback.academyRequired);
            return;
        }

        try {
            addAthlete(newAthlete);
            showFeedback('success', copy.feedback.athleteRegistered(newAthlete.nome));
            setShowAddModal(false);
            setNewAthlete({
                nome: '',
                faixa: 'Branca',
                peso: '',
                categoria: 'Adulto',
                academia: '',
                pais: 'Brasil',
                photoUrl: '',
                isNoGi: false,
                isAbsolute: false,
                eventId: activeEventId || ''
            });
        } catch (err) {
            showFeedback('error', err.message);
        }
    };

    const formatEventDate = (dateString) => {
        if (!dateString) return '';
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return dateString;
        return parsed.toLocaleDateString(locale);
    };

    const handleOpenAssignModal = (eventItem) => {
        const selection = {};
        athletes.forEach((athlete) => {
            selection[athlete.id] = athlete.eventId === eventItem.id;
        });
        setAssignEvent(eventItem);
        setAssignSelection(selection);
        setAssignSearch('');
        setShowAssignModal(true);
    };

    const handleToggleAssign = (athleteId) => {
        setAssignSelection((prev) => ({ ...prev, [athleteId]: !prev[athleteId] }));
    };

    const handleCloseAssignModal = () => {
        setShowAssignModal(false);
        setAssignEvent(null);
        setAssignSelection({});
        setAssignSearch('');
    };

    const handleSaveAssign = () => {
        if (!assignEvent) return;
        const selectedIds = Object.keys(assignSelection).filter((id) => assignSelection[id]);
        try {
            assignAthletesToEvent(assignEvent.id, selectedIds);
            showFeedback('success', copy.feedback.athletesAssigned);
            handleCloseAssignModal();
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.athleteAssignFail);
        }
    };

    const selectedAssignCount = Object.values(assignSelection).filter(Boolean).length;

    if (!currentUser) {
        return <LoginOverlay />;
    }

    return (
        <div className="admin-shell">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`toast ${toast.type === 'error' ? 'is-error' : ''}`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {navOpen && (
                    <motion.div
                        className="sidebar-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setNavOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside className={`admin-sidebar ${navOpen ? 'is-open' : ''}`}>
                <div className="admin-sidebar__header">
                    <span className="admin-sidebar__title">{copy.sidebar.title}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => setNavOpen(false)}>
                        {copy.common.close}
                    </button>
                </div>
                <nav className="admin-sidebar__nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`sidebar-link ${activeSection === item.id ? 'is-active' : ''}`}
                                onClick={() => handleNavClick(item.id)}
                            >
                                <span className="sidebar-link__label">
                                    <Icon size={16} />
                                    {item.label}
                                </span>
                                {item.meta !== undefined && <span className="sidebar-link__meta">{item.meta}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="admin-sidebar__card">
                    <div className="sidebar-stat">
                        <span>{copy.sidebar.activeAthletes}</span>
                        <strong>{totals.activeAthletes}</strong>
                    </div>
                    <div className="sidebar-stat">
                        <span>{copy.sidebar.totalPoints}</span>
                        <strong>{totals.totalPoints}</strong>
                    </div>
                    <div className="sidebar-stat">
                        <span>{copy.sidebar.registeredEvents}</span>
                        <strong>{events.length}</strong>
                    </div>
                </div>

                <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    {copy.sidebar.newRegister}
                </button>
            </aside>
            <div className="admin-main">
                <section className="admin-hero" id="overview">
                    <div>
                        <div className="meta-pill">
                            <Sparkles size={14} />
                            {copy.hero.activeEvent}: {activeEvent ? activeEvent.name : copy.hero.noActiveEvent}
                        </div>
                        <h2 className="hero-title">{copy.hero.title}</h2>
                        <p className="hero-subtitle">{copy.hero.subtitle}</p>
                        <div className="hero-meta">
                            <span className="meta-pill">
                                <Clock size={14} />
                                {copy.hero.updatedAt} {now.toLocaleTimeString(locale)}
                            </span>
                            <span className="meta-pill">
                                <ShieldCheck size={14} />
                                {copy.hero.secureSessionFor} {currentUser.name}
                            </span>
                            <span className="meta-pill">
                                <BarChart3 size={14} />
                                {copy.hero.average}: {totals.averagePoints} pts
                            </span>
                        </div>
                    </div>

                    <div className="hero-actions">
                        <div className="hero-actions__buttons">
                            <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                <UserPlus size={14} />
                                {copy.hero.newAthlete}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(true)}>
                                <ClipboardList size={14} />
                                {copy.hero.logs}
                            </button>
                            <button type="button" className="btn btn-ghost mobile-only" onClick={() => setNavOpen(true)}>
                                <Menu size={14} />
                                {copy.hero.menu}
                            </button>
                        </div>
                        <div className="hero-info-card">
                            <span>{copy.hero.rankingUpdated}</span>
                            <strong>{athletes.length} {copy.hero.athletes}</strong>
                            <div className="hero-info-meta">
                                <div>
                                    <Trophy size={16} />
                                    {totals.topAcademy ? totals.topAcademy[0] : copy.hero.noLeader}
                                </div>
                                <div>
                                    <Zap size={16} />
                                    {totals.totalPoints} pts
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Users size={18} />
                        </div>
                        <div className="stat-card__value">{athletes.length}</div>
                        <div className="stat-card__label">{copy.stats.enrolled}</div>
                        <div className="stat-card__trend">{totals.activeAthletes} {copy.stats.activeTrend}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Trophy size={18} />
                        </div>
                        <div className="stat-card__value">{totals.totalPoints}</div>
                        <div className="stat-card__label">{copy.stats.totalPoints}</div>
                        <div className="stat-card__trend">{copy.stats.average} {totals.averagePoints} pts</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Zap size={18} />
                        </div>
                        <div className="stat-card__value">{events.length}</div>
                        <div className="stat-card__label">{copy.stats.registeredEvents}</div>
                        <div className="stat-card__trend">{copy.stats.centralizedControl}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Activity size={18} />
                        </div>
                        <div className="stat-card__value">{logs.length}</div>
                        <div className="stat-card__label">{copy.stats.records}</div>
                        <div className="stat-card__trend">{copy.stats.continuousMonitoring}</div>
                    </div>
                </section>
                <section className="panel" id="events">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.eventsPanel.title}</div>
                            <div className="panel-subtitle">{copy.eventsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            <button type="button" className="btn btn-primary" onClick={openEventModal}>
                                <Calendar size={14} />
                                {copy.eventsPanel.createEvent}
                            </button>
                        </div>
                    </div>
                    {events.length === 0 ? (
                        <div className="panel-subtitle">{copy.eventsPanel.noEvents}</div>
                    ) : (
                        <div className="event-grid">
                            {eventStats.map((event) => {
                                const isActive = event.id === activeEventId;
                                const dateLabel = formatEventDate(event.date);
                                const metaParts = [
                                    dateLabel ? `${copy.eventsPanel.date} ${dateLabel}` : copy.eventsPanel.undefinedDate,
                                    event.location
                                ].filter(Boolean);

                                return (
                                    <div key={event.id} className="event-card">
                                        <div className="event-card__poster">
                                            {event.posterUrl ? (
                                                <img src={event.posterUrl} alt={event.name || copy.eventsPanel.noPoster} loading="lazy" />
                                            ) : (
                                                <div className="event-card__poster-placeholder">{copy.eventsPanel.noPoster}</div>
                                            )}
                                        </div>
                                        <div className="event-card__header">
                                            <div>
                                                <div className="event-name">{event.name}</div>
                                                <div className="table-meta">{metaParts.join(' - ')}</div>
                                            </div>
                                            <span className={`tag ${event.registrationOpen ? 'tag--open' : ''}`}>
                                                {event.registrationOpen ? copy.eventsPanel.open : copy.eventsPanel.closed}
                                            </span>
                                        </div>
                                        <div className="event-card__stats">
                                            <div className="event-stat">
                                                <span>{copy.eventsPanel.athletes}</span>
                                                <strong>{event.athleteCount}</strong>
                                            </div>
                                            <div className="event-stat">
                                                <span>{copy.eventsPanel.activeEvent}</span>
                                                <strong>{isActive ? copy.common.active : copy.common.inactive}</strong>
                                            </div>
                                        </div>
                                        <div className="event-card__footer">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => setActiveEvent(event.id)}
                                                disabled={isActive}
                                            >
                                                {isActive ? copy.eventsPanel.activeEvent : copy.eventsPanel.activate}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => handleOpenAssignModal(event)}
                                            >
                                                {copy.eventsPanel.manageAthletes}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => handleOpenEditEvent(event)}
                                            >
                                                <Pencil size={14} />
                                                {copy.eventsPanel.edit}
                                            </button>
                                            <a
                                                className={`btn ${event.registrationOpen ? 'btn-event btn-event--small' : 'btn-secondary btn-event--small'}`}
                                                href={event.internalRegistration ? `/eventos/${event.id}` : (event.registrationUrl || '#')}
                                                target={!event.internalRegistration && event.registrationUrl ? '_blank' : undefined}
                                                rel={!event.internalRegistration && event.registrationUrl ? 'noreferrer' : undefined}
                                                onClick={(clickEvent) => {
                                                    if (!event.registrationOpen || (!event.internalRegistration && !event.registrationUrl)) {
                                                        clickEvent.preventDefault();
                                                    }
                                                }}
                                                aria-disabled={!event.registrationOpen || (!event.internalRegistration && !event.registrationUrl)}
                                            >
                                                {copy.eventsPanel.registration}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
                <section className="panel" id="news">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.newsPanel.title}</div>
                            <div className="panel-subtitle">{copy.newsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            <Link className="btn btn-secondary" to="/noticias" target="_blank" rel="noreferrer">
                                {copy.newsPanel.openNewsPage}
                            </Link>
                        </div>
                    </div>

                    {newsError && (
                        <div className="login-error" role="alert">
                            <AlertCircle size={18} />
                            <p>{newsError}</p>
                        </div>
                    )}

                    <div className="news-admin-grid">
                        <form className="news-admin-form" onSubmit={handlePublishNews}>
                            <div className="form-grid">
                                <div>
                                    <label className="table-meta">{copy.newsPanel.titleLabel}</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={newsForm.title}
                                        onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })}
                                        placeholder={copy.newsPanel.titlePlaceholder}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="table-meta">{copy.newsPanel.dateLabel}</label>
                                    <input
                                        className="input"
                                        type="date"
                                        value={newsForm.publishedAt}
                                        onChange={(event) => setNewsForm({ ...newsForm, publishedAt: event.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="table-meta">{copy.newsPanel.imageLabel}</label>
                                <input
                                    className="input"
                                    type="url"
                                    value={newsForm.imageUrl}
                                    onChange={(event) => setNewsForm({ ...newsForm, imageUrl: event.target.value })}
                                    placeholder={copy.newsPanel.imagePlaceholder}
                                />
                            </div>
                            <div>
                                <label className="table-meta">{copy.newsPanel.summaryLabel}</label>
                                <textarea
                                    className="input"
                                    value={newsForm.summary}
                                    onChange={(event) => setNewsForm({ ...newsForm, summary: event.target.value })}
                                    placeholder={copy.newsPanel.summaryPlaceholder}
                                    rows={5}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {copy.newsPanel.publish}
                                </button>
                            </div>
                        </form>

                        <div className="news-admin-list">
                            {orderedNews.length ? (
                                orderedNews.map((item) => (
                                    <article className="news-admin-card" key={item.id}>
                                        {item.imageUrl && (
                                            <div className="news-admin-card__cover">
                                                <img src={item.imageUrl} alt={item.title} loading="lazy" />
                                            </div>
                                        )}
                                        <div className="news-card__meta">
                                            {formatEventDate(item.publishedAt || item.createdAt)}
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.summary}</p>
                                        <div className="news-admin-card__footer">
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={() => handleDeleteNews(item)}
                                            >
                                                <Trash2 size={14} />
                                                {copy.newsPanel.remove}
                                            </button>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="panel-subtitle">{copy.newsPanel.noNews}</div>
                            )}
                        </div>
                    </div>
                </section>
                <section className="panel" id="registrations">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.registrationsPanel.title}</div>
                            <div className="panel-subtitle">{copy.registrationsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            {pendingSyncCount > 0 && (
                                <span className="tag tag--warning">
                                    {copy.registrationsPanel.pendingLabel}: {pendingSyncCount}
                                </span>
                            )}
                            <button
                                type="button"
                                className={`btn ${registrationPendingOnly ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => {
                                    setRegistrationPendingFilterTouched(true);
                                    setRegistrationPendingOnly((prev) => !prev);
                                }}
                                disabled={!publicRegistrations.length}
                            >
                                {registrationPendingOnly
                                    ? copy.registrationsPanel.filterAll
                                    : copy.registrationsPanel.filterPending}
                            </button>
                            <div className="search-input">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder={copy.registrationsPanel.searchPlaceholder}
                                    value={registrationSearch}
                                    onChange={(event) => setRegistrationSearch(event.target.value)}
                                    aria-label={copy.registrationsPanel.searchAria}
                                />
                            </div>
                            <select
                                className="input select-compact"
                                value={registrationEventFilter}
                                onChange={(event) => setRegistrationEventFilter(event.target.value)}
                                aria-label={copy.registrationsPanel.eventFilter}
                            >
                                <option value="all">{copy.registrationsPanel.allEvents}</option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleExportRegistrationsSpreadsheet}
                                disabled={registrationsLoading || registrationsSyncing || !publicRegistrations.length}
                            >
                                <Download size={14} />
                                {copy.registrationsPanel.exportSpreadsheet}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleSyncPendingRegistrations}
                                disabled={registrationsSyncing || registrationsLoading || pendingSyncCount === 0}
                            >
                                <RotateCcw size={14} />
                                {registrationsSyncing ? `${copy.registrationsPanel.syncNow}...` : copy.registrationsPanel.syncNow}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={loadPublicRegistrations}
                                disabled={registrationsLoading || registrationsSyncing}
                            >
                                <RotateCcw size={14} />
                                {copy.registrationsPanel.refresh}
                            </button>
                        </div>
                    </div>
                    {registrationsError && (
                        <div className="login-error" role="alert">
                            <AlertCircle size={18} />
                            <p>{registrationsError}</p>
                        </div>
                    )}
                    {registrationsLoading ? (
                        <div className="panel-subtitle">{copy.registrationsPanel.refresh}...</div>
                    ) : registrationRows.length ? (
                        <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{copy.registrationsPanel.tablePhoto}</th>
                                    <th>{copy.registrationsPanel.tableAthlete}</th>
                                    <th>{copy.registrationsPanel.tableEvent}</th>
                                    <th>{copy.registrationsPanel.tableCategory}</th>
                                    <th>{copy.registrationsPanel.tableContact}</th>
                                    <th>{copy.registrationsPanel.tablePayment}</th>
                                    <th>{copy.registrationsPanel.tableNotes}</th>
                                    <th>{copy.registrationsPanel.tableStatus}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrationRows.map((item) => (
                                    <tr key={item.id}>
                                        <td className="athlete-photo-cell">
                                            {item.athletePhotoUrl ? (
                                                <img className="athlete-photo" src={item.athletePhotoUrl} alt={item.nome || copy.registrationsPanel.tableAthlete} loading="lazy" />
                                            ) : (
                                                <span className="athlete-photo-empty">{copy.registrationsPanel.noPhoto}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-name">{item.nome}</div>
                                            <div className="table-meta table-meta--tight">{item.academia || copy.modalAssign.noAcademy}</div>
                                        </td>
                                        <td>
                                            <div className="table-name">{item.eventName}</div>
                                            <div className="table-meta table-meta--tight">{formatEventDate(item.eventDate)}</div>
                                        </td>
                                        <td>
                                            <div className="table-meta table-meta--tight">{item.modalidade || '-'}</div>
                                            <div className="table-meta table-meta--tight">
                                                {item.categoria || '-'} / {item.faixa || '-'} / {item.peso || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-meta table-meta--tight">{item.email || '-'}</div>
                                            <div className="table-meta table-meta--tight">{item.phone || '-'}</div>
                                        </td>
                                        <td>
                                            <div className="table-meta table-meta--tight">
                                                {copy.registrationsPanel.totalValue}: {currencyFormatter.format(item.totalValue || 0)}
                                            </div>
                                            <div className="table-meta table-meta--tight">
                                                {copy.registrationsPanel.pixKey}: {item.notes?.pixKey || '-'}
                                            </div>
                                            <div className="table-meta table-meta--tight">
                                                {copy.registrationsPanel.receipt}: {item.proofName || copy.registrationsPanel.noReceipt}
                                            </div>
                                            {item.proofFileUrl && (
                                                <div className="registration-proof-preview">
                                                    <div className="table-meta table-meta--tight">{copy.registrationsPanel.proofPreviewTitle}</div>
                                                    {item.isImageProof ? (
                                                        <img
                                                            className="registration-proof-thumb"
                                                            src={item.proofFileUrl}
                                                            alt={item.proofName || copy.registrationsPanel.proofPreviewTitle}
                                                            loading="lazy"
                                                        />
                                                    ) : item.isPdfProof ? (
                                                        <embed
                                                            className="registration-proof-thumb registration-proof-thumb--pdf"
                                                            src={`${item.proofFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                            type="application/pdf"
                                                        />
                                                    ) : (
                                                        <div className="registration-proof-thumb registration-proof-thumb--placeholder">
                                                            {copy.registrationsPanel.proofPreviewPdf}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {item.proofFileUrl && (
                                                <a
                                                    className="text-link"
                                                    href={item.proofFileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {copy.registrationsPanel.openReceipt}
                                                </a>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-meta table-meta--tight">{item.notesText || copy.registrationsPanel.noNotes}</div>
                                        </td>
                                        <td>
                                            <div className={`points-pill ${item.isPendingSync ? 'points-pill--warning' : item.isPaymentError ? 'points-pill--danger' : ''}`}>
                                                {item.statusLabel}
                                            </div>
                                            <div className="table-meta table-meta--tight">{formatEventDate(item.createdAt)}</div>
                                            {!item.isPendingSync && (
                                                <div className="registration-status-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost registration-status-btn"
                                                        onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_CONFIRMED)}
                                                        disabled={registrationStatusUpdatingId === item.id || item.isPaymentConfirmed}
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        {copy.registrationsPanel.confirmPayment}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost registration-status-btn"
                                                        onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_ERROR)}
                                                        disabled={registrationStatusUpdatingId === item.id || item.isPaymentError}
                                                    >
                                                        <AlertCircle size={14} />
                                                        {copy.registrationsPanel.markPaymentError}
                                                    </button>
                                                </div>
                                            )}
                                            {(item.paymentReviewNotes || item.paymentReviewedBy || item.paymentReviewedAt) && (
                                                <div className="registration-review-meta">
                                                    <div className="table-meta table-meta--tight">
                                                        {copy.registrationsPanel.reviewNotes}: {item.paymentReviewNotes || '-'}
                                                    </div>
                                                    <div className="table-meta table-meta--tight">
                                                        {copy.registrationsPanel.reviewedBy}: {item.paymentReviewedBy || '-'}
                                                    </div>
                                                    <div className="table-meta table-meta--tight">
                                                        {copy.registrationsPanel.reviewedAt}: {formatEventDate(item.paymentReviewedAt)}
                                                    </div>
                                                </div>
                                            )}
                                            {item.syncError && (
                                                <div className="table-meta table-meta--tight registration-sync-error">
                                                    {copy.registrationsPanel.lastError}: {item.syncError}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    ) : (
                        <div className="panel-subtitle">{copy.registrationsPanel.noData}</div>
                    )}
                </section>
                <section className="panel" id="brackets">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.bracketsPanel.title}</div>
                            <div className="panel-subtitle">{copy.bracketsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={bracketEventId}
                                    onChange={(event) => setBracketEventId(event.target.value)}
                                    aria-label={copy.bracketsPanel.selectEventAria}
                                >
                                    <option value="">{copy.bracketsPanel.selectEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                className="input select-compact"
                                value={bracketMode}
                                onChange={(event) => setBracketMode(event.target.value)}
                                aria-label={copy.bracketsPanel.selectCategoryAria}
                            >
                                <option value="ALL">{copy.bracketsPanel.allCategories}</option>
                                <option value="GI">{isEnglish ? 'GI (weight)' : 'GI (peso)'}</option>
                                <option value="NO-GI">{isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)'}</option>
                                <option value="ABS-GI">ABS GI</option>
                                <option value="ABS-NO-GI">ABS NO-GI</option>
                            </select>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleGenerateBrackets}
                                disabled={!events.length}
                            >
                                <ClipboardList size={14} />
                                {copy.bracketsPanel.generate}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleExportBracketsPdf}
                                disabled={!filteredBrackets.length}
                            >
                                <Download size={14} />
                                {copy.bracketsPanel.savePdf}
                            </button>
                        </div>
                    </div>
                    <div className="bracket-toolbar">
                        <div className="search-input">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={copy.bracketsPanel.searchPlaceholder}
                                value={bracketSearch}
                                onChange={(event) => setBracketSearch(event.target.value)}
                                aria-label={copy.bracketsPanel.searchAria}
                            />
                        </div>
                        <span className="tag">{filteredBrackets.length} {copy.bracketsPanel.brackets}</span>
                    </div>
                    <div className="bracket-list">
                        {filteredBrackets.map((bracket) => {
                            const bracketAthletes = (bracket.seedIds || [])
                                .map((id) => athleteMap.get(id))
                                .filter(Boolean);
                            const matches = bracketAthletes.length
                                ? buildBracketMatches(bracket.seedIds || [], bracket.size || 0)
                                : [];
                            const eventLabel = eventMap[bracket.eventId]?.name || copy.common.noEvent;
                            const applied = Boolean(bracket.appliedAt);

                            return (
                                <div key={bracket.id} className="bracket-card">
                                    <div className="bracket-card__header">
                                        <div>
                                            <div className="bracket-number">{copy.bracketsPanel.bracket} {bracket.number || '-'}</div>
                                            <div className="table-meta">{localizeComposite(bracket.label)}</div>
                                        </div>
                                        <div className="bracket-tags">
                                            <span className="tag">{bracket.mode || 'GI'}</span>
                                            {applied && <span className="tag bracket-tag--applied">{copy.bracketsPanel.applied}</span>}
                                        </div>
                                    </div>
                                    <div className="bracket-card__meta">
                                        {copy.bracketsPanel.event}: {eventLabel} · {copy.bracketsPanel.athletes}: {bracketAthletes.length}
                                    </div>
                                    <div className="bracket-grid">
                                        <div className="bracket-matches">
                                            <div className="bracket-section-title">{copy.bracketsPanel.round1}</div>
                                            {matches.map((match, index) => {
                                                const nameA = match.slotA ? athleteMap.get(match.slotA)?.nome : 'BYE';
                                                const nameB = match.slotB ? athleteMap.get(match.slotB)?.nome : 'BYE';
                                                return (
                                                    <div key={match.id} className="bracket-match">
                                                        <span className="bracket-seed">{nameA || copy.bracketsPanel.athlete}</span>
                                                        <span className="bracket-vs">vs</span>
                                                        <span className="bracket-seed">{nameB || copy.bracketsPanel.athlete}</span>
                                                        <span className="bracket-match__index">#{index + 1}</span>
                                                    </div>
                                                );
                                            })}
                                            {matches.length === 0 && (
                                                <div className="panel-subtitle">{copy.bracketsPanel.noAthleteBracket}</div>
                                            )}
                                        </div>
                                        <div className="bracket-podium">
                                            <div className="bracket-section-title">{copy.bracketsPanel.podium}</div>
                                            <label className="bracket-field">
                                                <span>{copy.bracketsPanel.firstPlace}</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.goldId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { goldId: event.target.value })}
                                                    disabled={bracketAthletes.length === 0}
                                                >
                                                    <option value="">{copy.bracketsPanel.selectAthlete}</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>{athlete.nome}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="bracket-field">
                                                <span>{copy.bracketsPanel.secondPlace}</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.silverId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { silverId: event.target.value })}
                                                    disabled={bracketAthletes.length < 2}
                                                >
                                                    <option value="">{copy.bracketsPanel.selectAthlete}</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>{athlete.nome}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="bracket-field">
                                                <span>{copy.bracketsPanel.thirdPlace}</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.bronzeId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { bronzeId: event.target.value })}
                                                    disabled={bracketAthletes.length < 3}
                                                >
                                                    <option value="">{copy.bracketsPanel.selectAthlete}</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>{athlete.nome}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                className="btn btn-primary bracket-apply"
                                                onClick={() => handleApplyBracketPodium(bracket.id)}
                                                disabled={bracketAthletes.length === 0}
                                            >
                                                {applied ? copy.bracketsPanel.reapply : copy.bracketsPanel.apply}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredBrackets.length === 0 && (
                            <div className="panel-subtitle">{copy.bracketsPanel.noBracketFound}</div>
                        )}
                    </div>
                </section>
                <section className="panel">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.beltSummary.title}</div>
                            <div className="panel-subtitle">{copy.beltSummary.subtitle}</div>
                        </div>
                        <button
                            type="button"
                            className="tag tag-button"
                            onClick={handleRefreshBeltSummary}
                            title={`${copy.beltSummary.updateTitle} ${now.toLocaleTimeString(locale)}`}
                        >
                            {copy.common.update}
                        </button>
                    </div>
                    <div className="mini-chart">
                        {beltStats.map((belt) => (
                            <div key={belt.label}>
                                <div
                                    className="mini-chart__bar"
                                    style={{ height: `${Math.max(12, (belt.points / maxBeltPoints) * 120)}px` }}
                                >
                                    {belt.points}
                                </div>
                                <div className="mini-chart__label">{localizeBelt(belt.label, belt.label)}</div>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="panel" id="athletes">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.athletesPanel.title}</div>
                            <div className="panel-subtitle">{copy.athletesPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            <div className="search-input">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder={copy.athletesPanel.searchPlaceholder}
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    aria-label={copy.athletesPanel.searchAria}
                                />
                            </div>
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={eventFilter}
                                    onChange={(event) => setEventFilter(event.target.value)}
                                    aria-label={copy.athletesPanel.filterEventAria}
                                >
                                    <option value="all">{copy.common.allEvents}</option>
                                    <option value="none">{copy.athletesPanel.noEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <div className="view-toggle">
                                <button
                                    type="button"
                                    className={`toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('table')}
                                    aria-label={copy.athletesPanel.listView}
                                >
                                    <List size={14} />
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('cards')}
                                    aria-label={copy.athletesPanel.cardView}
                                >
                                    <LayoutGrid size={14} />
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleClearAthletes}
                                disabled={!athletes.length}
                            >
                                <AlertCircle size={14} />
                                {copy.athletesPanel.clearBase}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleClearReimportLocks}
                                disabled={!suppressedRegistrationKeys.length}
                            >
                                <RotateCcw size={14} />
                                {copy.athletesPanel.clearReimportLocks}
                                {suppressedRegistrationKeys.length ? ` (${suppressedRegistrationKeys.length})` : ''}
                            </button>
                        </div>
                    </div>

                    {viewMode === 'table' ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{copy.athletesPanel.profile}</th>
                                    <th>{copy.athletesPanel.athlete}</th>
                                    <th>{copy.athletesPanel.academy}</th>
                                    <th>{copy.athletesPanel.event}</th>
                                    <th>{copy.athletesPanel.contact}</th>
                                    <th className="points-col">{copy.common.points}</th>
                                    <th style={{ textAlign: 'right' }}>{copy.athletesPanel.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedAthleteRows.map(({ athlete, profile, eventLabel, photoUrl }) => {
                                    const profileMeta = [profile?.city, profile?.country].filter(Boolean).join(' - ');
                                    return (
                                    <tr key={athlete.id}>
                                        <td className="athlete-photo-cell">
                                            {photoUrl ? (
                                                <img className="athlete-photo" src={photoUrl} alt={athlete.nome} loading="lazy" />
                                            ) : (
                                                <span className="athlete-photo-empty">{copy.athletesPanel.noPhoto}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-name">{athlete.nome}</div>
                                            <div className="table-meta">
                                                {localizeBelt(athlete.faixa)} / {localizeWeight(athlete.peso)} / {localizeCategory(athlete.categoria)} / {athlete.isNoGi ? 'NO-GI' : 'GI'} / {eventLabel}
                                            </div>
                                        </td>
                                        <td>{athlete.academia}</td>
                                        <td>{eventLabel}</td>
                                        <td>
                                            {profile ? (
                                                <div>
                                                    <div className="table-meta table-meta--tight">{profile.email || '-'}</div>
                                                    <div className="table-meta table-meta--tight">{profile.phone || '-'}</div>
                                                    {profileMeta ? <div className="table-meta table-meta--tight">{profileMeta}</div> : null}
                                                </div>
                                            ) : (
                                                <span className="table-meta table-meta--tight">{copy.athletesPanel.noProfile}</span>
                                            )}
                                        </td>
                                        <td className="points-col">
                                            <span className="points-pill">{athlete.pontos} pts</span>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <div className="points-editor">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={copy.athletesPanel.pointsPlaceholder}
                                                        value={manualInputs[athlete.id] ?? ''}
                                                        onChange={(event) => handleManualInputChange(athlete.id, event.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="action-btn action-btn--set"
                                                        onClick={() => handleManualPoints(athlete.id)}
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--reset"
                                                    onClick={() => {
                                                        resetAthletePoints(athlete.id);
                                                        setManualInputs((prev) => ({ ...prev, [athlete.id]: '' }));
                                                        showFeedback('success', copy.feedback.pointsClearedFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.clearPointsAria}
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 1 });
                                                        showFeedback('success', copy.feedback.goldFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.registerGoldAria}
                                                >
                                                    <Trophy size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium-silver"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 2 });
                                                        showFeedback('success', copy.feedback.silverFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.registerSilverAria}
                                                >
                                                    2
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium-bronze"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 3 });
                                                        showFeedback('success', copy.feedback.bronzeFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.registerBronzeAria}
                                                >
                                                    3
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--danger"
                                                    onClick={() => handleRemoveAthlete(athlete)}
                                                    aria-label={copy.athletesPanel.removeAthleteAria}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="card-grid">
                            {pagedAthleteRows.map(({ athlete, profile, eventLabel, photoUrl }) => {
                                const profileMeta = [profile?.city, profile?.country].filter(Boolean).join(' - ');
                                return (
                                <div key={athlete.id} className="athlete-card">
                                    <div className="athlete-card__header">
                                        <div className="athlete-card__identity">
                                            {photoUrl ? (
                                                <img className="athlete-photo athlete-photo--card" src={photoUrl} alt={athlete.nome} loading="lazy" />
                                            ) : (
                                                <span className="athlete-photo-empty athlete-photo-empty--card">{copy.athletesPanel.noPhoto}</span>
                                            )}
                                            <div>
                                            <div className="table-name">{athlete.nome}</div>
                                            <div className="table-meta">{athlete.academia}</div>
                                            </div>
                                        </div>
                                        <span className="points-pill">{athlete.pontos} pts</span>
                                    </div>
                                    <div className="table-meta">
                                        {localizeBelt(athlete.faixa)} / {localizeWeight(athlete.peso)} / {localizeCategory(athlete.categoria)} / {athlete.isNoGi ? 'NO-GI' : 'GI'} / {eventLabel}
                                    </div>
                                    {profile ? (
                                        <div className="table-meta">
                                            {(profile.email || '-')} / {(profile.phone || '-')}
                                            {profileMeta ? ` / ${profileMeta}` : ''}
                                        </div>
                                    ) : (
                                        <div className="table-meta">{copy.athletesPanel.noProfile}</div>
                                    )}
                                    <div className="athlete-card__actions">
                                        <div className="points-editor">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={copy.athletesPanel.pointsPlaceholder}
                                                value={manualInputs[athlete.id] ?? ''}
                                                onChange={(event) => handleManualInputChange(athlete.id, event.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="action-btn action-btn--set"
                                                onClick={() => handleManualPoints(athlete.id)}
                                            >
                                                OK
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--reset"
                                            onClick={() => {
                                                resetAthletePoints(athlete.id);
                                                setManualInputs((prev) => ({ ...prev, [athlete.id]: '' }));
                                                showFeedback('success', copy.feedback.pointsClearedFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.clearPointsAria}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 1 });
                                                showFeedback('success', copy.feedback.goldFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.registerGoldAria}
                                        >
                                            <Trophy size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium-silver"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 2 });
                                                showFeedback('success', copy.feedback.silverFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.registerSilverAria}
                                        >
                                            2
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium-bronze"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 3 });
                                                showFeedback('success', copy.feedback.bronzeFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.registerBronzeAria}
                                        >
                                            3
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--danger"
                                            onClick={() => handleRemoveAthlete(athlete)}
                                            aria-label={copy.athletesPanel.removeAthleteAria}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                    {athleteRows.length > 0 && (
                        <div className="athletes-pagination">
                            <div className="table-meta">
                                {copy.athletesPanel.paginationShowing(
                                    athletePageRange.from,
                                    athletePageRange.to,
                                    athletePageRange.total
                                )}
                            </div>
                            <div className="athletes-pagination__controls">
                                <label className="athletes-pagination__label">
                                    <span>{copy.athletesPanel.paginationPerPage}</span>
                                    <select
                                        className="input select-compact"
                                        value={athletesPageSize}
                                        onChange={(event) => setAthletesPageSize(Number(event.target.value) || ATHLETE_PAGE_SIZE_OPTIONS[0])}
                                    >
                                        {ATHLETE_PAGE_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-event btn-event--small"
                                    onClick={() => setAthletesPage((prev) => Math.max(1, prev - 1))}
                                    disabled={athletesPage <= 1}
                                >
                                    {copy.athletesPanel.paginationPrev}
                                </button>
                                <span className="tag">
                                    {copy.athletesPanel.paginationPage} {athletesPage}/{athletesPageCount}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-event btn-event--small"
                                    onClick={() => setAthletesPage((prev) => Math.min(athletesPageCount, prev + 1))}
                                    disabled={athletesPage >= athletesPageCount}
                                >
                                    {copy.athletesPanel.paginationNext}
                                </button>
                            </div>
                        </div>
                    )}
                    {athleteRows.length === 0 && (
                        <div className="panel-subtitle">{copy.athletesPanel.noAthleteFound}</div>
                    )}
                </section>
                <section className="panel" id="automation">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.automation.title}</div>
                            <div className="panel-subtitle">{copy.automation.subtitle}</div>
                        </div>
                        <span className="tag">{copy.automation.fast}</span>
                    </div>
                    <div className="import-panel import-panel--admin">
                        <div>
                            <strong>{copy.automation.importFromPdf}</strong>
                            <span>{copy.automation.importDescription}</span>
                        </div>
                        <div className="import-actions">
                            {events.length > 0 && (
                                <select value={importEventId} onChange={(event) => setImportEventId(event.target.value)}>
                                    <option value="">{copy.common.noEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select value={importMode} onChange={(event) => setImportMode(event.target.value)}>
                                <option value="GI">GI</option>
                                <option value="NO-GI">NO-GI</option>
                            </select>
                            <label className="import-button">
                                <Upload size={14} />
                                {copy.automation.importPdf}
                                <input
                                    ref={importInputRef}
                                    type="file"
                                    accept=".pdf,.txt"
                                    onChange={handleImportFile}
                                />
                            </label>
                        </div>
                        {(importStatus || importError) && (
                            <div className={`import-status ${importError ? 'is-error' : ''}`}>
                                {importError || importStatus}
                            </div>
                        )}
                        {importDebug && (
                            <div className="import-debug">
                                <div className="import-debug__title">{copy.automation.debugPreview}</div>
                                <pre>{importDebug}</pre>
                            </div>
                        )}
                    </div>
                    <div className="action-grid">
                        <div className="action-card">
                            <strong>{copy.automation.importFile}</strong>
                            <span>{copy.automation.importFileDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleImportRanking}>
                                    <Upload size={14} />
                                    {copy.automation.select}
                                </button>
                                <span className="tag">Ctrl + I</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>{copy.automation.exportReport}</strong>
                            <span>{copy.automation.exportReportDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleFinalizeEvent}>
                                    <Download size={14} />
                                    {copy.automation.generatePdf}
                                </button>
                                <span className="tag">Ctrl + E</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>{copy.automation.immediateControl}</strong>
                            <span>{copy.automation.immediateControlDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={clearEventResults}>
                                    <Zap size={14} />
                                    {copy.automation.clear}
                                </button>
                                <span className="tag">{copy.automation.safe}</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>{copy.automation.clearAthletes}</strong>
                            <span>{copy.automation.clearAthletesDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-danger" onClick={handleClearAthletes}>
                                    <AlertCircle size={14} />
                                    {copy.automation.clearAll}
                                </button>
                                <span className="tag">{copy.automation.caution}</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel-header" style={{ marginTop: '1.8rem' }}>
                        <div>
                            <div className="panel-title">{copy.automation.keyboardTitle}</div>
                            <div className="panel-subtitle">{copy.automation.keyboardSubtitle}</div>
                        </div>
                    </div>
                    <div className="shortcut-list">
                        <span className="shortcut-pill">{copy.automation.shortcutNewAthlete}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutImport}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutExport}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutLogs}</span>
                    </div>
                </section>
                <section className="panel" id="activity">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.activity.title}</div>
                            <div className="panel-subtitle">{copy.activity.subtitle}</div>
                        </div>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(true)}>
                            <ClipboardList size={14} />
                            {copy.activity.viewAll}
                        </button>
                    </div>
                    <div className="activity-list">
                        {recentLogs.map((log) => (
                            <div key={log.id} className="activity-item">
                                <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString(locale)}</span>
                                <span
                                    className={`activity-tag ${log.type === 'ERROR' ? 'is-error' : log.type === 'AUTH' ? 'is-auth' : ''}`}
                                >
                                    {log.type}
                                </span>
                                <div>
                                    <strong>{translateLogAction(log.action)}</strong>
                                    <div className="table-meta">{translateLogDetails(log.details)}</div>
                                </div>
                            </div>
                        ))}
                        {recentLogs.length === 0 && (
                            <div className="activity-item">{copy.activity.noRecent}</div>
                        )}
                    </div>

                    <div className="panel-header" style={{ marginTop: '1.6rem' }}>
                        <div>
                            <div className="panel-title">{copy.activity.secureSession}</div>
                            <div className="panel-subtitle">{copy.activity.secureSessionSubtitle}</div>
                        </div>
                        <button type="button" className="btn btn-primary" onClick={logout}>
                            <LogOut size={14} />
                            {copy.activity.endSession}
                        </button>
                    </div>
                    {isLocalAuth && (
                        <div
                            className="action-grid"
                            style={{ marginTop: '1.2rem', gridTemplateColumns: 'minmax(0, 1fr)' }}
                        >
                            <div className="action-card">
                                <strong>{copy.activity.localUsers}</strong>
                                <span>{copy.activity.localUsersDesc}</span>
                                {localUsers.length > 0 ? (
                                    <div className="shortcut-list">
                                        {localUsers.map((user) => (
                                            <span key={user.username} className="shortcut-pill">
                                                {user.name || user.username}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="panel-subtitle">{copy.activity.noUser}</div>
                                )}
                                <div className="action-card__footer">
                                    <button type="button" className="btn btn-ghost" onClick={openUserResetModal}>
                                        <ShieldCheck size={14} />
                                        {copy.activity.resetPassword}
                                    </button>
                                    <span className="tag">{copy.activity.local}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
            <AnimatePresence>
                {showLogs && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogs(false)}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel modal-panel--wide">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalLogs.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(false)}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <div className="activity-list" style={{ overflowY: 'auto' }}>
                                    {logs.map((log) => (
                                        <div key={log.id} className="activity-item">
                                            <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString(locale)}</span>
                                            <span
                                                className={`activity-tag ${log.type === 'ERROR' ? 'is-error' : log.type === 'AUTH' ? 'is-auth' : ''}`}
                                            >
                                                {log.type}
                                            </span>
                                            <div>
                                                <strong>{translateLogAction(log.action)}</strong>
                                                <div className="table-meta">{translateLogDetails(log.details)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showEventEditModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseEditEvent}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalEventEdit.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseEditEvent}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                {eventEditError && (
                                    <div className="login-error" role="alert">
                                        <AlertCircle size={18} />
                                        <p>{eventEditError}</p>
                                    </div>
                                )}
                                <form onSubmit={handleUpdateEvent}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="table-meta">{copy.modalEventEdit.eventName}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={eventEditForm.name}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, name: event.target.value })}
                                                placeholder={copy.modalEventEdit.eventNamePlaceholder}
                                                required
                                            />
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="table-meta">{copy.modalEventEdit.date}</label>
                                                <input
                                                    className="input"
                                                    type="date"
                                                    value={eventEditForm.date}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, date: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalEventEdit.location}</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    value={eventEditForm.location}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, location: event.target.value })}
                                                    placeholder={copy.modalEventEdit.locationPlaceholder}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalEventEdit.posterUrl}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={eventEditForm.posterUrl}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, posterUrl: event.target.value })}
                                                placeholder={copy.modalEventEdit.posterUrlPlaceholder}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalEventEdit.posterFile}</label>
                                            <input
                                                className="input"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleEventEditPosterFile}
                                            />
                                        </div>
                                        {eventEditForm.posterUrl && (
                                            <div>
                                                <img
                                                    src={eventEditForm.posterUrl}
                                                    alt={eventEditForm.name || 'Poster preview'}
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: '220px',
                                                        objectFit: 'cover',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--border)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="table-meta">{copy.modalEventEdit.registrationUrl}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={eventEditForm.registrationUrl}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, registrationUrl: event.target.value })}
                                                placeholder={copy.modalEventEdit.registrationUrlPlaceholder}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalEventEdit.pixKey}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={eventEditForm.pixKey}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, pixKey: event.target.value })}
                                                placeholder={copy.modalEventEdit.pixKeyPlaceholder}
                                                required
                                            />
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="table-meta">{copy.modalEventEdit.feeUnder15}</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={eventEditForm.feeUnder15}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, feeUnder15: event.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalEventEdit.feeOver15}</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={eventEditForm.feeOver15}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, feeOver15: event.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalEventEdit.feeCombo}</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={eventEditForm.feeCombo}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, feeCombo: event.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalEventEdit.feeAbsolute}</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={eventEditForm.feeAbsolute}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, feeAbsolute: event.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <label className="checkbox-inline">
                                            <input
                                                type="checkbox"
                                                checked={eventEditForm.registrationOpen}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, registrationOpen: event.target.checked })}
                                            />
                                            <span>{copy.modalEventEdit.registrationOpen}</span>
                                        </label>
                                        <label className="checkbox-inline">
                                            <input
                                                type="checkbox"
                                                checked={eventEditForm.internalRegistration}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, internalRegistration: event.target.checked })}
                                            />
                                            <span>{copy.modalEventEdit.internalRegistration}</span>
                                        </label>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ghost" onClick={handleCloseEditEvent}>
                                            {copy.common.cancel}
                                        </button>
                                        <button type="button" className="btn btn-danger" onClick={handleDeleteEvent}>
                                            <Trash2 size={14} />
                                            {copy.modalEventEdit.deleteEvent}
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {copy.modalEventEdit.saveChanges}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalAthlete.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                        {copy.common.cancel}
                                    </button>
                                </div>
                                <form onSubmit={handleAddAthlete}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="table-meta">{copy.modalAthlete.fullName}</label>
                                            <input
                                                className="input"
                                                required
                                                type="text"
                                                placeholder={copy.modalAthlete.fullNamePlaceholder}
                                                value={newAthlete.nome}
                                                onChange={(event) => setNewAthlete({ ...newAthlete, nome: event.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalAthlete.event}</label>
                                            <select
                                                className="input"
                                                value={newAthlete.eventId}
                                                onChange={(event) => setNewAthlete({ ...newAthlete, eventId: event.target.value })}
                                            >
                                                <option value="">{copy.modalAthlete.noEvent}</option>
                                                {events.map((event) => (
                                                    <option key={event.id} value={event.id}>{event.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.graduation}</label>
                                                <select
                                                    className="input"
                                                    value={newAthlete.faixa}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, faixa: event.target.value })}
                                                >
                                                    {['Branca', 'Cinza', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Branca/Cinza'].map((faixa) => (
                                                        <option key={faixa} value={faixa}>{localizeBelt(faixa, faixa)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.weight}</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    placeholder={newAthlete.isAbsolute ? copy.modalAthlete.absoluteWeightPlaceholder : copy.modalAthlete.weightPlaceholder}
                                                    value={newAthlete.peso}
                                                    disabled={newAthlete.isAbsolute}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, peso: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.category}</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    placeholder={copy.modalAthlete.categoryPlaceholder}
                                                    value={newAthlete.categoria}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, categoria: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.categoryType}</label>
                                                <select
                                                    className="input"
                                                    value={newAthlete.isAbsolute ? 'ABS' : 'PESO'}
                                                    onChange={(event) => {
                                                        const isAbsolute = event.target.value === 'ABS';
                                                        setNewAthlete((prev) => ({
                                                            ...prev,
                                                            isAbsolute,
                                                            peso: isAbsolute
                                                                ? (prev.peso || copy.modalAthlete.absoluteWeightPlaceholder)
                                                                : (prev.peso === copy.modalAthlete.absoluteWeightPlaceholder ? '' : prev.peso)
                                                        }));
                                                    }}
                                                >
                                                    <option value="PESO">{copy.modalAthlete.typeWeight}</option>
                                                    <option value="ABS">{copy.modalAthlete.typeAbsolute}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.modality}</label>
                                                <select
                                                    className="input"
                                                    value={newAthlete.isNoGi ? 'NO-GI' : 'GI'}
                                                    onChange={(event) => setNewAthlete({
                                                        ...newAthlete,
                                                        isNoGi: event.target.value === 'NO-GI'
                                                    })}
                                                >
                                                    <option value="GI">{copy.modalAthlete.modalityGi}</option>
                                                    <option value="NO-GI">{copy.modalAthlete.modalityNoGi}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalAthlete.teamAcademy}</label>
                                            <input
                                                className="input"
                                                required
                                                type="text"
                                                placeholder={copy.modalAthlete.teamAcademyPlaceholder}
                                                value={newAthlete.academia}
                                                onChange={(event) => setNewAthlete({ ...newAthlete, academia: event.target.value })}
                                            />
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.country}</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    placeholder={copy.modalAthlete.countryPlaceholder}
                                                    value={newAthlete.pais || ''}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, pais: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalAthlete.photoUrl}</label>
                                                <input
                                                    className="input"
                                                    type="url"
                                                    placeholder="https://..."
                                                    value={newAthlete.photoUrl || ''}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, photoUrl: event.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                            {copy.common.cancel}
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {copy.modalAthlete.saveRegister}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showAssignModal && assignEvent && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseAssignModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel modal-panel--wide">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalAssign.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseAssignModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <div className="panel-subtitle">
                                    {copy.modalAssign.eventPrefix}: {assignEvent.name}. {copy.modalAssign.subtitle}
                                </div>
                                <div className="event-assign-toolbar">
                                    <div className="search-input">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder={copy.modalAssign.searchPlaceholder}
                                            value={assignSearch}
                                            onChange={(event) => setAssignSearch(event.target.value)}
                                            aria-label={copy.modalAssign.searchAria}
                                        />
                                    </div>
                                    <span className="tag">{selectedAssignCount} {copy.modalAssign.selected}</span>
                                </div>
                                <div className="event-assign-list">
                                    {assignCandidates.map((athlete) => {
                                        const currentEvent = eventMap[athlete.eventId]?.name;
                                        const metaBase = `${athlete.academia || copy.modalAssign.noAcademy} - ${localizeBelt(athlete.faixa)} / ${localizeWeight(athlete.peso)} / ${localizeCategory(athlete.categoria)}`;
                                        const eventNote = athlete.eventId && athlete.eventId !== assignEvent.id
                                            ? ` - ${copy.modalAssign.current}: ${currentEvent || copy.modalAssign.otherEvent}`
                                            : '';

                                        return (
                                            <label key={athlete.id} className="event-assign-item">
                                                <input
                                                    type="checkbox"
                                                    checked={!!assignSelection[athlete.id]}
                                                    onChange={() => handleToggleAssign(athlete.id)}
                                                />
                                                <div>
                                                    <div className="event-assign-name">{athlete.nome}</div>
                                                    <div className="table-meta">{metaBase}{eventNote}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {assignCandidates.length === 0 && (
                                        <div className="panel-subtitle">{copy.modalAssign.noAthleteFound}</div>
                                    )}
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseAssignModal}>
                                        {copy.common.cancel}
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleSaveAssign}>
                                        {copy.modalAssign.saveLink}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showUserResetModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeUserResetModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalReset.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={closeUserResetModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                {userResetList.length === 0 ? (
                                    <div className="panel-subtitle">{copy.modalReset.noUser}</div>
                                ) : (
                                    <form onSubmit={handleUserResetSubmit}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {userResetError && (
                                                <div className="login-error" role="alert">
                                                    <AlertCircle size={18} />
                                                    <p>{userResetError}</p>
                                                </div>
                                            )}
                                            {userResetSuccess && (
                                                <div className="login-success" role="status">
                                                    <CheckCircle2 size={18} />
                                                    <p>{userResetSuccess}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="table-meta">{copy.modalReset.user}</label>
                                                <select
                                                    className="input"
                                                    value={userResetUsername}
                                                    onChange={(event) => setUserResetUsername(event.target.value)}
                                                >
                                                    {userResetList.map((user) => (
                                                        <option key={user.username} value={user.username}>
                                                            {user.name ? `${user.name} (${user.username})` : user.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalReset.newPassword}</label>
                                                <input
                                                    className="input"
                                                    type="password"
                                                    minLength={6}
                                                    value={userResetPassword}
                                                    onChange={(event) => setUserResetPassword(event.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalReset.confirmPassword}</label>
                                                <input
                                                    className="input"
                                                    type="password"
                                                    minLength={6}
                                                    value={userResetConfirm}
                                                    onChange={(event) => setUserResetConfirm(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn btn-ghost" onClick={closeUserResetModal}>
                                                {copy.common.cancel}
                                            </button>
                                            <button type="submit" className="btn btn-primary" disabled={userResetLoading}>
                                                {copy.modalReset.updatePassword}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
