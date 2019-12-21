#!/usr/bin/env node
import {ConfigType, IJobConfig, Job, JobStatus, ServiceInterfacer} from "@data-channels/dcSDK";
import Table from 'cli-table3';
import program from 'commander';
import { readFileSync, writeFileSync } from "fs";
import {createconfig, deleteconfig, findconfig, findconfigs, updateconfig} from "./config";
import {csvRows} from "./file";
import {createjob, deletejob, findjob, findjobs, jobExecutionBody, updatejob} from "./job";
import {
    printChannelConfig, printIngressConfig, printJob, printTenant,
    printTenantsList, printTenantUser, printTenantUsersList
} from "./print";
import {
    createtenant, createTenantUser, deletetenant, deleteTenantUser,
    findtenant, findTenantByName, findTenantsPager, findTenantUser,
    findTenantUsers, findTenantUsersByCriteria, findTenantUsersPager, rotateUserPassword,
    updatetenant, updateTenantUser
} from "./tenant";
import {uploadFile} from "./upload";
import {ENVIROS, getDefaultEnviro, initConnection, setDefaultEnviro} from "./utils/config";
import {printExamples} from "./utils/examples";
import spin from "./utils/spinner";
import {sleep, waitOnJobExecution} from "./wait";

let stdin = '';

const catalogExcludes = [
    '4814730DUS',
    '4823640DUS',
    '4823640DUS',
    '0636840DUS',
    '0619540DUS',
    '1201770DUS',
    '7802511DUS',
    '2400480DUS',
    '1301290DUS',
    '15295USPU',
    '1742310DUS',
    '0506330DUS',
    '1812810DUS',
    '1810650DUS',
    '5101260DUS',
    '2930450DUS',
    '2100360DUS',
    '1930930DUS',
    '4807890DUS',
    '25005USPU',
    '1725320DUS',
    '4702190DUS',
    '0506840DUS',
    '2918300DUS',
    '2733330DUS',
    '19691USPU',
    '19216USPU',
    '20456USPU',
    '4823910DUS',
    '4829850DUS',
    '4841220DUS',
    '209228USPU',
    '39125USPU',
    '18006USPU',
    '32035USPU',
    '4100023DUS',
    '5305910DUS',
    '2509450DUS',
    '0503690DUS',
    '2012000DUS',
    '0806900DUS',
    '0634620DUS',
    '4830060DUS',
    '15999USPU',
    '4900750DUS',
    '0505170DUS',
    '0502580DUS',
    '4700900DUS',
    '2926890DUS',
    '5103690DUS',
    '1808280DUS',
    '1807140DUS',
    '16025USPU'
];

const totalSkips = [
    '0610260DUS',
    '0614760DUS',
    '11974USPU',
    '12712USPU'
];

export interface ISubInst {
    id: string;
    name: string;
    districtId: string;
    hasCp: boolean;
    studentPlan: IProcessing;
}

export interface IInstitution {
    catalog?: IProcessing;
    pos?: IProcessing;
}

export interface IMigration {
    [id: string]: IInstitution;
}

export interface IProcessing {
    guid: string;
    status?: string;
    statusMsg?: string;
    created?: Date;
    completed?: Date;
    objects?: number;
    skippedForTime?: number;
}

let catalogLog: IMigration = {};

function loadCatalogLog(name: string) {
    try {
        const logstring = readFileSync(name);
        catalogLog = JSON.parse(logstring.toString());
    } catch (err) {
        console.log('could not load catalog log');
    }
}

function saveCatalogLog(name: string) {
    writeFileSync(name, JSON.stringify(catalogLog));
}

program
    .version(require('../package.json').version) // tslint:disable-line
    .option('-e, --enviro <enviro name>', 'Environment to run against', '')
    .option('--jwt <jwt body>', 'JWT body for authentication on non-local services')
    .option('--auth0-client-id <auth0 client id>', 'Auth0 client ID for JWT retrieval')
    .option('--auth0-client-secret <auth0 client secret>', 'Auth0 client secret for JWT retrieval')
    .option('--auth0-domain <auth0 domain>', 'Auth0 domain for JWT retrieval')
    .option('--auth0-audience <auth0 audience>', 'Auth0 audience for JWT retrieval');

program
    .command('init [districtPath] [hsPath]')
    .action(async (districtPath, hsPath, cmd) => {
        const districtRows = await csvRows(districtPath);
        const hsRows = await csvRows(hsPath);

        const migration: IMigration = {};
        const subsByInstId: { [id: string]: ISubInst[]} = {};

        for (const row of hsRows.slice(1)) {
            const [ hsId, name, dassigned, hasCp, districtId] = row;
            if (hasCp !== '1') {
                continue;
            }
            if (!districtId.replace(/\s+/, '').length) {
                // migration[hsId] = {};
            }
        }

        for (const row of districtRows.slice(1)) {
            console.log(row);
        }
    });

program
    .command('studentfix [path]')
    .action(async (path, cmd) => {
        const rows = await csvRows(path);
        let count = 0;
        for (const row of rows) {
            if (row[1] !== '(deleted)' && row[1] !== row[3]) {
                console.log(`update plans set scope = 'naviance.${row[1]}' where guid = '${row[4]}';`);
                count += 1;
            }
        }
    });
program
    .command('catalog.progress')
    .option('--highschools')
    .action(async (cmd) => {
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
        }
        loadCatalogLog(logName);
        const ids = Object.keys(catalogLog).sort();
        console.log(`${ids.length} schools`);
        for (const id of ids) {
            const courseCount = catalogLog[id].catalog ? catalogLog[id].catalog!.objects : 0;
            const posCount = catalogLog[id].pos ? catalogLog[id].pos!.objects : 0;
            const catalogStatus = catalogLog[id].catalog ? catalogLog[id].catalog!.status : 'not run';
            const posStatus = catalogLog[id].pos ? catalogLog[id].pos!.status : 'not run';
            console.log(`${id} courses ${courseCount} (${catalogStatus}) pos ${posCount} (${posStatus})`);
        }
        console.log(`${ids.length} schools`);
    });

