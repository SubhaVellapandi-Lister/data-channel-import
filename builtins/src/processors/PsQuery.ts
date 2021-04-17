import { URLSearchParams } from 'url';

import {
    BaseProcessor,
    IFileProcessorInput,
    IFileProcessorOutput
} from "@data-channels/dcSDK";
import AbortController from 'abort-controller';
import _ from "lodash";
import fetch from "node-fetch";

export interface IPsQueryConfig {
    host: string; // powerschool host, no trailing slash
    endpoint: string; // start with forward slash, don't include query string
    qs?: string; // query string, no need to include ?
    method?: string; // defaults to GET
    body?: any; // json or form
    paginate?: boolean; // keep retrieving pages until no more data is returned
    pageLimit?: number; // max number of pages to retrieve
    listKey?: string; // path to array of items in response body, e.g. "students.student"
    clientId?: string; // plugin credentials client Id
    clientSecret?: string; // plugin credentials client secret, combined with client Id to generate access token
    accessToken?: string; // already generated access token, can be sent instead of client Id and secret.
    tenantDataVersion?: string; // field name in tenant meta corresponding to the saved Data Version number to use
    tenantDataVersionOnlyLatest?: boolean; // pull only the latest updates based on the saved Data Version number
    resultsOutputName?: string; // name of data channels step output to write to
    convertToCsv?: boolean; // try to convert json objects to csv as the output, only works with "flat" results
}

export class PsQuery extends BaseProcessor {
    private config!: IPsQueryConfig;

    public async psQuery(input: IFileProcessorInput): Promise<IFileProcessorOutput> {
        this.config = input.parameters!['psQueryConfig'] as IPsQueryConfig;

        this.loadDataVersionConfig();

        this.validateConfig(this.config);

        const outputName = this.config.resultsOutputName ?? 'results';

        if (!this.config.accessToken) {
            
            console.log('Obtaining access token');
            this.config.accessToken = await this.getAccessToken();
        }

        if (!this.config.convertToCsv) {
            this.writeOutputRow(input.outputs[outputName].writeStream, ['JSON_OBJECT']);
        }

        console.log(`Calling ${this.config.host}${this.config.endpoint}?${this.config.qs}`);

        const pageLimit = this.config.pageLimit ?? 10000;

        let page = 1;
        let getNextPage = true;
        let seenHeaders: string[] = [];

        while (getNextPage && page <= pageLimit) {
            const qsItems = [];
            if (this.config.qs) {
                qsItems.push(this.config.qs);
            }
            if (this.config.paginate) {
                qsItems.push(`page=${page}`);
            }
            const fullQs = qsItems.length ? `?${qsItems.join('&')}` : '';

            const resp = await this.fetchWithRetries(
                `${this.config.host}${this.config.endpoint}${fullQs}`,
                `Bearer ${this.config.accessToken}`,
                this.config.method ?? 'GET',
                this.config.body
            );

            let items: any[] = [];
            if (Array.isArray(resp)) {
                items = resp;
            } else if (this.config.listKey) {
                if (!Array.isArray(resp[this.config.listKey])) {
                    throw new Error(`listKey ${this.config.listKey} not present in response or is not an array`);
                }

                items = _.get(resp, this.config.listKey);
            } else {
                const key = this.config.endpoint.split('/').slice(-1)[0] || this.config.endpoint.split('/').slice(-2)[0];
                const keyPlural = `${key}s`;

                // typical format seems to be a top level "plural" key, e.g. "students", with child key containing the items that is singular, e.g. "student"

                if (resp[keyPlural] && Array.isArray(resp[keyPlural][key])) {
                    items = resp[keyPlural][key];
                } else if (page === 1) {
                    // otherwise, just treat result like a single item on first page
                    items = [resp];
                }
            }

            if (this.config.convertToCsv && page === 1) {
                for (const item of items) {
                    const keys = Object.keys(item);
                    seenHeaders = seenHeaders.concat(keys.filter((headerName: string) => !seenHeaders.includes(headerName)));
                }

                this.writeOutputRow(input.outputs[outputName].writeStream, seenHeaders);
            }

            for (const item of items) {
                if (this.config.convertToCsv) {
                    const flatItem = seenHeaders.map((headerName: string) => (item[headerName] || '').toString());
                    this.writeOutputRow(input.outputs[outputName].writeStream, flatItem);
                } else {
                    this.writeOutputRow(input.outputs[outputName].writeStream, [JSON.stringify(item)]);
                }
            }

            if (this.config.tenantDataVersion && resp['$dataversion']) {
                await this.saveLatestDataVersion(this.config.tenantDataVersion, resp['$dataVersion']);
            }

            console.log(`page ${page} items ${items.length}`);

            getNextPage = items.length > 0 && this.config.paginate == true;
            page += 1;
        }

        return {
            results: {
                pagesIterated: page - 1
            }
        };
    }

