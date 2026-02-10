/**
 * Website Builder TypeScript Types
 */

export type WebsiteType = 'REBUILT' | 'SERVICE_TEMPLATE' | 'PRODUCT_TEMPLATE';
export type WebsiteStatus = 'BUILDING' | 'READY' | 'PUBLISHED' | 'FAILED';
export type WebsiteBuildType = 'INITIAL' | 'REBUILD' | 'UPDATE';
export type WebsiteBuildStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type WebsiteIntegrationType = 'STRIPE' | 'BOOKING' | 'FORM' | 'CTA' | 'CHAT' | 'ANALYTICS';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type ChangeType = 'AI_MODIFICATION' | 'MANUAL_EDIT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
export type WebsiteTemplateType = 'SERVICE' | 'PRODUCT';

export interface WebsiteStructure {
  pages: WebsitePage[];
  globalStyles: GlobalStyles;
  navigation: NavigationConfig;
  footer: FooterConfig;
}

export interface WebsitePage {
  id: string;
  name: string;
  path: string;
  components: Component[];
  seo: SEOData;
}

export interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: Component[];
}

export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  canonicalUrl?: string;
}

export interface GlobalStyles {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    unit: number;
  };
}

export interface NavigationConfig {
  items: NavigationItem[];
  style: 'horizontal' | 'vertical' | 'hamburger';
}

export interface NavigationItem {
  label: string;
  path: string;
  children?: NavigationItem[];
}

export interface FooterConfig {
  sections: FooterSection[];
  copyright: string;
  socialLinks?: SocialLink[];
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface ScrapedWebsiteData {
  html: string;
  seo: SEOData;
  images: ScrapedImage[];
  videos: ScrapedVideo[];
  forms: ScrapedForm[];
  products?: ScrapedProduct[];
  styles: ScrapedStyles;
  structure: ScrapedStructure;
  metadata: Record<string, any>;
}

export interface ScrapedImage {
  url: string;
  alt?: string;
  downloaded?: boolean;
  localPath?: string;
}

export interface ScrapedVideo {
  url: string;
  type: 'youtube' | 'vimeo' | 'direct';
  embedId?: string;
}

export interface ScrapedForm {
  id?: string;
  action?: string;
  method?: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
}

export interface ScrapedProduct {
  name: string;
  price?: string;
  description?: string;
  image?: string;
  url?: string;
}

export interface ScrapedStyles {
  colors: string[];
  fonts: string[];
  layout: string;
}

export interface ScrapedStructure {
  header: any;
  main: any;
  footer: any;
  navigation: any;
}

export interface QuestionnaireAnswers {
  businessName: string;
  businessDescription: string;
  services?: string[];
  products?: string[];
  targetAudience?: string;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
  /** Legal entity name for Privacy Policy & Terms (e.g. "Acme Inc."). Defaults to businessName. */
  legalEntityName?: string;
  /** Jurisdiction for legal pages (e.g. "United States", "California"). */
  legalJurisdiction?: string;
  brandColors?: string[];
  logo?: string;
  images?: string[];
  documents?: string[];
  blog?: {
    enabled: boolean;
    includeCTA: boolean;
    ctaText?: string;
    ctaLink?: string;
  };
  [key: string]: any;
}

export interface WebsiteBuildConfig {
  type: WebsiteType;
  sourceUrl?: string;
  templateType?: WebsiteTemplateType;
  questionnaireAnswers?: QuestionnaireAnswers;
  userId: string;
}

export interface ProvisioningResult {
  githubRepoUrl: string;
  neonDatabaseUrl: string;
  vercelProjectId: string;
  vercelDeploymentUrl?: string;
}

export interface VoiceAIConfig {
  enabled: boolean;
  agentId?: string;
  greeting?: string;
  systemPrompt?: string;
  voiceId?: string;
  language?: string;
}

export interface WebsiteChange {
  type: 'add' | 'update' | 'delete';
  path: string; // JSON path to component/page
  data: any;
  preview?: any;
}