function failedCat(id: string): boolean {
    if (catalogLog[id].catalog && (
        !catalogLog[id].catalog!.status || catalogLog[id].catalog!.status === JobStatus.Failed
    )) {
        return true;
    }

    return false;
}

function failedPlanOfStudy(id: string): boolean {
    if ((catalogLog[id].catalog && catalogLog[id].catalog!.objects! > 0 && !catalogLog[id].pos) ||
        (catalogLog[id].pos && !catalogLog[id].pos!.status) ||
        (catalogLog[id].pos && catalogLog[id].pos!.status === JobStatus.Failed)) {
        return true;
    }

    return false;
}

function failedTimeout(id: string): boolean {
    if ((catalogLog[id].catalog && catalogLog[id].catalog!.skippedForTime)) {
        return true;
    }

    return false;
}

program
    .command('catalog.stats')
    .option('--highschools')
    .action(async (cmd) => {
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
        }
        loadCatalogLog(logName);
        let success = 0;
        let error = 0;
        let totalCourses = 0;
        let totalPoS = 0;
        let totalFailedCat = 0;
        let totalFailedPos = 0;
        let totalSkippedForTime = 0;
        const errorIds = [];
        for (const id of Object.keys(catalogLog)) {
            const failedCatalog = failedCat(id);
            if (failedCatalog) {
                totalFailedCat += 1;
            }
            const failedPoS = failedPlanOfStudy(id);
            if (failedPoS) {
                totalFailedPos += 1;
            }
            const skippedForTime = failedTimeout(id);
            if (skippedForTime) {
                totalSkippedForTime += 1;
            }
            if (failedCatalog || failedPoS || skippedForTime) {
                error += 1;
                errorIds.push(id);
            }

            let courses = 0 ;
            if (catalogLog[id].catalog && catalogLog[id].catalog!.objects) {
                courses = catalogLog[id].catalog!.objects || 0;
                totalCourses += courses;
            }
            let pos = 0;
            if (catalogLog[id].pos && catalogLog[id].pos!.objects) {
                pos = catalogLog[id].pos!.objects || 0;
                totalPoS += pos;
            }

            if (courses > 0 || pos > 0) {
                success += 1;
                console.log(id);
            }

        }

        console.log('errors');
        errorIds.sort();
        for (const id of errorIds) {
            console.log(id);
        }

        console.log(`district - ${success} success ${error} error`);
        console.log(`total courses ${totalCourses} plans ${totalPoS}`);
        console.log(
            `skippedForTime ${totalSkippedForTime}, catalog fail ${totalFailedCat}, pos fail ${totalFailedPos}`);

    });

