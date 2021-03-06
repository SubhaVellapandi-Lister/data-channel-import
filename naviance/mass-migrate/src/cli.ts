#!/usr/bin/env node
import {ConfigType, IJobConfig, IngressConfig, Job, JobStatus, s3Readable, s3Writeable, ServiceInterfacer} from "@data-channels/dcSDK";
import Table from 'cli-table3';
import program from 'commander';
import { chmod, readFileSync, writeFileSync } from "fs";
import { Readable } from 'stream';
import { getApInfo } from "./ap";
import {csvRows} from "./file";
import {createjob, deletejob, findjob, findjobs, jobExecutionBody, updatejob} from "./job";
import {catalogExcludes, planningDistricts, planningHighschools, planningSplitDistricts} from "./schools";
import {initConnection} from "./utils/config";
import spin from "./utils/spinner";
import {sleep, waitOnJobExecution} from "./wait";

const totalSkips = [
    '0610260DUS',
    '0614760DUS',
    '11974USPU',
    '12712USPU'
];

const studentPlanSkips = [
    '5101260DUS',
    '15295USPU',
    '11974USPU',
    '0611820DUS',
    '5103460DUS',
    '0902070DUS',
    '20456USPU',

    '4814730DUS',
    '7802531DUS',
    '180567USPU'
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
    reco?: IProcessing;
    student?: { [hsId: string]: IStudentPlans };
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
    errors?: number;
    skippedForTime?: number;
    hsId?: string;
}

export interface IStudentPlans {
    jobs: IProcessing[];
    numJobsNeeded?: number;
    numBatches?: number;
    numPlansTotal?: number;
    error?: boolean;
}

let catalogLog: IMigration = {};

function streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

const LOG_BUCKET_NAME = 'data-channels-work-navprod';
const LOG_PREFIX = 'migration';

async function getLogS3(name: string): Promise<IMigration | null> {
    try {
        const logStream = await s3Readable(LOG_BUCKET_NAME, `${LOG_PREFIX}/${name}.json`);
        const result = await streamToString(logStream);

        return JSON.parse(result);
    } catch (err) {
        console.log('could not load log from s3');
    }

    return null;
}

async function loadCatalogLog(name: string) {

    const log = await getLogS3(name);
    if (log) {
        catalogLog = log;

        return;
    } else {
        console.log('could not load catalog log from s3');
    }

    try {
        const logstring = readFileSync(name);
        catalogLog = JSON.parse(logstring.toString());
        const s = new Readable();
        s.push(logstring.toString());
        s.push(null);
       // await s3Writeable(LOG_BUCKET_NAME, `${LOG_PREFIX}/${name}.json`, s);
    } catch (err) {
        console.log('could not load catalog log');
    }
}

