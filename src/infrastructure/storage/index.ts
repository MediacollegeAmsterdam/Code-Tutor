/**
 * Storage Infrastructure - Barrel Export
 * 
 * Centralized export of storage adapters
 * Part of Infrastructure Layer
 */

export { StorageAdapter, StudentProgressData, StudentMetadata, AllStudentMetadata } from './StorageAdapter';
export { FileSystemStorage } from './FileSystemStorage';
export { VSCodeStorage } from './VSCodeStorage';
export { StudentDataService, STORAGE_KEYS } from './StudentDataService';