async function processBatch(idBatch: string[], logName: string, tenantType: string, noCatalog?: boolean) {
    console.log(`starting batch of ${idBatch.length}: ${idBatch}`);
    const shouldProcessPos: {[key: string]: boolean} = {};
    let processingIds: string[] = [];
    for (const id of idBatch) {
        console.log(`starting catalog inst ${id}`);
        catalogLog[id] = {};
        shouldProcessPos[id] = true;
        if (catalogExcludes.includes(id) || noCatalog) {
            console.log(`skipping ${id} catalog`);
        } else {
            const createBody = jobExecutionBody({
                channel: 'naviance/migrateCourseCatalog',
                product: 'naviance',
                parameters:
                    `namespace=${id},tenantId=${id},tenantType=${tenantType},batchSize=50`
            });
            const job = await createjob(JSON.stringify(createBody), true);
            catalogLog[id].catalog = {
                guid: job.guid
            };
            console.log(`created job ${job.guid}`);
            saveCatalogLog(logName);
            processingIds.push(id);
        }
    }

    const startTime = new Date().getTime() / 1000;
    await sleep(5000);
    spin.text = `waiting catalog on jobs`;
    spin.start();
    while (processingIds.length) {
        const curTime = new Date().getTime() / 1000;
        if (curTime > startTime + (60 * 20)) {
            console.log(`timing out on batch, failing remaining jobs for: ${processingIds}`);
            for (const failId of processingIds) {
                catalogLog[failId].catalog!.status = JobStatus.Failed;
                shouldProcessPos[failId] = false;
            }
            saveCatalogLog(logName);
            break;
        }

        for (const checkId of processingIds) {
            const resultJob = await ServiceInterfacer.getInstance()
                .getJob(catalogLog[checkId].catalog!.guid);
            if (resultJob.status === JobStatus.Completed || resultJob.status === JobStatus.Failed) {
                let courseCount = 0;
                let skippedForTime = 0;
                if (resultJob.status === JobStatus.Completed) {
                    courseCount = resultJob.steps['batchToAp'].output!['coursesPushed'];
                    skippedForTime = resultJob.steps['batchToAp'].output!['skippedForTime'] || 0;
                }
                catalogLog[checkId].catalog = {
                    guid: resultJob.guid,
                    status: resultJob.status,
                    statusMsg: resultJob.statusMsg || '',
                    created: resultJob.created,
                    completed: resultJob.completed,
                    objects: courseCount,
                    skippedForTime
                };
                saveCatalogLog(logName);
                if (resultJob.status === JobStatus.Failed) {
                    shouldProcessPos[checkId] = false;
                }
                if (!resultJob.steps['validate'].metrics || !resultJob.steps['validate'].metrics.inputs ||
                    resultJob.steps['validate'].metrics.inputs['CourseCatalog'].totalRows < 2) {
                    shouldProcessPos[checkId] = false;
                }

                processingIds.splice( processingIds.indexOf(checkId), 1 );
                console.log(`${checkId} ${courseCount} courses loaded`);
                console.log(`${checkId} catalog ${resultJob.status}, ${processingIds.length} jobs left`);
                if (resultJob.status === JobStatus.Failed) {
                    console.log(`${checkId} catalog: ${resultJob.statusMsg}`);
                }
            }
        }
        await sleep(5000);
    }
    spin.stop();

    const posIds = Object.keys(shouldProcessPos).filter((id) => shouldProcessPos[id]);

    for (const posId of posIds) {
        console.log(`starting PoS inst ${posId}`);
        let channel = 'naviance/migrateDistrictPoS';
        let parameters = `namespace=${posId},districtId=${posId},chunkSize=16`;
        if (tenantType === 'highschool') {
            channel = 'naviance/migrateHighschoolPoS';
            parameters = `namespace=${posId},highschoolId=${posId}`;
        }
        const posBody = jobExecutionBody({
            channel,
            product: 'naviance',
            parameters
        });
        const posjob = await createjob(JSON.stringify(posBody), true);
        console.log(`created job ${posjob.guid}`);
        catalogLog[posId].pos = {
            guid: posjob.guid
        };
        saveCatalogLog(logName);
    }

    const posStartTime = new Date().getTime() / 1000;
    await sleep(5000);
    spin.text = `waiting on pos jobs`;
    spin.start();
    processingIds = [...posIds];
    while (processingIds.length) {
        const curTime = new Date().getTime() / 1000;
        if (curTime > posStartTime + (60 * 20)) {
            console.log(`timing out on batch, failing remaining jobs for: ${processingIds}`);
            for (const failId of processingIds) {
                catalogLog[failId].pos!.status = JobStatus.Failed;
            }
            saveCatalogLog(logName);
            break;
        }

        for (const checkId of processingIds) {
            const resultJob = await ServiceInterfacer.getInstance()
                .getJob(catalogLog[checkId].pos!.guid);
            if (resultJob.status === JobStatus.Completed || resultJob.status === JobStatus.Failed) {
                let posCount = 0;
                if (resultJob.status === JobStatus.Completed) {
                    posCount = resultJob.steps['importPoS'].output!['createdCount']
                        + resultJob.steps['importPoS'].output!['updatedCount'];
                }
                catalogLog[checkId].pos = {
                    guid: resultJob.guid,
                    status: resultJob.status,
                    statusMsg: resultJob.statusMsg || '',
                    created: resultJob.created,
                    completed: resultJob.completed,
                    objects: posCount
                };
                saveCatalogLog(logName);
                processingIds.splice( processingIds.indexOf(checkId), 1 );
                console.log(`${checkId} ${posCount} pos loaded`);
                console.log(`${checkId} pos ${resultJob.status}, ${processingIds.length} jobs left`);
                if (resultJob.status === JobStatus.Failed) {
                    console.log(`${checkId} pos: ${resultJob.statusMsg}`);
                }
            }
        }
        await sleep(5000);
    }
    spin.stop();
}

program
    .command('catalog.runFailures')
    .option('--starting <startingId>')
    .option('--highschools')
    .action(async (cmd) => {
        initConnection(program);
        let logName = 'catalogLog.json';
        let tenantType = 'district';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
            tenantType = 'highschool';
        }
        loadCatalogLog(logName);

        const allIds = Object.keys(catalogLog);
        allIds.sort();

        let foundStarting = false;
        for (const id of allIds) {
            if (cmd.starting && id === cmd.starting) {
                foundStarting = true;
                continue;
            }
            if (cmd.starting && !foundStarting) {
                continue;
            }

            if (totalSkips.includes(id)) {
                continue;
            }
            const failedCatalog = failedCat(id);
            const failedPoS = failedPlanOfStudy(id);
            const skippedForTime = failedTimeout(id);

            if (failedCatalog || failedPoS || skippedForTime) {
                console.log(
                    `retrying ${id}, failed cat: ${failedCatalog}, failed pos: ${failedPoS}, skipped: ${skippedForTime}`);
                await processBatch([id], logName, tenantType, failedPoS);
                await sleep(10000);
            }
        }
    });

program
    .command('catalog.loadAll [districtPath] [hsPath]')
    .option('--starting <startingId>')
    .option('--highschools')
    .option('--batch-size <batchSize')
    .action(async (dsPath, hsPath, cmd) => {
        initConnection(program);
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
        }
        loadCatalogLog(logName);

        const batchSize = parseInt(cmd.batchSize) || 1;

        const hsRows = await csvRows(hsPath);
        const dsRows = await csvRows(dsPath);

        const districtIdsWithCP = [];
        for (const row of dsRows) {
            const [id, name, hasCp] = row;
            if (id !== 'Id' && hasCp === '1') {
                districtIdsWithCP.push(id.replace(/\s+/, ''));
            }
        }

        const standalonesWithCP = [];
        const highschoolsInDistrict = [];
        const soloschools = [];
        for (const row of hsRows.slice(1)) {
            const [ hsId, name, dassigned, hasCp, districtId] = row;
            if (name.toUpperCase().includes('ELEMENTARY')) {
                continue;
            }
            if (hasCp === '1' && districtId !== '0' && !districtIdsWithCP.includes(districtId.replace(/\s+/, ''))) {
                standalonesWithCP.push(hsId);
            } else if (hasCp === '1' && districtId !== '0') {
                highschoolsInDistrict.push(hsId);
            } else if (hasCp === '1') {
                soloschools.push(hsId);
            }
        }

        console.log(districtIdsWithCP.length);
        console.log(standalonesWithCP.length);
        console.log(highschoolsInDistrict.length);
        console.log(soloschools.length);

        const allHighSchools = standalonesWithCP.concat(soloschools);
        console.log('all high schools', allHighSchools.length);

        let foundStarting = false;
        let runIds = districtIdsWithCP;
        let tenantType = 'district';
        if (cmd.highschools) {
            runIds = allHighSchools;
            tenantType = 'highschool';
        }
        let idBatch: string[] = [];
        for (const dsId of runIds) {
            if (cmd.starting && dsId === cmd.starting) {
                foundStarting = true;
                continue;
            }
            if (cmd.starting && !foundStarting) {
                continue;
            }

            if (totalSkips.includes(dsId)) {
                continue;
            }

            idBatch.push(dsId);
            if (idBatch.length >= batchSize) {
                await processBatch(idBatch, logName, tenantType);
                await sleep(5000);
                idBatch = [];
            }
        }
    });

