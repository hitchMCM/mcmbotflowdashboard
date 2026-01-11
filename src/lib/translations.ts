// Translations for the dashboard
export type Language = 'en' | 'fr' | 'ar' | 'es';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Settings
    'settings': 'Settings',
    'settings.configure': 'Configure your dashboard',
    'settings.general': 'General',
    'settings.pages': 'Pages',
    'settings.team': 'Team',
    'settings.generalSettings': 'General Settings',
    'settings.themeMode': 'Theme Mode',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.system': 'System',
    'settings.language': 'Language',
    'settings.timezone': 'Timezone',
    'settings.saveChanges': 'Save Changes',
    'settings.pagesManagement': 'Pages Management',
    'settings.addPage': 'Add Page',
    'settings.teamManagement': 'Team Management',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.welcome': 'Welcome',
    'nav.responses': 'Standard Reply',
    'nav.sequences': 'Sequences',
    'nav.broadcasts': 'Broadcasts',
    'nav.flows': 'Flows',
    'nav.subscribers': 'Subscribers',
    'nav.analytics': 'Analytics',
    'nav.configuration': 'Configuration',
    'nav.settings': 'Settings',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
    'common.success': 'Success',
    'common.error': 'Error',
  },
  
  fr: {
    // Settings
    'settings': 'Paramètres',
    'settings.configure': 'Configurez votre tableau de bord',
    'settings.general': 'Général',
    'settings.pages': 'Pages',
    'settings.team': 'Équipe',
    'settings.generalSettings': 'Paramètres généraux',
    'settings.themeMode': 'Mode du thème',
    'settings.dark': 'Sombre',
    'settings.light': 'Clair',
    'settings.system': 'Système',
    'settings.language': 'Langue',
    'settings.timezone': 'Fuseau horaire',
    'settings.saveChanges': 'Enregistrer',
    'settings.pagesManagement': 'Gestion des pages',
    'settings.addPage': 'Ajouter une page',
    'settings.teamManagement': 'Gestion de l\'équipe',
    
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.welcome': 'Bienvenue',
    'nav.responses': 'Réponse standard',
    'nav.sequences': 'Séquences',
    'nav.broadcasts': 'Diffusions',
    'nav.flows': 'Flux',
    'nav.subscribers': 'Abonnés',
    'nav.analytics': 'Analytique',
    'nav.configuration': 'Configuration',
    'nav.settings': 'Paramètres',
    
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée',
    'common.success': 'Succès',
    'common.error': 'Erreur',
  },
  
  ar: {
    // Settings
    'settings': 'الإعدادات',
    'settings.configure': 'قم بتكوين لوحة التحكم الخاصة بك',
    'settings.general': 'عام',
    'settings.pages': 'الصفحات',
    'settings.team': 'الفريق',
    'settings.generalSettings': 'الإعدادات العامة',
    'settings.themeMode': 'وضع السمة',
    'settings.dark': 'داكن',
    'settings.light': 'فاتح',
    'settings.system': 'النظام',
    'settings.language': 'اللغة',
    'settings.timezone': 'المنطقة الزمنية',
    'settings.saveChanges': 'حفظ التغييرات',
    'settings.pagesManagement': 'إدارة الصفحات',
    'settings.addPage': 'إضافة صفحة',
    'settings.teamManagement': 'إدارة الفريق',
    
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.welcome': 'الترحيب',
    'nav.responses': 'الرد القياسي',
    'nav.sequences': 'التسلسلات',
    'nav.broadcasts': 'البث',
    'nav.flows': 'التدفقات',
    'nav.subscribers': 'المشتركون',
    'nav.analytics': 'التحليلات',
    'nav.configuration': 'التكوين',
    'nav.settings': 'الإعدادات',
    
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.loading': 'جاري التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.success': 'نجاح',
    'common.error': 'خطأ',
  },
  
  es: {
    // Settings
    'settings': 'Configuración',
    'settings.configure': 'Configura tu panel de control',
    'settings.general': 'General',
    'settings.pages': 'Páginas',
    'settings.team': 'Equipo',
    'settings.generalSettings': 'Configuración general',
    'settings.themeMode': 'Modo de tema',
    'settings.dark': 'Oscuro',
    'settings.light': 'Claro',
    'settings.system': 'Sistema',
    'settings.language': 'Idioma',
    'settings.timezone': 'Zona horaria',
    'settings.saveChanges': 'Guardar cambios',
    'settings.pagesManagement': 'Gestión de páginas',
    'settings.addPage': 'Añadir página',
    'settings.teamManagement': 'Gestión del equipo',
    
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.welcome': 'Bienvenida',
    'nav.responses': 'Respuesta estándar',
    'nav.sequences': 'Secuencias',
    'nav.broadcasts': 'Difusiones',
    'nav.flows': 'Flujos',
    'nav.subscribers': 'Suscriptores',
    'nav.analytics': 'Analítica',
    'nav.configuration': 'Configuración',
    'nav.settings': 'Ajustes',
    
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Añadir',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.noData': 'Sin datos',
    'common.success': 'Éxito',
    'common.error': 'Error',
  },
};

// Get translation for a key
export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] || translations['en'][key] || key;
}

// Check if language is RTL
export function isRTL(lang: Language): boolean {
  return lang === 'ar';
}
