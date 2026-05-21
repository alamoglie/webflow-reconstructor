// Re-export AI types from the provider abstraction layer
export type { AIProvider, AIEngine, ApiKeys, ProviderMeta, GenerateResult } from '@/lib/ai/types';
export { PROVIDERS } from '@/lib/ai/types';

export type InputType = 'code' | 'video' | 'images';

export interface FileData {
  name: string;
  content: string;
  type: InputType;
}

export interface ZipFiles {
  [filename: string]: string;
}

export interface AnalysisRequest {
  type: InputType;
  files?: ZipFiles;
  frames?: string[];
}

export interface WebflowElement {
  html: string;
  css: string;
  js: string;
  headLinks: string;
}

export interface UploadedFile {
  file: File;
  type: 'zip' | 'video' | 'image';
  preview?: string;
}