async function loadHighschoolPlans(districtId: string, hsId: string, chunksPerJob: number) {
    const lookupBody = jobExecutionBody({
        channel: 'naviance/getStudentCoursePlan',
        product: 'naviance',
        parameters:
            `tenantType=highschool,tenantId=${hsId}`
    });
    const lookupJob = await createjob(JSON.stringify(lookupBody), true);
    const lookupResult = await waitOnJobExecution(lookupJob, undefined);
    if (lookupResult.status === JobStatus.Failed) {
        console.log(`lookup job failed - ${lookupJob.guid}`);

        return;
    }
    const planCount = lookupResult.steps['getStudentCoursePlan'].output!['historyRecordsFound'] as number;
    const totalChunks = lookupResult.steps['getStudentCoursePlan'].output!['totalChunks'] as number;
    console.log(`${totalChunks} total student chunks, ${planCount} plans`);
    const numJobs = Math.ceil(totalChunks / chunksPerJob);
    console.log(`will need to run ${numJobs} jobs to process this school`);
    for (let jobChunkIdx = 0; jobChunkIdx < numJobs; jobChunkIdx++) {
        const chunkStartParm = jobChunkIdx * chunksPerJob;
        console.log(`running ${chunksPerJob} chunks starting at chunk ${chunkStartParm}`);
        const createBody = jobExecutionBody({
            channel: 'naviance/migrateStudentCoursePlan',
            product: 'naviance',
            parameters:
                // tslint:disable-next-line:max-line-length
                `chunkStart=${chunkStartParm},numChunks=${chunksPerJob},namespace=${districtId},scope=${hsId},tenantType=highschool,tenantId=${hsId}`
                // ,createOnly=true
        });
        const job = await createjob(JSON.stringify(createBody), true);
        const result = await waitOnJobExecution(job, undefined);
        console.log(result.steps['importStudentCoursePlans'].output);
    }
}

program
    .command('studentPlan.load <districtId> <hsPath>')
    .option('--starting <startingId>')
    .action(async (districtId, hsPath, cmd) => {
        initConnection(program);

        const hsRows = await csvRows(hsPath);

        let totalSchoolCount = 0;
        let foundStarting = false;
        for (const row of hsRows.slice(1)) {
            const [ hsId, name, dassigned, hasCp, dsId] = row;
            if (cmd.starting && hsId === cmd.starting) {
                foundStarting = true;
            }
            if (cmd.starting && !foundStarting) {
                continue;
            }
            if (dsId === districtId && hasCp === '1') {
                if (name.toUpperCase().includes('ELEMENTARY')) {
                    continue;
                }
                totalSchoolCount += 1;
            }
        }

        console.log(`${totalSchoolCount} total schools`);

        foundStarting = false;
        let processedCount = 0;
        for (const row of hsRows.slice(1)) {
            const [ hsId, name, dassigned, hasCp, dsId] = row;
            if (cmd.starting && hsId === cmd.starting) {
                foundStarting = true;
            }
            if (cmd.starting && !foundStarting) {
                continue;
            }

            if (dsId === districtId && hasCp === '1') {
                if (name.toUpperCase().includes('ELEMENTARY')) {
                    console.log(`skipping elementary school ${hsId} ${name}`);
                    continue;
                }
                processedCount += 1;
                console.log(`${processedCount} of ${totalSchoolCount}`, dsId, hsId, name);
                await loadHighschoolPlans(districtId, hsId, 40);
            }
        }
    });

program
    .command('studentPlan.loadhs <hsId> [dsId]')
    .option('--chunk-size <chunkSize>')
    .action(async (hsId, dsId, cmd) => {
        initConnection(program);

        await loadHighschoolPlans(dsId || hsId, hsId, parseInt(cmd.chunkSize) || 40);
    });

program
    .command('channel.findone <configGuid>')
    .option('--json', `Dump config as JSON`)
    .description('Find a single existing Channel Config from a guid')
    .action(async (configGuid, cmd) => {
        initConnection(program);
        spin.text = 'Channel Finding Config';
        spin.start();
        const config = await findconfig(configGuid);
        spin.stop();

        if (!config) {
            console.log('Config not found');
        } else if (config.configType === ConfigType.INGRESS) {
            console.log('Wrong method - use ingress.config.findone');
        } else if (cmd.json) {
            console.log(JSON.stringify(config, undefined, 2));
        } else {
            printChannelConfig(config);
        }
    });

