import { FileUploader, Tenant } from "@data-channels/dcSDK";
import { createReadStream } from "fs";
import fetch from 'node-fetch';

export async function uploadFile(
    path: string, name: string, product: string, tenant?: Tenant
): Promise<any> {
    const writeStream = createReadStream(path);
    const uploadInfo = await FileUploader.getUploadUrl(name, tenant, product);

    return new Promise((resolve, reject) => {
        try {
            const buffers: Uint8Array[] = [];
            writeStream.on('data', (d) => { buffers.push(d); });
            writeStream.on('end', async () => {
                const buffer = buffers.length ? Buffer.concat(buffers) : '';
                try {

                    const request = await fetch(uploadInfo.url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'text/csv' },
                        body: buffer
                    });

                    if(request.ok) {
                        resolve(uploadInfo);
                    } else {
                        reject(request.statusText);
                    }

                } catch (err) {
                    reject(err);
                }
                
            });
        } catch (error) {
            reject(error);
        }
    });
}
