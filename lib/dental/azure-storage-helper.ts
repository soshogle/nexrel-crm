/**
 * Azure Storage Helper
 * Lazy-loads Azure Blob Storage client only when needed
 * This prevents build errors when @azure/storage-blob is not installed
 */

export async function getAzureBlobClient(connectionString: string): Promise<any> {
  try {
    // Use dynamic import with string literal to prevent webpack from bundling
    const azureModule = await Function('return import("@azure/storage-blob")')() as any;
    const { BlobServiceClient } = azureModule;
    return BlobServiceClient.fromConnectionString(connectionString);
  } catch (error: any) {
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('Cannot find module')) {
      throw new Error('Azure Storage Blob package (@azure/storage-blob) is not installed. Install it with: npm install @azure/storage-blob');
    }
    throw error;
  }
}