program
    .command('ingress.findone <configGuid>')
    .option('--json', `Dump config as JSON`)
    .description('Find a single existing Ingress Config from a guid')
    .action(async (configGuid, cmd) => {
        initConnection(program);
        spin.text = 'Finding Config';
        spin.start();
        const config = await findconfig(configGuid);
        spin.stop();

        if (!config) {
            console.log('Ingress Config not found');
        } else if (config.configType === ConfigType.CHANNEL) {
            console.log('Wrong method - use channel.config.findone');
        } else if (cmd.json) {
            console.log(JSON.stringify(config, undefined, 2));
        } else {
            printIngressConfig(config);
        }
    });

program
    .command('ingress.find <top> <skip> <filter>')
    .option('--json', `Dump config as JSON`)
    .description('Find Ingress Configs from a filter')
    .action(async (top, skip, filter, cmd) => {
        initConnection(program);
        spin.text = 'Finding Configs';
        spin.start();
        if (filter.length === 0) {
            filter += 'configType eq "INGRESS"';
        } else if (!filter.includes("configType")) {
            filter += ' and configType eq "INGRESS"';
        }
        const configs = await findconfigs(top, skip , filter);
        spin.stop();

        if (configs.total === 0) {
            console.log('Configs not found');
        } else if (cmd.json) {
            console.log(JSON.stringify(configs));
        } else {
            console.log('TOTAL INGRESS CONFIGS : ' + configs.total);
            for (const config of configs.value) {
                printIngressConfig(config);
            }
        }
    });

program
    .command('channel.find <top> <skip> <filter>')
    .option('--json', `Dump config as JSON`)
    .description('Find Channel Configs from a filter')
    .action(async (top, skip, filter, cmd) => {
        initConnection(program);
        spin.text = 'Finding Configs';
        spin.start();
        if (filter.length === 0) {
            filter += 'configType eq "CHANNEL"';
        } else if (!filter.includes("configType")) {
            filter += ' and configType eq "CHANNEL"';
        }

        const configs = await findconfigs(top, skip , filter);
        spin.stop();

        if (configs.total === 0) {
            console.log('Configs not found');
        } else if (cmd.json) {
            console.log(JSON.stringify(configs));
        } else {
            console.log('TOTAL CHANNEL CONFIGS : ' + configs.total);
            for (const config of configs.value) {
                printChannelConfig(config);
            }
        }
    });

program
    .command('ingress.delete <configGuid> <hard>')
    .description('Delete a single existing Ingress Config from a guid')
    .action(async (configGuid, hard, cmd) => {
        initConnection(program);
        spin.text = 'Deleting Config';
        spin.start();
        const getConfig = await findconfig(configGuid);
        if (getConfig.configType === ConfigType.INGRESS) {
            let config;
            if (hard === true || hard === "true") {
                config = await deleteconfig(configGuid, hard);
            } else {
                config = await deleteconfig(configGuid, false);
            }

            spin.stop();

            if (!config) {
                console.log('Config not found');
            } else if (hard === true || hard === "true") {
                console.log('Config hard deleted with guid :' + configGuid);
            } else {
                console.log('Config soft deleted with guid :' + configGuid);
            }
        } else if (getConfig.configType === ConfigType.CHANNEL) {
            console.log('Wrong Config Type - Use channel.delete');
        } else {
            console.log('Config not found');
        }
    });

program
    .command('channel.delete <configGuid> <hard>')
    .description('Delete a single existing Channel Config from a guid')
    .action(async (configGuid, hard, cmd) => {
        initConnection(program);
        spin.text = 'Deleting Config';
        spin.start();
        const getConfig = await findconfig(configGuid);
        if (getConfig.configType === ConfigType.CHANNEL) {
            let config;
            if (hard === true || hard === "true") {
                config = await deleteconfig(configGuid, hard);
            } else {
                config = await deleteconfig(configGuid, false);
            }

            spin.stop();

            if (!config) {
                console.log('Config not found');
            } else if (hard === true || hard === "true") {
                console.log('Config hard deleted with guid :' + configGuid);
            } else {
                console.log('Config soft deleted with guid :' + configGuid);
            }
        } else if (getConfig.configType === ConfigType.INGRESS) {
            console.log('Wrong Config Type - Use ingress.delete');
        } else {
            console.log('Config not found');
        }
    });

program
    .command('channel.create <createBody>')
    .option('--json', `Dump channel config as JSON when created`)
    .description('Create a Channel Config from a JSON Body')
    .action(async (createBody, cmd) => {
        initConnection(program);
        spin.text = 'Creating Channel Config';
        spin.start();
        const config = await createconfig(createBody, ConfigType.CHANNEL);
        spin.stop();

        if (!config) {
            console.log('Config not created');
        } else if (cmd.json) {
            console.log(JSON.stringify(config, undefined, 2));
        } else {
            printChannelConfig(config);
        }
    });

program
    .command('ingress.create <createBody>')
    .option('--json', `Dump channel config as JSON when created`)
    .description('Create a Ingress Config from a JSON Body')
    .action(async (createBody, cmd) => {
        initConnection(program);
        spin.text = 'Creating Ingress Config';
        spin.start();
        const config = await createconfig(createBody, ConfigType.INGRESS);
        spin.stop();

        if (!config) {
            console.log('Config not created');
        } else if (cmd.json) {
            console.log(JSON.stringify(config, undefined, 2));
        } else {
            printIngressConfig(config);
        }
    });

program
    .command('channel.update <configGuid> <updateBody>')
    .option('--json', `Dump channel config as JSON when updated`)
    .description('Update a Channel Config from a JSON Body')
    .action(async (configGuid, updateBody, cmd) => {
        initConnection(program);
        spin.text = 'Updating Channel Config';
        spin.start();
        const config = await updateconfig(configGuid, updateBody, ConfigType.CHANNEL);
        spin.stop();

        if (!config) {
            console.log('Config not updated');
        } else if (cmd.json) {
            console.log(JSON.stringify(config, undefined, 2));
        } else {
            printChannelConfig(config);
        }
    });