async function saveCatalogLog(name: string, id: string) {
    // pull latest version before updating
    const log = await getLogS3(name);
    if (log) {
        log[id] = catalogLog[id];
        catalogLog = log;
    }

    try {
        const s = new Readable();
        s.push(JSON.stringify(catalogLog));
        s.push(null);
        await s3Writeable(LOG_BUCKET_NAME, `${LOG_PREFIX}/${name}.json`, s);

        return;
    } catch (err) {
        console.log('could not load catalog log');
    }

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
    .command('big.picture')
    .action(async () => {
        const [nsCounts, scopeCounts] = await getApInfo();

        let totalCourses = 0;
        let totalPrograms = 0;
        let totalPlans = 0;
        for (const ns of Object.keys(nsCounts)) {
            if (ns.startsWith('naviance.') && ns.endsWith('courses')) {
                totalCourses += parseInt(nsCounts[ns].files);
            }
            if (ns.startsWith('naviance.') && ns.endsWith('programs')) {
                totalPrograms += parseInt(nsCounts[ns].files);
            }
        }

        for (const scope of Object.keys(scopeCounts)) {
            if (scope.startsWith('naviance.')) {
                totalPlans += parseInt(scopeCounts[scope].plans);
            }
        }

        console.error(`AP ${totalCourses} courses, ${totalPrograms} programs, ${totalPlans} plans`);

        await loadCatalogLog('hsCatalog.json');
        const hsLog = catalogLog;
        await loadCatalogLog('catalogLog.json');
        const districtLog = catalogLog;

        interface IRowPrintable {
            dsId?: string;
            dsName?: string;
            hsId?: string;
            hsName?: string;
            courseCount?: number;
            courseDate?: string;
            courseError?: string;
            posCount?: number;
            posDate?: string;
            posError?: string;
            plansCP?: number;
            plansAP?: number;
            plansDate?: string;
            plansError?: string;
        }

        function printRow(row: IRowPrintable) {
            const columns = [
                row.dsId || '', row.dsName || '', row.hsId || '', row.hsName || '',
                row.courseCount?.toString() || '', row.courseDate || '', row.courseError || '',
                row.posCount?.toString() || '', row.posDate || '', row.posError || '',
                row.plansCP?.toString() || '', row.plansAP?.toString() || '', row.plansDate || '',
                row.plansError || ''
            ];

            console.log(`"${columns.join('","')}"`);
        }

        /* for (const dsId of planningDistricts) {

            const row = {
                dsId,
            };
            if (studentPlanSkips.includes(dsId)) {
                console.log(`${dsId},,,skipped on purpose`);
                continue;
            }

            if (cmd.highschools && highschoolsRunFromDistricts[dsId]) {
                const parentId = highschoolsRunFromDistricts[dsId];
                let pid = 23;
                if (planningSplitDistricts.includes(parentId)) {
                    pid = 34;
                }
                const [hsPlans, hsErrors, dateString] = hsJobsInfo(districtLog[parentId].student![dsId].jobs);
                const totalPlans = districtLog[parentId].student![dsId].numPlansTotal || 0;
                let msg = `highschool processed as part of district ${parentId} (PID ${pid})`;
                if (hsPlans < 500 && hsErrors > hsPlans && hsErrors > 40) {
                    msg += ` - has high % of errors (${hsErrors} total errors)`;
                }
                console.log(
                    `${dsId},${dateString},${totalPlans},${msg}`);
                continue;
            }

            if (mode === 'district' && planningSplitDistricts.includes(dsId)) {
                console.log(`${dsId},,,district with cp (pid 34)`);
                continue;
            }

            if (!catalogLog[dsId]) {
                console.log(`${dsId},,,Not run - needs investigation`);
                continue;
            }

            if (catalogLog[dsId] && catalogLog[dsId].pos &&
                (catalogLog[dsId].pos!.status !== JobStatus.Completed) && !catalogLog[dsId].student) {
                console.log(`${dsId},,,issue with PoS migration`);
                continue;
            }

            if (catalogLog[dsId] && catalogLog[dsId].pos && catalogLog[dsId].pos!.objects === 0 &&
                (!catalogLog[dsId].student || !Object.keys(catalogLog[dsId].student!).length)) {
                console.log(`${dsId},,,no plans of study`);
                continue;
            }

            let hasPosLoadErrors = '';
            if (catalogLog[dsId].pos &&
                (catalogLog[dsId].pos!.status !== JobStatus.Completed || catalogLog[dsId].pos!.errors)) {
                hasPosLoadErrors = `${catalogLog[dsId].pos?.errors || 'some'} errors loading PoS;`;
            }

            totalDistricts += 1;
            if (catalogLog[dsId].student) {
                districts += 1;
                let dsTotalPlans = 0;
                let dtStr = '';
                const highschoolErrors: string[] = [];

                for (const hsId of Object.keys(catalogLog[dsId].student!)) {
                    const hsInfo = catalogLog[dsId].student![hsId];
                    dsTotalPlans += hsInfo.numPlansTotal || 0;

                    if (hsInfo.error) {
                       highschoolErrors.push(`${hsId} job error`);
                    }

                    const [hsPlans, hsErrors, dateString] = hsJobsInfo(hsInfo.jobs);
                    if (dateString) {
                        dtStr = dateString;
                    }

                    if (hsPlans < 500 && hsErrors > hsPlans && hsErrors > 40) {
                        highschoolErrors.push(`${hsId} ${hsErrors} plan errors`);

                        if ((cmd.splitdistricts || cmd.highschools) &&
                            (!hsLog[hsId] ||
                             !hsLog[hsId].pos ||
                             hsLog[hsId].pos?.status !== JobStatus.Completed ||
                             hsLog[hsId].pos?.errors)) {
                            highschoolErrors.push(`${hsId} ${hsLog[hsId]?.pos?.errors || ''} errors loading PoS`);
                        }
                    }

                }
                console.log(`${dsId},${dtStr},${dsTotalPlans},${hasPosLoadErrors}${highschoolErrors.join(';')}`);
            } else {
                console.log(`${dsId},,,No highschools processed`);
            }
        } */
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
    .command('info <id> [hsId]')
    .option('--remove')
    .action(async (id, hsId, cmd) => {
        let logName = 'catalogLog.json';
        await loadCatalogLog(logName);

        let item: IInstitution | null = null;
        if (catalogLog[id]) {
            item = catalogLog[id];
        } else {
            logName = 'hsCatalog.json';
            await loadCatalogLog(logName);
            if (catalogLog[id]) {
                item = catalogLog[id];
            }
        }

        if (item) {
            if (hsId) {
                console.log(JSON.stringify(item.student![hsId], undefined, 2));
            } else {
                console.log(JSON.stringify(item, undefined, 2));
            }
            if (cmd.remove) {
                if (hsId) {
                    if (catalogLog[id].student && catalogLog[id].student![hsId]) {
                        delete catalogLog[id].student![hsId];
                    }
                } else {
                    catalogLog[id] = {};
                }

                await saveCatalogLog(logName, id);
                console.log('removed');
            }

        } else {
            console.log(`no migration history found for ${id}`);
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
        await loadCatalogLog(logName);
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

program
    .command('studentplan.progress')
    .option('--highschools')
    .action(async (cmd) => {
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
        }
        await loadCatalogLog(logName);
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
        let fileRecords = await csvRows(`Districts.csv`);
        const districtIds = fileRecords.slice(1).filter((row) => row[2] === '1').map((row) => row[0]);
        let fileIds = districtIds;
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
            fileRecords = await csvRows('Highschools.csv');
            fileIds = fileRecords
                .slice(1)
                .filter((row) => row[3] === '1')
                .filter((row) => row[4] === '0' || !districtIds.includes(row[4]))
                .filter((row) => !row[1].toUpperCase().includes('ELEMENTARY'))
                .map((row) => row[0]);
        }
        fileIds = fileIds.filter((id) => !totalSkips.includes(id));

        await loadCatalogLog(logName);

        for (const id of fileIds) {
            if (!catalogLog[id]) {
                console.log(`${id} - SCHOOL NOT FOUND IN LOG`);
            }
        }

        let success = 0;
        let error = 0;
        let totalCourses = 0;
        let totalPoS = 0;
        let totalFailedCat = 0;
        let totalFailedPos = 0;
        let totalErrorPos = 0;
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
                errorIds.push(`${id} - ${catalogLog[id].catalog?.statusMsg} ${catalogLog[id].pos?.statusMsg}`);
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

            if (catalogLog[id].pos && catalogLog[id].pos!.errors !== undefined) {
                totalErrorPos += catalogLog[id].pos!.errors || 0;
            }

            if (courses > 0 || pos > 0) {
                success += 1;
            }

        }

        console.log('errors');
        errorIds.sort();
        for (const id of errorIds) {
            console.log(id);
        }

        console.log(`district - ${success} success ${error} error`);
        console.log(`total courses ${totalCourses} plans ${totalPoS}`);
        console.log(`total pos items with errors ${totalErrorPos}`);
        console.log(
            `skippedForTime ${totalSkippedForTime}, catalog fail ${totalFailedCat}, pos fail ${totalFailedPos}`);

    });

async function processCourseCatalog(id: string, logName: string, tenantType: string, prereqFix?: boolean) {
    const prereqFixParam = prereqFix ? ',prereqFix=true' : '';
    const createBody = jobExecutionBody({
        channel: 'naviance/migrateCourseCatalog',
        product: 'naviance',
        parameters:
            `namespace=${id},tenantId=${id},tenantType=${tenantType},batchSize=50${prereqFixParam}`
    });
    const job = await createjob(JSON.stringify(createBody), true);
    catalogLog[id].catalog = {
        guid: job.guid
    };
    console.log(`created job ${job.guid}`);
    await saveCatalogLog(logName, id);
}

async function processPoS(posId: string, logName: string, tenantType: string) {
    console.log(`starting PoS inst ${posId}`);
    let channel = 'naviance/migrateDistrictPoS';
    let parameters = `namespace=${posId},districtId=${posId},chunkSize=16,safeOnly=true`;
    if (tenantType === 'highschool') {
        channel = 'naviance/migrateHighschoolPoS';
        parameters = `namespace=${posId},highschoolId=${posId},safeOnly=true,tenantType=highschool`;
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
    await saveCatalogLog(logName, posId);
}

async function waitOnCourseCatalog(processingIds: string[], logName: string): Promise<string[]> {
    const startTime = new Date().getTime() / 1000;
    const failedIds: string[] = [];
    while (processingIds.length) {
        const curTime = new Date().getTime() / 1000;
        if (curTime > startTime + (60 * 20)) {
            console.log(`timing out on batch, failing remaining jobs for: ${processingIds}`);
            for (const failId of processingIds) {
                catalogLog[failId].catalog!.status = JobStatus.Failed;
                failedIds.push(failId);
                await saveCatalogLog(logName, failId);
            }
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
                await saveCatalogLog(logName, checkId);
                if (resultJob.status === JobStatus.Failed) {
                    failedIds.push(checkId);
                }
                if (!resultJob.steps['validate'].metrics || !resultJob.steps['validate'].metrics.inputs ||
                    resultJob.steps['validate'].metrics.inputs['CourseCatalog'].totalRows < 2) {
                    failedIds.push(checkId);
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

    return failedIds;
}

async function waitOnPoS(processingIds: string[], logName: string) {
    const posStartTime = new Date().getTime() / 1000;
    while (processingIds.length) {
        const curTime = new Date().getTime() / 1000;
        if (curTime > posStartTime + (60 * 20)) {
            console.log(`timing out on batch, failing remaining jobs for: ${processingIds}`);
            for (const failId of processingIds) {
                catalogLog[failId].pos!.status = JobStatus.Failed;
                await saveCatalogLog(logName, failId);
            }
            break;
        }

        for (const checkId of processingIds) {
            const resultJob = await ServiceInterfacer.getInstance()
                .getJob(catalogLog[checkId].pos!.guid);
            if (resultJob.status === JobStatus.Completed || resultJob.status === JobStatus.Failed) {
                let posCount = 0;
                let errorCount = 0;
                if (resultJob.status === JobStatus.Completed) {
                    posCount = resultJob.steps['importPoS'].output!['createdCount']
                        + resultJob.steps['importPoS'].output!['updatedCount'];
                    errorCount = resultJob.steps['importPoS'].output!['errorCount'];
                }
                catalogLog[checkId].pos = {
                    guid: resultJob.guid,
                    status: resultJob.status,
                    statusMsg: resultJob.statusMsg || '',
                    created: resultJob.created,
                    completed: resultJob.completed,
                    objects: posCount,
                    errors: errorCount
                };
                await saveCatalogLog(logName, checkId);
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
}

async function processBatch(
    idBatch: string[], logName: string, tenantType: string, noCatalog?: boolean, noSpin?: boolean, prereqFix?: boolean
) {
    console.log(`starting batch of ${idBatch.length}: ${idBatch}`);
    const shouldProcessPos: {[key: string]: boolean} = {};
    let processingIds: string[] = [];
    for (const id of idBatch) {
        console.log(`starting catalog inst ${id}`);
        catalogLog[id] = catalogLog[id] || {};
        shouldProcessPos[id] = true;
        if (catalogExcludes.includes(id) || noCatalog) {
            console.log(`skipping ${id} catalog`);
        } else {
            await processCourseCatalog(id, logName, tenantType, prereqFix);
            processingIds.push(id);
        }
    }

    await sleep(5000);
    if (!noSpin) {
        spin.text = `waiting catalog on jobs`;
        spin.start();
    }
    const failedCatIds = await waitOnCourseCatalog(processingIds, logName);

    for (const failId of failedCatIds) {
        shouldProcessPos[failId] = false;
    }
    if (!noSpin) {
        spin.stop();
    }

    if (prereqFix) {
        return;
    }

    const posIds = Object.keys(shouldProcessPos).filter((id) => shouldProcessPos[id]);

    for (const posId of posIds) {
        await processPoS(posId, logName, tenantType);
    }

    await sleep(5000);
    if (!noSpin) {
        spin.text = `waiting on pos jobs`;
        spin.start();
    }
    processingIds = [...posIds];
    await waitOnPoS(processingIds, logName);
    if (!noSpin) {
        spin.stop();
    }
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
        await loadCatalogLog(logName);

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
    .command('catalog.loadOne [dsId]')
    .option('--highschool')
    .option('--no-spin')
    .option('--no-catalog')
    .option('--force')
    .action(async (dsId, cmd) => {
        initConnection(program);
        let logName = 'catalogLog.json';
        let tenantType = 'district';
        if (cmd.highschool) {
            tenantType = 'highschool';
            logName = 'hsCatalog.json';
        }
        await loadCatalogLog(logName);
        let toLoad = [dsId];
        if (planningSplitDistricts.includes(dsId)) {
            const hsRows = await csvRows('Highschools.csv');
            toLoad = [];
            for (const row of hsRows) {
                if (row[1].toUpperCase().includes('ELEMENTARY')) {
                    continue;
                }
                if (row[4] === dsId) {
                    toLoad.push(row[0]);
                }
            }
            console.log('Split District', dsId);
            console.log(toLoad);
        }
        await processBatch(toLoad, logName, tenantType, !cmd.catalog, !cmd.spin);
    });

program
    .command('catalog.prereqFix')
    .option('--starting <startingId>')
    .option('--highschools')
    .option('--batch-size')
    .option('--no-spin')
    .action(async (cmd) => {
        initConnection(program);
        let logName = 'catalogLogPrereqFix.json';
        let tenantType = 'district';
        if (cmd.highschools) {
            logName = 'hsCatalogPrereqFix.json';
            tenantType = 'highschool';
        }
        await loadCatalogLog(logName);

        const batchSize = parseInt(cmd.batchSize) || 1;

        let toRuns = planningDistricts.filter((dsId) =>
            !planningSplitDistricts.includes(dsId) &&
            !totalSkips.includes(dsId) &&
            !catalogExcludes.includes(dsId));

        if (cmd.highschools) {
            toRuns = planningHighschools.filter((dsId) =>
                !totalSkips.includes(dsId) &&
                !catalogExcludes.includes(dsId));
                tenantType = 'highschool';
        }

        let foundStarting = false;
        let idBatch: string[] = [];
        for (const dsId of toRuns) {
            if (cmd.starting && dsId === cmd.starting) {
                foundStarting = true;
                continue;
            }
            if (cmd.starting && !foundStarting) {
                continue;
            }

            idBatch.push(dsId);
            if (idBatch.length >= batchSize) {
                await processBatch(idBatch, logName, tenantType, false, !cmd.spin, true);
                idBatch = [];
            }
        }

        if (idBatch.length) {
            await processBatch(idBatch, logName, tenantType, false, !cmd.spin, true);
            idBatch = [];
        }
    });

program
    .command('catalog.loadAll')
    .option('--starting <startingId>')
    .option('--highschools')
    .option('--prereq-fix')
    .option('--batch-size <batchSize')
    .action(async (cmd) => {
        initConnection(program);
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
        }
        await loadCatalogLog(logName);

        const batchSize = parseInt(cmd.batchSize) || 1;

        const hsRows = await csvRows('Highschools.csv');
        const dsRows = await csvRows('District.csv');

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

function setStudentPlanJobStatus(districtId: string, hsId: string, guid: string, value: IProcessing) {
    if (!catalogLog[districtId].student) {
        catalogLog[districtId].student = {};
    }

    if (!catalogLog[districtId].student![hsId]) {
        catalogLog[districtId].student![hsId] = {
            jobs: []
        };
    }

    for (const [idx, job] of catalogLog[districtId].student![hsId].jobs.entries()) {
        if (job.guid === guid) {
            catalogLog[districtId].student![hsId].jobs[idx] = value;

            return;
        }
    }

    catalogLog[districtId].student![hsId].jobs.push(value);
}

async function loadHighschoolPlans(
    districtId: string, hsId: string, chunksPerJob: number,
    planBatchSize: number, showSpin: boolean, logName: string,
    allowUpdates: boolean = false, totalJobs?: number, totalStudents?: number
) {
    if (!catalogLog[districtId]) {
        catalogLog[districtId] = {};
    }
    if (!catalogLog[districtId].student) {
        catalogLog[districtId].student = {};
    }

    let finalChunksPerJob = 0;
    let numJobs = 0;
    let planCount = 0;

    if (!totalJobs || !totalStudents) {
        const lookupBody = jobExecutionBody({
            channel: 'naviance/getStudentCoursePlan',
            product: 'naviance',
            parameters:
                `tenantType=highschool,tenantId=${hsId},chunkSize=100`
        });
        const lookupJob = await createjob(JSON.stringify(lookupBody), true);
        const lookupResult = await waitOnJobExecution(lookupJob, showSpin);
        if (lookupResult.status === JobStatus.Failed || lookupResult.status === JobStatus.Started) {
            console.log(`lookup job failed - ${lookupJob.guid}`);

            catalogLog[districtId].student![hsId] = {
                jobs: [],
                error: true
            };
            await saveCatalogLog(logName, districtId);

            return;
        }

        planCount = lookupResult.steps['getStudentCoursePlan'].output!['historyRecordsFound'] as number;
        const totalChunks = lookupResult.steps['getStudentCoursePlan'].output!['totalChunks'] as number;
        console.log(`${totalChunks} total student chunks, ${planCount} plans`);
        finalChunksPerJob = chunksPerJob;
        numJobs = Math.ceil(totalChunks / chunksPerJob);
        if (planCount < 250 && numJobs > 1) {
            numJobs = 1;
            finalChunksPerJob = totalChunks;
        }
        if (planCount < 500 && numJobs > 2) {
            numJobs = 2;
            finalChunksPerJob = Math.ceil(totalChunks / 2);
        }

        if (planCount && numJobs) {
            const plansPerJob = planCount / numJobs;
            if (plansPerJob > 400) {
                numJobs = Math.ceil(planCount / 400);
                finalChunksPerJob = Math.ceil(totalChunks / numJobs);
            }
        }
        catalogLog[districtId].student![hsId] = {
            jobs: [],
            numBatches: totalChunks,
            numJobsNeeded: numJobs,
            numPlansTotal: planCount,
            error: false
        };
    } else {
        numJobs = totalJobs;
        finalChunksPerJob = chunksPerJob;
        planCount = -1;
        catalogLog[districtId].student![hsId] = {
            jobs: [],
            numBatches: Math.ceil(totalStudents / 20),
            numJobsNeeded: totalJobs,
            numPlansTotal: -1,
            error: false
        };

    }

    await saveCatalogLog(logName, districtId);

    if (planCount === 0) {
        return;
    }

    console.log(`will need to run ${numJobs} jobs to process this school`);
    for (let jobChunkIdx = 0; jobChunkIdx < numJobs; jobChunkIdx++) {
        const chunkStartParm = jobChunkIdx * finalChunksPerJob;
        console.log(`running ${finalChunksPerJob} chunks starting at chunk ${chunkStartParm}`);
        const namespace = planningSplitDistricts.includes(districtId) ? hsId : districtId;
        const createOnly = !allowUpdates;
        const createBody = jobExecutionBody({
            channel: 'naviance/migrateStudentCoursePlan',
            product: 'naviance',
            parameters:
                // tslint:disable-next-line:max-line-length
                `chunkStart=${chunkStartParm},numChunks=${finalChunksPerJob},namespace=${namespace},scope=${hsId},tenantType=highschool,tenantId=${hsId},planBatchSize=${planBatchSize},createOnly=${createOnly}`
                // ,createOnly=true
        });
        const job = await createjob(JSON.stringify(createBody), true);
        setStudentPlanJobStatus(districtId, hsId, job.guid, {
            guid: job.guid
        });
        await saveCatalogLog(logName, districtId);
        const result = await waitOnJobExecution(job, showSpin);

        const processingResult: IProcessing = {
            guid: result.guid,
            status: result.status,
            statusMsg: result.statusMsg || '',
            created: result.created,
            completed: result.completed
        };

        if (result.status === JobStatus.Completed) {
            const metrics = result.steps['importStudentCoursePlans'].output as any;
            processingResult.objects = metrics.createdCount + metrics.updatedCount;
            processingResult.errors = metrics.errorCount;
        } else {
            catalogLog[districtId].student![hsId].error = true;
        }
        setStudentPlanJobStatus(districtId, hsId, job.guid, processingResult);
        await saveCatalogLog(logName, districtId);
    }
}

async function loadHighschoolRecommendations(
    districtId: string, hsId: string, showSpin: boolean, logName: string
) {

    if (!catalogLog[hsId]) {
        catalogLog[hsId] = {};
    }
    const jobBody = jobExecutionBody({
        channel: 'naviance/migrateCourseRecommendations',
        product: 'naviance',
        parameters:
            `tenantType=highschool,tenantId=${hsId},namespace=${districtId}`
    });
    const job = await createjob(JSON.stringify(jobBody), true);
    const result = await waitOnJobExecution(job, showSpin);
    catalogLog[hsId].reco = {
        guid: result.guid,
        status: result.status,
        statusMsg: result.statusMsg || '',
        created: result.created,
        completed: result.completed
    };
    if (result.status === JobStatus.Failed || result.status === JobStatus.Started) {
        console.log(`job failed - ${result.guid}`);
        await saveCatalogLog(logName, districtId);

        return;
    }

    const metrics = result.steps['importRecommendations'].output as any;
    catalogLog[hsId].reco!.objects = metrics.createdCount + metrics.updatedCount;
    catalogLog[hsId].reco!.errors = metrics.skippedCount;
    console.log(catalogLog[hsId].reco);

    await saveCatalogLog(logName, districtId);
}

function hsJobsInfo(allJobs: IProcessing[]): [number, number, string] {
    const jobs = allJobs.filter((j) => j.completed);
    let hsPlans = 0;
    let hsErrors = 0;
    let dtStr = '';
    if (jobs.length) {
        const dt = new Date(jobs.slice(-1)[0].completed!);
        dtStr = `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;

        for (const job of jobs) {
            hsErrors += job.errors || 0;
            hsPlans += job.objects || 0;
        }
    }

    return [hsPlans, hsErrors, dtStr];
}

program
    .command('studentPlan.status')
    .option('--details')
    .option('--highschools')
    .option('--splitdistricts')
    .action(async (cmd) => {
        let totalDistricts = 0;
        let districts = 0;
        let idList = planningDistricts;
        let mode = 'district';
        await loadCatalogLog('hsCatalog.json');
        const hsLog = catalogLog;
        await loadCatalogLog('catalogLog.json');
        const districtLog = catalogLog;

        const highschoolsRunFromDistricts: { [hsId: string]: string } = {};
        for (const dsId of Object.keys(districtLog)) {
            if (districtLog[dsId].student) {
                for (const hsId of Object.keys(districtLog[dsId].student!)) {
                    highschoolsRunFromDistricts[hsId] = dsId;
                }
            }
        }

        if (cmd.highschools) {
            mode = 'highschool';
            idList = planningHighschools;
            await loadCatalogLog('hsCatalog.json');

        }
        if (cmd.splitdistricts) {
            mode = 'split';
            idList = planningSplitDistricts;
        }

        for (const dsId of idList) {
            if (studentPlanSkips.includes(dsId)) {
                console.log(`${dsId},,,skipped on purpose`);
                continue;
            }

            if (cmd.highschools && highschoolsRunFromDistricts[dsId]) {
                const parentId = highschoolsRunFromDistricts[dsId];
                let pid = 23;
                if (planningSplitDistricts.includes(parentId)) {
                    pid = 34;
                }
                const [hsPlans, hsErrors, dateString] = hsJobsInfo(districtLog[parentId].student![dsId].jobs);
                const totalPlans = districtLog[parentId].student![dsId].numPlansTotal || 0;
                let msg = `highschool processed as part of district ${parentId} (PID ${pid})`;
                if (hsPlans < 500 && hsErrors > hsPlans && hsErrors > 40) {
                    msg += ` - has high % of errors (${hsErrors} total errors)`;
                }
                console.log(
                    `${dsId},${dateString},${totalPlans},${msg}`);
                continue;
            }

            if (mode === 'district' && planningSplitDistricts.includes(dsId)) {
                console.log(`${dsId},,,district with cp (pid 34)`);
                continue;
            }

            if (!catalogLog[dsId]) {
                console.log(`${dsId},,,Not run - needs investigation`);
                continue;
            }

            if (catalogLog[dsId] && catalogLog[dsId].pos &&
                (catalogLog[dsId].pos!.status !== JobStatus.Completed) && !catalogLog[dsId].student) {
                console.log(`${dsId},,,issue with PoS migration`);
                continue;
            }

            if (catalogLog[dsId] && catalogLog[dsId].pos && catalogLog[dsId].pos!.objects === 0 &&
                (!catalogLog[dsId].student || !Object.keys(catalogLog[dsId].student!).length)) {
                console.log(`${dsId},,,no plans of study`);
                continue;
            }

            let hasPosLoadErrors = '';
            if (catalogLog[dsId].pos &&
                (catalogLog[dsId].pos!.status !== JobStatus.Completed || catalogLog[dsId].pos!.errors)) {
                hasPosLoadErrors = `${catalogLog[dsId].pos?.errors || 'some'} errors loading PoS;`;
            }

            totalDistricts += 1;
            if (catalogLog[dsId].student) {
                districts += 1;
                let dsTotalPlans = 0;
                let dtStr = '';
                const highschoolErrors: string[] = [];

                for (const hsId of Object.keys(catalogLog[dsId].student!)) {
                    const hsInfo = catalogLog[dsId].student![hsId];
                    dsTotalPlans += hsInfo.numPlansTotal || 0;

                    if (hsInfo.error) {
                       highschoolErrors.push(`${hsId} job error`);
                    }

                    const [hsPlans, hsErrors, dateString] = hsJobsInfo(hsInfo.jobs);
                    if (dateString) {
                        dtStr = dateString;
                    }

                    if (hsPlans < 500 && hsErrors > hsPlans && hsErrors > 40) {
                        highschoolErrors.push(`${hsId} ${hsErrors} plan errors`);

                        if ((cmd.splitdistricts || cmd.highschools) &&
                            (!hsLog[hsId] ||
                             !hsLog[hsId].pos ||
                             hsLog[hsId].pos?.status !== JobStatus.Completed ||
                             hsLog[hsId].pos?.errors)) {
                            highschoolErrors.push(`${hsId} ${hsLog[hsId]?.pos?.errors || ''} errors loading PoS`);
                        }
                    }

                }
                console.log(`${dsId},${dtStr},${dsTotalPlans},${hasPosLoadErrors}${highschoolErrors.join(';')}`);
            } else {
                console.log(`${dsId},,,No highschools processed`);
            }
        }

/*
        await loadCatalogLog('hsCatalog.json');

        for (const dsId of Object.keys(catalogLog)) {
            if (!catalogLog[dsId].pos) {
                continue;
            }
            totalHighschools += 1;
            if (catalogLog[dsId].student) {
                highschools += 1;
                for (const hsId of Object.keys(catalogLog[dsId].student!)) {
                    const hsInfo = catalogLog[dsId].student![hsId];
                    if (hsInfo.error) {
                        hsErrors += 1;
                        console.log('ERROR', hsId);
                    } else {
                        totalPlans += hsInfo.numPlansTotal || 0;
                        if (cmd.details) {
                            console.log(`${hsId} ${hsInfo.numPlansTotal || 0} total plans`);
                        }
                    }
                }
            }
        }

        console.log(`${totalPlans} plans total`);
        console.log(`${districts}/${totalDistricts} districts processed, ${districtErrors} errors`);
        console.log(`${highschools}/${totalHighschools} highschools processed, ${hsErrors} errors`); */
    });

program
    .command('studentPlan.load <districtId>')
    .option('--starting <startingId>')
    .option('--chunk-size <chunkSize>')
    .option('--plan-batch-size <planBatchSize>')
    .option('--no-spin')
    .option('--fix-errors')
    .option('--force')
    .option('--allow-updates')
    .action(async (districtId, cmd) => {
        initConnection(program);
        await loadCatalogLog('catalogLog.json');

        const hsRows = await csvRows('Highschools.csv');

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
                if (!cmd.force &&
                    catalogLog[districtId].student &&
                    catalogLog[districtId].student![hsId] &&
                    !catalogLog[districtId].student![hsId].error) {
                    console.log(`skipping ${hsId} as it appears complete already`);
                    continue;
                }

                if (catalogLog[districtId].student &&
                    catalogLog[districtId].student![hsId] &&
                    catalogLog[districtId].student![hsId].numPlansTotal === 0) {
                    console.log(`skipping ${hsId} as it was run before and has 0 student plans`);
                    continue;
                }

                if (!cmd.fixErrors &&
                    catalogLog[districtId].student &&
                    catalogLog[districtId].student![hsId] &&
                    catalogLog[districtId].student![hsId].error) {
                    console.log(`skipping ${hsId} as it previously errored out`);
                    continue;
                }

                processedCount += 1;
                console.log(`${processedCount} of ${totalSchoolCount}`, dsId, hsId, name);
                await loadHighschoolPlans(
                    districtId,
                    hsId,
                    parseInt(cmd.chunkSize) || 40,
                    parseInt(cmd.planBatchSize) || 30,
                    cmd.spin,
                    'catalogLog.json',
                    cmd.allowUpdates
                );
            }
        }
    });

program
    .command('studentPlan.loadAll')
    .option('--highschools')
    .option('--splitdistricts')
    .option('--chunk-size <chunkSize>')
    .option('--plan-batch-size <planBatchSize>')
    .option('--no-spin')
    .option('--count <count>')
    .option('--fix-errors')
    .option('--allow-updates')
    .action(async (cmd) => {
        initConnection(program);
        let tenantType = 'district';
        let logName = 'catalogLog.json';
        let districtLog: IMigration = {};
        if (cmd.highschools) {
            await loadCatalogLog(logName);
            districtLog = catalogLog;

            tenantType = 'highschool';
            logName = 'hsCatalog.json';

        }
        await loadCatalogLog('hsCatalog.json');
        const hsCatalogLog = catalogLog;
        await loadCatalogLog(logName);

        const hsRows = await csvRows('Highschools.csv');

        let runCount = 0;
        if (!cmd.highschools && !cmd.splitdistricts) {
            for (const dsId of planningDistricts) {
                let runnable = false;
                if (studentPlanSkips.includes(dsId)) {
                    console.log(dsId, 'total skipping');
                    continue;
                }
                if (planningSplitDistricts.includes(dsId)) {
                    console.log(dsId, 'skipping split district');
                    continue;
                }
                if (catalogLog[dsId] &&
                    catalogLog[dsId].pos && (catalogLog[dsId].pos!.status !== JobStatus.Completed)) {
                    console.log(dsId, 'skipping because failed PoS migrate', dsId);
                    continue;
                }

                if (logName === 'catalogLog.json') {
                    // district
                    if (!catalogLog[dsId] ||
                        !catalogLog[dsId].pos ||
                        new Date(catalogLog[dsId].pos!.completed!.toString()) <  new Date('2020-01-08')) {
                        // loading PoS first
                        await processBatch(
                            [dsId],
                            logName,
                            tenantType,
                            catalogLog[dsId] && catalogLog[dsId].catalog !== undefined,
                            !cmd.spin);
                    }

                    if (catalogLog[dsId] && catalogLog[dsId].pos && catalogLog[dsId].pos!.objects === 0) {
                        console.log(dsId, 'skipping because no PoS', dsId);
                        continue;
                    }

                    for (const row of hsRows.slice(1)) {
                        const [ hsId, name, dassigned, hasCp, xId] = row;

                        if (dsId === xId) {
                            let hasErrors = false;
                            if (catalogLog[dsId]?.student?.[hsId].error) {
                                hasErrors = true;
                            } else if (catalogLog[dsId]?.student?.[hsId].jobs) {
                                let plans = 0;
                                let errors  = 0;
                                for (const job of catalogLog[dsId]?.student?.[hsId].jobs) {
                                    errors += job.errors || 0;
                                    plans += job.objects || 0;
                                }
                                if (errors > plans) {
                                    hasErrors = true;
                                }
                            }

                            if (!hasErrors) {
                                continue;
                            }

                            if (!cmd.fixErrors && hasErrors) {
                                console.log(`skipping ${hsId} as it previously errored out`);
                                continue;
                            }

                            console.log(`loading hs ${hsId}`);

                            runnable = true;

                            await loadHighschoolPlans(
                                dsId,
                                hsId,
                                parseInt(cmd.chunkSize) || 40,
                                parseInt(cmd.planBatchSize) || 30,
                                cmd.spin,
                                logName,
                                cmd.allowUpdates
                            );
                        }
                    }
                }

                let planCount = 0;
                let hsCount = 0;
                if (catalogLog[dsId].student) {
                    for (const hsPlan of Object.values(catalogLog[dsId].student!)) {
                        hsCount += 1;
                        planCount += hsPlan.numPlansTotal || 0;
                    }
                }

                console.log('--> ', dsId,  `${hsCount} highschools, ${planCount} plans`);

                if (runnable) {
                    runCount += 1;
                }

                if (parseInt(cmd.count) && runCount >= parseInt(cmd.count)) {
                    console.log(`Processed ${runCount} institutions, quitting`);
                    break;
                }
            }
        }

        if (cmd.splitdistricts) {
            for (const dsId of planningSplitDistricts) {
                let runnable = false;
                if (studentPlanSkips.includes(dsId)) {
                    console.log(dsId, 'total skipping');
                    continue;
                }

                for (const row of hsRows.slice(1)) {
                    const [ hsId, name, dassigned, hasCp, xId] = row;

                    if (dsId === xId) {
                        if ((!catalogLog[hsId] ||
                            !catalogLog[hsId].pos ||
                            !catalogLog[hsId].pos!.completed ||
                            new Date(catalogLog[hsId].pos!.completed!.toString()) <  new Date('2020-01-08')) &&
                            (!hsCatalogLog[hsId] ||
                             !hsCatalogLog[hsId].pos ||
                             !hsCatalogLog[hsId].pos!.completed ||
                             new Date(hsCatalogLog[hsId].pos!.completed!.toString()) <  new Date('2020-01-08'))) {
                            // loading PoS first
                            await processBatch(
                                [hsId],
                                logName,
                                'highschool',
                                catalogLog[hsId] && catalogLog[hsId].catalog !== undefined,
                                !cmd.spin);
                        }

                        /*if (catalogLog[hsId] && catalogLog[hsId].pos && catalogLog[hsId].pos!.objects === 0) {
                            console.log(dsId, 'skipping because no PoS', hsId);
                            continue;
                        }*/

                        if (!catalogLog[dsId]) {
                            catalogLog[dsId] = {};
                        }

                        let hasErrors = false;
                        if (catalogLog[dsId]?.student?.[hsId].error) {
                            hasErrors = true;
                        } else if (catalogLog[dsId]?.student?.[hsId].jobs) {
                            let plans = 0;
                            let errors  = 0;
                            for (const job of catalogLog[dsId]?.student?.[hsId].jobs) {
                                errors += job.errors || 0;
                                plans += job.objects || 0;
                            }
                            if (errors > plans) {
                                hasErrors = true;
                            }
                        }

                        if (!hasErrors) {
                            console.log(dsId, 'skipping because already successful', hsId);
                            continue;
                        }

                        if (!cmd.fixErrors &&
                            hasErrors) {
                            console.log(`skipping ${hsId} as it previously errored out`);
                            continue;
                        }

                        console.log(`loading hs ${hsId}`);

                        runnable = true;

                        await loadHighschoolPlans(
                            dsId,
                            hsId,
                            parseInt(cmd.chunkSize) || 40,
                            parseInt(cmd.planBatchSize) || 30,
                            cmd.spin,
                            logName,
                            cmd.allowUpdates
                        );
                    }
                }

                let planCount = 0;
                let hsCount = 0;
                if (catalogLog[dsId] && catalogLog[dsId].student) {
                    for (const hsPlan of Object.values(catalogLog[dsId].student!)) {
                        hsCount += 1;
                        planCount += hsPlan.numPlansTotal || 0;
                    }
                }

                console.log('--> ', dsId,  `${hsCount} highschools, ${planCount} plans`);

                if (runnable) {
                    runCount += 1;
                }

                if (parseInt(cmd.count) && runCount >= parseInt(cmd.count)) {
                    console.log(`Processed ${runCount} institutions, quitting`);
                    break;
                }
            }
        }

        if (cmd.highschools) {
            let highschoolsRunFromDistricts: string[] = [];
            for (const ds of Object.values(districtLog)) {
                if (ds.student) {
                    highschoolsRunFromDistricts = highschoolsRunFromDistricts.concat(Object.keys(ds.student));
                }
            }
            for (const hsId of planningHighschools) {
                if (studentPlanSkips.includes(hsId)) {
                    console.log(hsId, 'total skipping');
                    continue;
                }

                if (highschoolsRunFromDistricts.includes(hsId)) {
                    console.log(hsId, 'run as part of a district, skipping');
                    continue;
                }

                if (!catalogLog[hsId] ||
                    !catalogLog[hsId].pos ||
                    !catalogLog[hsId].pos!.completed ||
                    new Date(catalogLog[hsId].pos!.completed!.toString()) <  new Date('2020-01-08')) {
                    // loading PoS first
                    await processBatch(
                        [hsId],
                        logName,
                        'highschool',
                        catalogLog[hsId] && catalogLog[hsId].catalog !== undefined,
                        !cmd.spin);
                }

                let hasErrors = false;
                if (catalogLog[hsId]?.student?.[hsId].error) {
                    hasErrors = true;
                } else if (catalogLog[hsId]?.student?.[hsId].jobs) {
                    let plans = 0;
                    let errors  = 0;
                    for (const job of catalogLog[hsId]?.student?.[hsId].jobs) {
                        errors += job.errors || 0;
                        plans += job.objects || 0;
                    }
                    if (errors > plans) {
                        hasErrors = true;
                    }
                }

                if (!hasErrors) {
                    console.log(hsId, 'skipping because already successful');
                    continue;
                }

                if (!cmd.fixErrors &&
                    hasErrors) {
                    console.log(`skipping ${hsId} as it previously errored out`);
                    continue;
                }

                console.log(`loading hs ${hsId}`);

                await loadHighschoolPlans(
                    hsId,
                    hsId,
                    parseInt(cmd.chunkSize) || 40,
                    parseInt(cmd.planBatchSize) || 30,
                    cmd.spin,
                    logName,
                    cmd.allowUpdates
                );

                let planCount = 0;
                if (catalogLog[hsId] && catalogLog[hsId].student) {
                    for (const hsPlan of Object.values(catalogLog[hsId].student!)) {
                        planCount += hsPlan.numPlansTotal || 0;
                    }
                }

                console.log('--> ', hsId,  `${planCount} plans`);

                runCount += 1;

                if (parseInt(cmd.count) && runCount >= parseInt(cmd.count)) {
                    console.log(`Processed ${runCount} institutions, quitting`);
                    break;
                }
            }
        }

    });

program
    .command('studentPlan.loadhs <hsId> [dsId]')
    .option('--chunk-size <chunkSize>')
    .option('--plan-batch-size <planBatchSize>')
    .option('--no-spin')
    .option('--allow-updates')
    .option('--total-students <totalStudents>')
    .option('--total-jobs <totalJobs>')
    .action(async (hsId, dsId, cmd) => {
        initConnection(program);

        let logName = 'catalogLog.json';
        if (!dsId) {
            logName = 'hsCatalog.json';
        }
        await loadCatalogLog(logName);

        await loadHighschoolPlans(
            dsId || hsId,
            hsId,
            parseInt(cmd.chunkSize) || 40,
            parseInt(cmd.planBatchSize) || 30,
            cmd.spin,
            logName,
            cmd.allowUpdates,
            parseInt(cmd.totalJobs) || undefined,
            parseInt(cmd.totalStudents) || undefined
        );
    });

async function highschoolsByDistrictId(): Promise<{ [id: string]: string[]}> {
    const hsRows = await csvRows('Highschools.csv');

    const highschoolsInDistrict: {[dsId: string]: string[]} = {};
    for (const row of hsRows.slice(1)) {
        const [ hsId, name, dassigned, hasCp, xId] = row;
        const fileDsId = xId.trim();
        if (fileDsId.length) {
            if (!highschoolsInDistrict[fileDsId]) {
                highschoolsInDistrict[fileDsId] = [hsId.trim()];
            } else {
                highschoolsInDistrict[fileDsId].push(hsId.trim());
            }
        }
    }

    return highschoolsInDistrict;
}

program
    .command('reco.loadOne <id>')
    .option('--highschool')
    .option('--splitdistricts')
    .option('--no-spin')
    .action(async (id, cmd) => {
        initConnection(program);
        let logName = 'catalogLog.json';
        if (cmd.highschool) {
            logName = 'hsCatalog.json';
        }
        await loadCatalogLog(logName);

        if (!cmd.highschool) {
            const highschoolsInDistrict = await highschoolsByDistrictId();
            for (const hsId of highschoolsInDistrict[id] || []) {
                console.log(`loading hs ${hsId}`);
                await loadHighschoolRecommendations(
                    id,
                    hsId,
                    cmd.spin,
                    logName
                );
            }
        } else {
            console.log(`loading hs ${id}`);
            await loadHighschoolRecommendations(
                id,
                id,
                cmd.spin,
                logName
            );
        }
    });

program
    .command('reco.loadAll')
    .option('--highschools')
    .option('--splitdistricts')
    .option('--no-spin')
    .action(async (cmd) => {
        initConnection(program);
        let logName = 'catalogLog.json';
        if (cmd.highschools) {
            logName = 'hsCatalog.json';
        }
        await loadCatalogLog(logName);

        if (!cmd.highschools) {
            const highschoolsInDistrict = await highschoolsByDistrictId();
            console.log('processing districts');
            for (const dsId of planningDistricts) {
                if (planningSplitDistricts.includes(dsId)) {
                    console.log(dsId, 'skipping split district');
                    continue;
                }

                console.log(dsId, 'processing highschools');
                for (const hsId of highschoolsInDistrict[dsId] || []) {
                    console.log(`loading hs ${hsId}`);
                    await loadHighschoolRecommendations(
                        dsId,
                        hsId,
                        cmd.spin,
                        logName
                    );
                }
            }
        } else {
            for (const hsId of planningHighschools) {
                console.log(`loading hs ${hsId}`);
                await loadHighschoolRecommendations(
                    hsId,
                    hsId,
                    cmd.spin,
                    logName
                );
            }
        }
    });

program
    .command('export.Plans <id> <academicYear> [namespaceStr]')
    .option('--bucket <bucket>')
    .option('--key-prefix <keyPrefix>')
    .option('--no-spin')
    .action(async (id, academicYear, namespaceStr, cmd) => {
        initConnection(program);

        const academicYearInt = parseInt(academicYear);
        let acadStr = '';
        if (academicYear) {
            acadStr = `_${academicYear}-${academicYearInt + 1}`;
        }

        const namespace = namespaceStr || id;

        const outBucket = cmd.bucket || 'data-channels-work-navprod';
        const keyPrefix = cmd.keyPrefix || 'exports/studentCourses';
        const byPlanfileName = 'PlanCoursesExportByPlan';
        const byCourseFileName = 'PlanCoursesExportByCourse';

        let tenantType = 'highschool';
        if (id.endsWith('DUS') || planningDistricts.includes(id) || planningSplitDistricts.includes(id)) {
            tenantType = 'district';
        }
        const perPlanCustomHeaders = [
            "Highschool_Name",
            "Student_ID",
            "Class_Year",
            "First_Name",
            "Last_Name",
            "Counselor_ID",
            "Counselor_Name",
            "Status",
            "Plan_Type",
            "Student_Last_Update_Date",
            "Plan_Name",
            "Grade"
        ];

        const perCourseCustomHeaders = [
            "Highschool_Name",
            "Student_ID",
            "Class_Year",
            "First_Name",
            "Last_Name",
            "Status",
            "Plan_Type",
            "Student_Last_Update_Date",
            "Plan_Name",
            "Grade",
            "Course_ID",
            "Course_Name"
        ];

        const parameters = JSON.stringify({
            all: {
                tenantType,
                tenantId: id,
                namespace,
                filters: {
                    classYearFrom: academicYearInt + 1,
                    classYearTo: academicYearInt + 10
                },
                academicYear: academicYearInt,
                exports: {
                    ByPlan: {
                        mode: "course",
                        customHeaders: perPlanCustomHeaders,
                        rowPerPlan: true,
                        sisStudentId: true
                    },
                    ByCourse: {
                        mode: "course",
                        customHeaders: perCourseCustomHeaders,
                        sisStudentId: true
                    }
                }
            }

        });

        const jobBody = jobExecutionBody({
            channel: 'naviance/exportStudentCourses',
            product: 'naviance',
            filesOut:
                `ByPlan=${outBucket}/${keyPrefix}/${byPlanfileName}_${id}${acadStr}.csv,ByCourse=${outBucket}/${keyPrefix}/${byCourseFileName}_${id}${acadStr}.csv`,
            parameters
        });
        const job = await createjob(JSON.stringify(jobBody), true);
        const result = await waitOnJobExecution(job, cmd.spin);

        console.log(JSON.stringify(result.steps['exportStudentCourses'], undefined, 2));
    });

program.parse(process.argv);