    private validateConfig(config: IPsQueryConfig): void {
        if (!config) {
            throw new Error('psQueryConfig is a required parameter to psQuery');
        }

        if (!config.accessToken && (!config.clientId || !config.clientSecret)) {
            throw new Error('psQueryConfig Error: clientId and clientSecret, or accessToken are required for authentication');
        }

        if (!config.host || config.host.trim().length < 0 || !config.host.startsWith('https://')) {
            throw new Error('psQueryConfig Error: invalid host');
        }

        if (!config.endpoint || config.endpoint.trim().length < 0) {
            throw new Error('psQueryConfig Error: invalid endpoint');
        }
    }

    private loadDataVersionConfig() {
        let dataVersionValue = '0';

        if (this.job.tenant && this.job.tenant.meta) {
            this.config.host = (this.job.tenant.meta['psHost'] ?? this.config.host) as string;
            this.config.clientId = (this.job.tenant.meta['psClientId'] ?? this.config.clientId) as string;
            this.config.clientSecret = (this.job.tenant.meta['psClientSecret'] ?? this.config.clientSecret) as string;
            dataVersionValue = (this.job.tenant.meta[`psDataVersion.${this.config.tenantDataVersion}`] as string) ?? '0'; 
        }

        if (typeof this.config.body === 'object' && this.config.tenantDataVersion) {
            this.config.body['$dataversion_applicationname'] = this.config.tenantDataVersion;
            if (this.config.tenantDataVersionOnlyLatest) {
                this.config.body['$dataVersion'] =  dataVersionValue;
            }
        }
    }

    private async saveLatestDataVersion(dataVersionName: string, newDataVersion: string): Promise<void> {
        if (this.job.tenant && this.job.tenant.meta) {
            await this.job.tenant!.update({
                meta: { ...this.job.tenant.meta, [`psDataVersion.${dataVersionName}`]: newDataVersion }
            });
        }
    }

    private async getAccessToken(): Promise<string> {
        const formBody = new URLSearchParams();
        formBody.append('grant_type', 'client_credentials');

        const creds = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
        const resp = await this.fetchWithRetries(`${this.config.host}/oauth/access_token`, `Basic ${creds}`, 'POST', formBody, 'application/x-www-form-urlencoded');

        return resp.access_token;
    }

    private async fetchWithRetries(url: string, authorization: string, method?: string, body?: any, contentType?: string): Promise<any> {
        const timeoutMs = 120000; // two minutes for now

        let postBody = body;
        if ((!contentType || contentType === 'application/json') && typeof body === 'object') {
            postBody = JSON.stringify(body);
        } 

        let triesLeft = 3;
        let finalErr;
        while (triesLeft > 0) {
            const controller = new AbortController();
            const config = {
                url,
                method: method ?? 'GET',
                body: postBody,
                headers: { 'Authorization': authorization, Accept: 'application/json', 'Content-Type': contentType ?? 'application/json' },
                signal: controller.signal
            };

            console.log(JSON.stringify(config, undefined, 2));

            const requestTimeout = setTimeout(() => {
                controller.abort();
            }, timeoutMs);

            try {
                const response = await fetch(url, config);

                if (!response.ok) {
                    let error: any;

                    const errText = await response.text();

                    try {
                        error = JSON.parse(errText);
                    } catch {
                        error = errText;
                    }

                    throw new Error(`psQuery http request (${response.status}) error: ${JSON.stringify(error)}`);
                }

                return response.json();
            } catch (error) {
                if (error.name === 'AbortError') {
                    triesLeft -= 1;

                    if (triesLeft === 0) {
                        finalErr = new Error('psQuery http request timed out after multiple tries');
                    }
                } else {
                    triesLeft = 0;
                    finalErr = error;
                }
            } finally {
                clearTimeout(requestTimeout);
            }
        }

        throw finalErr;
    }
}