program
    .command('ingress.update <configGuid> <updateBody>')
    .option('--json', `Dump channel config as JSON when created`)
    .description('Update a Ingress Config from a JSON Body')
    .action(async (configGuid, updateBody, cmd) => {
        initConnection(program);
        spin.text = 'Updating Ingress Config';
        spin.start();
        const config = await updateconfig(configGuid, updateBody, ConfigType.INGRESS);
        spin.stop();

        if (!config) {
            console.log('Config not updated');
        } else if (cmd.json) {
            console.log(JSON.stringify(config, undefined, 2));
        } else {
            printIngressConfig(config);
        }
    });

/* END OF CONFIGS COMMANDS */

/* BEGIN OF JOBS COMMANDS */

program
    .command('job.findone <jobGuid>')
    .option('--json', `Dump job as JSON`)
    .description('Find a single existing Job from a guid')
    .action(async (jobGuid, cmd) => {
        initConnection(program);
        spin.text = 'Finding Job';
        spin.start();
        const job = await findjob(jobGuid);
        spin.stop();

        if (!job) {
            console.log('Job not found');
        } else if (cmd.json) {
            console.log(JSON.stringify(job));
        } else {
            printJob(job);
        }
    });

program
    .command('job.find <top> <skip> <filter>')
    .option('--json', `Dump Job as JSON`)
    .description('Find Jobs from a filter')
    .action(async (top, skip, filter, cmd) => {
        initConnection(program);
        spin.text = 'Finding Jobs';
        spin.start();
        const jobs = await findjobs(top, skip , filter);
        spin.stop();

        if (jobs.total === 0) {
            console.log('Jobs not found');
        } else if (cmd.json) {
            console.log(JSON.stringify(jobs));
        } else {
            console.log('TOTAL JOBS : ' + jobs.total);
            for (const job of jobs.value) {
                printJob(job);
            }
        }
    });

program
    .command('job.delete <jobGuid> <hard>')
    .description('Delete a single existing Job from a guid')
    .action(async (jobGuid, hard, cmd) => {
        initConnection(program);
        spin.text = 'Deleting Job';
        spin.start();
        const getJob = await findjob(jobGuid);
        if (!getJob) {
            console.log('Job not found');
        }
        let job;
        if (hard === true || hard === "true") {
            job = await deletejob(jobGuid, hard);
        } else {
            job = await deletejob(jobGuid, false);
        }

        spin.stop();

        if (hard === true || hard === "true") {
            console.log('Job hard deleted with guid :' + jobGuid);
        } else {
            console.log('Job soft deleted with guid :' + jobGuid);
        }

    });

program
    .command('job.create <createBody>')
    .option('--json', `Dump Job as JSON when created`)
    .option('--execute', `Execute the job when created`)
    .description('Create a Job from a JSON Body')
    .action(async (createBody, cmd) => {
        initConnection(program);
        spin.text = 'Creating a Job';
        spin.start();
        const job = await createjob(createBody, cmd.execute);
        spin.stop();

        if (!job) {
            console.log('Job not created');
        } else if (cmd.json) {
            console.log(JSON.stringify(job));
        } else {
            printJob(job);
        }
    });

program
    .command('job.execute')
    .option('-a, --author <author>', 'Name of the author for this job', 'cli')
    .option('-c, --channel <channel>', `"Product-name/channel-name", e.g. myproduct/mychannel or GUID`)
    .option('-i, --files-in <filesIn>', `Comma separate list of files in, format: name=bucket/key`)
    .option('-o, --files-out <filesOut>', `Comma separate list of files out, format: name=bucket/key`)
    .option('-n, --job-name <jobName>', 'Name for this job')
    .option('-p, --product <product>', 'Product associated to this job')
    .option('-t, --tenant <tenant>', 'Tenant GUID or "product/name"')
    .option('-w, --watch', 'Command will poll and update console until job is complete')
    .option('-d, --download-output [destination directory]', 'Download files out')
    .option('--parameters <parameters>',
        'Job parameters, comma separated, name=value format. Value can be json or string')
    .description('Shorthand way to create and execute job')
    .action(async (cmd) => {
        initConnection(program);

        if (!cmd.channel) {
            console.log('Channel is required');

            return;
        }

        spin.text = 'Executing Job';
        spin.start();

        const createBody = jobExecutionBody(cmd);
        const job = await createjob(JSON.stringify(createBody), true);
        spin.stop();

        if (!job) {
            console.log('Job not created');

            return;
        }

        printJob(job);

        if (cmd.watch) {
            await waitOnJobExecution(job, cmd.downloadOutput);
        }
    });

program
    .command('job.update <jobGuid> <updateBody>')
    .option('--json', `Dump Job as JSON when updated`)
    .description('Update a Job from a JSON Body')
    .action(async (jobGuid, updateBody, cmd) => {
        initConnection(program);
        spin.text = 'Updating a Job';
        spin.start();
        const job = await updatejob(jobGuid, updateBody);
        spin.stop();

        if (!job) {
            console.log('Job not updated');
        } else if (cmd.json) {
            console.log(JSON.stringify(job));
        } else {
            printJob(job);
        }
    });

/* END OF JOBS COMMANDS */

/* Begin - Tenants Commands */

program
    .command('tenant.findone [tenantGuid]')
    .option('-n, --name <Name>')
    .option('-p, --product <Product>')
    .option('--json', `Dump tenant as JSON`)
    .description('Find a single existing Tenant')
    .action(async (tenantGuid, cmd) => {
        initConnection(program);
        spin.text = 'Finding Tenant';
        spin.start();
        const tenant = await findtenant(tenantGuid, cmd.product, cmd.name);
        spin.stop();

        if (!tenant) {
            console.log('Tenant not found');
        } else if (cmd.json) {
            console.log(JSON.stringify(tenant));
        } else {
            printTenant(tenant);
        }
    });

