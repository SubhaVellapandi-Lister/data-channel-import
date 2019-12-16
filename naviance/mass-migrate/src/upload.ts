import { FileUploader, Tenant } from "@data-channels/dcSDK";
import { createReadStream } from "fs";
import request from 'request-promise-native';

export async function uploadFile(
    path: string, name: string, product: string, tenant?: Tenant
): Promise<any> {
    const writeStream = createReadStream(path);
    const uploadInfo = await FileUploader.getUploadUrl(name, tenant, product);

    return new Promise((resolve, reject) => {
        try {
            const bufs: Uint8Array[] = [];
            writeStream.on('data', (d) => { bufs.push(d); });
            writeStream.on('end', async () => {
                const buf = bufs.length ? Buffer.concat(bufs) : '';
                const params: any = {
                    method: 'PUT',
                    uri: uploadInfo.url,
                    headers: {
                        'Content-Type': 'text/csv'
                    },
                    body: buf
                };
                const resp = request(params);
                try {
                    await resp;
                } catch (err) {
                    reject(err);
                }
                resolve(uploadInfo);
            });
        } catch (error) {
            reject(error);
        }
    });
}