program
    .command('tenant.find')
    .option('-n, --name <Name>')
    .option('-p, --product <Product>')
    .option('--json', `Dump tenant as JSON`)
    .description('Find Tenants from a filter')
    .action(async (cmd) => {
        initConnection(program);
        const tenantsPager = findTenantsPager(cmd.name, cmd.product);
        spin.text = 'Finding Tenants';
        spin.start();
        const allTenants = await tenantsPager.all();
        spin.stop();
        if (allTenants.length === 0) {
            console.log('No tenants found');
        } else if (cmd.json) {
            console.log(JSON.stringify(allTenants));
        } else {
            console.log('TOTAL TENANTS : ' + allTenants.length);
            printTenantsList(allTenants);
        }
    });

program
    .command('tenant.delete <tenantGuid> <hard>')
    .description('Delete a single existing Tenant from a guid')
    .action(async (tenantGuid, hard, cmd) => {
        initConnection(program);
        spin.text = 'Deleting Tenant';
        spin.start();
        const getTenant = await findtenant(tenantGuid);
        if (getTenant) {
            if (hard === true || hard === "true") {
                await deletetenant(tenantGuid, hard);
            } else {
                await deletetenant(tenantGuid, false);
            }

            spin.stop();

            if (hard === true || hard === "true") {
                console.log('Tenant hard deleted with guid :' + tenantGuid);
            } else {
                console.log('Tenant soft deleted with guid :' + tenantGuid);
            }
        } else {
            console.log('Tenant not found');
        }
    });

program
    .command('tenant.create [createBody]')
    .option('-n, --name <Name>')
    .option('-p, --product <Product>')
    .option('--json', `Dump tenant as JSON when created`)
    .description('Create a Tenant from a JSON Body')
    .action(async (createBody, cmd) => {
        initConnection(program);
        spin.text = 'Creating Tenant';
        spin.start();
        if (!createBody) {
            createBody = JSON.stringify({
                name: cmd.name,
                product: cmd.product
            });
        }
        const tenant = await createtenant(createBody);
        spin.stop();

        if (!tenant) {
            console.log('Tenant not created');
        } else if (cmd.json) {
            console.log(JSON.stringify(tenant));
        } else {
            printTenant(tenant);
        }
    });

program
    .command('tenant.update <tenantGuid> <updateBody>')
    .option('--json', `Dump tenant as JSON when updated`)
    .description('Update a Tenant from a JSON Body')
    .action(async (tenantGuid, updateBody, cmd) => {
        initConnection(program);
        spin.text = 'Updating Tenant';
        spin.start();
        const tenant = await updatetenant(tenantGuid, updateBody);
        spin.stop();

        if (!tenant) {
            console.log('Tenant not updated');
        } else if (cmd.json) {
            console.log(JSON.stringify(tenant));
        } else {
            printTenant(tenant);
        }
    });
/* End - Tenants Commands */

/* BEGIN TENANT USERS */
program
    .command('tenant.user.findone [tenantGuid] [tenantUserGuid]')
    .option('-n, --tenant-name <TenantName>')
    .option('-p, --product <Product>')
    .option('-u, --username <Username>')
    .option('-s, --server-id <ServerId>')
    .option('-m, --email <Email>')
    .option('--json', `Dump Tenant User as JSON`)
    .description('Find a single existing Tenant User from a guid')
    .action(async (tenantGuid, tenantUserGuid, cmd) => {
        initConnection(program);
        spin.text = 'Finding Tenant User';
        spin.start();
        if (!tenantGuid) {
            const tenant = await findTenantByName(cmd.product, cmd.tenantName);
            if (!tenant) {
                console.log('Error: Tenant Not Found');

                return;
            }
            tenantGuid = tenant.guid;
        }
        const tenantUser = await findTenantUser(tenantGuid, tenantUserGuid, cmd.username, cmd.serverId, cmd.email);
        spin.stop();

        if (!tenantUser) {
            console.log('Tenant User not found');
        } else if (cmd.json) {
            console.log(JSON.stringify(tenantUser));
        } else {
            printTenantUser(tenantUser);
        }
    });

program
    .command('tenant.user.find [tenantGuid]')
    .option('-n, --tenant-name <TenantName>')
    .option('-p, --product <Product>')
    .option('-u, --username <Username>')
    .option('-s, --server-id <ServerId>')
    .option('-m, --email <Email>')
    .option('--json', `Dump Tenant Users as JSON`)
    .description('Find Tenant Users from a filter')
    .action(async (tenantGuid, cmd) => {
        initConnection(program);
        spin.text = 'Finding Tenant Users';
        spin.start();
        if (!tenantGuid) {
            const tenant = await findTenantByName(cmd.product, cmd.tenantName);
            if (!tenant) {
                console.log('Error: Tenant Not Found');

                return;
            }
            tenantGuid = tenant.guid;
        }

        const tenantsPager = findTenantUsersPager(tenantGuid, cmd.username, cmd.serverId, cmd.email);
        const allUsers = await tenantsPager.all();
        spin.stop();

        if (allUsers.length === 0) {
            console.log('No users found');
        } else if (cmd.json) {
            console.log(JSON.stringify(allUsers));
        } else {
            console.log('TOTAL USERS : ' + allUsers.length);
            printTenantUsersList(allUsers);
        }
    });

program
    .command('tenant.user.delete <tenantGuid> <tenantUserGuid>')
    .description('Delete a single existing Tenant User from a guid')
    .action(async (tenantGuid, tenantUserGuid, cmd) => {
        initConnection(program);
        spin.text = 'Deleting Tenant User';
        spin.start();
        const result = await deleteTenantUser(tenantGuid, tenantUserGuid);
        spin.stop();

        if (result) {
            console.log('Tenant User deleted with guid: ' + tenantUserGuid);
        } else {
            console.log('Failed to delete Tenant User');
        }
    });

program
    .command('tenant.user.create [tenantGuid] [createBody]')
    .option('-n, --tenant-name <TenantName>')
    .option('-p, --product <Product>')
    .option('-u, --username <Username>')
    .option('-m, --email <Email>')
    .option('-h, --home-dir <HomeDirectory')
    .option('-s, --server-id <ServerId>')
    .option('--json', `Dump Tenant User as JSON when created`)
    .description('Create a Tenant User from a JSON Body')
    .action(async (tenantGuid, createBody, cmd) => {
        initConnection(program);
        spin.text = 'Creating Tenant User';
        spin.start();

        let homeDir = cmd.homeDir;

        if (!tenantGuid) {
            const tenant = await findTenantByName(cmd.product, cmd.tenantName);
            if (!tenant) {
                console.log('Error: Tenant Not Found');

                return;
            }
            tenantGuid = tenant.guid;
            if (!homeDir) {
                homeDir = tenant.name;
            }
        }

        if (!createBody) {
            if (!cmd.username || !cmd.email || !cmd.serverId) {
                console.log('Error: username, email, and serverId are required');

                return;
            }
            createBody = JSON.stringify({
                username: cmd.username,
                email: cmd.email,
                sftpHomeDirectory: homeDir,
                sftpServerId: cmd.serverId
            });
        }
        const tenantUser = await createTenantUser(tenantGuid, createBody);
        spin.stop();

        if (!tenantUser) {
            console.log('Tenant User not created');
        } else if (cmd.json) {
            console.log(JSON.stringify(tenantUser));
        } else {
            printTenantUser(tenantUser);
        }
    });

program
    .command('tenant.user.update <tenantGuid> <tenantUserGuid> <updateBody>')
    .option('--json', `Dump Tenant User as JSON when updated`)
    .description('Update a Tenant User from a JSON Body')
    .action(async (tenantGuid, tenantUserGuid, updateBody, cmd) => {
        initConnection(program);
        spin.text = 'Updating Tenant User';
        spin.start();
        const tenantUser = await updateTenantUser(tenantGuid, tenantUserGuid, updateBody);
        spin.stop();

        if (!tenantUser) {
            console.log('Tenant User not updated');
        } else if (cmd.json) {
            console.log(JSON.stringify(tenantUser));
        } else {
            printTenantUser(tenantUser);
        }
    });

program
    .command('tenant.user.rotatepassword [tenantGuid] [tenantUserGuid]')
    .option('-n, --tenant-name <TenantName>')
    .option('-p, --product <Product>')
    .option('-u, --username <Username>')
    .option('-s, --server-id <ServerId>')
    .description(`Rotates a user's password`)
    .action(async (tenantGuid, tenantUserGuid, cmd) => {
        initConnection(program);

        if (!tenantGuid) {
            if (!cmd.tenantName || !cmd.product) {
                console.log('Error: Tenant name and product must be provided');

                return;
            }
            const tenant = await findTenantByName(cmd.product, cmd.tenantName);
            if (!tenant) {
                console.log('Error: Tenant not found');

                return;
            }
            tenantGuid = tenant.guid;
        }

        if (!tenantUserGuid) {
            if (!cmd.username) {
                console.log('Error: Username must be provided');

                return;
            }
            let users = await findTenantUsersByCriteria(tenantGuid, cmd.username);
            if (users.length > 1) {
                if (cmd.serverId) {
                    users = users.filter((u) => u.sftpServerId === cmd.serverId);
                } else {
                    console.log('Error: multiple users with that username, provide serverId');

                    return;
                }
            }
            if (!users.length) {
                console.log('Error: User not found');

                return;
            }

            tenantUserGuid = users[0].guid;
        }
        spin.text = 'Rotating Tenant User password';
        spin.start();
        const { password } = await rotateUserPassword(tenantGuid, tenantUserGuid);
        spin.stop();

        console.log(`New password: ${password}`);
    });

/* END TENANT USERS */

/* START FILE UTILS */

program
    .command('file.upload <filename> [uploadName]')
    .option('-n, --tenant-name <TenantName>')
    .option('-p, --product <Product>')
    .description('Upload a file to the ready bucket for processing')
    .action(async (filename, uploadName, cmd) => {
        initConnection(program);

        let tenant: any;
        if (cmd.tenantName && cmd.product) {
            spin.text = 'Finding tenant';
            spin.start();
            tenant = await findTenantByName(cmd.product, cmd.tenantName);
            spin.stop();
            if (!tenant) {
                console.log('Error: Tenant not found');

                return;
            }
        }
        if (!uploadName) {
            uploadName = filename.split('/').slice(-1)[0];
        }

        spin.text = 'Uploading';
        spin.start();
        const info = await uploadFile(filename, uploadName, cmd.product || '', tenant);
        spin.stop();
        console.log(`uploaded to s3://${info.bucketName}/${info.keyName}`);
    });

/* END FILE UTILS */

if (process.stdin.isTTY) {
    program.parse(process.argv);
} else {
    process.stdin.on('readable', function() {
        // @ts-ignore
        const chunk = this.read();
        if (chunk !== null) {
            stdin += chunk;
        }
    });
    process.stdin.on('end', () => {
        program.parse(process.argv);
    });
}
